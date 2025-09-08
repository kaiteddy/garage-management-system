// Check MOT Status - Robust Version
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Configuration
const CONFIG = {
  batchSize: 50,
  requestDelay: 1000, // 1 second between requests
  maxRetries: 3,
  minDaysBetweenChecks: 7,
  logFile: path.resolve(__dirname, '../logs/mot_check.log'),
  errorLogFile: path.resolve(__dirname, '../logs/mot_errors.log'),
};

// Create logs directory if it doesn't exist
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Statistics
const stats = {
  totalProcessed: 0,
  success: 0,
  notFound: 0,
  invalid: 0,
  errors: 0,
  startTime: null,
  totalToProcess: 0,
};

/**
 * Log message to console and file
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  const logFile = isError ? CONFIG.errorLogFile : CONFIG.logFile;
  fs.appendFileSync(logFile, logMessage + '\n');
}

/**
 * Clean and validate UK vehicle registration
 * @param {string} registration - The registration to clean and validate
 * @returns {object} - Object with cleaned registration and validity
 */
function validateRegistration(registration) {
  if (!registration) return { cleaned: '', isValid: false };
  
  // Remove any non-alphanumeric characters
  let cleaned = registration.toString().replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Basic validation for UK registration format
  // This is simplified and may not catch all edge cases
  const isValid = (
    // Current format: AB12ABC
    /^[A-Z]{2}\d{2}[A-Z]{3}$/.test(cleaned) ||
    // Older format: A123ABC
    /^[A-Z]\d{1,3}[A-Z]{3}$/.test(cleaned) ||
    // Even older format: ABC123A
    /^[A-Z]{3}\d{1,3}[A-Z]?$/.test(cleaned) ||
    // Special formats
    /^[A-Z]{1,2}\d{1,4}$/.test(cleaned)
  );
  
  return { cleaned, isValid };
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
        client_id: process.env.TAPI_CLIENT_ID,
        client_secret: process.env.TAPI_CLIENT_SECRET,
        scope: process.env.TAPI_SCOPE
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    log(`Error getting access token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Check MOT status for a vehicle registration
 */
async function checkMOTStatus(registration, attempt = 1) {
  const { cleaned, isValid } = validateRegistration(registration);
  
  if (!isValid) {
    log(`Invalid registration format: ${registration}`, true);
    return { status: 'INVALID_FORMAT' };
  }
  
  try {
    const accessToken = await getDVSAAccessToken();
    
    const response = await fetch(`${process.env.MOT_HISTORY_BASE_URL}/registration/${encodeURIComponent(cleaned)}`, {
      headers: {
        'x-api-key': process.env.MOT_HISTORY_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      }
    });

    // Handle API responses
    if (response.status === 404) {
      log(`Vehicle not found: ${registration}`);
      return { status: 'NOT_FOUND' };
    }
    
    if (response.status === 429) {
      log(`Rate limit exceeded for ${registration}, retrying after delay`, true);
      if (attempt <= CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        return checkMOTStatus(registration, attempt + 1);
      }
      return { status: 'RATE_LIMITED' };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    log(`Successfully retrieved MOT data for ${registration}`);
    return { status: 'SUCCESS', data };
  } catch (error) {
    log(`Error checking MOT for ${registration}: ${error.message}`, true);
    
    if (attempt <= CONFIG.maxRetries) {
      const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
      log(`Retry ${attempt}/${CONFIG.maxRetries} for ${registration} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return checkMOTStatus(registration, attempt + 1);
    }
    
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
    RETURNING registration
  `;

  try {
    const result = await pool.query(query, [
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
    
    return result.rowCount > 0;
  } catch (error) {
    log(`Error updating vehicle ${registration}: ${error.message}`, true);
    return false;
  }
}

/**
 * Mark vehicle as checked even if no MOT data found
 */
async function markVehicleChecked(registration) {
  try {
    await pool.query(
      'UPDATE vehicles SET mot_last_checked = NOW() WHERE registration = $1',
      [registration]
    );
    return true;
  } catch (error) {
    log(`Error marking vehicle ${registration} as checked: ${error.message}`, true);
    return false;
  }
}

/**
 * Fetch a batch of vehicles that need MOT checks
 */
async function fetchVehicles(limit) {
  const query = `
    SELECT registration, make, model
    FROM vehicles
    WHERE 
      registration IS NOT NULL 
      AND registration != ''
      AND (
        mot_last_checked IS NULL 
        OR mot_last_checked < NOW() - INTERVAL '${CONFIG.minDaysBetweenChecks} days'
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
    log(`Error fetching vehicles: ${error.message}`, true);
    return [];
  }
}

/**
 * Process a single vehicle
 */
