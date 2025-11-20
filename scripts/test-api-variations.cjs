const https = require('https');

const API_KEY = '8TfF8vnU2s5sP1CRm7ij69anVlLe5SRm4cNGn9yq';
const REGISTRATION = 'LN64XFG';

const testCases = [
  {
    name: 'Basic API Key',
    hostname: 'beta.check-mot.service.gov.uk',
    path: `/trade/vehicles/mot-tests?registration=${REGISTRATION}`,
    headers: {
      'x-api-key': API_KEY,
      'Accept': 'application/json+v6'
    }
  },
  {
    name: 'With Content-Type',
    hostname: 'beta.check-mot.service.gov.uk',
    path: `/trade/vehicles/mot-tests?registration=${REGISTRATION}`,
    headers: {
      'x-api-key': API_KEY,
      'Accept': 'application/json+v6',
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Different Endpoint',
    hostname: 'beta.check-mot.service.gov.uk',
    path: '/trade/vehicles',
    headers: {
      'x-api-key': API_KEY,
      'Accept': 'application/json+v6'
    }
  },
  {
    name: 'Different Registration',
    hostname: 'beta.check-mot.service.gov.uk',
    path: '/trade/vehicles/mot-tests?registration=AA19AAA',
    headers: {
      'x-api-key': API_KEY,
      'Accept': 'application/json+v6'
    }
  }
];

function runTest(testCase) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Running test: ${testCase.name}`);
    console.log(`URL: https://${testCase.hostname}${testCase.path}`);
    
    const req = https.request({
      hostname: testCase.hostname,
      path: testCase.path,
      method: 'GET',
      headers: testCase.headers,
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        
        try {
          const json = data ? JSON.parse(data) : {};
          console.log('Response:', JSON.stringify(json, null, 2));
        } catch (e) {
          console.log('Raw Response:', data);
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

async function runAllTests() {
  for (const testCase of testCases) {
    await runTest(testCase);
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

console.log('🚀 Starting API test variations...');
runAllTests().catch(console.error);
