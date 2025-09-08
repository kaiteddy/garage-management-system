// Test script for DVSA Trade API (TAPI) authentication
const fetch = require('node-fetch');
const path = require('path');
const { URLSearchParams } = require('url');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testTAPIAuth() {
  console.log('🔍 Testing DVSA Trade API (TAPI) authentication...');
  
  // Check required environment variables
  const requiredVars = [
    'TAPI_TENANT_ID',
    'TAPI_CLIENT_ID',
    'TAPI_CLIENT_SECRET',
    'TAPI_SCOPE',
    'TAPI_TOKEN_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    return;
  }
  
  console.log('✅ Environment variables found');
  
  // Step 1: Get access token
  console.log('\n🔑 Getting access token...');
  console.log('Token URL:', process.env.TAPI_TOKEN_URL);
  
  const params = new URLSearchParams();
  params.append('client_id', process.env.TAPI_CLIENT_ID);
  params.append('client_secret', process.env.TAPI_CLIENT_SECRET);
  params.append('scope', process.env.TAPI_SCOPE);
  params.append('grant_type', 'client_credentials');
  
  try {
    // Get access token
    const tokenResponse = await fetch(process.env.TAPI_TOKEN_URL, {
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
    
    // Step 2: Test TAPI endpoint with beta URL
    console.log('\n🚗 Testing Trade API beta endpoint...');
    const apiUrl = 'https://beta.tapi.dvsa.gov.uk/v1/vehicles/mot-tests?registration=AA19AAA';
    
    console.log('\nSending request to:', apiUrl);
    console.log('Headers:', {
      'Authorization': 'Bearer [token]',
      'x-api-key': 'Not required for TAPI',
      'Accept': 'application/json+v6'
    });
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
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
      console.log('✅ Successfully retrieved vehicle data');
      console.log('Response:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('❌ Failed to retrieve vehicle data');
      console.error('Response:', JSON.stringify(responseData, null, 2));
      
      if (apiResponse.status === 403) {
        console.error('\n🔒 403 Forbidden - This usually means:');
        console.error('1. The client credentials are invalid or have expired');
        console.error('2. The client does not have permission to access this endpoint');
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

testTAPIAuth().catch(console.error);
