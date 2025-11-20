// Bulk MOT Check - Efficient Version
const { Pool } = require('pg');
const path = require('path');
const { setTimeout } = require('timers/promises');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Database configuration with connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Configuration
const CONFIG = {
  batchSize: 100,          // Number of vehicles to process in each batch
  concurrency: 5,          // Number of concurrent API requests
  requestDelay: 200,       // Delay between API requests in ms
  maxRetries: 3,           // Maximum number of retries for failed requests
  tokenRefreshInterval: 300000, // 5 minutes in ms
};

// Rate limiting
let tokens = CONFIG.concurrency;
const TOKEN_REFRESH_RATE = 1000; // 1 second

// Statistics
const stats = {
  totalProcessed: 0,
  success: 0,
  notFound: 0,
  errors: 0,
  startTime: null,
  totalToProcess: 0,
};

/**
 * Rate limiter using token bucket algorithm
 */
async function waitForToken() {
  while (tokens <= 0) {
    await setTimeout(100);
  }
  tokens--;
  return Promise.resolve();
}

/**
 * Refresh tokens at a fixed rate
 */
function startTokenRefresher() {
  setInterval(() => {
    tokens = Math.min(tokens + CONFIG.concurrency, CONFIG.concurrency);
  }, TOKEN_REFRESH_RATE);
}

/**
 * Fetch a batch of vehicles that need MOT checks
 */
