// Debug version of the bulk MOT check with enhanced logging
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

console.log('🔍 Debug Mode: Enabled');
console.log('Environment Variables:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '***REDACTED***' : 'Not set');
console.log('- DVSA_API_KEY:', process.env.DVSA_API_KEY ? '***REDACTED***' : 'Not set');
console.log('- DVSA_CLIENT_ID:', process.env.DVSA_CLIENT_ID ? '***REDACTED***' : 'Not set');
console.log('- DVSA_TENANT_ID:', process.env.DVSA_TENANT_ID ? '***REDACTED***' : 'Not set');
console.log('\n🚀 Starting in debug mode...\n');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Simple test query to check database connection
async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as time');
    console.log('📅 Database time:', result.rows[0].time);
    
    // Check if vehicles table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicles'
      );
    `);
    
    console.log('📊 Vehicles table exists:', tableCheck.rows[0].exists);
    
    // Get row count
    try {
      const countResult = await client.query('SELECT COUNT(*) as count FROM vehicles');
      console.log(`📈 Total vehicles in database: ${countResult.rows[0].count}`);
    } catch (countError) {
      console.log('ℹ️ Could not count vehicles (table might not exist yet)');
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Simple test for DVSA API
async function testDVSAApi() {
  console.log('\n🔌 Testing DVSA API connection...');
  
  try {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.DVSA_TENANT_ID}/oauth2/v2.0/token`;
    console.log('🔑 Requesting token from:', tokenUrl);
    
    const params = new URLSearchParams();
    params.append('client_id', process.env.DVSA_CLIENT_ID);
    params.append('client_secret', process.env.DVSA_CLIENT_SECRET);
    params.append('scope', 'https://tapi.dvsa.gov.uk/.default');
    params.append('grant_type', 'client_credentials');
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Successfully obtained access token');
    
    // Test a simple API request
    const testReg = 'AB12CDE'; // Known test registration
    const apiUrl = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${testReg}`;
    
    console.log(`\n🚗 Testing MOT check for registration: ${testReg}`);
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API request failed: ${apiResponse.status} - ${errorText}`);
    }
    
    const data = await apiResponse.json();
    console.log('✅ API request successful');
    console.log('📋 Vehicle details:');
    console.log(`- Make: ${data.make || 'N/A'}`);
    console.log(`- Model: ${data.model || 'N/A'}`);
    console.log(`- First Used: ${data.firstUsedDate || 'N/A'}`);
    
    if (data.motTests && data.motTests.length > 0) {
      console.log(`- Latest MOT: ${data.motTests[0].testResult} (${data.motTests[0].completedDate})`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ DVSA API test failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('\n🔍 Starting system diagnostics...\n');
  
  // Test database connection
  const dbOk = await testDatabaseConnection();
  
  // Test DVSA API
  const apiOk = await testDVSAApi();
  
  console.log('\n📊 Diagnostics Summary:');
  console.log('==================');
  console.log(`Database Connection: ${dbOk ? '✅' : '❌'}`);
  console.log(`DVSA API Connection: ${apiOk ? '✅' : '❌'}`);
  console.log('==================');
  
  if (dbOk && apiOk) {
    console.log('\n✅ All systems go! You can now run the bulk check.');
  } else {
    console.log('\n❌ Some tests failed. Please check the error messages above.');
  }
  
  await pool.end();
  process.exit(0);
}

// Run diagnostics
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
