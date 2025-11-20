// Quick check with a small batch
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Configuration
const CONFIG = {
  batchSize: 20,          // Larger sample size for better testing
  concurrency: 2,         // Reduced concurrency
  maxRetries: 2,
  retryDelay: 500,
  minDaysBetweenChecks: 7,
};

// Statistics
let stats = {
  totalProcessed: 0,
  success: 0,
  failed: 0,
  startTime: Date.now(),
};

// Get OAuth token
let accessToken = null;
let tokenExpiry = 0;

async function getDVSAAccessToken() {
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

// Check MOT status for a single vehicle
async function checkMOTStatus(registration) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '');
  
  try {
    const token = await getDVSAAccessToken();
    const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`;
    
    console.log(`🔍 Checking ${cleanReg}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { 
          registration: cleanReg,
          status: 'NOT_FOUND',
          success: true,
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const latestTest = data.motTests?.[0];
    
    return {
      registration: cleanReg,
      status: latestTest ? latestTest.testResult : 'NO_TESTS',
      expiryDate: latestTest?.expiryDate,
      mileage: latestTest?.odometerValue,
      testDate: latestTest?.completedDate,
      success: true,
      rawData: data
    };
    
  } catch (error) {
    console.error(`❌ Error checking ${cleanReg}:`, error.message);
    return {
      registration: cleanReg,
      status: 'ERROR',
      error: error.message,
      success: false
    };
  }
}

// Update vehicle in database
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
      JSON.stringify(rawData || {}),
      registration
    ]);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${registration}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚗 Starting Quick MOT Check (5 vehicles)');
  
  try {
    // Get vehicles that need checking
    const query = `
      SELECT registration 
      FROM vehicles
      WHERE 
        registration IS NOT NULL 
        AND registration != ''
        AND (
          mot_last_checked IS NULL 
          OR mot_last_checked < NOW() - INTERVAL '${CONFIG.minDaysBetweenChecks} days'
        )
      LIMIT ${CONFIG.batchSize}
    `;
    
    console.log('\n🔍 Fetching vehicles to check...');
    const result = await pool.query(query);
    const vehicles = result.rows;
    
    if (vehicles.length === 0) {
      console.log('✅ No vehicles need checking at this time');
      return;
    }
    
    console.log(`\n🔧 Processing ${vehicles.length} vehicles...`);
    
    // Process vehicles with limited concurrency
    const processWithConcurrency = async (items, concurrency) => {
      const queue = [...items];
      const results = [];
      
      const worker = async () => {
        while (queue.length > 0) {
          const vehicle = queue.shift();
          if (!vehicle) continue;
          
          try {
            const result = await checkMOTStatus(vehicle.registration);
            
            if (result.success) {
              await updateVehicleMOT(vehicle.registration, result);
              console.log(`✅ ${vehicle.registration}: ${result.status}`);
              stats.success++;
            } else {
              console.log(`❌ ${vehicle.registration}: ${result.error || 'Error'}`);
              stats.failed++;
            }
            
            stats.totalProcessed++;
            results.push(result);
            
          } catch (error) {
            console.error(`❌ Error processing ${vehicle.registration}:`, error.message);
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
    
    // Print summary
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    console.log('\n📊 Quick Check Summary:');
    console.log('==================');
    console.log(`Total processed: ${stats.totalProcessed}`);
    console.log(`✅ Success: ${stats.success}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`⏱️  Time: ${elapsed} seconds`);
    console.log('==================');
    
  } catch (error) {
    console.error('\n❌ Quick check failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the quick check
main().catch(console.error);
