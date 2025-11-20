// Bulk MOT Check Script - Optimized for Speed
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Increase connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Configuration
const CONFIG = {
  batchSize: 100,          // Increased from 50 to 100
  concurrency: 5,          // Increased from 3 to 5 concurrent requests
  maxRetries: 2,           // Reduced from 3 to 2 to fail faster
  retryDelay: 500,         // Reduced from 1000ms to 500ms
  minDaysBetweenChecks: 7, // Minimum days between MOT checks for the same vehicle
  batchDelay: 1000,        // Reduced batch delay to 1 second
  tokenRefreshInterval: 300000, // 5 minutes in ms
};

// Rate limiting
let tokens = 5; // Start with 5 tokens (allowing 5 concurrent requests)
const MAX_TOKENS = 5;
let lastTokenRefresh = Date.now();

/**
 * Rate limiter function using token bucket algorithm
 */
async function waitForToken() {
  // Refresh tokens if needed (every 5 minutes)
  const now = Date.now();
  if (now - lastTokenRefresh > CONFIG.tokenRefreshInterval) {
    tokens = MAX_TOKENS;
    lastTokenRefresh = now;
  }

  // If no tokens available, wait a bit and try again
  if (tokens <= 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return waitForToken();
  }

  // Use a token
  tokens--;
  return Promise.resolve();
}

// Statistics
let stats = {
  totalProcessed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
  lastUpdate: Date.now(),
  processedPerMinute: 0,
};

/**
 * Fetch a batch of vehicles that need MOT checks
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
 */
let accessToken = null;
let tokenExpiry = 0;

async function getDVSAAccessToken() {
  // Return cached token if it's still valid (with 1 minute buffer)
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

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
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    throw error;
  }
}

/**
 * Check MOT status for a vehicle registration
 */
async function checkMOTStatus(registration, attempt = 1) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '');
  
  try {
    // Wait for rate limit token
    await waitForToken();
    
    const token = await getDVSAAccessToken();
    const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'Bulk-MOT-Check/1.0'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    
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
 */
async function processBatch(vehicles) {
  const batchStartTime = Date.now();
  let processedInBatch = 0;
  
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
          process.stdout.write(`\r🔍 ${processedInBatch + 1}/${vehicles.length} - Checking ${vehicle.registration}... `);
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
          
          processedInBatch++;
          stats.totalProcessed++;
          
          // Update stats every 10 vehicles
          if (stats.totalProcessed % 10 === 0) {
            updateStats();
          }
          
        } catch (error) {
          console.error(`\n❌ Error processing ${vehicle.registration}:`, error.message);
          stats.failed++;
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
  
  return processedInBatch;
}

/**
 * Print and update statistics
 */
function updateStats() {
  const now = Date.now();
  const elapsedMinutes = (now - stats.startTime) / 60000;
  const vehiclesPerMinute = stats.totalProcessed / elapsedMinutes;
  
  // Calculate ETA
  const remainingVehicles = stats.totalToProcess - stats.totalProcessed;
  const etaMinutes = remainingVehicles / vehiclesPerMinute;
  const etaTime = new Date(now + (etaMinutes * 60000)).toLocaleTimeString();
  
  console.log('\n📊 Current Status:');
  console.log('==================');
  console.log(`Processed: ${stats.totalProcessed}/${stats.totalToProcess} (${((stats.totalProcessed / stats.totalToProcess) * 100).toFixed(1)}%)`);
  console.log(`✅ Success: ${stats.success}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`🚀 Speed: ${vehiclesPerMinute.toFixed(2)} vehicles/minute`);
  console.log(`⏱️  ETA: ${etaMinutes.toFixed(0)} minutes (${etaTime})`);
  console.log('==================');
}

/**
 * Main function
 */
async function main() {
  console.log('🚗 Starting Optimized Bulk MOT Check 🚗\n');
  
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
    
    // First, get total count of vehicles to process
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
      console.log('✅ No vehicles need MOT checks at this time.');
      return;
    }
    
    console.log(`🔍 Found ${stats.totalToProcess} vehicles that need MOT checks\n`);
    
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
      
      const processedInBatch = await processBatch(vehicles);
      processedCount += processedInBatch;
      
      // Small delay between batches to avoid hitting rate limits
      if (vehicles.length === CONFIG.batchSize) {
        console.log(`\n⏳ Waiting ${CONFIG.batchDelay/1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.batchDelay));
      }
    }
    
  } catch (error) {
    console.error('\n❌ Bulk MOT check failed:', error.message);
    process.exit(1);
  } finally {
    stats.endTime = Date.now();
    console.log('\n🎉 Bulk MOT check completed!');
    printFinalStats();
    await pool.end();
  }
}

/**
 * Print final statistics
 */
function printFinalStats() {
  const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
  const totalMinutes = (stats.endTime - stats.startTime) / 60000;
  const vehiclesPerMinute = (stats.totalProcessed / totalMinutes).toFixed(2);
  
  console.log('\n📊 MOT Check Summary');
  console.log('==================');
  console.log(`Total vehicles processed: ${stats.totalProcessed}`);
  console.log(`✅ Success: ${stats.success}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⏱️  Total time: ${(totalTime / 60).toFixed(2)} minutes`);
  console.log(`🚀 Average speed: ${vehiclesPerMinute} vehicles/minute`);
  console.log('==================');
}

// Run the script
main();
