#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const fs = require('fs');

// Sample registrations to check - using real UK registrations that should have MOT data
const registrations = [
  'LN64XFG', // Example from the MOT API documentation
  'MT09OBD',
  'AB12ABC',
  'YY19AAA',
  'LB07TDX'
];

// OAuth2 token management
async function getAccessToken() {
  try {
    const tokenResponse = await fetch(process.env.TAPI_TOKEN_URL, {
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

    const tokenData = await tokenResponse.json();
    console.log('Access token obtained successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

// Check MOT status for a registration
async function checkMOTStatus(registration, accessToken) {
  try {
    const url = `${process.env.MOT_HISTORY_BASE_URL}/registration/${encodeURIComponent(registration)}`;
    console.log(`Calling MOT API: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.MOT_HISTORY_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response status: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      return { status: 'SUCCESS', data };
    } else if (response.status === 404) {
      return { status: 'NOT_FOUND' };
    } else if (response.status === 400) {
      return { status: 'INVALID_FORMAT' };
    } else {
      const errorText = await response.text();
      return { status: `ERROR_${response.status}`, error: errorText };
    }
  } catch (error) {
    console.error(`Error checking MOT for ${registration}:`, error);
    return { status: 'ERROR', error: error.message };
  }
}

// Main function
async function main() {
  console.log('Testing MOT History API with sample registrations...\n');
  
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error('Failed to get access token');
    process.exit(1);
  }
  
  const results = {};
  
  for (const registration of registrations) {
    console.log(`\nChecking registration: ${registration}`);
    const result = await checkMOTStatus(registration, accessToken);
    results[registration] = result;
    
    if (result.status === 'SUCCESS' && result.data) {
      const vehicleData = result.data[0] || {};
      const motTests = vehicleData.motTests || [];
      
      console.log(`Found ${motTests.length} MOT tests`);
      
      if (motTests.length > 0) {
        // Check for expiry dates in all tests
        const testsWithExpiry = motTests.filter(test => test.expiryDate);
        console.log(`Tests with expiry date: ${testsWithExpiry.length}`);
        
        // Check for passed tests with expiry dates
        const passedTestsWithExpiry = motTests.filter(test => 
          test.testResult === 'PASSED' && test.expiryDate
        );
        console.log(`PASSED tests with expiry date: ${passedTestsWithExpiry.length}`);
        
        if (passedTestsWithExpiry.length > 0) {
          console.log('Latest PASSED test with expiry date:');
          console.log(JSON.stringify(passedTestsWithExpiry[0], null, 2));
        } else if (testsWithExpiry.length > 0) {
          console.log('Latest test with expiry date (not PASSED):');
          console.log(JSON.stringify(testsWithExpiry[0], null, 2));
        } else {
          console.log('First MOT test (no expiry date):');
          console.log(JSON.stringify(motTests[0], null, 2));
        }
      } else {
        console.log('No MOT tests found in the response');
      }
    } else {
      console.log(`Result: ${result.status}`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
    }
    
    // Add a delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save all results to a file for reference
  fs.writeFileSync('mot-api-test-results.json', JSON.stringify(results, null, 2));
  console.log('\nAll results saved to mot-api-test-results.json');
}

main().catch(console.error);
