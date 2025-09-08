// Simple test for MOT History API with just API key
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const API_KEY = '8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq';
const REGISTRATION = 'LN64XFG';

const options = {
  hostname: 'beta.check-mot.service.gov.uk',
  path: `/trade/vehicles/mot-tests?registration=${encodeURIComponent(REGISTRATION)}`,
  method: 'GET',
  headers: {
    'x-api-key': API_KEY,
    'Accept': 'application/json+v6',
    'Content-Type': 'application/json'
  },
  timeout: 10000
};

console.log('🔍 Testing MOT History API');
console.log('API Key:', `${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 5)}`);
console.log('Registration:', REGISTRATION);
console.log('Endpoint:', `https://${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  console.log('\nResponse Status:', res.statusCode, res.statusMessage);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  
  res.on('end', () => {
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
    
    try {
      const json = data ? JSON.parse(data) : {};
      console.log('Response Body:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Raw Response:', data);
    }
    
    if (res.statusCode !== 200) {
      console.error('\n❌ Request failed');
      if (res.statusCode === 403) {
        console.error('Possible issues:');
        console.error('1. The API key is invalid or expired');
        console.error('2. The API key does not have permission to access this endpoint');
        console.error('3. The endpoint URL might be incorrect');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request error:', error.message);});

req.on('timeout', () => {
  console.error('\n❌ Request timed out');
  req.destroy();
});

req.end();
