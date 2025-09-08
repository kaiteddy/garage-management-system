// Fast Bulk MOT Check using DVSA Batch API
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { setInterval } = require('timers/promises');
// Load environment variables from .env.local if it exists
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const autoConfirm = args.includes('--yes') || args.includes('-y');

// Configuration
const CONFIG = {
  batchSize: 1,                   // Process one vehicle at a time
  concurrency: 1,                 // Process one request at a time
  requestDelay: 1000,             // 1 second delay between requests to respect rate limits
  maxRetries: 3,                  // Max retry attempts per vehicle
  retryDelay: 2000,               // Initial delay between retries (will back off)
  daysUntilExpiry: 30,            // Days before expiry to send reminders
  outputFile: 'mot-reminders.csv', // Output file for reminders
  maxApiErrors: 5,                // Max consecutive API errors before giving up
  tokenRefreshInterval: 1800000,   // Refresh token every 30 minutes (tokens typically expire in 1 hour)
  minRegistrationLength: 2,        // Minimum valid registration length
  maxRegistrationLength: 8         // Maximum valid registration length (typical UK reg is 7 chars)
};

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.MOT_HISTORY_BASE_URL || 'https://history.mot.api.gov.uk/v1/trade/vehicles',
  tokenUrl: process.env.TAPI_TOKEN_URL,
  clientId: process.env.TAPI_CLIENT_ID,
  clientSecret: process.env.TAPI_CLIENT_SECRET,
  scope: process.env.TAPI_SCOPE || 'https://tapi.dvsa.gov.uk/.default',
  apiKey: process.env.MOT_HISTORY_API_KEY
};

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Track token state
let accessToken = null;
let tokenExpiry = 0;

// Track results for error handling
let results = [];

/**
 * Process a single vehicle's MOT data and update the database
 */
