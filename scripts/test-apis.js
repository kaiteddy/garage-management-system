// @ts-check
const { getMOTHistory } = require('../lib/dvsa');
const { getVehicleDetails } = require('../lib/dvla');

// Test registration number (you can change this to any valid UK registration)
const TEST_REGISTRATION = 'AB12CDE';

async function testDVSA() {
  console.log('Testing DVSA API...');
  try {
    const motHistory = await getMOTHistory(TEST_REGISTRATION);
    console.log('✅ DVSA API Test - Success!');
    console.log('   Vehicle Make:', motHistory.make);
    console.log('   Vehicle Model:', motHistory.model);
    console.log('   MOT Tests:', motHistory.motTests.length);
    
    if (motHistory.motTests.length > 0) {
      const latestTest = motHistory.motTests[0];
      console.log('   Latest Test Date:', latestTest.completedDate);
      console.log('   Test Result:', latestTest.testResult);
      if (latestTest.expiryDate) {
        console.log('   MOT Expiry Date:', latestTest.expiryDate);
      }
    }
    return true;
  } catch (error) {
    console.error('❌ DVSA API Test - Failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

async function testDVLA() {
  console.log('\nTesting DVLA API...');
  try {
    const vehicleDetails = await getVehicleDetails(TEST_REGISTRATION);
    console.log('✅ DVLA API Test - Success!');
    console.log('   Make:', vehicleDetails.make);
    console.log('   Model:', vehicleDetails.model);
    console.log('   Colour:', vehicleDetails.colour);
    console.log('   Year of Manufacture:', vehicleDetails.yearOfManufacture);
    console.log('   Tax Status:', vehicleDetails.taxStatus);
    console.log('   MOT Status:', vehicleDetails.motStatus);
    if (vehicleDetails.motExpiryDate) {
      console.log('   MOT Expiry Date:', vehicleDetails.motExpiryDate);
    }
    if (vehicleDetails.taxDueDate) {
      console.log('   Tax Due Date:', vehicleDetails.taxDueDate);
    }
    return true;
  } catch (error) {
    console.error('❌ DVLA API Test - Failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

async function runTests() {
  console.log('=== Starting API Tests ===\n');
  
  // Test DVSA API
  const dvsaResult = await testDVSA();
  
  // Test DVLA API
  const dvlaResult = await testDVLA();
  
  console.log('\n=== Test Results ===');
  console.log(`DVSA API: ${dvsaResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`DVLA API:  ${dvlaResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (!dvsaResult || !dvlaResult) {
    process.exit(1); // Exit with error code if any test fails
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