async function processVehicle(vehicle) {
  try {
    const result = await checkMOTStatus(vehicle.registration);
    
    if (result.status === 'SUCCESS' && result.data) {
      // Extract MOT data from API response
      const motTests = result.data[0]?.motTests || [];
      const latestTest = motTests[0] || {};
      
      const motData = {
        status: 'VALID',
        expiryDate: latestTest.expiryDate || null,
        testDate: latestTest.completedDate || null,
        odometerValue: latestTest.odometerValue || null,
        odometerUnit: latestTest.odometerUnit || null,
        testNumber: latestTest.motTestNumber || null,
        defects: latestTest.rfrAndComments || [],
        advisories: latestTest.rfrAndComments?.filter(d => d.type === 'ADVISORY') || [],
        testResult: latestTest.testResult || null
      };

      const updated = await updateVehicleMOT(vehicle.registration, motData);
      if (updated) {
        stats.success++;
        return 'SUCCESS';
      }
    } 
    else if (result.status === 'NOT_FOUND') {
      await markVehicleChecked(vehicle.registration);
      stats.notFound++;
      return 'NOT_FOUND';
    }
    else if (result.status === 'INVALID_FORMAT') {
      await markVehicleChecked(vehicle.registration);
      stats.invalid++;
      return 'INVALID';
    }
    else {
      await markVehicleChecked(vehicle.registration);
      stats.errors++;
      return 'ERROR';
    }
  } catch (error) {
    log(`Error processing vehicle ${vehicle.registration}: ${error.message}`, true);
    stats.errors++;
    return 'ERROR';
  }
}

/**
 * Process vehicles sequentially with delay
 */
async function processVehicles(vehicles) {
  for (const vehicle of vehicles) {
    log(`Processing ${vehicle.registration} (${vehicle.make} ${vehicle.model})`);
    await processVehicle(vehicle);
    stats.totalProcessed++;
    
    // Add delay between requests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
  }
}

/**
 * Print statistics
 */
function printStats() {
  const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
  const processed = stats.totalProcessed;
  const remaining = stats.totalToProcess - processed;
  const rate = processed > 0 ? (processed / elapsed).toFixed(2) : 0;
  const eta = rate > 0 ? Math.ceil(remaining / rate) : '?';
  const progress = ((processed / stats.totalToProcess) * 100).toFixed(2);

  log(`\n=== Progress Update ===`);
  log(`Processed: ${processed}/${stats.totalToProcess} (${progress}%)`);
  log(`Success: ${stats.success} | Not Found: ${stats.notFound} | Invalid: ${stats.invalid} | Errors: ${stats.errors}`);
  log(`Rate: ${rate} vehicles/second | ETA: ${eta}s | Elapsed: ${elapsed}s`);
  log(`========================\n`);
}

/**
 * Main function
 */
async function main() {
  log('🚗 Starting MOT Status Check 🚗\n');
  
  // Validate required environment variables
  const requiredVars = [
    'MOT_HISTORY_API_KEY', 
    'MOT_HISTORY_BASE_URL', 
    'TAPI_CLIENT_ID', 
    'TAPI_CLIENT_SECRET', 
    'TAPI_SCOPE', 
    'TAPI_TOKEN_URL', 
    'DATABASE_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log('❌ Error: The following required environment variables are not set:', true);
    missingVars.forEach(varName => log(`- ${varName}`, true));
    process.exit(1);
  }
  
  try {
    stats.startTime = Date.now();
    
    // Get total count of vehicles to process
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles
      WHERE 
        registration IS NOT NULL 
        AND registration != ''
        AND (
          mot_last_checked IS NULL 
          OR mot_last_checked < NOW() - INTERVAL '${CONFIG.minDaysBetweenChecks} days'
        )
    `;
    
    const countResult = await pool.query(countQuery);
    stats.totalToProcess = parseInt(countResult.rows[0].total, 10);
    
    if (stats.totalToProcess === 0) {
      log('✅ No vehicles need MOT checks at this time.');
      return;
    }
    
    log(`🔍 Found ${stats.totalToProcess} vehicles that need MOT checks\n`);
    
    let hasMoreVehicles = true;
    let batchCount = 0;
    
    // Process vehicles in batches
    while (hasMoreVehicles) {
      const vehicles = await fetchVehicles(CONFIG.batchSize);
      
      if (vehicles.length === 0) {
        log('\n✅ No more vehicles to process');
        hasMoreVehicles = false;
        break;
      }
      
      batchCount++;
      log(`\nProcessing batch #${batchCount} (${vehicles.length} vehicles)...`);
      
      await processVehicles(vehicles);
      printStats();
    }
    
    log('\n✅ MOT check completed!');
    log(`\n📊 Final Stats:`);
    log(`- Total Processed: ${stats.totalProcessed}`);
    log(`- Success: ${stats.success}`);
    log(`- Not Found: ${stats.notFound}`);
    log(`- Invalid Registrations: ${stats.invalid}`);
    log(`- Errors: ${stats.errors}`);
    log(`- Time Elapsed: ${Math.floor((Date.now() - stats.startTime) / 1000)} seconds`);
    
  } catch (error) {
    log(`\n❌ Error during MOT check: ${error.message}`, true);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`, true);
  process.exit(1);
});
