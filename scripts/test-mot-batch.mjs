// Test script to verify MOT batch processing functionality
import { bulkCheckMOTStatus } from '../lib/mot-api.js';
import { VehicleService } from '../lib/database/vehicle-service.js';

async function testMOTBatch() {
  try {
    console.log('🚗 Starting MOT Batch Test 🚗\n');
    
    // 1. Test API connectivity with a single known registration
    console.log('🔍 Testing API connectivity with a single vehicle...');
    const testRegistrations = ['AB12CDE']; // Add a known registration here
    
    const testResults = await bulkCheckMOTStatus(testRegistrations, {
      concurrency: 1,
      batchSize: 1,
      onProgress: (processed, total, current) => {
        console.log(`  Processed ${processed}/${total}: ${current}`);
      }
    });
    
    console.log('\n📋 Single Vehicle Test Results:');
    console.log(JSON.stringify(testResults, null, 2));
    
    if (testResults.some(r => r.error)) {
      console.error('❌ API connectivity test failed');
      console.error('Errors:', testResults.filter(r => r.error).map(r => r.error));
      return;
    }
    
    // 2. Test with a small batch from the database
    console.log('\n🔍 Testing with a small batch from the database...');
    const sampleSize = 5;
    const sampleVehicles = await VehicleService.getSampleVehicles(sampleSize);
    
    if (sampleVehicles.length === 0) {
      console.error('❌ No vehicles found in the database');
      return;
    }
    
    console.log(`\n🔧 Testing with ${sampleVehicles.length} sample vehicles:`);
    console.log(sampleVehicles.map(v => v.registration).join(', '));
    
    const batchResults = await bulkCheckMOTStatus(
      sampleVehicles.map(v => v.registration),
      {
        concurrency: 2,
        batchSize: 3,
        onProgress: (processed, total, current) => {
          console.log(`  Processed ${processed}/${total}: ${current}`);
        }
      }
    );
    
    const successCount = batchResults.filter(r => !r.error).length;
    const errorCount = batchResults.filter(r => r.error).length;
    
    console.log('\n📊 Batch Test Results:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\nError Details:');
      batchResults
        .filter(r => r.error)
        .forEach(r => console.log(`- ${r.registration}: ${r.error}`));
    }
    
    // 3. Check database update
    console.log('\n🔍 Verifying database updates...');
    const updatedVehicles = await Promise.all(
      sampleVehicles.map(v => VehicleService.getVehicleByRegistration(v.registration))
    );
    
    const updatedCount = updatedVehicles.filter(v => v && v.mot_status).length;
    console.log(`✅ Updated MOT status for ${updatedCount}/${sampleVehicles.length} vehicles`);
    
    console.log('\n🎉 MOT Batch Test Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
testMOTBatch().catch(console.error);