async function processVehicle(vehicle, attempt = 1) {
  try {
    console.log(`\n🔍 Checking ${vehicle.registration} (${vehicle.make || 'Unknown make'} ${vehicle.model || ''})`);
    
    // Get MOT history for this vehicle
    const result = await getMotHistory(vehicle.registration);
    const now = new Date();
    
    if (result.status === 'SUCCESS' && result.data) {
      // Parse the MOT test results
      const motData = result.data[0]; // Get the most recent test
      const motExpiry = motData.motTestExpiryDate || null;
      const motPassed = motData.motTestResult === 'PASSED';
      const motTestDate = motData.completedDate ? motData.completedDate.split('T')[0] : null;
      const motTestNumber = motData.motTestNumber || null;
      
      // Get odometer reading if available
      let odometerReading = null;
      let odometerUnit = null;
      
      if (motData.odometerValue && motData.odometerUnit) {
        odometerReading = parseInt(motData.odometerValue, 10);
        odometerUnit = motData.odometerUnit === 'km' ? 'km' : 'mi';
      }
      
      // Get advisories if any
      const advisories = motData.rfrAndComments ? 
        motData.rfrAndComments
          .filter(item => item.type === 'ADVISORY' || item.type === 'MINOR')
          .map(item => ({
            type: item.type,
            text: item.text,
            dangerous: item.dangerous
          })) : [];
      
      // Get defects if any
      const defects = motData.rfrAndComments ? 
        motData.rfrAndComments
          .filter(item => item.type === 'FAIL' || item.type === 'MAJOR')
          .map(item => ({
            type: item.type,
            text: item.text,
            dangerous: item.dangerous
          })) : [];
      
      // Update the database with MOT information
      try {
        await pool.query(
          `UPDATE vehicles 
           SET 
             mot_expiry_date = $1,
             mot_test_date = $2,
             mot_test_result = $3,
             mot_test_number = $4,
             mot_odometer_value = $5,
             mot_odometer_unit = $6,
             mot_advisories = $7,
             mot_defects = $8,
             mot_last_checked = $9,
             updated_at = $9
           WHERE registration = $10`,
          [
            motExpiry,
            motTestDate,
            motPassed ? 'PASSED' : 'FAILED',
            motTestNumber,
            odometerReading,
            odometerUnit,
            advisories.length > 0 ? advisories : null,
            defects.length > 0 ? defects : null,
            now,
            vehicle.registration
          ]
        );
        console.log(`   ✅ Updated MOT information in database for ${vehicle.registration}`);
      } catch (dbError) {
        console.error(`   ❌ Error updating database for ${vehicle.registration}:`, dbError.message);
        // Continue with the result even if database update fails
      }
      
      return {
        status: 'COMPLETED',
        registration: vehicle.registration,
        make: vehicle.make || motData.make || null,
        model: vehicle.model || motData.model || null,
        motExpiryDate: motExpiry,
        motTestDate: motTestDate,
        motTestResult: motPassed ? 'PASSED' : 'FAILED',
        motTestNumber: motTestNumber,
        odometerValue: odometerReading,
        odometerUnit: odometerUnit,
        advisories: advisories,
        defects: defects,
        customerName: vehicle.customer_name,
        email: vehicle.email,
        phone: vehicle.phone,
        error: null
      };
    } else if (result.status === 'NOT_FOUND') {
      // Update the database to indicate we checked this vehicle
      try {
        await pool.query(
          `UPDATE vehicles 
           SET mot_last_checked = $1,
               updated_at = $1
           WHERE registration = $2`,
          [now, vehicle.registration]
        );
      } catch (dbError) {
        console.error(`   ❌ Error updating database for ${vehicle.registration}:`, dbError.message);
      }
      
      return {
        status: 'NOT_FOUND',
        registration: vehicle.registration,
        make: vehicle.make || null,
        model: vehicle.model || null,
        error: 'Vehicle not found in MOT database',
        customerName: vehicle.customer_name,
        email: vehicle.email,
        phone: vehicle.phone
      };
    } else {
      // Handle API errors with retry logic
      if (attempt < CONFIG.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff with max 30s
        console.log(`   ⏳ Retrying in ${delay/1000}s... (Attempt ${attempt + 1}/${CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return processVehicle(vehicle, attempt + 1);
      }
      
      return {
        status: 'ERROR',
        registration: vehicle.registration,
        make: vehicle.make || null,
        model: vehicle.model || null,
        error: result.error || 'Unknown error',
        customerName: vehicle.customer_name,
        email: vehicle.email,
        phone: vehicle.phone
      };
    }
  } catch (error) {
    console.error(`   ❌ Error processing vehicle ${vehicle.registration}:`, error.message);
    return {
      status: 'ERROR',
      registration: vehicle.registration,
      make: vehicle.make || null,
      model: vehicle.model || null,
      error: error.message,
      customerName: vehicle.customer_name,
      email: vehicle.email,
      phone: vehicle.phone
    };
  }
}

/**
 * Get or refresh OAuth access token
 */
async function getAccessToken() {
  // Return cached token if it's still valid (with 5 minute buffer)
  if (accessToken && Date.now() < tokenExpiry - 300000) {
    return accessToken;
  }

  console.log('🔑 Getting new access token...');
  
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', API_CONFIG.clientId);
    params.append('client_secret', API_CONFIG.clientSecret);
    params.append('scope', API_CONFIG.scope);
    
    const response = await fetch(API_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Cache the token
    accessToken = data.access_token;
    // Set expiry time (default to 1 hour if not provided)
    tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000);
    
    console.log('✅ Successfully obtained access token');
    return accessToken;
    
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    throw error;
  }
}

/**
 * Get MOT history for a single vehicle
 */
async function getMotHistory(registration, attempt = 1) {
  const url = `${API_CONFIG.baseUrl}/registration/${registration}`;
  
  try {
    const token = await getAccessToken();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': API_CONFIG.apiKey,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json+v6',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    // Handle token expiration
    if (response.status === 401 && attempt <= 2) {
      console.log('   🔄 Token expired, refreshing and retrying...');
      accessToken = null; // Force token refresh
      return getMotHistory(registration, attempt + 1);
    }
    
    if (!response.ok) {
      // Handle 404 (vehicle not found) as a non-error case
      if (response.status === 404) {
        return { registration, status: 'NOT_FOUND', error: null };
      }
      
      const errorData = await response.text();
      throw new Error(`API error (${response.status}): ${errorData}`);
    }
    
    const data = await response.json();
    return { 
      registration,
      status: 'SUCCESS',
      data,
      error: null
    };
    
  } catch (error) {
    console.error(`   ❌ Error checking ${registration}:`, error.message);
    return {
      registration,
      status: 'ERROR',
      data: null,
      error: error.message
    };
  }
}

/**
 * Process vehicles one at a time with rate limiting
 */
async function processVehicles(vehicles) {
  const results = [];
  let consecutiveErrors = 0;
  let processedCount = 0;
  const totalVehicles = vehicles.length;
  
  console.log(`\n🚀 Starting to process ${totalVehicles} vehicles\n`);
  
  // Create CSV file with headers
  const csvHeaders = [
    'Registration', 'Make', 'Model', 'Customer Name', 'Email', 'Phone',
    'MOT Status', 'MOT Expiry Date', 'Last Test Date', 'Last Recorded Mileage',
    'Needs Reminder?', 'Error'
  ];
  
  // Write headers to file
  fs.writeFileSync(CONFIG.outputFile, csvHeaders.join(',') + '\n');
  
  /**
   * Check if a registration number is valid
   * Valid UK formats:
   * - Current format (2001-present): XX00 XXX
   * - Prefix format (1983-2001): X000 XXX
   * - Suffix format (1963-1983): XXX 000X
   * - Dateless (pre-1963): XXX 000
   */
  const isValidRegistration = (reg) => {
    if (!reg || typeof reg !== 'string') return false;
    
    // Remove all whitespace and convert to uppercase
    const cleanReg = reg.replace(/\s+/g, '').toUpperCase();
    const length = cleanReg.length;
    
    // Check length (UK regs are typically 4-7 characters without spaces)
    if (length < 2 || length > 7) {
      return false;
    }
    
    // Check for invalid characters (only letters and numbers allowed)
    if (!/^[A-Z0-9]+$/.test(cleanReg)) {
      return false;
    }
    
    // Must contain at least one letter and one number
    if (!/[A-Z]/.test(cleanReg) || !/[0-9]/.test(cleanReg)) {
      return false;
    }
    
    // Check common invalid patterns
    const invalidPatterns = [
      /^0+$/,                  // All zeros
      /^[A-Z]0+$/,             // Single letter followed by zeros
      /^[A-Z]{2}0+$/,          // Two letters followed by zeros
      /^[0-9]+$/,              // Numbers only
      /^[A-Z]+$/,              // Letters only
      /^[A-Z]0+[A-Z]?$/,       // Single letter, zeros, optional letter
      /^[A-Z]{2}0+[A-Z]?$/,    // Two letters, zeros, optional letter
      /^[A-Z]?0+[A-Z]?$/       // Optional letter, zeros, optional letter
    ];
    
    // If any invalid pattern matches, reject
    if (invalidPatterns.some(pattern => pattern.test(cleanReg))) {
      return false;
    }
    
    // Additional validation for specific formats
    // Current format (XX00 XXX or similar)
    if (/^[A-Z]{2}[0-9]{2}[A-Z]{2,3}$/.test(cleanReg)) {
      return true;
    }
    
    // Prefix format (X000 XXX or similar)
    if (/^[A-Z][0-9]{3}[A-Z]{2,3}$/.test(cleanReg)) {
      return true;
    }
    
    // Suffix format (XXX 000X or similar)
    if (/^[A-Z]{2,3}[0-9]{3}[A-Z]$/.test(cleanReg)) {
      return true;
    }
    
    // Dateless format (XXX 000 or similar)
    if (/^[A-Z]{1,3}[0-9]{1,4}$/.test(cleanReg)) {
      return true;
    }
    
    // If none of the specific formats matched but it has letters and numbers, allow it
    // The API will be the final judge
    return /[A-Z]/.test(cleanReg) && /[0-9]/.test(cleanReg);
  };
  
  // Process each vehicle one at a time
  for (const vehicle of vehicles) {
    // Skip vehicles with invalid registration numbers
    if (!isValidRegistration(vehicle.registration)) {
      console.log(`\n⏭️  Skipping invalid registration: "${vehicle.registration}"`);
      continue;
    }
    
    // Normalize the registration (trim and uppercase)
    vehicle.registration = vehicle.registration.trim().toUpperCase();
    
    const startTime = Date.now();
    let processedCount = results.filter(r => r.status).length + 1;
    const progress = Math.floor((processedCount / totalVehicles) * 100);
    
    try {
      // Process the vehicle
      const result = await processVehicle(vehicle);
      
      // Skip if no valid data was returned
      if (!result) {
        console.log(`   ⏭️  No valid data returned, skipping`);
        continue;
      }
      
      // Check if we need a reminder for this vehicle
      const needsReminder = checkIfNeedsReminder(result);
      
      // Add to results
      const resultWithReminder = {
        ...result,
        needsReminder: needsReminder ? 'YES' : 'NO'
      };
      
      results.push(resultWithReminder);
      
      // Append to CSV file
      const csvRow = [
        `"${resultWithReminder.registration || ''}"`,
        `"${resultWithReminder.make || ''}"`,
        `"${resultWithReminder.model || ''}"`,
        `"${resultWithReminder.customer_name || ''}"`,
        `"${resultWithReminder.email || ''}"`,
        `"${resultWithReminder.phone || ''}"`,
        `"${resultWithReminder.motStatus || ''}"`,
        `"${resultWithReminder.expiryDate || ''}"`,
        `"${resultWithReminder.testDate || ''}"`,
        `"${resultWithReminder.mileage || ''}"`,
        `"${resultWithReminder.needsReminder || ''}"`,
        `"${(resultWithReminder.error || '').replace(/"/g, '""')}"`
      ];
      
      fs.appendFileSync(CONFIG.outputFile, csvRow.join(',') + '\n');
      
      // Log progress
      console.log(`   ✅ [${processedCount}/${totalVehicles} (${progress}%)] ${vehicle.registration}: ${result.motStatus}`);
      if (result.motStatus === 'PASSED' && result.expiryDate) {
        console.log(`      Expires: ${result.expiryDate}${needsReminder ? ' ⚠️ REMINDER NEEDED' : ''}`);
      } else if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      
      // Reset error counter on success
      if (result.status !== 'ERROR' && result.status !== 'FAILED') {
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
      }
      
      // Check for too many consecutive errors
      if (consecutiveErrors >= CONFIG.maxApiErrors) {
        throw new Error(`Too many consecutive errors (${consecutiveErrors}), stopping`);
      }
      
      // Add delay between requests to respect rate limits
      if (processedCount < totalVehicles) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
      }
      
    } catch (error) {
      console.error(`\n❌ Error processing vehicle ${vehicle.registration}:`, error.message);
      
      // Add failed vehicle to results
      const failedResult = {
        ...vehicle,
        status: 'ERROR',
        motStatus: 'ERROR',
        expiryDate: null,
        testDate: null,
        mileage: null,
        error: error.message,
        needsReminder: 'ERROR'
      };
      
      results.push(failedResult);
      
      // Append failed result to CSV
      const csvRow = [
        `"${failedResult.registration || ''}"`,
        `"${failedResult.make || ''}"`,
        `"${failedResult.model || ''}"`,
        `"${failedResult.customer_name || ''}"`,
        `"${failedResult.email || ''}"`,
        `"${failedResult.phone || ''}"`,
        `"${failedResult.motStatus || 'ERROR'}"`,
        `"${failedResult.expiryDate || ''}"`,
        `"${failedResult.testDate || ''}"`,
        `"${failedResult.mileage || ''}"`,
        `"${failedResult.needsReminder || 'ERROR'}"`,
        `"${(failedResult.error || 'Unknown error').replace(/"/g, '""')}"`
      ];
      
      fs.appendFileSync(CONFIG.outputFile, csvRow.join(',') + '\n');
      
      consecutiveErrors++;
      
      // Check for too many consecutive errors
      if (consecutiveErrors >= CONFIG.maxApiErrors) {
        console.error('\n❌ Too many consecutive errors, stopping processing');
        break;
      }
      
      // Add delay after error
      await new Promise(resolve => setTimeout(resolve, CONFIG.apiErrorDelay));
    }
  }
  
  return results;
}

