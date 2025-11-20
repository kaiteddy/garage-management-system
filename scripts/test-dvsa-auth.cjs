// Test script for DVSA MOT History API authentication
const fetch = require('node-fetch');
const path = require('path');
const { URLSearchParams } = require('url');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testAuth() {
  console.log('🔍 Testing DVSA API authentication...');
  
  // Check required environment variables
  const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'DVSA_TENANT_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    return;
  }
  
  console.log('✅ Environment variables found');
  
  // Step 1: Get access token
  console.log('\n🔑 Getting access token...');
  const tokenUrl = `https://login.microsoftonline.com/${process.env.DVSA_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', process.env.DVSA_CLIENT_ID);
  params.append('client_secret', process.env.DVSA_CLIENT_SECRET);
  params.append('scope', 'https://tapi.dvsa.gov.uk/.default');
  params.append('grant_type', 'client_credentials');
  
  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}\n${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Successfully obtained access token');
    console.log(`   Token expires in: ${Math.floor(tokenData.expires_in / 60)} minutes`);
    
    // Step 2: Test MOT history API with the token
    console.log('\n🚗 Testing MOT history API...');
    const testRegistration = 'AA19AAA'; // Example registration (change if needed)
    const apiUrl = `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${encodeURIComponent(testRegistration)}`;
    
    console.log('\nSending request to:', apiUrl);
    console.log('Headers:', {
      'x-api-key': `${process.env.DVSA_API_KEY.substring(0, 5)}...`,
      'Authorization': 'Bearer [token]',
      'Accept': 'application/json+v6'
    });
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${tokenData.access_token}`,
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
      console.log('✅ Successfully retrieved MOT data');
      console.log('Response:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('❌ Failed to retrieve MOT data');
      console.error('Response:', JSON.stringify(responseData, null, 2));
      
      if (apiResponse.status === 403) {
        console.error('\n🔒 403 Forbidden - This usually means:');
        console.error('1. The API key is invalid or has expired');
        console.error('2. The API key does not have permission to access this endpoint');
        console.error('3. The API key is not properly activated in the DVSA developer portal');
      } else if (apiResponse.status === 401) {
        console.error('\n🔒 401 Unauthorized - This usually means:');
        console.error('1. The access token is invalid or has expired');
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

testAuth().catch(console.error);
