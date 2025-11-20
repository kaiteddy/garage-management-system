import pg from 'pg';
const { Pool } = pg;
type PoolClient = pg.PoolClient;
type PoolConfig = pg.PoolConfig;
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as csv from 'fast-csv';
import { format, parse } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { createHash } from 'crypto';
import axios, { AxiosError } from 'axios';
import https from 'https';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define types for DVLA API response
interface DvlaVehicleData {
  registrationNumber: string;
  make: string;
  model: string;
  yearOfManufacture: number;
  engineCapacity: number;
  fuelType: string;
  colour: string;
  motStatus: string;
  taxStatus: string;
  taxDueDate: string;
  motExpiryDate: string;
  dateOfLastV5CIssued: string;
  wheelplan: string;
  monthOfFirstRegistration: string;
  typeApproval: string;
  co2Emissions: number;
  fuelConsumption: {
    urban: number;
    extraUrban: number;
    combined: number;
  };
  taxDetails: {
    taxBand: string;
    taxRate: number;
  };
  motTests: Array<{
    completedDate: string;
    testResult: string;
    expiryDate: string;
    odometerValue: number;
    odometerUnit: string;
    motTestNumber: string;
    rfrAndComments: Array<{
      text: string;
      type: string;
    }>;
  }>;
}

// Define row type for CSV data
type CsvRow = Record<string, string | number | null | undefined>;

// Load environment variables from .env.local if it exists
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const env = dotenv.config({ path: envPath });
  dotenvExpand.expand(env);
}

// Verify required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Error: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Initialize database pool with SSL for production
const poolConfig: pg.PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(poolConfig);

// DVLA API Configuration
const DVLA_API_KEY = process.env.DVLA_API_KEY;
const DVLA_BASE_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
const USE_DVLA = !!DVLA_API_KEY && DVLA_API_KEY !== 'your_dvla_api_key_here';

// Cache for DVLA lookups to avoid redundant API calls
const dvlaCache = new Map<string, DvlaVehicleData>();

// Create a custom axios instance for DVLA API
let dvlaApi: ReturnType<typeof axios.create> | null = null;

if (USE_DVLA && DVLA_API_KEY) {
  dvlaApi = axios.create({
    baseURL: DVLA_BASE_URL,
    headers: {
      'x-api-key': DVLA_API_KEY,
      'Content-Type': 'application/json',
    },
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false // Only for development
    }),
    timeout: 10000 // 10 second timeout
  });
}

/**
 * Look up vehicle details from DVLA API with retry logic
 */
