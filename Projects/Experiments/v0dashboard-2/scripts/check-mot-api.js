// Minimal script to test MOT API connectivity
import { getDVSAAccessToken } from '../lib/dvsa-auth.js';

// Configuration
const TEST_REGISTRATION = 'AB12CDE';

async function testMOTAPI() {
  try {
    console.log('🔍 Testing MOT API connectivity...');
    
    // 1. Test authentication
    console.log('🔑 Getting access token...');
    const token = await getDVSAAccessToken();
    
    if (!token) {
      throw new Error('Failed to get access token');
    }
    
    console.log('✅ Successfully obtained access token');
    
    // 2. Test MOT API endpoint
    console.log(`\n🚗 Checking MOT for registration: ${TEST_REGISTRATION}`);
    
    const dvsaApiKey = process.env.DVSA_API_KEY;
    if (!dvsaApiKey) {
      throw new Error('DVSA_API_KEY environment variable is not set');
    }
    
    const cleanReg = TEST_REGISTRATION.toUpperCase().replace(/\s/g, '');
    const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`;
    
    console.log(`🌐 Sending request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': dvsaApiKey,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'MOT-API-Test/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    console.log(`\n📡 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('\n✅ MOT Check Successful!');
    console.log('\n📋 Vehicle Details:');
    console.log(`Registration: ${data.registration}`);
    console.log(`Make: ${data.make}`);
    console.log(`Model: ${data.model}`);
    
    if (data.motTests && data.motTests.length > 0) {
      const latestTest = data.motTests[0];
      console.log('\n🔍 Latest MOT Test:');
      console.log(`- Date: ${latestTest.completedDate}`);
      console.log(`- Result: ${latestTest.testResult}`);
      console.log(`- Expiry: ${latestTest.expiryDate || 'N/A'}`);
      console.log(`- Odometer: ${latestTest.odometerValue} ${latestTest.odometerUnit}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    
    process.exit(1);
  }
}

// Run the test
testMOTAPI();
