// Simple MOT test script with all required functionality
import { sql } from '../lib/database/neon-client.js';
import { getDVSAAccessToken } from '../lib/dvsa-auth.js';

// Configuration
const CONFIG = {
  batchSize: 5,          // Number of vehicles to test with
  concurrency: 2,        // Number of concurrent requests
  testRegistration: 'AB12CDE' // Test registration number
};

// Interface for vehicle data
class VehicleService {
  static async getSampleVehicles(limit = 5) {
    try {
      const result = await sql`
        SELECT * FROM vehicles 
        WHERE registration IS NOT NULL 
        AND registration != ''
        ORDER BY RANDOM() 
        LIMIT ${limit}
      `;
      return result;
    } catch (error) {
      console.error('Error fetching sample vehicles:', error);
      throw error;
    }
  }

  static async getVehicleByRegistration(registration) {
    try {
      const cleanReg = registration.toUpperCase().replace(/\s/g, '');
      const result = await sql`
        SELECT * FROM vehicles WHERE registration = ${cleanReg}
      `;
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching vehicle by registration:', error);
      throw error;
    }
  }
}

// MOT check function
async function checkMOTStatus(registration) {
  try {
    const cleanReg = registration.toUpperCase().replace(/\s/g, '');
    console.log(`🔍 Checking MOT for: ${cleanReg}`);
    
    const token = await getDVSAAccessToken();
    const dvsaApiKey = process.env.DVSA_API_KEY;
    
    if (!dvsaApiKey) {
      throw new Error('DVSA_API_KEY environment variable is not set');
    }

    const response = await fetch(
      `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': dvsaApiKey,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'MOT-Test-Script/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { 
          registration: cleanReg,
          success: false,
          status: 'not_found',
          error: 'Vehicle not found in DVSA database'
        };
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      registration: cleanReg,
      success: true,
      status: 'success',
      data: data
    };
  } catch (error) {
    console.error(`Error checking MOT for ${registration}:`, error.message);
    return {
      registration: registration,
      success: false,
      status: 'error',
      error: error.message
    };
  }
}

// Process a batch of vehicles
async function processBatch(vehicles, concurrency = 2) {
  console.log(`\n🚀 Processing ${vehicles.length} vehicles with concurrency ${concurrency}...`);
  
  const results = [];
  const queue = [...vehicles];
  
  const workers = Array(concurrency).fill().map(async () => {
    while (queue.length > 0) {
      const vehicle = queue.shift();
      if (!vehicle) continue;
      
      const result = await checkMOTStatus(vehicle.registration || vehicle);
      results.push(result);
      
      console.log(`  ${result.registration}: ${result.success ? '✅' : '❌'} ${result.status}`);
    }
  });
  
  await Promise.all(workers);
  return results;
}

// Main test function
async function runTest() {
  try {
    console.log('🚗 Starting MOT Batch Test 🚗\n');
    
    // Test with a single known registration first
    console.log('🔍 Testing with single registration...');
    const singleTest = await checkMOTStatus(CONFIG.testRegistration);
    console.log('Single test result:', JSON.stringify(singleTest, null, 2));
    
    if (!singleTest.success) {
      console.error('❌ Single vehicle test failed');
      return;
    }
    
    // Test with a batch from the database
    console.log(`\n📋 Fetching ${CONFIG.batchSize} random vehicles from database...`);
    const sampleVehicles = await VehicleService.getSampleVehicles(CONFIG.batchSize);
    
    if (sampleVehicles.length === 0) {
      console.error('❌ No vehicles found in the database');
      return;
    }
    
    console.log(`\n🔧 Testing with ${sampleVehicles.length} sample vehicles:`);
    console.log(sampleVehicles.map(v => v.registration).join(', '));
    
    // Process the batch
    const startTime = Date.now();
    const results = await processBatch(sampleVehicles, CONFIG.concurrency);
    const duration = (Date.now() - startTime) / 1000;
    
    // Print summary
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    
    if (errorCount > 0) {
      console.log('\nError Details:');
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`- ${r.registration}: ${r.error || r.status}`));
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
