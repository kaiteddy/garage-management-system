// Test script to verify DVSA MOT API connectivity
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Test registration number (using a common UK registration)
const TEST_REGISTRATION = 'AB12CDE';

/**
 * Get OAuth access token for DVSA API
 */
async function getDVSAAccessToken() {
  console.log('🔑 Requesting access token...');
  
  const tokenUrl = `https://login.microsoftonline.com/${process.env.DVSA_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', process.env.DVSA_CLIENT_ID);
  params.append('client_secret', process.env.DVSA_CLIENT_SECRET);
  params.append('scope', 'https://tapi.dvsa.gov.uk/.default');
  params.append('grant_type', 'client_credentials');
  
  return new Promise((resolve, reject) => {
    const req = https.request(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': params.toString().length
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to get token: ${res.statusCode} - ${data}`));
        }
        
        try {
          const json = JSON.parse(data);
          console.log('✅ Successfully obtained access token');
          resolve(json.access_token);
        } catch (e) {
          reject(new Error('Failed to parse token response'));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(params.toString());
    req.end();
  });
}

/**
 * Test MOT API with a sample registration
 */
async function testMOTAPI() {
  try {
    // Check required environment variables
    const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'DVSA_TENANT_ID'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Error: The following required environment variables are not set:');
      missingVars.forEach(varName => console.error(`- ${varName}`));
      process.exit(1);
    }
    
    console.log('🔍 Testing DVSA MOT API connection...');
    
    // Get access token
    const token = await getDVSAAccessToken();
    
    // Test MOT API
    console.log(`\n🚗 Testing MOT check for registration: ${TEST_REGISTRATION}`);
    
    const apiUrl = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${TEST_REGISTRATION}`;
    
    console.log('\n📡 Sending request to DVSA MOT API...');
    console.log(`URL: ${apiUrl}`);
    console.log('Headers:', {
      'x-api-key': '****************', // Masking the key in logs
      'Authorization': 'Bearer [TOKEN]'
    });
    
    const response = await new Promise((resolve, reject) => {
      const req = https.get(apiUrl, {
        headers: {
          'x-api-key': process.env.DVSA_API_KEY,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'MOT-API-Test/1.0'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve({ rawResponse: data });
            }
          } else {
            reject(new Error(`API responded with status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
    
    console.log('\n✅ API Connection Successful!');
    console.log('\n📋 Response Summary:');
    console.log('==================');
    
    if (response.registration) {
      console.log(`Registration: ${response.registration}`);
      console.log(`Make: ${response.make || 'N/A'}`);
      console.log(`Model: ${response.model || 'N/A'}`);
      console.log(`First Used Date: ${response.firstUsedDate || 'N/A'}`);
      
      if (response.motTests && response.motTests.length > 0) {
        const latestTest = response.motTests[0];
        console.log('\n🔍 Latest MOT Test:');
        console.log(`- Completed: ${latestTest.completedDate || 'N/A'}`);
        console.log(`- Result: ${latestTest.testResult || 'N/A'}`);
        console.log(`- Expiry: ${latestTest.expiryDate || 'N/A'}`);
        console.log(`- Odometer: ${latestTest.odometerValue || 'N/A'} ${latestTest.odometerUnit || ''}`);
      } else {
        console.log('\nℹ️ No MOT tests found for this vehicle');
      }
    } else {
      console.log('Unexpected response format:');
      console.log(JSON.stringify(response, null, 2));
    }
    
    console.log('\n✅ API test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ API Test Failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the test
testMOTAPI().catch(console.error);
