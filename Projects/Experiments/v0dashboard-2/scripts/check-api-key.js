// Script to check API key format and test connectivity
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const API_KEY = process.env.MOT_HISTORY_API_KEY;
const REGISTRATION = 'LN64XFG';

console.log('🔍 API Key Details:');
console.log(`- Length: ${API_KEY.length} characters`);
console.log(`- Starts with: ${API_KEY.substring(0, 5)}...`);
console.log(`- Ends with: ...${API_KEY.substring(API_KEY.length - 5)}`);

// Test with different endpoints
const endpoints = [
  'https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests',
  'https://beta.check-mot.service.gov.uk/trade/vehicles/mot-history',
  'https://beta.check-mot.service.gov.uk/v1/vehicles/mot-tests',
  'https://beta.check-mot.service.gov.uk/v1/trade/vehicles/mot-tests'
];

async function testEndpoint(endpoint) {
  const url = new URL(endpoint);
  url.searchParams.append('registration', REGISTRATION);
  
  console.log(`\n🔗 Testing endpoint: ${url.toString()}`);
  
  return new Promise((resolve) => {
    const req = https.request({
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
          console.log('Response:', JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
          console.log('Response:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
      resolve();
    });
    
    req.on('timeout', () => {
      console.error('Request timed out');
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

async function runTests() {
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
}

runTests().catch(console.error);
