#!/usr/bin/env node

// Ultra-Fast MOT Scanner - Optimized for maximum speed
const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// High-performance configuration
const CONFIG = {
  batchSize: 200,          // Increased from 100 to 200
  concurrency: 15,         // Increased from 5 to 15 concurrent requests
  maxRetries: 1,           // Reduced from 2 to 1 for faster failure
  retryDelay: 200,         // Reduced from 500ms to 200ms
  minDaysBetweenChecks: 7, // Keep same
  batchDelay: 100,         // Reduced from 1000ms to 100ms
  requestTimeout: 5000,    // Reduced from 10000ms to 5000ms
  tokenRefreshInterval: 60000, // Reduced from 5 minutes to 1 minute
};

// Aggressive rate limiting - more tokens, faster refresh
let tokens = 15; // Start with 15 tokens (matching concurrency)
const MAX_TOKENS = 15;
let lastTokenRefresh = Date.now();

// Database connection pool with higher limits
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 30, // Increased from 20 to 30
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 1000, // Reduced from 2000ms
});

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
 * Ultra-fast rate limiter
 */
async function waitForToken() {
  const now = Date.now();
  if (now - lastTokenRefresh > CONFIG.tokenRefreshInterval) {
    tokens = MAX_TOKENS;
    lastTokenRefresh = now;
  }

  if (tokens <= 0) {
    await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms
    return waitForToken();
  }

  tokens--;
  return Promise.resolve();
}

/**
 * Fetch vehicles that need MOT checks
 */
async function fetchVehicles(limit) {
  const query = `
    SELECT registration, make, model, mot_expiry_date, mot_last_checked
    FROM vehicles
    WHERE 
      registration IS NOT NULL 
      AND registration != ''
      AND LENGTH(registration) >= 3
      AND registration NOT LIKE '%*%'
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
 * Update vehicle MOT information
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
 * Get OAuth access token (cached)
 */
let accessToken = null;
let tokenExpiry = 0;

async function getDVSAAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 30000) { // Reduced buffer to 30 seconds
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
 * Ultra-fast MOT status check
 */
async function checkMOTStatus(registration, attempt = 1) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '');
  
  try {
    await waitForToken();
    
    const token = await getDVSAAccessToken();
    const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'Ultra-Fast-MOT-Scanner/1.0'
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
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        return checkMOTStatus(registration, attempt + 1);
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
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
    if (attempt <= CONFIG.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
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
 * Process batch with maximum concurrency
 */
async function processBatch(vehicles) {
  console.log(`\n🚀 Ultra-fast processing batch of ${vehicles.length} vehicles...`);
  
  const processWithConcurrency = async (items, concurrency) => {
    const queue = [...items];
    const results = [];
    let processed = 0;
    
    const worker = async () => {
      while (queue.length > 0) {
        const vehicle = queue.shift();
        if (!vehicle) continue;
        
        try {
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
            
            stats.success++;
          } else {
            stats.failed++;
          }
          
          processed++;
          stats.totalProcessed++;
          
          // Update progress every 25 vehicles
          if (processed % 25 === 0) {
            const speed = (stats.totalProcessed / ((Date.now() - stats.startTime) / 60000)).toFixed(1);
            const eta = ((10519 - stats.totalProcessed) / speed).toFixed(0);
            process.stdout.write(`\r🔥 ${processed}/${vehicles.length} | Total: ${stats.totalProcessed}/10519 | Speed: ${speed}/min | ETA: ${eta}min`);
          }
          
        } catch (error) {
          stats.failed++;
          processed++;
          stats.totalProcessed++;
        }
      }
    };
    
    // Start all workers
    const workers = Array(concurrency).fill().map(() => worker());
    await Promise.all(workers);
    
    return processed;
  };
  
  const processed = await processWithConcurrency(vehicles, CONFIG.concurrency);
  
  const speed = (stats.totalProcessed / ((Date.now() - stats.startTime) / 60000)).toFixed(1);
  console.log(`\n✅ Batch complete! Speed: ${speed} vehicles/minute`);
  
  return processed;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Ultra-Fast MOT Scanner Starting! 🚀\n');
  
  // Validate environment variables
  const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'DVSA_TENANT_ID', 'NEON_DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    process.exit(1);
  }
  
  try {
    stats.startTime = Date.now();
    
    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM vehicles
      WHERE 
        registration IS NOT NULL 
        AND registration != ''
        AND LENGTH(registration) >= 3
        AND registration NOT LIKE '%*%'
        AND (
          mot_last_checked IS NULL 
          OR mot_last_checked < NOW() - INTERVAL '${CONFIG.minDaysBetweenChecks} days'
        )
    `);
    
    const totalToProcess = parseInt(countResult.rows[0].total, 10);
    
    if (totalToProcess === 0) {
      console.log('✅ No vehicles need MOT checks');
      return;
    }
    
    console.log(`🔍 Found ${totalToProcess} vehicles needing MOT checks`);
    console.log(`⚡ Ultra-fast mode: ${CONFIG.concurrency} concurrent, ${CONFIG.batchSize} batch size\n`);
    
    // Process in batches
    while (stats.totalProcessed < totalToProcess) {
      const vehicles = await fetchVehicles(CONFIG.batchSize);
      
      if (vehicles.length === 0) break;
      
      await processBatch(vehicles);
      
      // Minimal delay between batches
      if (vehicles.length === CONFIG.batchSize) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.batchDelay));
      }
    }
    
  } catch (error) {
    console.error('\n❌ Ultra-fast MOT scan failed:', error.message);
    process.exit(1);
  } finally {
    stats.endTime = Date.now();
    const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
    const speed = (stats.totalProcessed / (totalTime / 60)).toFixed(1);
    
    console.log('\n🎉 Ultra-Fast MOT Scan Complete!');
    console.log('================================');
    console.log(`Total processed: ${stats.totalProcessed}`);
    console.log(`✅ Success: ${stats.success}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`⏱️  Time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(`🚀 Speed: ${speed} vehicles/minute`);
    console.log('================================');
    
    await pool.end();
  }
}

main();
