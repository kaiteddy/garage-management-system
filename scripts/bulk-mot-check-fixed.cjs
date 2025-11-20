// Bulk MOT Check Script - Fixed for vehicles table schema
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configuration
const CONFIG = {
  batchSize: 50,           // Number of vehicles to process in each batch
  concurrency: 3,          // Number of concurrent API requests (reduced to be safe)
  maxRetries: 3,           // Maximum number of retry attempts for failed requests
  retryDelay: 1000,        // Delay between retries in milliseconds
  minDaysBetweenChecks: 7, // Minimum days between MOT checks for the same vehicle
};

// Statistics
let stats = {
  totalProcessed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null
};

/**
 * Fetch a batch of vehicles that need MOT checks
 * @param {number} limit - Maximum number of vehicles to fetch
 * @returns {Promise<Array>} Array of vehicle objects
 */
async function fetchVehicles(limit) {
  const query = `
    SELECT registration, make, model, mot_expiry_date, mot_last_checked
    FROM vehicles
    WHERE 
      registration IS NOT NULL 
      AND registration != ''
      AND (
        mot_last_checked IS NULL 
        OR mot_last_checked < NOW() - INTERVAL '${CONFIG.minDaysBetweenChecks} days'
      )
    ORDER BY mot_last_checked ASC NULLS FIRST
    LIMIT $1
  `;

  try {
    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching vehicles:', error.message);
    throw error;
  }
}

/**
 * Update vehicle MOT information in the database
 * @param {string} registration - Vehicle registration number (primary key)
 * @param {Object} motData - MOT data to update
 * @returns {Promise<void>}
 */
async function updateVehicleMOT(registration, motData) {
  const { status, expiryDate, mileage, testDate, testResult, rawData } = motData;
  
  const query = `
    UPDATE vehicles
    SET 
      mot_status = $1,
      mot_expiry_date = $2,
      mot_last_checked = NOW(),
      mot_odometer_value = $3,
      mot_test_date = $4,
      mot_test_result = $5,
      mot_raw_data = $6,
      updated_at = NOW()
    WHERE registration = $7
    RETURNING registration
  `;

  try {
    await pool.query(query, [
      status,
      expiryDate,
      mileage,
      testDate,
      testResult,
      JSON.stringify(rawData),
      registration
    ]);
  } catch (error) {
    console.error(`❌ Error updating vehicle ${registration}:`, error.message);
    throw error;
  }
}

/**
 * Get OAuth access token for DVSA API
 * @returns {Promise<string>} Access token
 */
async function getDVSAAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.DVSA_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', process.env.DVSA_CLIENT_ID);
  params.append('client_secret', process.env.DVSA_CLIENT_SECRET);
  params.append('scope', 'https://tapi.dvsa.gov.uk/.default');
  params.append('grant_type', 'client_credentials');
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    throw error;
  }
}

/**
 * Check MOT status for a vehicle registration
 * @param {string} registration - Vehicle registration number
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} MOT check result
 */