async function fetchVehicles(limit) {
  const query = `
    SELECT registration, make, model, mot_expiry_date, mot_last_checked
    FROM vehicles
    WHERE registration IS NOT NULL 
      AND registration != ''
      AND (
        mot_last_checked IS NULL 
        OR mot_last_checked < NOW() - INTERVAL '7 days'
      )
    ORDER BY 
      CASE 
        WHEN mot_expiry_date IS NULL THEN 0
        WHEN mot_expiry_date < NOW() THEN 1
        WHEN mot_expiry_date < NOW() + INTERVAL '30 days' THEN 2
        ELSE 3
      END,
      mot_last_checked ASC NULLS FIRST
    LIMIT $1
  `;

  try {
    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
}

/**
 * Get OAuth access token for DVSA API
 */
async function getDVSAAccessToken() {
  try {
    const response = await fetch(process.env.TAPI_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.DVSA_CLIENT_ID,
        client_secret: process.env.DVSA_CLIENT_SECRET,
        scope: process.env.TAPI_SCOPE
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

/**
 * Check MOT status for a vehicle registration with retry logic
 */
async function checkMOTStatus(registration, attempt = 1) {
  await waitForToken();
  
  try {
    const accessToken = await getDVSAAccessToken();
    const response = await fetch(`${process.env.MOT_HISTORY_BASE_URL}/registration/${encodeURIComponent(registration)}`, {
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      return { status: 'NOT_FOUND' };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { status: 'SUCCESS', data };
  } catch (error) {
    if (attempt <= CONFIG.maxRetries) {
      const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
      console.log(`Retry ${attempt}/${CONFIG.maxRetries} for ${registration} after ${delay}ms`);
      await setTimeout(delay);
      return checkMOTStatus(registration, attempt + 1);
    }
    console.error(`Failed to check MOT for ${registration}:`, error.message);
    return { status: 'ERROR', error: error.message };
  }
}

/**
 * Update vehicle MOT information in the database
 */
async function updateVehicleMOT(registration, motData) {
  const query = `
    UPDATE vehicles
    SET 
      mot_status = $1,
      mot_expiry_date = $2,
      mot_test_date = $3,
      mot_odometer_value = $4,
      mot_odometer_unit = $5,
      mot_test_number = $6,
      mot_defects = $7,
      mot_advisories = $8,
      mot_test_result = $9,
      mot_last_checked = NOW(),
      updated_at = NOW()
    WHERE registration = $10
  `;

  try {
    await pool.query(query, [
      motData.status,
      motData.expiryDate,
      motData.testDate,
      motData.odometerValue,
      motData.odometerUnit,
      motData.testNumber,
      JSON.stringify(motData.defects || []),
      JSON.stringify(motData.advisories || []),
      motData.testResult,
      registration
    ]);
    return true;
  } catch (error) {
    console.error(`Error updating vehicle ${registration}:`, error);
    return false;
  }
}

/**
 * Process a batch of vehicles
 */
async function processBatch(vehicles) {
  const results = {
    success: 0,
    notFound: 0,
    errors: 0
  };

  // Process vehicles in parallel with controlled concurrency
  await Promise.all(vehicles.map(async (vehicle) => {
    try {
      const result = await checkMOTStatus(vehicle.registration);
      
      if (result.status === 'SUCCESS' && result.data) {
        const motData = {
          status: 'VALID',
          expiryDate: result.data[0]?.motTests[0]?.expiryDate || null,
          testDate: result.data[0]?.motTests[0]?.completedDate || null,
          odometerValue: result.data[0]?.motTests[0]?.odometerValue || null,
          odometerUnit: result.data[0]?.motTests[0]?.odometerUnit || null,
          testNumber: result.data[0]?.motTests[0]?.motTestNumber || null,
          defects: result.data[0]?.motTests[0]?.rfrAndComments || [],
          advisories: result.data[0]?.motTests[0]?.rfrAndComments?.filter(d => d.dangerous === false) || [],
          testResult: result.data[0]?.motTests[0]?.testResult || null
        };

        await updateVehicleMOT(vehicle.registration, motData);
        results.success++;
      } else if (result.status === 'NOT_FOUND') {
        // Update last checked time even if not found
        await pool.query(
          'UPDATE vehicles SET mot_last_checked = NOW() WHERE registration = $1',
          [vehicle.registration]
        );
        results.notFound++;
      } else {
        results.errors++;
      }
    } catch (error) {
      console.error(`Error processing ${vehicle.registration}:`, error);
      results.errors++;
    }
  }));

  return results;
}

/**
 * Print and update statistics
 */
function updateStats(batchResults) {
  stats.totalProcessed += batchResults.success + batchResults.notFound + batchResults.errors;
  stats.success += batchResults.success;
  stats.notFound += batchResults.notFound;
  stats.errors += batchResults.errors;

  const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
  const processed = stats.success + stats.notFound + stats.errors;
  const rate = processed > 0 ? Math.floor(processed / elapsed) : 0;
  const remaining = stats.totalToProcess - processed;
  const eta = rate > 0 ? Math.ceil(remaining / rate) : '?';
  const progress = ((processed / stats.totalToProcess) * 100).toFixed(2);

  console.log(`\n=== Batch Complete ===`);
  console.log(`Processed: ${processed}/${stats.totalToProcess} (${progress}%)`);
  console.log(`Success: ${stats.success} | Not Found: ${stats.notFound} | Errors: ${stats.errors}`);
  console.log(`Rate: ${rate} vehicles/second | ETA: ${eta}s | Elapsed: ${elapsed}s`);
  console.log('========================');
}

/**
 * Main function
 */
async function main() {
  console.log('🚗 Starting Efficient Bulk MOT Check 🚗\n');
  
  // Validate required environment variables
  const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'MOT_HISTORY_BASE_URL', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Error: The following required environment variables are not set:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    process.exit(1);
  }
  
  try {
    stats.startTime = Date.now();
    
    // First, get total count of vehicles to process
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles
      WHERE 
        registration IS NOT NULL 
        AND registration != ''
        AND (
          mot_last_checked IS NULL 
          OR mot_last_checked < NOW() - INTERVAL '7 days'
        )
    `;
    
    const countResult = await pool.query(countQuery);
    stats.totalToProcess = parseInt(countResult.rows[0].total, 10);
    
    if (stats.totalToProcess === 0) {
      console.log('✅ No vehicles need MOT checks at this time.');
      return;
    }
    
    console.log(`🔍 Found ${stats.totalToProcess} vehicles that need MOT checks\n`);
    
    // Start the token refresher
    startTokenRefresher();
    
    let processedCount = 0;
    let hasMoreVehicles = true;
    
    // Process vehicles in batches
    while (hasMoreVehicles) {
      const vehicles = await fetchVehicles(CONFIG.batchSize);
      
      if (vehicles.length === 0) {
        console.log('\n✅ No more vehicles to process');
        hasMoreVehicles = false;
        break;
      }
      
      console.log(`\nℹ️  Processing batch of ${vehicles.length} vehicles...`);
      const batchResults = await processBatch(vehicles);
      updateStats(batchResults);
      
      processedCount += vehicles.length;
      
      // Add a small delay between batches
      if (hasMoreVehicles) {
        await setTimeout(CONFIG.requestDelay);
      }
    }
    
    console.log('\n✅ MOT check completed!');
    console.log(`\n📊 Final Stats:`);
    console.log(`- Total Processed: ${stats.success + stats.notFound + stats.errors}`);
    console.log(`- Success: ${stats.success}`);
    console.log(`- Not Found: ${stats.notFound}`);
    console.log(`- Errors: ${stats.errors}`);
    console.log(`- Time Elapsed: ${Math.floor((Date.now() - stats.startTime) / 1000)} seconds`);
    
  } catch (error) {
    console.error('\n❌ Error during MOT check:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the script
main();
