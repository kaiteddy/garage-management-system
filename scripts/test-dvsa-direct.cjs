// Direct test for DVSA MOT History API
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testDVSADirect() {
  console.log('🔍 Testing DVSA MOT History API (Direct)...');
  
  // Using the API key from environment variables
  const apiKey = process.env.MOT_HISTORY_API_KEY;
  const registration = 'LN64XFG';
  const url = `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${encodeURIComponent(registration)}`;
  
  console.log('\nSending request to:', url);
  console.log('Using API Key:', `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      },
      timeout: 10000
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

testDVSADirect().catch(console.error);
