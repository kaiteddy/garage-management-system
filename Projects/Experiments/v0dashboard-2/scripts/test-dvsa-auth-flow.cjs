// Test script for DVSA API authentication flow
const fetch = require('node-fetch');
const path = require('path');
const { URLSearchParams } = require('url');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testDVSAAuthFlow() {
  console.log('🔍 Testing DVSA API Authentication Flow...');
  
  // Check required environment variables
  const requiredVars = [
    'DVSA_USERNAME',
    'DVSA_PASSWORD',
    'DVSA_API_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    console.error('\nPlease add these to your .env.local file');
    return;
  }
  
  console.log('✅ Environment variables found');
  
  // Step 1: Get JWT Token
  console.log('\n🔑 Step 1: Getting JWT Token...');
  const authUrl = 'https://driver-vehicle-licensing.api.gov.uk/thirdparty-access/v1/authenticate';
  
  try {
    // Get JWT Token
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: process.env.DVSA_USERNAME,
        password: process.env.DVSA_PASSWORD
      })
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText}\n${error}`);
    }
    
    const authData = await authResponse.json();
    const jwtToken = authData.token;
    
    if (!jwtToken) {
      throw new Error('No token received in authentication response');
    }
    
    console.log('✅ Successfully obtained JWT token');
    console.log(`   Token expires in: ${Math.floor(authData.expiresIn / 60)} minutes`);
    
    // Step 2: Test MOT History API with JWT and API Key
    console.log('\n🚗 Step 2: Testing MOT History API...');
    const testRegistration = 'LN64XFG';
    const apiUrl = `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${encodeURIComponent(testRegistration)}`;
    
    console.log('\nSending request to:', apiUrl);
    console.log('Headers:', {
      'Authorization': `Bearer ${jwtToken}`,
      'x-api-key': `${process.env.DVSA_API_KEY.substring(0, 5)}...`,
      'Accept': 'application/json+v6'
    });
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'x-api-key': process.env.DVSA_API_KEY,
        'Accept': 'application/json+v6',
      },
      timeout: 10000
    });
    
    const responseHeaders = {};
    apiResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('\nResponse Status:', apiResponse.status, apiResponse.statusText);
    console.log('Response Headers:', JSON.stringify(responseHeaders, null, 2));
    
    const responseText = await apiResponse.text();
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { rawResponse: responseText };
    }
    
    if (apiResponse.ok) {
      console.log('✅ Successfully retrieved vehicle data');
      console.log('Response:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('❌ Failed to retrieve vehicle data');
      console.error('Response:', JSON.stringify(responseData, null, 2));
      
      if (apiResponse.status === 403) {
        console.error('\n🔒 403 Forbidden - This usually means:');
        console.error('1. The JWT token or API key is invalid');
        console.error('2. The credentials do not have permission to access this endpoint');
      } else if (apiResponse.status === 401) {
        console.error('\n🔒 401 Unauthorized - This usually means:');
        console.error('1. The JWT token is invalid or has expired');
        console.error('2. The token was not properly included in the request');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during authentication test:');
    console.error(error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.type === 'system' && error.errno) {
      console.error('System error:', error.errno);
    }
  }
}

testDVSAAuthFlow().catch(console.error);
