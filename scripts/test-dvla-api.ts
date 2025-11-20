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

// Test registration numbers
const TEST_REGISTRATIONS = [
  'AB51ABC',  // Example registration 1
  'CD62DEF',  // Example registration 2
  'EF73GHI'   // Example registration 3
];

async function testDvlaApi() {
  const DVLA_API_KEY = process.env.DVLA_API_KEY;
  const DVLA_BASE_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

  if (!DVLA_API_KEY) {
    console.error('❌ DVLA_API_KEY is not set in .env.local');
    return;
  }

  console.log('🔑 DVLA API Key detected');
  console.log('🌐 Testing connection to DVLA API...\n');

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

  for (const reg of TEST_REGISTRATIONS) {
    try {
      console.log(`🚗 Testing registration: ${reg}`);
      const response = await dvlaApi.post('', { registrationNumber: reg });
      
      console.log('✅ Success! Response status:', response.status);
      console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
      console.log('----------------------------------------');
    } catch (error: any) {
      console.error(`❌ Error testing registration ${reg}:`);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          console.error('Status:', error.response.status);
          console.error('Headers:', error.response.headers);
          console.error('Data:', error.response.data);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received:', error.request);
          console.error('Request config:', error.config);
        } else {
          // Something happened in setting up the request
          console.error('Error:', error.message);
        }
      } else {
        console.error('Unexpected error:', error);
      }
      
      console.log('----------------------------------------');
    }
  }
}

// Run the test
testDvlaApi().catch(console.error);
