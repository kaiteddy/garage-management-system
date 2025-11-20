// Simple test script to verify MOT History API access
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function getOAuthToken() {
  console.log('🔑 Getting OAuth token...');
  
  const tokenUrl = process.env.TAPI_TOKEN_URL;
  const clientId = process.env.TAPI_CLIENT_ID;
  const clientSecret = process.env.TAPI_CLIENT_SECRET;
  const scope = process.env.TAPI_SCOPE;
  
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', scope);
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get token: ${response.status} ${response.statusText} - ${error}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('❌ Error getting OAuth token:', error.message);
    throw error;
  }
}

async function testMotApi() {
  const registration = 'LN64XFG'; // Test registration we know works
  const apiUrl = `${process.env.MOT_HISTORY_BASE_URL}/registration/${registration}`;
  
  console.log('🔍 Testing MOT History API Access');
  console.log('================================');
  console.log(`🔗 Endpoint: ${apiUrl}`);
  console.log(`🔑 API Key: ${process.env.MOT_HISTORY_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`🔑 OAuth Client ID: ${process.env.TAPI_CLIENT_ID ? '✅ Present' : '❌ Missing'}`);
  
  if (!process.env.MOT_HISTORY_API_KEY || !process.env.TAPI_CLIENT_ID || !process.env.TAPI_CLIENT_SECRET) {
    console.error('❌ Error: Required credentials are missing');
    process.exit(1);
  }
  
  // Get OAuth token
  const accessToken = await getOAuthToken();
  console.log('✅ Successfully obtained OAuth token');
  
  try {
    console.log('\n🚀 Sending request...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.MOT_HISTORY_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`\n📡 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed with response:');
      console.error(errorText);
      
      // Check for common issues
      if (response.status === 403) {
        console.error('\n🔒 Possible issues:');
        console.error('- Invalid or expired API key');
        console.error('- IP not whitelisted (if required)');
        console.error('- Incorrect API endpoint');
      } else if (response.status === 404) {
        console.error('\n🔍 Endpoint not found. Please verify:');
        console.error(`- Is ${process.env.MOT_HISTORY_BASE_URL} the correct base URL?`);
        console.error('- Is the registration number correct?');
      }
      
      process.exit(1);
    }
    
    const data = await response.json();
    console.log('\n✅ Success! MOT Data Received:');
    console.log('================================');
    console.log(`🚗 Registration: ${data.registration}`);
    console.log(`🏭 Make: ${data.make}`);
    console.log(`📅 First Used: ${data.firstUsedDate}`);
    
    if (data.motTests && data.motTests.length > 0) {
      const latestTest = data.motTests[0];
      console.log('\n🔍 Latest MOT Test:');
      console.log(`   📅 Date: ${latestTest.completedDate}`);
      console.log(`   ✅ Result: ${latestTest.testResult}`);
      console.log(`   🏁 Expiry: ${latestTest.expiryDate}`);
      console.log(`   🛣️  Mileage: ${latestTest.odometerValue} ${latestTest.odometerUnit}`);
    } else {
      console.log('\nℹ️  No MOT test history found');
    }
    
    console.log('\n✨ API Test Completed Successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔍 DNS Lookup Failed. Possible issues:');
      console.error(`- Cannot resolve ${new URL(process.env.MOT_HISTORY_BASE_URL).hostname}`);
      console.error('- Check your internet connection');
      console.error('- Verify the API endpoint URL is correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔌 Connection Refused. Possible issues:');
      console.error('- The API server might be down');
      console.error('- Firewall or network restrictions might be blocking the connection');
    }
    
    process.exit(1);
  }
}

// Run the test
testMotApi();
