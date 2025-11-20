// Fix MOT Expiry Dates Script
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
  batchSize: 100,
  concurrentRequests: 5,
  requestDelay: 200,
  batchDelay: 1000,
  maxRetries: 3,
  logFile: path.resolve(__dirname, '../logs/mot_fix.log'),
  errorLogFile: path.resolve(__dirname, '../logs/mot_fix_errors.log'),
};

// Create logs directory if it doesn't exist
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Statistics
const stats = {
  totalProcessed: 0,
  fixedRegistrations: 0,
  fixedExpiries: 0,
  errors: 0,
  startTime: null,
};

// OAuth token management
let accessToken = null;
let tokenExpiry = null;

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
 */
function validateRegistration(registration) {
  if (!registration) return { cleaned: '', isValid: false };
  
  // Remove any non-alphanumeric characters and quotes
  let cleaned = registration.toString().replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Basic validation for UK registration format
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
  // Return existing token if it's still valid
  if (accessToken && tokenExpiry && tokenExpiry > Date.now()) {
    return accessToken;
  }
  
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
    accessToken = data.access_token;
    
    // Set token expiry to 90% of the actual expiry time to be safe
    const expiresIn = data.expires_in * 0.9 * 1000;
    tokenExpiry = Date.now() + expiresIn;
    
    log(`Obtained new access token, valid for ${Math.floor(expiresIn / 1000)} seconds`);
    return accessToken;
  } catch (error) {
    log(`Error getting access token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Check MOT status for a vehicle registration
 */
async function checkMOTStatus(registration, attempt = 1) {
  try {
    // Get access token if needed
    if (!accessToken || Date.now() >= tokenExpiry) {
      await getDVSAAccessToken();
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
    // Debug log to help diagnose issues
    log(`Updating ${registration} with expiry date: ${motData.expiryDate}`);
    
    const result = await pool.query(query, [
      motData.status,
      motData.expiryDate, // This should now be in YYYY-MM-DD format for PostgreSQL date column
      motData.testDate,
      motData.odometerValue,
      motData.odometerUnit,
      motData.testNumber,
      JSON.stringify(motData.defects || []),
      JSON.stringify(motData.advisories || []),
      motData.testResult,
      registration
    ]);
    
    // Log the result for debugging
    if (result.rowCount > 0) {
      log(`Successfully updated ${registration} with expiry date: ${motData.expiryDate}`);
    } else {
      log(`Failed to update ${registration} - no rows affected`);
    }
    
    return result.rowCount > 0;
  } catch (error) {
    log(`Error updating vehicle ${registration}: ${error.message}`, true);
    return false;
  }
}

/**
 * Fix quoted registrations in the database
 */
async function fixQuotedRegistrations() {
  try {
    log('Fixing quoted registrations in the database...');
    
    // Find all registrations with quotes
    const findQuery = `
      SELECT registration
      FROM vehicles
      WHERE registration LIKE '"%"'
    `;
    
    const result = await pool.query(findQuery);
    const quotedRegistrations = result.rows;
    
    log(`Found ${quotedRegistrations.length} registrations with quotes`);
    
    if (quotedRegistrations.length === 0) {
      return 0;
    }
    
    // Fix each quoted registration
    let fixedCount = 0;
    for (const row of quotedRegistrations) {
      const quotedReg = row.registration;
      const cleanReg = quotedReg.replace(/"/g, '');
      
      try {
        // Update the registration to remove quotes
        const updateResult = await pool.query(
          'UPDATE vehicles SET registration = $1 WHERE registration = $2',
          [cleanReg, quotedReg]
        );
        
        if (updateResult.rowCount > 0) {
          log(`Fixed registration: ${quotedReg} -> ${cleanReg}`);
          fixedCount++;
        }
      } catch (error) {
        log(`Error fixing registration ${quotedReg}: ${error.message}`, true);
        stats.errors++;
      }
      
      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return fixedCount;
  } catch (error) {
    log(`Error fixing quoted registrations: ${error.message}`, true);
    return 0;
  }
}

/**
 * Process a single vehicle to update its MOT expiry date
 */
async function processVehicle(vehicle) {
  try {
    log(`Processing ${vehicle.registration} (${vehicle.make} ${vehicle.model})`);
    const result = await checkMOTStatus(vehicle.registration);
    
    if (result.status === 'SUCCESS' && result.data) {
      // Extract MOT data from API response
      const vehicleData = result.data[0] || {};
      const motTests = vehicleData.motTests || [];
      
      // Find the latest PASSED test with an expiry date
      const latestPassedTest = motTests.find(test => 
        test.testResult === 'PASSED' && test.expiryDate
      ) || motTests[0] || {};
      
      // Debug log to see the structure
      if (motTests.length > 0) {
        log(`Found ${motTests.length} MOT tests for ${vehicle.registration}`);
        if (latestPassedTest.expiryDate) {
          log(`Expiry date found: ${latestPassedTest.expiryDate}`);
        } else {
          log(`No expiry date found in MOT data for ${vehicle.registration}`);
        }
      }
      
      // Format the expiry date correctly (it might be in different formats)
      let expiryDate = latestPassedTest.expiryDate;
      
      // For PostgreSQL date column, we need to ensure it's in YYYY-MM-DD format
      // If it's already in that format, use it directly
      // If it's a full ISO timestamp, extract just the date part
      if (expiryDate) {
        if (expiryDate.length > 10) {
          // Extract just the date part from ISO timestamp
          expiryDate = expiryDate.substring(0, 10);
        }
        log(`Formatted expiry date: ${expiryDate}`);
      }
      
      const motData = {
        status: 'Valid',
        expiryDate: expiryDate || null,
        testDate: latestPassedTest.completedDate || null,
        odometerValue: latestPassedTest.odometerValue || null,
        odometerUnit: latestPassedTest.odometerUnit || null,
        testNumber: latestPassedTest.motTestNumber || null,
        defects: latestPassedTest.defects || [],
        advisories: latestPassedTest.defects?.filter(d => d.type === 'ADVISORY') || [],
        testResult: latestPassedTest.testResult || null
      };

      const updated = await updateVehicleMOT(vehicle.registration, motData);
      if (updated) {
        log(`Updated MOT data for ${vehicle.registration}`);
        if (motData.expiryDate) {
          stats.fixedExpiries++;
        }
        return 'SUCCESS';
      }
    } 
    else if (result.status === 'NOT_FOUND') {
      log(`Vehicle not found: ${vehicle.registration}`);
      return 'NOT_FOUND';
    }
    else if (result.status === 'INVALID_FORMAT') {
      log(`Invalid registration format: ${vehicle.registration}`);
      return 'INVALID';
    }
    else {
      log(`Error checking MOT for ${vehicle.registration}: ${result.status}`);
      return 'ERROR';
    }
  } catch (error) {
    log(`Error processing vehicle ${vehicle.registration}: ${error.message}`, true);
    stats.errors++;
    return 'ERROR';
  } finally {
    stats.totalProcessed++;
  }
}

/**
 * Process vehicles in parallel with controlled concurrency
 */
async function processBatch(vehicles) {
  // Create chunks of vehicles to process concurrently
  const chunks = [];
  for (let i = 0; i < vehicles.length; i += CONFIG.concurrentRequests) {
    chunks.push(vehicles.slice(i, i + CONFIG.concurrentRequests));
  }
  
  for (const chunk of chunks) {
    // Process each chunk concurrently
    await Promise.all(chunk.map(vehicle => processVehicle(vehicle)));
    
    // Add delay between chunks to respect rate limits
    if (chunk.length === CONFIG.concurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
    }
  }
}

/**
 * Get total count of vehicles that need MOT expiry date updates
 */
async function getTotalVehiclesCount() {
  try {
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
  } catch (error) {
    log(`Error getting total count: ${error.message}`, true);
    return 0;
  }
}

/**
 * Fetch a batch of vehicles to update MOT expiry dates
 */
async function fetchVehicleBatch(limit, offset = 0) {
  try {
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
  } catch (error) {
    log(`Error fetching vehicles: ${error.message}`, true);
    return [];
  }
}

/**
 * Print statistics
 */
function printStats(totalToProcess) {
  const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
  const processed = stats.totalProcessed;
  const remaining = totalToProcess - processed;
  const rate = processed > 0 ? (processed / elapsed).toFixed(2) : 0;
  const eta = rate > 0 ? Math.ceil(remaining / rate) : '?';
  const progress = ((processed / totalToProcess) * 100).toFixed(2);

  log(`\n=== Progress Update ===`);
  log(`Processed: ${processed}/${totalToProcess} (${progress}%)`);
  log(`Fixed Registrations: ${stats.fixedRegistrations}`);
  log(`Fixed MOT Expiry Dates: ${stats.fixedExpiries}`);
  log(`Errors: ${stats.errors}`);
  log(`Rate: ${rate} vehicles/second | ETA: ${eta}s | Elapsed: ${elapsed}s`);
  log(`========================\n`);
}

/**
 * Main function
 */
async function main() {
  log('🔧 Starting MOT Expiry Date Fix 🔧\n');
  
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
    
    // Step 1: Fix quoted registrations
    const fixedCount = await fixQuotedRegistrations();
    stats.fixedRegistrations = fixedCount;
    log(`Fixed ${fixedCount} quoted registrations`);
    
    // Step 2: Get total count of vehicles that need MOT expiry date updates
    const totalToProcess = await getTotalVehiclesCount();
    
    if (totalToProcess === 0) {
      log('✅ No vehicles need MOT expiry date updates.');
      return;
    }
    
    log(`🔍 Found ${totalToProcess} vehicles that need MOT expiry date updates\n`);
    
    // Step 3: Process vehicles in batches
    let offset = 0;
    let batchCount = 0;
    let hasMoreVehicles = true;
    
    while (hasMoreVehicles) {
      const vehicles = await fetchVehicleBatch(CONFIG.batchSize, offset);
      
      if (vehicles.length === 0) {
        log('\n✅ No more vehicles to process');
        hasMoreVehicles = false;
        break;
      }
      
      batchCount++;
      log(`\nProcessing batch #${batchCount} (${vehicles.length} vehicles)...`);
      
      await processBatch(vehicles);
      printStats(totalToProcess);
      
      offset += vehicles.length;
      
      // Add delay between batches
      if (hasMoreVehicles) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.batchDelay));
      }
      
      // Check if we've processed all vehicles
      if (offset >= totalToProcess) {
        hasMoreVehicles = false;
      }
    }
    
    log('\n✅ MOT expiry date fix completed!');
    log(`\n📊 Final Stats:`);
    log(`- Total Processed: ${stats.totalProcessed}`);
    log(`- Fixed Registrations: ${stats.fixedRegistrations}`);
    log(`- Fixed MOT Expiry Dates: ${stats.fixedExpiries}`);
    log(`- Errors: ${stats.errors}`);
    log(`- Time Elapsed: ${Math.floor((Date.now() - stats.startTime) / 1000)} seconds`);
    
  } catch (error) {
    log(`\n❌ Error during MOT expiry date fix: ${error.message}`, true);
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
