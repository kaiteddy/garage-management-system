// Simple test script to verify MOT batch processing
import { bulkCheckMOTStatus } from '../lib/mot-batch-processor.js';
import { VehicleService } from '../lib/database/vehicle-service.js';

async function testMOTBatch() {
  try {
    console.log('🚗 Starting MOT Batch Test 🚗\n');
    
    // Test with a small batch from the database
    console.log('🔍 Fetching sample vehicles from the database...');
    const sampleVehicles = await VehicleService.getSampleVehicles(3);
    
    if (sampleVehicles.length === 0) {
      console.error('❌ No vehicles found in the database');
      return;
    }
    
    console.log(`\n🔧 Testing with ${sampleVehicles.length} sample vehicles:`);
    console.log(sampleVehicles.map(v => v.registration).join(', '));
    
    console.log('\n🚀 Starting MOT checks...');
    const results = await bulkCheckMOTStatus(
      sampleVehicles.map(v => v.registration),
      {
        concurrency: 2,
        onProgress: (processed, total) => {
          console.log(`  Processed ${processed}/${total} vehicles`);
        }
      }
    );
    
    console.log('\n📊 Test Results:');
    console.log(JSON.stringify(results, null, 2));
    
    console.log('\n✅ MOT Batch Test Completed!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
testMOTBatch();