async function checkMOTStatus(registration, attempt = 1) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '');
  
  try {
    const token = await getDVSAAccessToken();
    const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'Bulk-MOT-Check/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { 
          registration: cleanReg,
          status: 'NOT_FOUND',
          success: true,
          rawData: { error: 'Vehicle not found' }
        };
      }
      
      if (response.status === 429 && attempt <= CONFIG.maxRetries) {
        // Rate limited - wait and retry
        const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⚠️  Rate limited. Waiting ${delay}ms before retry ${attempt}/${CONFIG.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return checkMOTStatus(registration, attempt + 1);
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract relevant MOT information
    const latestTest = data.motTests && data.motTests.length > 0 
      ? data.motTests[0] 
      : null;
    
    return {
      registration: cleanReg,
      status: latestTest ? latestTest.testResult : 'NO_TESTS',
      expiryDate: latestTest?.expiryDate || null,
      mileage: latestTest?.odometerValue || null,
      testDate: latestTest?.completedDate || null,
      testResult: latestTest?.testResult || null,
      success: true,
      rawData: data
    };
    
  } catch (error) {
    console.error(`❌ Error checking MOT for ${cleanReg}:`, error.message);
    
    if (attempt <= CONFIG.maxRetries) {
      const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
      console.log(`⚠️  Retry ${attempt}/${CONFIG.maxRetries} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return checkMOTStatus(registration, attempt + 1);
    }
    
    return {
      registration: cleanReg,
      status: 'ERROR',
      error: error.message,
      success: false
    };
  }
}

/**
 * Process a batch of vehicles
 * @param {Array} vehicles - Array of vehicle objects
 * @returns {Promise<void>}
 */
async function processBatch(vehicles) {
  const results = [];
  const batchStartTime = Date.now();
  
  console.log(`\n🔄 Processing batch of ${vehicles.length} vehicles...`);
  
  // Process vehicles with limited concurrency
  const processWithConcurrency = async (items, concurrency) => {
    const queue = [...items];
    const results = [];
    
    const worker = async () => {
      while (queue.length > 0) {
        const vehicle = queue.shift();
        if (!vehicle) continue;
        
        try {
          process.stdout.write(`\r🔍 Checking ${vehicle.registration}... `);
          const result = await checkMOTStatus(vehicle.registration);
          
          if (result.success) {
            await updateVehicleMOT(vehicle.registration, {
              status: result.status,
              expiryDate: result.expiryDate,
              mileage: result.mileage,
              testDate: result.testDate,
              testResult: result.testResult,
              rawData: result.rawData
            });
            
            process.stdout.write(`✅ (${result.status})\n`);
            stats.success++;
          } else {
            process.stdout.write(`❌ (${result.error || 'Error'})\n`);
            stats.failed++;
          }
          
          results.push({ ...result, registration: vehicle.registration });
          stats.totalProcessed++;
          
        } catch (error) {
          console.error(`\n❌ Error processing ${vehicle.registration}:`, error.message);
          stats.failed++;
          results.push({ 
            registration: vehicle.registration,
            success: false,
            error: error.message 
          });
        }
      }
    };
    
    // Start worker threads
    await Promise.all(
      Array(concurrency).fill().map(worker)
    );
    
    return results;
  };
  
  await processWithConcurrency(vehicles, CONFIG.concurrency);
  
  const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
  console.log(`✅ Batch completed in ${batchTime}s`);
  
  return results;
}

/**
 * Print summary statistics
 */
function printStats() {
  const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
  const vehiclesPerMinute = ((stats.totalProcessed / (stats.endTime - stats.startTime)) * 60000).toFixed(2);
  
  console.log('\n📊 MOT Check Summary');
  console.log('==================');
  console.log(`Total vehicles processed: ${stats.totalProcessed}`);
  console.log(`✅ Success: ${stats.success}`);
  console.log(`❌ Failed: ${stats.failed}`);
  
  if (stats.totalProcessed > 0) {
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`🚀 Speed: ${vehiclesPerMinute} vehicles/minute`);
  }
  
  console.log('==================');
}

/**
 * Main function
 */
async function main() {
  console.log('🚗 Starting Bulk MOT Check 🚗\n');
  
  // Validate required environment variables
  const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'DVSA_TENANT_ID', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Error: The following required environment variables are not set:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    process.exit(1);
  }
  
  try {
    stats.startTime = Date.now();
    
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
      
      console.log(`\n📋 Fetched ${vehicles.length} vehicles for processing`);
      console.log(`Sample registrations: ${vehicles.slice(0, 3).map(v => v.registration).join(', ')}${vehicles.length > 3 ? '...' : ''}`);
      
      await processBatch(vehicles);
      
      processedCount += vehicles.length;
      console.log(`\n📊 Processed ${processedCount} vehicles so far`);
      
      // Small delay between batches to avoid hitting rate limits
      if (vehicles.length === CONFIG.batchSize) {
        const delay = 2000; // 2 second delay between batches
        console.log(`\n⏳ Waiting ${delay/1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
  } catch (error) {
    console.error('\n❌ Bulk MOT check failed:', error.message);
    process.exit(1);
  } finally {
    stats.endTime = Date.now();
    printStats();
    await pool.end();
    process.exit(0);
  }
}

// Run the script
main();
