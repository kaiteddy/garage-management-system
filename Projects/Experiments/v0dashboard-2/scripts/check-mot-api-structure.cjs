// Check MOT API Structure
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.resolve(__dirname, '../logs/mot_api_structure.log');

// Log function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Get OAuth access token
async function getDVSAAccessToken() {
  try {
    const response = await fetch(process.env.TAPI_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.TAPI_CLIENT_ID,
        client_secret: process.env.TAPI_CLIENT_SECRET,
        scope: process.env.TAPI_SCOPE
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    log(`Error getting access token: ${error.message}`);
    throw error;
  }
}

// Check MOT API structure for a sample registration
async function checkMOTApiStructure(registration) {
  try {
    const accessToken = await getDVSAAccessToken();
    
    log(`Checking MOT API structure for registration: ${registration}`);
    
    const response = await fetch(`${process.env.MOT_HISTORY_BASE_URL}/registration/${encodeURIComponent(registration)}`, {
      headers: {
        'x-api-key': process.env.MOT_HISTORY_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      log(`Vehicle not found: ${registration}`);
      return;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    log(`API Response Structure for ${registration}:`);
    log(JSON.stringify(data, null, 2));
    
    // Check for MOT tests and expiry date
    if (data && data.length > 0) {
      const vehicle = data[0];
      log(`Vehicle Make: ${vehicle.make}`);
      log(`Vehicle Model: ${vehicle.model}`);
      
      if (vehicle.motTests && vehicle.motTests.length > 0) {
        const latestTest = vehicle.motTests[0];
        log(`Latest MOT Test Date: ${latestTest.completedDate}`);
        log(`MOT Expiry Date: ${latestTest.expiryDate}`);
        log(`MOT Test Result: ${latestTest.testResult}`);
      } else {
        log('No MOT tests found for this vehicle');
      }
    }
  } catch (error) {
    log(`Error: ${error.message}`);
  }
}

// Main function
async function main() {
  try {
    // Sample registrations to check
    const registrations = [
      'LN64XFG',  // Known good registration
      'WF17VNJ',  // Another registration to try
      'FG12SYO',  // One of the vehicles from our database
      'RF17XOP'   // Another vehicle from our database
    ];
    
    for (const reg of registrations) {
      await checkMOTApiStructure(reg);
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    log('API structure check completed');
  } catch (error) {
    log(`Error in main function: ${error.message}`);
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
});
