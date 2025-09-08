import axios from 'axios';
import https from 'https';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Test with the specific registration
const TEST_REGISTRATION = 'LN64XFG';

async function testDvlaApi() {
  const DVLA_API_KEY = process.env.DVLA_API_KEY;
  const DVLA_BASE_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

  if (!DVLA_API_KEY) {
    console.error('❌ DVLA_API_KEY is not set in .env.local');
    return;
  }

  console.log('🔑 DVLA API Key detected');
  console.log(`🚗 Testing registration: ${TEST_REGISTRATION}\n`);

  const dvlaApi = axios.create({
    baseURL: DVLA_BASE_URL,
    headers: {
      'x-api-key': DVLA_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false
    }),
    timeout: 15000
  });

  try {
    console.log('📡 Sending request to DVLA API...');
    const response = await dvlaApi.post('', { 
      registrationNumber: TEST_REGISTRATION 
    });
    
    console.log('✅ Success! Response status:', response.status);
    console.log('📦 Full response data:', JSON.stringify(response.data, null, 2));
    
    // Extract and display key information
    const vehicle = response.data;
    console.log('\n🚗 Vehicle Details:');
    console.log('-------------------');
    console.log(`Registration: ${vehicle.registrationNumber || 'N/A'}`);
    console.log(`Make: ${vehicle.make || 'N/A'}`);
    console.log(`Model: ${vehicle.model || 'N/A'}`);
    console.log(`Colour: ${vehicle.colour || 'N/A'}`);
    console.log(`Year of Manufacture: ${vehicle.yearOfManufacture || 'N/A'}`);
    console.log(`Engine Capacity: ${vehicle.engineCapacity || 'N/A'} cc`);
    console.log(`Fuel Type: ${vehicle.fuelType || 'N/A'}`);
    console.log(`Tax Status: ${vehicle.taxStatus || 'N/A'}`);
    console.log(`MOT Status: ${vehicle.motStatus || 'N/A'}`);
    console.log(`MOT Expiry: ${vehicle.motExpiryDate || 'N/A'}`);
    
  } catch (error: any) {
    console.error('❌ Error testing registration:');
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received');
        console.error('Request config:', error.config);
      } else {
        // Something happened in setting up the request
        console.error('Error:', error.message);
      }
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Run the test
testDvlaApi().catch(console.error);
