import { runBulkMOTCheck } from './bulk-mot-check.js';

async function testBulkMOTCheck() {
  try {
    console.log('Starting bulk MOT check...');
    await runBulkMOTCheck();
    console.log('\n--- Test Complete ---');
  } catch (error) {
    console.error('Error running bulk MOT check test:', error);
    process.exit(1);
  }
}

// Run the test
testBulkMOTCheck();
