// Quick MOT Reminder Script
// Fetches MOT statuses and generates reminder list without modifying the database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Configuration
const CONFIG = {
  batchSize: 50,          // Number of vehicles to process
  concurrency: 3,         // Concurrent API requests
  daysUntilExpiry: 30,    // Send reminders for MOTs expiring within this many days
  outputFile: 'mot-reminders.csv'  // Output file for reminders
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Cache for access tokens
let accessToken = null;
let tokenExpiry = 0;

/**
 * Get OAuth access token for DVSA API
 */
async function getDVSAAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${process.env.DVSA_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', process.env.DVSA_CLIENT_ID);
  params.append('client_secret', process.env.DVSA_CLIENT_SECRET);
  params.append('scope', 'https://tapi.dvsa.gov.uk/.default');
  params.append('grant_type', 'client_credentials');
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    throw error;
  }
}

/**
 * Check MOT status for a vehicle registration
 */
async function checkMOTStatus(registration) {
  // Skip invalid registrations
  if (!registration || typeof registration !== 'string') {
    return { registration, status: 'INVALID', error: 'Invalid registration' };
  }
  
  // Clean the registration
  const cleanReg = registration.toString()
    .replace(/[^a-zA-Z0-9]/g, '')  // Remove all non-alphanumeric chars
    .toUpperCase();
    
  if (cleanReg.length < 2 || cleanReg.length > 10) {
    return { registration, status: 'INVALID', error: 'Invalid registration format' };
  }
  
  try {
    const token = await getDVSAAccessToken();
    const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${encodeURIComponent(cleanReg)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.DVSA_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { 
          registration: cleanReg, 
          status: 'NOT_FOUND',
          error: 'Vehicle not found in MOT database'
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const latestTest = data.motTests?.[0];
    
    return {
      registration: cleanReg,
      make: data.make,
      model: data.model,
      firstUsedDate: data.firstUsedDate,
      status: latestTest?.testResult || 'NO_TESTS',
      expiryDate: latestTest?.expiryDate,
      testDate: latestTest?.completedDate,
      mileage: latestTest?.odometerValue,
      success: true
    };
    
  } catch (error) {
    return {
      registration: cleanReg,
      status: 'ERROR',
      error: error.message,
      success: false
    };
  }
}

/**
 * Process a batch of vehicles
 */
async function processBatch(vehicles) {
  const results = [];
  
  // Process vehicles with limited concurrency
  const processWithConcurrency = async (items, concurrency) => {
    const queue = [...items];
    const results = [];
    
    const worker = async () => {
      while (queue.length > 0) {
        const vehicle = queue.shift();
        if (!vehicle) continue;
        
        const result = await checkMOTStatus(vehicle.registration);
        results.push({ ...vehicle, ...result });
        
        // Log progress
        const progress = Math.round((results.length / items.length) * 100);
        process.stdout.write(`\r🔍 Progress: ${results.length}/${items.length} (${progress}%)`);
      }
    };
    
    // Start worker threads
    await Promise.all(
      Array(concurrency).fill().map(worker)
    );
    
    return results;
  };
  
  return await processWithConcurrency(vehicles, CONFIG.concurrency);
}

/**
 * Generate CSV report
 */
function generateReport(results) {
  const headers = [
    'Registration',
    'Make',
    'Model',
    'MOT Status',
    'Expiry Date',
    'Last Test Date',
    'Mileage',
    'Customer Name',
    'Email',
    'Phone'
  ];
  
  // Filter for vehicles that need reminders (expiring soon or expired)
  const now = new Date();
  const expiryThreshold = new Date();
  expiryThreshold.setDate(now.getDate() + CONFIG.daysUntilExpiry);
  
  const reminders = results.filter(vehicle => {
    if (!vehicle.expiryDate) return false;
    const expiryDate = new Date(vehicle.expiryDate);
    return expiryDate <= expiryThreshold;
  });
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  for (const vehicle of reminders) {
    const row = [
      `"${vehicle.registration}"`,
      `"${vehicle.make || ''}"`,
      `"${vehicle.model || ''}"`,
      `"${vehicle.status}"`,
      `"${vehicle.expiryDate || ''}"`,
      `"${vehicle.testDate || ''}"`,
      `"${vehicle.mileage || ''}"`,
      `"${vehicle.customer_name || ''}"`,
      `"${vehicle.email || ''}"`,
      `"${vehicle.phone || ''}"`
    ];
    csvContent += row.join(',') + '\n';
  }
  
  // Write to file
  fs.writeFileSync(CONFIG.outputFile, csvContent);
  console.log(`\n\n📊 Report generated: ${CONFIG.outputFile}`);
  console.log(`📋 Total vehicles processed: ${results.length}`);
  console.log(`🔔 Reminders needed: ${reminders.length}`);
  
  return reminders.length;
}

/**
 * Main function
 */
async function main() {
  console.log('🚗 Starting Quick MOT Reminder Check\n');
  
  // Validate required environment variables
  const requiredVars = ['DVSA_API_KEY', 'DVSA_CLIENT_ID', 'DVSA_CLIENT_SECRET', 'DVSA_TENANT_ID', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Error: The following required environment variables are not set:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    process.exit(1);
  }
  
  try {
    // Fetch vehicles that need checking
    console.log('🔍 Fetching vehicles from database...');
    const query = `
      SELECT 
        v.registration,
        v.make,
        v.model,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email,
        c.phone
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration IS NOT NULL 
        AND v.registration != ''
    `;
    
    const result = await pool.query(query);
    const vehicles = result.rows;
    
    if (vehicles.length === 0) {
      console.log('✅ No vehicles found in the database');
      return;
    }
    
    console.log(`🚗 Found ${vehicles.length} vehicles to check\n`);
    
    // Process vehicles in batches
    const results = await processBatch(vehicles);
    
    // Generate report
    const reminderCount = generateReport(results);
    
    console.log('\n✅ Check completed!');
    console.log(`📋 See ${CONFIG.outputFile} for the reminder list`);
    
  } catch (error) {
    console.error('\n❌ Error during MOT check:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);
