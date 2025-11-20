import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config({ path: '.env.local' });

// DVSA API Configuration
const DVSA_API_KEY = process.env.DVSA_API_KEY;
const DVSA_TENANT_ID = process.env.DVSA_TENANT_ID;
const DVSA_CLIENT_ID = process.env.DVSA_CLIENT_ID;
const DVSA_CLIENT_SECRET = process.env.DVSA_CLIENT_SECRET;

// Test a known valid registration
const TEST_REGISTRATION = 'BF65CPZ'; // Example registration

async function getAuthToken() {
  try {
    const authUrl = `https://login.microsoftonline.com/${DVSA_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', DVSA_CLIENT_ID);
    params.append('client_secret', DVSA_CLIENT_SECRET);
    params.append('scope', 'https://tapi.dvsa.gov.uk/.default');

    const response = await axios.post(authUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error.response?.data || error.message);
    throw error;
  }
}

async function testMOTCheck(registration) {
  try {
    console.log('Testing DVSA API with registration:', registration);
    
    // Get auth token
    console.log('Getting auth token...');
    const token = await getAuthToken();
    
    // Test MOT check
    console.log('Checking MOT status...');
    const response = await axios.get(
      `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${encodeURIComponent(registration)}`,
      {
        headers: {
          'x-api-key': DVSA_API_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error testing MOT check:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// Run the test
testMOTCheck(TEST_REGISTRATION)
  .then(() => console.log('Test completed successfully'))
  .catch(() => console.error('Test failed'))
  .finally(() => process.exit(0));
