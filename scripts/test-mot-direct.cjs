// Self-contained MOT API test script
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+?)[=:](.*)/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/(^['"]|['"]$)/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file, using system environment variables');
  }
}

// Load environment variables
loadEnv();

// Configuration
const CONFIG = {
  testRegistration: 'AB12CDE', // Test registration number
  authUrl: 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/token',
  motUrl: 'https://history.mot.api.gov.uk/v1/trade/vehicles/registration',
  // These should be set in your environment variables
  DVSA_API_KEY: process.env.DVSA_API_KEY,
  DVSA_CLIENT_SECRET: process.env.DVSA_CLIENT_SECRET,
  DVSA_CLIENT_ID: process.env.DVSA_CLIENT_ID,
  DVSA_TENANT_ID: process.env.DVSA_TENANT_ID
};

// Helper function to make HTTP requests
async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData ? JSON.parse(responseData) : null
          };
          
          if (res.statusCode >= 400) {
            const error = new Error(`Request failed with status ${res.statusCode}`);
            error.response = result;
            reject(error);
          } else {
            resolve(result);
          }
        } catch (error) {
          error.response = { data: responseData };
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Get DVSA access token using OAuth 2.0 client credentials flow
async function getDVSAAccessToken() {
  try {
    console.log('🔑 Requesting DVSA access token...');
    
    const tokenUrl = `https://login.microsoftonline.com/${process.env.DVSA_TENANT_ID}/oauth2/v2.0/token`;
    
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', process.env.DVSA_CLIENT_ID);
    tokenParams.append('client_secret', process.env.DVSA_CLIENT_SECRET);
    tokenParams.append('scope', 'https://tapi.dvsa.gov.uk/.default');
    tokenParams.append('grant_type', 'client_credentials');
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get OAuth token: ${tokenResponse.status} ${tokenResponse.statusText}\n${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received in the response');
    }
    
    console.log('✅ Successfully obtained access token');
    return tokenData.access_token;
    
  } catch (error) {
    console.error('❌ Failed to get access token:', error.message);
    throw error;
  }
}

// Check MOT status for a registration
async function checkMOTStatus(registration) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '');
  console.log(`\n🚗 Checking MOT for: ${cleanReg}`);
  
  try {
    const token = await getDVSAAccessToken();
    
    const url = new URL(`${CONFIG.motUrl}/${cleanReg}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'MOT-Direct-Test/1.0',
        'Content-Type': 'application/json'
      }
    };
    
    console.log(`🌐 Sending request to: ${url}`);
    const response = await makeRequest(options);
    
    console.log('✅ MOT check successful');
    return {
      success: true,
      data: response.data
    };
    
  } catch (error) {
    console.error(`❌ MOT check failed for ${cleanReg}:`, error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return {
      success: false,
      error: error.message,
      response: error.response
    };
  }
}

// Main function
async function main() {
  console.log('🚗 MOT API Direct Test 🚗\n');
  
  // Check required environment variables
  const requiredVars = {
    'DVSA_API_KEY': 'DVSA API Key',
    'DVSA_CLIENT_ID': 'DVSA Client ID',
    'DVSA_CLIENT_SECRET': 'DVSA Client Secret',
    'DVSA_TENANT_ID': 'DVSA Tenant ID'
  };
  
  const missingVars = Object.entries(requiredVars)
    .filter(([varName]) => !process.env[varName])
    .map(([varName, description]) => ({ varName, description }));
  
  if (missingVars.length > 0) {
    console.error('❌ Error: The following required environment variables are not set:');
    missingVars.forEach(({ varName, description }) => {
      console.error(`- ${varName}: ${description}`);
      console.error(`  Current value: ${process.env[varName] ? '***' : 'Not set'}`);
    });
    
    console.log('\nPlease ensure these variables are set in your .env.local file.');
    console.log('The file should be in the root of your project and contain:');
    missingVars.forEach(({ varName }) => {
      console.log(`${varName}=your_${varName.toLowerCase()}`);
    });
    
    process.exit(1);
  }
  
  try {
    // Test with the configured registration
    const result = await checkMOTStatus(CONFIG.testRegistration);
    
    if (result.success) {
      console.log('\n📋 Vehicle Details:');
      console.log(`Registration: ${result.data.registration}`);
      console.log(`Make: ${result.data.make}`);
      console.log(`Model: ${result.data.model}`);
      
      if (result.data.motTests && result.data.motTests.length > 0) {
        const latestTest = result.data.motTests[0];
        console.log('\n🔍 Latest MOT Test:');
        console.log(`- Date: ${latestTest.completedDate}`);
        console.log(`- Result: ${latestTest.testResult}`);
        console.log(`- Expiry: ${latestTest.expiryDate || 'N/A'}`);
        console.log(`- Odometer: ${latestTest.odometerValue} ${latestTest.odometerUnit}`);
      }
      
      console.log('\n🎉 Test completed successfully!');
    } else {
      console.error('\n❌ Test failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
main();