async function lookupVehicleDetails(
  registration: string,
  retries = 2,
  delay = 1000
): Promise<DvlaVehicleData | null> {
  if (!dvlaApi) return null;
  
  const normalizedReg = registration.replace(/\s+/g, '').toUpperCase();
  
  // Check cache first
  const cachedData = dvlaCache.get(normalizedReg);
  if (cachedData) {
    return cachedData;
  }

  // Skip if registration is not valid (too short or too long)
  if (normalizedReg.length < 2 || normalizedReg.length > 8) {
    console.log(`⚠️  Skipping DVLA lookup for invalid registration: ${registration}`);
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Looking up DVLA details for ${normalizedReg} (attempt ${attempt}/${retries})...`);
      
      const response = await dvlaApi.post<DvlaVehicleData>('', { 
        registrationNumber: normalizedReg 
      });
      
      if (response.status === 200 && response.data) {
        // Cache the result
        dvlaCache.set(normalizedReg, response.data);
        return response.data;
      }
    } catch (error) {
      if (attempt === retries) {
        // Only log errors on the last attempt
        if (axios.isAxiosError(error)) {
          if (error.response) {
            // The request was made and the server responded with an error status code
            if (error.response.status === 404) {
              console.log(`ℹ️  No DVLA data found for ${normalizedReg}: Vehicle not found`);
            } else {
              console.error(`❌ DVLA API Error for ${normalizedReg}: ${error.response.status} - ${error.response.statusText}`);
            }
          } else if (error.request) {
            // The request was made but no response was received
            console.error(`❌ DVLA API Error for ${normalizedReg}: No response received`);
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error(`❌ DVLA API Error for ${normalizedReg}: ${error.message}`);
          }
        } else {
          console.error(`❌ Unexpected error looking up ${normalizedReg}:`, error);
        }
      }
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  return null;
}

/**
 * Helper to parse dates from various formats
 */
function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    'yyyy-MM-dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy/MM/dd',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'yyyyMMdd',
    'ddMMyyyy',
    'MMddyyyy'
  ];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (e) {
      // Try next format
      continue;
    }
  }
  
  return null;
}

/**
 * Format vehicle registration to standard UK format
 */
function formatRegistration(reg: string | undefined | null): string {
  if (!reg) return '';
  // Remove all non-alphanumeric characters and convert to uppercase
  return reg.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Generate a unique ID from a string
 */
function stringToId(id: string | undefined | null): number {
  if (!id) return 0;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Ensure positive number
  return Math.abs(hash);
}

/**
 * Transform customer data from CSV row to database format
 */
async function transformCustomer(row: CsvRow): Promise<Record<string, any> | null> {
  // Extract customer details
  const firstName = String(row.first_name || '').trim();
  const lastName = String(row.last_name || '').trim();
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const email = String(row.email || '').trim();
  const phone = String(row.phone || '').trim();

  // Generate a stable ID from the customer's details
  const idSource = [name, email, phone].filter(Boolean).join('_');
  const id = stringToId(idSource);

  // Format address from address components
  const addressLine1 = String(row.address_line1 || '').trim();
  const addressLine2 = String(row.address_line2 || '').trim();
  const city = String(row.city || '').trim();
  const postcode = String(row.postcode || '').trim();
  const country = String(row.country || '').trim();

  const addressParts = [
    addressLine1,
    addressLine2,
    city,
    postcode,
    country
  ].filter(Boolean);

  const address = addressParts.join(', ');
  const now = new Date();

  return {
    id,
    name: name || 'Unknown Customer',
    email: email || null,
    phone: phone || null,
    address: address || null,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
    updated_at: format(now, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
  };
}

interface ImportConfig {
  name: string;
  table: string;
  filePath: string;
  transform: (row: any) => Promise<any>;
  batchSize?: number;
}

// Transform vehicle data from CSV row to database format
async function transformVehicle(row: CsvRow): Promise<Record<string, any> | null> {
  // Get and validate registration
  const registration = formatRegistration(String(row.registration || row.reg || row.registration_number || ''));
  if (!registration) {
    console.warn('⚠️  Skipping vehicle with missing registration');
    return null;
  }

  // Generate a stable ID from the vehicle's details
  const idSource = [
    registration,
    row.make,
    row.model,
    row.vin
  ].filter(Boolean).join('_');
  
  const id = stringToId(idSource);
  
  // Get make and model - at least one is required
  const make = String(row.make || '').trim();
  const model = String(row.model || '').trim();
  
  // Get other vehicle details
  let year: number | null = null;
  const yearStr = String(row.year || row.year_of_manufacture || '').trim();
  if (yearStr) {
    const parsedYear = parseInt(yearStr, 10);
    if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 1) {
      year = parsedYear;
    }
  }
  
  const color = String(row.color || row.colour || '').trim();
  const fuelType = String(row.fuel_type || row.fuel || '').trim();
  const engineSize = String(row.engine_size || row.engine_capacity || '').trim();
  const vin = String(row.vin || '').trim().toUpperCase();
  
  // Map owner_id to customer_id if present
  const customerId = row.owner_id ? parseInt(String(row.owner_id), 10) : null;
  
  // Format dates
  const now = new Date();
  
  return {
    id,
    registration,
    make: make || null,
    model: model || null,
    year: year,
    color: color || null,
    fuel_type: fuelType || null,
    engine_size: engineSize || null,
    customer_id: customerId,
    created_at: new Date(),
    updated_at: new Date()
  };
}

const importConfigs: ImportConfig[] = [
{
name: 'customers',
table: 'customers',
filePath: path.join(__dirname, '../data/customers.csv'),
transform: transformCustomer,
batchSize: 50,
},
{
name: 'vehicles',
table: 'vehicles',
filePath: path.join(__dirname, '../data/vehicles.csv'),
transform: transformVehicle,
batchSize: 50,
}
];

/**
 * Process rows in batches
 */
async function processBatch(
  client: any,
  table: string,
  rows: any[],
  batchNumber: number,
  totalBatches: number
): Promise<{ inserted: number; updated: number; errors: number }> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, errors: 0 };
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
    // Get column names from the first row
    const columns = Object.keys(rows[0]);
    if (columns.length === 0) {
      console.warn(`⚠️  No columns found in batch ${batchNumber}`);
      return { inserted: 0, updated: 0, errors: 0 };
    }

    // Create the table if it doesn't exist
    await createTableIfNotExists(client, table, columns);

    // Process each row individually
    for (const row of rows) {
      try {
        // Start a new transaction for this row
        await client.query('BEGIN');
        
        try {
          // Determine the conflict target (primary key)
          const conflictTarget = table === 'vehicles' ? 'registration' : 'id';
          
          // Get the column names and values
          const columnNames = columns.map(col => `"${col}"`).join(', ');
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          // Log the row data for debugging
          console.log(`Processing row for table ${table}:`, row);
          console.log(`Columns: ${columns.join(', ')}`);
          console.log(`Values: ${Object.values(row).join(', ')}`);
          
          // Build the SET clause for the upsert
          const setClause = columns
            .filter(col => col !== conflictTarget)
            .map(col => `"${col}" = EXCLUDED."${col}"`)
            .join(', ');
          
          // Build the query with proper conflict handling
          const query = `
            INSERT INTO "${table}" (${columnNames})
            VALUES (${placeholders})
            ON CONFLICT ("${conflictTarget}") 
            DO UPDATE SET ${setClause}
            RETURNING *;
          `;
          
          // Log the query for debugging
          console.log('Generated query:', query);

          // Prepare the values array
          const values = columns.map(col => row[col]);
          
          // Execute the query
          const result = await client.query(query, values);
          
          // Commit the transaction
          await client.query('COMMIT');
          
          if (result.rowCount === 1) {
            if (result.rows[0].created_at === result.rows[0].updated_at) {
              inserted++;
            } else {
              updated++;
            }
          }
        } catch (error) {
          // Rollback the transaction on error
          await client.query('ROLLBACK');
          throw error;
        }
      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errorDetails.push(`Error processing row: ${errorMessage}`);
        console.error(`❌ Error processing row in batch ${batchNumber}:`, error);
      }
    }

    console.log(`✅ Processed batch ${batchNumber}/${totalBatches} for ${table}: ${inserted} inserted, ${updated} updated, ${errors} errors`);
    return { inserted, updated, errors };
  } catch (error) {
    console.error(`❌ Error processing batch ${batchNumber} for ${table}:`, error);
    return { inserted: 0, updated: 0, errors: rows.length };
  }
}

/**
 * Create table if it doesn't exist
 */
async function createTableIfNotExists(
  client: any,
  tableName: string,
  columns: string[]
): Promise<void> {
  try {
    // Check if table exists
    const tableExists = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = '${tableName}'
      )`
    );

    if (!tableExists.rows[0].exists) {
      console.log(`ℹ️  Creating table ${tableName}...`);
      
      // Define column types based on column names
      const columnDefinitions = columns.map(col => {
        // Map column names to types
        if (col.endsWith('_at') || col.endsWith('_date')) {
          return `"${col}" TIMESTAMP WITH TIME ZONE`;
        } else if (col === 'id') {
          return `"${col}" BIGINT PRIMARY KEY`;
        } else if (col === 'registration') {
          return `"${col}" VARCHAR(20) UNIQUE`;
        } else if (col === 'email') {
          return `"${col}" VARCHAR(255) UNIQUE`;
        } else if (col === 'phone') {
          return `"${col}" VARCHAR(50)`;
        } else if (col === 'metadata' || col === 'original_data') {
          return `"${col}" JSONB`;
        } else if (col.endsWith('_id') || col === 'year') {
          return `"${col}" INTEGER`;
        } else if (col.endsWith('_mileage') || col.endsWith('_capacity') || col === 'engine_size') {
          return `"${col}" NUMERIC(10, 2)`;
        } else if (col.endsWith('_status') || col.endsWith('_result')) {
          return `"${col}" VARCHAR(50)`;
        } else if (col.includes('name') || col.includes('make') || col.includes('model') || col.includes('color') || col.includes('colour')) {
          return `"${col}" VARCHAR(100)`;
        } else if (col.includes('address') || col.includes('description') || col.includes('notes')) {
          return `"${col}" TEXT`;
        } else {
          return `"${col}" TEXT`;
        }
      });

      // Add created_at and updated_at timestamps if not present
      if (!columns.includes('created_at')) {
        columnDefinitions.push('"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
      }
      if (!columns.includes('updated_at')) {
        columnDefinitions.push('"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
      }

      // Create the table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          ${columnDefinitions.join(',\n          ')}
        );
      `);

      // Create indexes for common query patterns
      if (tableName === 'vehicles') {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles (registration);
          CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles (make, model);
          CREATE INDEX IF NOT EXISTS idx_vehicles_mot_status ON vehicles (mot_status);
          CREATE INDEX IF NOT EXISTS idx_vehicles_tax_status ON vehicles (tax_status);
        `);
      } else if (tableName === 'customers') {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);
          CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
          CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (last_name, first_name);
        `);
      }

      console.log(`✅ Created table ${tableName}`);
    }
  } catch (error) {
    console.error(`❌ Error creating table ${tableName}:`, error);
    throw error;
  }
}

/**
 * Function to verify database connection and tables
 */
async function verifyDatabase() {
  let client: pg.PoolClient | null = null;
  try {
    client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    
    // Check if the customers table exists
    const customersTableExists = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'customers'
      )`
    );

    if (!customersTableExists.rows[0].exists) {
      console.log('ℹ️  Customers table does not exist. It will be created during import.');
    } else {
      console.log('✅ Customers table exists');
    }

    // Check if the vehicles table exists
    const vehiclesTableExists = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'vehicles'
      )`
    );

    if (!vehiclesTableExists.rows[0].exists) {
      console.log('ℹ️  Vehicles table does not exist. It will be created during import.');
    } else {
      console.log('✅ Vehicles table exists');
    }

    return true;
  } catch (error) {
    console.error('❌ Error connecting to the database:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Main import function
 */
async function importData(client: any, config: ImportConfig) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const stats: Record<string, {
    total: number;
    inserted: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> = {};
  try {
    await client.query('BEGIN');

    // Process each import configuration
    const { name, transform, batchSize = 50 } = config;
    const filePath = path.resolve(__dirname, '../data', config.filePath);
      
    console.log(`\n📂 Processing ${name} from ${config.filePath}...`);
      
    // Initialize stats
    stats[name] = { total: 0, inserted: 0, updated: 0, errors: 0, errorDetails: [] };
      
    try {
      async function readCsv(filePath: string, skipHeader: boolean = true): Promise<CsvRow[]> {
        return new Promise((resolve, reject) => {
          const rows: CsvRow[] = [];
          let headers: string[] = [];
          let isFirstRow = true;
            
          fs.createReadStream(filePath, 'utf8')
            .pipe(csv.parse({ delimiter: ',', trim: true }))
            .on('data', (row: string[]) => {
              if (isFirstRow) {
                // First row is headers
                headers = row.map(h => h.trim());
                isFirstRow = false;
                if (skipHeader) return;
              }
                
              // Skip empty rows
              if (row.every(cell => !cell || cell.trim() === '')) return;
                
              // Create object with headers as keys
              const rowData: CsvRow = {};
              for (let i = 0; i < Math.min(headers.length, row.length); i++) {
                const header = headers[i];
                const value = row[i]?.trim() || '';
                if (header && value !== '') {
                  rowData[header] = value;
                }
              }
                
              if (Object.keys(rowData).length > 0) {
                rows.push(rowData);
              }
            })
            .on('end', () => {
              console.log(`📊 Read ${rows.length} rows from ${path.basename(filePath)}`);
              resolve(rows);
            })
            .on('error', (error) => {
              console.error(`❌ Error reading CSV file ${filePath}:`, error);
              reject(error);
            });
        });
      }

      const rows = await readCsv(filePath);
        
      // Filter out empty rows
      const nonEmptyRows = rows.filter(row => 
        Object.values(row).some(value => value !== null && value !== undefined && value !== '')
      );

      console.log(`📊 Found ${nonEmptyRows.length} rows in ${config.filePath}`);
        
      // Process rows in batches
      const totalBatches = Math.ceil(nonEmptyRows.length / batchSize);
        
      for (let i = 0; i < nonEmptyRows.length; i += batchSize) {
        const batch = nonEmptyRows.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
          
        console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} for ${name}...`);
          
        // Transform and process batch
        const transformedRows = [];
          
        for (const row of batch) {
          try {
            // Transform row
            const transformed = await transform(row);
            if (transformed) {
              transformedRows.push(transformed);
            } else {
              stats[name].errors++;
              stats[name].errorDetails.push('Row transformation returned null');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error transforming row: ${errorMessage}`);
            stats[name].errors++;
            stats[name].errorDetails.push(`Transformation error: ${errorMessage}`);
          }
        }
          
        // Process batch if we have valid rows
        if (transformedRows.length > 0) {
          const batchResult = await processBatch(
            client,
            name,
            transformedRows,
            batchNumber,
            totalBatches
          );
            
          // Update stats
          stats[name].inserted += batchResult.inserted;
          stats[name].updated += batchResult.updated;
          stats[name].errors += batchResult.errors;
        }
          
        stats[name].total += batch.length;
      }
        
      console.log(`✅ Completed processing ${name}: ${stats[name].inserted} inserted, ${stats[name].updated} updated, ${stats[name].errors} errors`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error processing ${name}:`, errorMessage);
      stats[name].errors++;
      stats[name].errorDetails.push(`Processing error: ${errorMessage}`);
    }
  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    // Commit the transaction
    await client.query('COMMIT');
    console.log('\n✅ All imports completed successfully!');
    
    // Print summary
    console.log('\n📊 Import Summary:');
    console.log('================================');
    
    for (const [name, stat] of Object.entries(stats)) {
      console.log(`\n${name.toUpperCase()}:`);
      console.log('--------------------------------');
      console.log(`Total processed: ${stat.total}`);
      console.log(`Inserted: ${stat.inserted}`);
      console.log(`Updated: ${stat.updated}`);
      console.log(`Errors: ${stat.errors}`);
      
      if (stat.errorDetails.length > 0) {
        console.log('\nError details:');
        stat.errorDetails.forEach((detail, index) => {
          console.log(`  ${index + 1}. ${detail}`);
        });
      }
    }
    
    console.log('\n✨ Import process completed!');
  }
}

/**
 * Main function to run the import
 */
async function main() {
  console.log('🚀 Starting import process...');
  
  const client = await pool.connect();
  
  try {
    // Check if the database is reachable
    await client.query('SELECT NOW()');
    console.log('✅ Successfully connected to the database');
    
    // Process each import configuration
    for (const config of importConfigs) {
      console.log(`\n📂 Processing ${config.name} from ${config.filePath}...`);
      await importData(client, config);
    }
    
    console.log('\n✅ All imports completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error; // Re-throw to be caught by the outer try-catch
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

// Run the main function
main().catch(console.error);
