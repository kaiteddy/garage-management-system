// Update MOT Expiry Dates Script
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
  logFile: path.resolve(__dirname, '../logs/mot_expiry_update.log'),
  errorLogFile: path.resolve(__dirname, '../logs/mot_expiry_errors.log'),
};

// Create logs directory if it doesn't exist
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Statistics
const stats = {
  totalProcessed: 0,
  updated: 0,
  notFound: 0,
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
    const accessToken = await getDVSAAccessToken();
    
    const response = await fetch(`${process.env.MOT_HISTORY_BASE_URL}/registration/${encodeURIComponent(registration)}`, {
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
 * Update vehicle MOT expiry date in the database
 */
async function updateVehicleMOTExpiry(registration, expiryDate, testDate) {
  const query = `
    UPDATE vehicles
    SET 
      mot_expiry_date = $1,
      mot_test_date = $2,
      updated_at = NOW()
    WHERE registration = $3
    RETURNING registration
  `;

  try {
    const result = await pool.query(query, [
      expiryDate,
      testDate,
      registration
    ]);
    
    return result.rowCount > 0;
  } catch (error) {
    log(`Error updating vehicle ${registration}: ${error.message}`, true);
    return false;
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
      
      if (motTests.length > 0) {
        // Find the latest PASSED test with an expiry date
        const latestPassedTest = motTests.find(test => 
          test.testResult === 'PASSED' && test.expiryDate
        );
        
        if (latestPassedTest && latestPassedTest.expiryDate) {
          // Format the expiry date correctly (it might be in different formats)
          let expiryDate = latestPassedTest.expiryDate;
          
          // If the date is just a string like "2026-05-27", convert it to ISO format
          if (expiryDate.length === 10) {
            expiryDate = new Date(`${expiryDate}T23:59:59.000Z`).toISOString();
          }
          
          log(`Found expiry date: ${expiryDate} for ${vehicle.registration}`);
          
          const updated = await updateVehicleMOTExpiry(
            vehicle.registration, 
            expiryDate, 
            latestPassedTest.completedDate
          );
          
          if (updated) {
            log(`Updated MOT expiry date for ${vehicle.registration}`);
            stats.updated++;
            return 'UPDATED';
          }
        } else {
          log(`No valid expiry date found for ${vehicle.registration}`);
        }
      } else {
        log(`No MOT tests found for ${vehicle.registration}`);
      }
    } 
    else if (result.status === 'NOT_FOUND') {
      log(`Vehicle not found: ${vehicle.registration}`);
      stats.notFound++;
      return 'NOT_FOUND';
    }
    else {
      log(`Error checking MOT for ${vehicle.registration}: ${result.status}`);
      stats.errors++;
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
 * Fetch vehicles that need MOT expiry date updates
 */
async function fetchVehicles(limit, offset = 0) {
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
        AND v.mot_status = 'VALID'
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
        AND mot_status = 'VALID'
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
  log(`Updated: ${stats.updated} | Not Found: ${stats.notFound} | Errors: ${stats.errors}`);
  log(`Rate: ${rate} vehicles/second | ETA: ${eta}s | Elapsed: ${elapsed}s`);
  log(`========================\n`);
}

/**
 * Main function
 */
async function main() {
  log('🔧 Starting MOT Expiry Date Update 🔧\n');
  
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
    const totalToProcess = await getTotalVehiclesCount();
    
    if (totalToProcess === 0) {
      log('✅ No vehicles need MOT expiry date updates.');
      return;
    }
    
    log(`🔍 Found ${totalToProcess} vehicles that need MOT expiry date updates\n`);
    
    // Process vehicles in batches
    let offset = 0;
    let batchCount = 0;
    let hasMoreVehicles = true;
    
    while (hasMoreVehicles) {
      const vehicles = await fetchVehicles(CONFIG.batchSize, offset);
      
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
    
    log('\n✅ MOT expiry date update completed!');
    log(`\n📊 Final Stats:`);
    log(`- Total Processed: ${stats.totalProcessed}`);
    log(`- Updated: ${stats.updated}`);
    log(`- Not Found: ${stats.notFound}`);
    log(`- Errors: ${stats.errors}`);
    log(`- Time Elapsed: ${Math.floor((Date.now() - stats.startTime) / 1000)} seconds`);
    
  } catch (error) {
    log(`\n❌ Error during MOT expiry date update: ${error.message}`, true);
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