/**
 * Check if a vehicle needs an MOT reminder
 */
function checkIfNeedsReminder(vehicle) {
  if (vehicle.motStatus !== 'PASSED' || !vehicle.expiryDate) {
    return false;
  }
  
  const expiryDate = new Date(vehicle.expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry <= CONFIG.daysUntilExpiry;
}

/**
 * Generate a summary report of the MOT checks
 */
function generateSummaryReport(results) {
  console.log('\n📊 Generating summary report...');
  
  // Count results by status
  const statusCounts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  
  // Count MOT reminders needed (expired or expiring soon)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  
  const reminderCount = results.filter(result => {
    if (!result.motExpiryDate) return false;
    const expiryDate = new Date(result.motExpiryDate);
    return expiryDate <= thirtyDaysFromNow && result.status === 'COMPLETED';
  }).length;
  
  // Print summary
  console.log('\n=== PROCESSING SUMMARY ===');
  console.log(`Total vehicles processed: ${results.length}`);
  
  console.log('\nStatus Summary:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`- ${status}: ${count} (${Math.round((count / results.length) * 100)}%)`);
  });
  
  console.log(`\n🔔 MOT reminders needed: ${reminderCount} (${results.length > 0 ? Math.round((reminderCount / results.length) * 100) : 0}%)`);
  
  // Generate CSV
  const csvHeader = [
    'Registration',
    'Make',
    'Model',
    'Customer Name',
    'Email',
    'Phone',
    'MOT Status',
    'MOT Expiry Date',
    'Last MOT Test Date',
    'Odometer Value',
    'Odometer Unit',
    'Has Advisories',
    'Has Defects',
    'Error',
    'MOT Test Number'
  ].join(',');
  
  const csvRows = results.map(result => {
    const hasAdvisories = result.advisories && result.advisories.length > 0 ? 'Yes' : 'No';
    const hasDefects = result.defects && result.defects.length > 0 ? 'Yes' : 'No';
    
    return [
      `"${result.registration || ''}"`,
      `"${result.make || ''}"`,
      `"${result.model || ''}"`,
      `"${result.customerName || ''}"`,
      `"${result.email || ''}"`,
      `"${result.phone || ''}"`,
      `"${result.motTestResult || result.status || ''}"`,
      `"${result.motExpiryDate || ''}"`,
      `"${result.motTestDate || ''}"`,
      `"${result.odometerValue || ''}"`,
      `"${result.odometerUnit || ''}"`,
      `"${hasAdvisories}"`,
      `"${hasDefects}"`,
      `"${result.error || ''}"`,
      `"${result.motTestNumber || ''}"`
    ].join(',');
  });
  
  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  // Write to file
  fs.writeFileSync(CONFIG.outputFile, csvContent);
  
  // Print a sample of vehicles that need MOT reminders
  const vehiclesNeedingReminders = results.filter(result => {
    if (result.status !== 'COMPLETED' || !result.motExpiryDate) return false;
    const expiryDate = new Date(result.motExpiryDate);
    return expiryDate <= thirtyDaysFromNow;
  });
  
  if (vehiclesNeedingReminders.length > 0) {
    console.log('\n🚨 VEHICLES NEEDING MOT REMINDERS:');
    vehiclesNeedingReminders.slice(0, 10).forEach(vehicle => {
      console.log(`- ${vehicle.registration}: Expires ${vehicle.motExpiryDate} (${vehicle.customerName} - ${vehicle.email || vehicle.phone || 'No contact info'})`);
    });
    
    if (vehiclesNeedingReminders.length > 10) {
      console.log(`- ...and ${vehiclesNeedingReminders.length - 10} more`);
    }
  }
  
  return reminderCount;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Fast Bulk MOT Check\n');
  
  // Validate required environment variables
  const requiredVars = [
    'MOT_HISTORY_API_KEY', 
    'TAPI_CLIENT_ID', 
    'TAPI_CLIENT_SECRET', 
    'TAPI_TOKEN_URL',
    'DATABASE_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Error: The following required environment variables are not set:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are present');
  
  // Check if output file exists and ask for confirmation
  if (fs.existsSync(CONFIG.outputFile)) {
    console.log(`\n⚠️  Warning: Output file ${CONFIG.outputFile} already exists`);
    
    if (autoConfirm) {
      console.log('   Auto-confirmed: --yes flag detected, overwriting file');
    } else {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('   Continue? (y/N) ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('\n❌ Operation cancelled by user');
        process.exit(0);
      }
    }
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
        c.phone,
        v.mot_expiry_date,
        v.mot_last_checked
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration IS NOT NULL 
        AND v.registration != ''
        AND v.registration !~ '^\\s*$'  -- Exclude whitespace-only strings
        AND v.registration ~ '[A-Za-z0-9]'  -- Must contain at least one alphanumeric character
        -- Skip test registrations (like AB12CDE, BC23FGH, etc.)
        AND v.registration !~ '^[A-Z]{2}[0-9]{2}[A-Z]{3}$'
        -- Only check vehicles that haven't been checked in the last 30 days
        AND (v.mot_last_checked IS NULL OR v.mot_last_checked < NOW() - INTERVAL '30 days')
      ORDER BY 
        -- Check vehicles with expired or expiring MOTs first
        CASE 
          WHEN v.mot_expiry_date IS NULL THEN 1
          WHEN v.mot_expiry_date < NOW() THEN 2
          WHEN v.mot_expiry_date < NOW() + INTERVAL '30 days' THEN 3
          ELSE 4
        END,
        v.registration`;

    const result = await pool.query(query);
    const vehicles = result.rows;
    
    if (vehicles.length === 0) {
      console.log('✅ No vehicles found in the database that need checking');
      return;
    }
    
    console.log(`🚗 Found ${vehicles.length} vehicles to check\n`);
    
    // Process vehicles one at a time with rate limiting
    const results = await processVehicles(vehicles);
    
    // Generate summary report
    const reminderCount = generateSummaryReport(results);
    
    console.log('\n✅ Check completed!');
    console.log(`📋 See ${CONFIG.outputFile} for the detailed results`);
    
  } catch (error) {
    console.error('\n❌ Error during bulk MOT check:', error.message);
    console.error(error.stack);
    
    // Try to save partial results if possible
    if (results && results.length > 0) {
      try {
        // Write partial results to CSV
        const partialCsv = [
          'Registration,Status,Error',
          ...results.map(r => 
            `"${r.registration || ''}","${r.status || 'UNKNOWN'}","${(r.error || '').replace(/"/g, '""')}"`
          )
        ].join('\n');
        
        fs.writeFileSync('partial-results.csv', partialCsv);
        
        console.log('\n⚠️  Partial results saved to partial-results.csv');
      } catch (saveError) {
        console.error('\n❌ Failed to save partial results:', saveError.message);
      }
    }
    
    process.exit(1);
  } finally {
    await pool.end();
    
    // Ensure any pending writes are flushed
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the script
main().catch(console.error);
