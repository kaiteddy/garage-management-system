// Test script for DVSA OAuth 2.0 Client Credentials Flow
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Configuration from the credentials email
const CONFIG = {
  clientId: '2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f',
  clientSecret: 'rWe8Q~vhlVo7Z_fFuy~zBfAOY5BqCg_PviCwIa74',
  tokenUrl: 'https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token',
  scope: 'https://tapi.dvsa.gov.uk/.default',
  apiKey: '8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq',
  apiUrl: 'https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests'
};

async function getAccessToken() {
  console.log('🔑 Requesting access token...');
  
  const params = new URLSearchParams();
  params.append('client_id', CONFIG.clientId);
  params.append('client_secret', CONFIG.clientSecret);
  params.append('scope', CONFIG.scope);
  params.append('grant_type', 'client_credentials');

  try {
    const response = await fetch(CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token request failed: ${response.status} ${response.statusText}\n${error}`);
    }

    const data = await response.json();
    console.log('✅ Successfully obtained access token');
    console.log(`   Token expires in: ${Math.floor(data.expires_in / 60)} minutes`);
    return data.access_token;
  } catch (error) {
    console.error('❌ Failed to get access token:', error.message);
    throw error;
  }
}

async function testMotApi(accessToken) {
  const registration = 'LN64XFG';
  const url = `${CONFIG.apiUrl}?registration=${encodeURIComponent(registration)}`;
  
  console.log(`\n🚗 Testing MOT API with registration: ${registration}`);
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': CONFIG.apiKey,
        'Accept': 'application/json+v6'
      }
    });

    console.log('\nResponse Status:', response.status, response.statusText);
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('Response Headers:', JSON.stringify(responseHeaders, null, 2));
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { rawResponse: responseText };
    }
    
    console.log('Response Body:', JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      console.error('\n❌ API request failed');
      if (response.status === 403) {
        console.error('Possible issues:');
        console.error('1. The API key might be invalid or expired');
        console.error('2. The token might not have the required scopes');
        console.error('3. The registration might be invalid');
      }
    } else {
      console.log('\n✅ Successfully retrieved MOT data');
    }
    
  } catch (error) {
    console.error('\n❌ Error during API request:', error.message);
  }
}

async function main() {
  try {
    const accessToken = await getAccessToken();
    await testMotApi(accessToken);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

main();
