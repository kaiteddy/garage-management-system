// Test script for DVSA MOT History API
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testMOTHistoryAPI() {
  console.log('🔍 Testing DVSA MOT History API...');
  
  // Check required environment variables
  const requiredVars = ['MOT_HISTORY_API_KEY', 'MOT_HISTORY_BASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    return;
  }
  
  console.log('✅ Environment variables found');
  
  // Show API key info (first 10 and last 5 chars for verification)
  const apiKey = process.env.MOT_HISTORY_API_KEY;
  console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'Not found');
  console.log('🔗 Base URL:', process.env.MOT_HISTORY_BASE_URL);
  
  // Test MOT history endpoint with the provided registration
  const testRegistration = 'LN64XFG'; // Using the provided registration (spaces removed)
  // Using the direct MOT history endpoint with API key in headers
  const apiUrl = `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${encodeURIComponent(testRegistration)}`;
  
  console.log('\nSending request to:', apiUrl);
  console.log('Headers:', {
    'x-api-key': `${process.env.MOT_HISTORY_API_KEY.substring(0, 5)}...`,
    'Accept': 'application/json+v6'
  });
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'x-api-key': process.env.MOT_HISTORY_API_KEY,
        'Accept': 'application/json+v6',
      },
      timeout: 10000
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('\nResponse Status:', response.status, response.statusText);
    console.log('Response Headers:', JSON.stringify(responseHeaders, null, 2));
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { rawResponse: responseText };
    }
    
    if (response.ok) {
      console.log('✅ Successfully retrieved MOT data');
      console.log('Response:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('❌ Failed to retrieve MOT data');
      console.error('Response:', JSON.stringify(responseData, null, 2));
      
      if (response.status === 403) {
        console.error('\n🔒 403 Forbidden - This usually means:');
        console.error('1. The API key is invalid or has expired');
        console.error('2. The API key does not have permission to access this endpoint');
        console.error('3. The API key is not properly activated in the DVSA developer portal');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during API request:');
    console.error(error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.type === 'system' && error.errno) {
      console.error('System error:', error.errno);
    }
  }
}

testMOTHistoryAPI().catch(console.error);
