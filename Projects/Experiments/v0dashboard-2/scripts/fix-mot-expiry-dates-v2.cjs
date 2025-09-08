#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { Pool } = require('pg');

// Configuration
const CONFIG = {
  batchSize: 5,
  concurrency: 5,
  delayBetweenBatches: 2000, // ms
  maxRetries: 3,
  logToConsole: true,
  logToFile: true
};

// Global variables
let pool;
let accessToken = null;
let tokenExpiry = 0;
let totalProcessed = 0;
let totalSuccess = 0;
let totalFailed = 0;
let startTime;

/**
 * Log message to console and/or file
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  if (CONFIG.logToConsole) {
    if (isError) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
  }
  
  if (CONFIG.logToFile) {
    // Could implement file logging here if needed
  }
}

/**
 * Get OAuth2 access token for DVSA API
 */
async function refreshAccessToken() {
  try {
    log('Getting new access token...');
    
    const tokenResponse = await fetch(process.env.TAPI_TOKEN_URL, {
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

    const tokenData = await tokenResponse.json();
    accessToken = tokenData.access_token;
    
    // Set token expiry time (subtract 5 minutes for safety margin)
    const expiresInMs = (tokenData.expires_in - 300) * 1000;
    tokenExpiry = Date.now() + expiresInMs;
    
    log('Access token refreshed successfully');
  } catch (error) {
    log(`Error refreshing access token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Check MOT status for a registration
 */
async function checkMOTStatus(registration, attempt = 1) {
  try {
    // Get access token if needed
    if (!accessToken || Date.now() >= tokenExpiry) {
      await refreshAccessToken();
    }
    
    const url = `${process.env.MOT_HISTORY_BASE_URL}/registration/${encodeURIComponent(registration)}`;
    log(`Calling MOT API for ${registration}`);
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.MOT_HISTORY_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const data = await response.json();
      
      // Log the API response structure
      const vehicleData = data[0] || {};
      const motTests = vehicleData.motTests || [];
      
      // Find the latest PASSED test with an expiry date
      const latestPassedTest = motTests.find(test => 
        test.testResult === 'PASSED' && test.expiryDate
      ) || motTests[0] || {};
      
      // Debug log to see the structure
      if (motTests.length > 0) {
        log(`Found ${motTests.length} MOT tests for ${registration}`);
        if (latestPassedTest.expiryDate) {
          log(`Expiry date found: ${latestPassedTest.expiryDate}`);
        } else {
          log(`No expiry date found in MOT data for ${registration}`);
        }
      } else {
        log(`No MOT tests found for ${registration} despite 200 status`);
      }
      
      return { status: 'SUCCESS', data };
    } else if (response.status === 404) {
      log(`Vehicle not found in MOT API: ${registration}`);
      return { status: 'NOT_FOUND' };
    } else if (response.status === 400) {
      log(`Invalid registration format for MOT API: ${registration}`);
      return { status: 'INVALID_FORMAT' };
    } else if (response.status === 429) {
      log(`Rate limit exceeded for ${registration}, retrying after delay`, true);
      if (attempt <= CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        return checkMOTStatus(registration, attempt + 1);
      }
      return { status: 'RATE_LIMITED' };
    } else {
      log(`MOT API error for ${registration}: ${response.status}`);
      return { status: `ERROR_${response.status}` };
    }
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
 * Process a single vehicle
 */
async function processVehicle(vehicle) {
  const { registration, make, model } = vehicle;
  
  try {
    log(`Processing ${registration} (${make} ${model})`);
    
    // Check MOT status
    const result = await checkMOTStatus(registration);
    
    if (result.status !== 'SUCCESS') {
      log(`Failed to get MOT data for ${registration}: ${result.status}`);
      // Mark as checked even if no data found
      await updateVehicleMOT(registration, {
        status: 'Valid',
        expiryDate: null,
        testDate: null,
        odometerValue: null,
        odometerUnit: null,
        testNumber: null,
        defects: '[]',
        advisories: '[]',
        testResult: null
      });
      log(`Marked ${registration} as checked with no MOT data`);
      return false;
    }
    
    const vehicleData = result.data[0] || {};
    const motTests = vehicleData.motTests || [];
    
    if (motTests.length === 0) {
      log(`No MOT tests found for ${registration}`);
      // Mark as checked even if no tests found
      await updateVehicleMOT(registration, {
        status: 'Valid',
        expiryDate: null,
        testDate: null,
        odometerValue: null,
        odometerUnit: null,
        testNumber: null,
        defects: '[]',
        advisories: '[]',
        testResult: null
      });
      log(`Marked ${registration} as checked with no MOT tests`);
      return false;
    }
    
    // Find the latest PASSED test with an expiry date
    const latestPassedTest = motTests.find(test => 
      test.testResult === 'PASSED' && test.expiryDate
    ) || motTests[0] || {};
    
    let expiryDate = latestPassedTest.expiryDate;
    if (expiryDate) {
      if (expiryDate.length > 10) {
        expiryDate = expiryDate.substring(0, 10);
      }
      log(`Found expiry date for ${registration}: ${expiryDate}`);
    } else {
      log(`No expiry date found in MOT tests for ${registration}`);
    }
    
    const motData = {
      status: 'Valid',
      expiryDate: expiryDate || null,
      testDate: latestPassedTest.completedDate || null,
      odometerValue: latestPassedTest.odometerValue || null,
      odometerUnit: latestPassedTest.odometerUnit || null,
      testNumber: latestPassedTest.motTestNumber || null,
      defects: JSON.stringify(latestPassedTest.rfrAndComments || []),
      advisories: JSON.stringify(latestPassedTest.advisoryNotices || []),
      testResult: latestPassedTest.testResult || null
    };
    
    // Update vehicle MOT data in database
    await updateVehicleMOT(registration, motData);
    
    log(`Updated MOT data for ${registration}`);
    return true;
  } catch (error) {
    log(`Error processing ${registration}: ${error.message}`, true);
    return false;
  }
}

/**
 * Update vehicle MOT information in the database
 */
async function updateVehicleMOT(registration, motData) {
  log(`Updating ${registration} with expiry date: ${motData.expiryDate}`);
  
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
      motData.defects,
      motData.advisories,
      motData.testResult,
      registration
    ]);
    
    if (result.rows.length > 0) {
      log(`Successfully updated ${registration} with expiry date: ${motData.expiryDate}`);
      return true;
    } else {
      log(`Failed to update ${registration} - no rows affected`, true);
      return false;
    }
  } catch (error) {
    log(`Database error updating ${registration}: ${error.message}`, true);
    throw error;
  }
}

/**
 * Get total count of vehicles needing MOT expiry date update
 */
async function getTotalVehiclesCount() {
  const query = `
    SELECT COUNT(*) as total
    FROM vehicles
    WHERE 
      registration IS NOT NULL 
      AND registration != ''
      AND registration !~ '^\\s*$'
      AND (mot_status = 'VALID' OR mot_status = 'Valid')
      AND mot_expiry_date IS NULL
  `;
  
  const result = await pool.query(query);
  return parseInt(result.rows[0].total, 10);
}

/**
 * Fetch a batch of vehicles needing MOT expiry date update
 */
async function fetchVehicleBatch(limit, offset) {
  const query = `
    SELECT 
      v.registration,
      v.make,
      v.model
    FROM vehicles v
    WHERE 
      v.registration IS NOT NULL 
      AND v.registration != ''
      AND v.registration !~ '^\\s*$'
      AND (v.mot_status = 'VALID' OR v.mot_status = 'Valid')
      AND v.mot_expiry_date IS NULL
    ORDER BY v.mot_last_checked DESC
    LIMIT $1
    OFFSET $2
  `;
  
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

/**
 * Process a batch of vehicles concurrently
 */
async function processBatch(vehicles) {
  const results = await Promise.all(
    vehicles.map(async (vehicle) => {
      try {
        const success = await processVehicle(vehicle);
        return { vehicle, success };
      } catch (error) {
        log(`Error in batch processing for ${vehicle.registration}: ${error.message}`, true);
        return { vehicle, success: false, error };
      }
    })
  );
  
  const succeeded = results.filter(r => r.success).length;
  const failed = results.length - succeeded;
  
  totalProcessed += results.length;
  totalSuccess += succeeded;
  totalFailed += failed;
  
  return { succeeded, failed };
}

/**
 * Fix quoted registration format
 */
function fixQuotedRegistration(registration) {
  if (!registration) return registration;
  
  // Remove quotes if present
  if (registration.startsWith('"') && registration.endsWith('"')) {
    return registration.substring(1, registration.length - 1);
  }
  
  return registration;
}

/**
 * Main function
 */
async function main() {
  startTime = Date.now();
  
  // Validate required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'MOT_HISTORY_API_KEY',
    'MOT_HISTORY_BASE_URL',
    'TAPI_CLIENT_ID',
    'TAPI_CLIENT_SECRET',
    'TAPI_SCOPE',
    'TAPI_TOKEN_URL'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }
  
  try {
    // Initialize database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Get initial access token
    await refreshAccessToken();
    
    // Fix quoted registrations in database
    log('Fixing quoted registrations in database...');
    await pool.query(`
      UPDATE vehicles
      SET registration = REPLACE(REPLACE(registration, '"', ''), '"', '')
      WHERE registration LIKE '"%"'
    `);
    
    // Get total count of vehicles to process
    const totalVehicles = await getTotalVehiclesCount();
    log(`Found ${totalVehicles} vehicles needing MOT expiry date update`);
    
    // Process vehicles in batches
    let offset = 0;
    
    while (offset < totalVehicles) {
      const vehicles = await fetchVehicleBatch(CONFIG.batchSize, offset);
      
      if (vehicles.length === 0) {
        log('No more vehicles to process');
        break;
      }
      
      log(`Processing batch of ${vehicles.length} vehicles (offset ${offset})...`);
      
      // Fix quoted registrations
      vehicles.forEach(v => {
        v.registration = fixQuotedRegistration(v.registration);
        v.make = fixQuotedRegistration(v.make);
        v.model = fixQuotedRegistration(v.model);
      });
      
      const { succeeded, failed } = await processBatch(vehicles);
      log(`Batch completed: ${succeeded} succeeded, ${failed} failed`);
      
      offset += CONFIG.batchSize;
      
      // Add delay between batches
      if (offset < totalVehicles) {
        log(`Waiting ${CONFIG.delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
      }
    }
    
    // Print summary
    const duration = (Date.now() - startTime) / 1000;
    log(`\nFix MOT expiry dates completed in ${duration.toFixed(2)} seconds`);
    log(`Total vehicles processed: ${totalProcessed}`);
    log(`Successful updates: ${totalSuccess}`);
    log(`Failed updates: ${totalFailed}`);
    
    // Check updated count
    const updatedCount = await pool.query(`
      SELECT COUNT(*) as total
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `);
    
    log(`Vehicles with MOT expiry date: ${updatedCount.rows[0].total}`);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, true);
    console.error(error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
