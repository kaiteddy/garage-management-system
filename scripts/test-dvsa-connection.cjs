// Simple script to test DVSA API connectivity
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testConnection() {
  console.log('🔍 Testing DVSA API connectivity...');
  
  // Check required environment variables
  const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'DVSA_TENANT_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    return;
  }
  
  console.log('✅ Environment variables found');
  
  // Check API key format
  const apiKey = process.env.DVSA_API_KEY;
  console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : 'Not found');
  if (!apiKey || apiKey.length < 20) {
    console.error('❌ API key appears to be invalid (too short)');
    return;
  }
  
  // Test token endpoint
  try {
    console.log('\n🔑 Testing token endpoint...');
    const tokenUrl = `https://login.microsoftonline.com/${process.env.DVSA_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', process.env.DVSA_CLIENT_ID);
    params.append('client_secret', process.env.DVSA_CLIENT_SECRET);
    params.append('scope', 'https://tapi.dvsa.gov.uk/.default');
    params.append('grant_type', 'client_credentials');
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Successfully obtained access token');
    console.log(`   Token expires in: ${Math.floor(tokenData.expires_in / 60)} minutes`);
    
    // Test API endpoint with a known registration
    console.log('\n🚗 Testing MOT history API...');
    const testRegistration = 'AA19AAA'; // Example registration (change if needed)
    const baseUrl = process.env.DVSA_API_BASE_URL || 'https://beta.check-mot.service.gov.uk';
    const endpoint = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const apiUrl = `${endpoint}/mot-tests?registration=${encodeURIComponent(testRegistration)}`;
    
    console.log('\nSending request to:', apiUrl);
    console.log('Headers:', {
      'x-api-key': `${process.env.DVSA_API_KEY.substring(0, 5)}...`,
      'Accept': 'application/json+v6'
    });
    
    // Get a fresh access token for the API request
    const tokenReqResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!tokenReqResponse.ok) {
      throw new Error(`Token request failed: ${tokenReqResponse.status} ${tokenReqResponse.statusText}`);
    }
    
    const tokenResponseData = await tokenReqResponse.json();
    
    // Make the API request with both API key and access token
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${tokenResponseData.access_token}`,
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
        console.error('\nPlease check your DVSA developer account to ensure:');
        console.error('- Your API key is active');
        console.error('- You have the correct permissions for the MOT history API');
        console.error('- Your subscription is active and not expired');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.type === 'system' && error.errno) {
      console.error('System error:', error.errno);
    }
    
    // Test basic internet connectivity
    try {
      console.log('\n🌐 Testing general internet connectivity...');
      await fetch('https://www.google.com', { method: 'HEAD' });
      console.log('✅ Internet connection is working');
    } catch (e) {
      console.error('❌ No internet connection or DNS issues detected');
    }
  }
}

testConnection().catch(console.error);
