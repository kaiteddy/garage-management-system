import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (message) => console.log(`${colors.blue}[i]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}✓${colors.reset} ${message}`),
  error: (message) => console.error(`${colors.red}✗${colors.reset} ${message}`),
  warning: (message) => console.log(`${colors.yellow}⚠${colors.reset} ${message}`),
  section: (title) => console.log(`\n${colors.bright}${title}${colors.reset}\n${'-'.repeat(title.length)}`),
};

async function checkEnvironment() {
  log.section('ENVIRONMENT CHECK');
  
  const requiredVars = [
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_PRISMA_URL',
    'DVSA_API_KEY',
    'DVLA_API_KEY',
    'NEXT_PUBLIC_APP_URL',
    'NODE_ENV'
  ];

  let allVarsPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      const value = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('URL') && varName !== 'NEXT_PUBLIC_APP_URL' 
        ? '*****' 
        : process.env[varName];
      
      log.success(`${varName}: ${value}`);
    } else {
      log.error(`${varName} is not set`);
      allVarsPresent = false;
    }
  });

  return allVarsPresent;
}

async function checkDatabaseConnection() {
  log.section('DATABASE CONNECTION CHECK');
  
  try {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    log.success('Connection successful!');
    log.info(`Database time: ${result.rows[0].now}`);
    
    // Check PostgreSQL version
    const version = await client.query('SELECT version()');
    log.info(`PostgreSQL version: ${version.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    client.release();
    return true;
  } catch (error) {
    log.error(`Connection failed: ${error.message}`);
    return false;
  }
}

async function checkDatabaseSchema() {
  log.section('DATABASE SCHEMA CHECK');
  
  try {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    
    // Check if required tables exist
    const tables = ['customers', 'vehicles', 'documents', 'line_items', 'appointments'];
    
    for (const table of tables) {
      try {
        await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
        log.success(`Table exists: ${table}`);
      } catch (error) {
        log.warning(`Table missing: ${table} (${error.message})`);
      }
    }
    
    client.release();
    return true;
  } catch (error) {
    log.error(`Schema check failed: ${error.message}`);
    return false;
  }
}

async function checkAPIConnectivity() {
  log.section('API CONNECTIVITY CHECK');
  
  const apis = [
    { name: 'DVSA API', url: process.env.DVSA_API_BASE_URL },
    { name: 'Application API', url: process.env.NEXT_PUBLIC_APP_URL + '/api/health' }
  ];
  
  let allAPIsWorking = true;
  
  for (const api of apis) {
    try {
      const response = await fetch(api.url, {
        method: 'HEAD',
        headers: {
          'Accept': 'application/json',
          'x-api-key': api.name === 'DVSA API' ? process.env.DVSA_API_KEY : ''
        }
      });
      
      if (response.ok) {
        log.success(`${api.name} is reachable (Status: ${response.status})`);
      } else {
        log.warning(`${api.name} returned non-OK status: ${response.status}`);
        allAPIsWorking = false;
      }
    } catch (error) {
      log.error(`${api.name} is not reachable: ${error.message}`);
      allAPIsWorking = false;
    }
  }
  
  return allAPIsWorking;
}

async function checkDataIntegrity() {
  log.section('DATA INTEGRITY CHECK');
  
  try {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    
    // Check record counts in key tables
    const tables = ['customers', 'vehicles', 'documents'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        log.info(`${table}: ${parseInt(result.rows[0].count).toLocaleString()} records`);
      } catch (error) {
        log.warning(`Could not count records in ${table}: ${error.message}`);
      }
    }
    
    client.release();
    return true;
  } catch (error) {
    log.error(`Data integrity check failed: ${error.message}`);
    return false;
  }
}

async function runChecks() {
  console.log(`\n${colors.bright}🚀 Starting System Check${colors.reset}\n`);
  
  const envCheck = await checkEnvironment();
  const dbCheck = envCheck ? await checkDatabaseConnection() : false;
  const schemaCheck = dbCheck ? await checkDatabaseSchema() : false;
  const apiCheck = await checkAPIConnectivity();
  const dataCheck = schemaCheck ? await checkDataIntegrity() : false;
  
  log.section('CHECK SUMMARY');
  
  console.log(`Environment: ${envCheck ? '✅' : '❌'}`);
  console.log(`Database: ${dbCheck ? '✅' : '❌'}`);
  console.log(`Schema: ${schemaCheck ? '✅' : '⚠'}`);
  console.log(`APIs: ${apiCheck ? '✅' : '⚠'}`);
  console.log(`Data: ${dataCheck ? '✅' : '⚠'}`);
  
  console.log('\nCheck completed!');
  
  if (!envCheck || !dbCheck) {
    log.error('Critical issues found. Please fix the above errors before proceeding.');
    process.exit(1);
  }
}

// Run all checks
runChecks().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
