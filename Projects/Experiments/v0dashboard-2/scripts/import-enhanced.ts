import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from 'path';
import * as fs from 'fs';

// Define types
type ImportStats = Record<string, {
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  errorDetails: string[];
}>;
import * as dotenv from 'dotenv';
import * as csv from 'fast-csv';
import { parse } from 'date-fns';
import { format } from 'date-fns-tz';
import { createHash } from 'crypto';
import axios, { AxiosError } from 'axios';
import * as https from 'https';

// Define types for DVLA API response
interface DvlaVehicleData {
  registrationNumber: string;
  taxStatus?: string;
  motStatus?: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  colour?: string;
  fuelType?: string;
  markedForExport?: boolean;
  motExpiryDate?: string;
  taxDueDate?: string;
  typeApproval?: string;
  dateOfLastV5CIssued?: string;
  wheelplan?: string;
  monthOfFirstRegistration?: string;
}

// Get the current working directory
const __dirname = process.cwd();

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// DVLA API Configuration
const DVLA_API_KEY = process.env.DVLA_API_KEY;
const DVLA_BASE_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
const USE_DVLA = !!DVLA_API_KEY && DVLA_API_KEY !== 'your_dvla_api_key_here';

// Cache for DVLA lookups to avoid redundant API calls
const dvlaCache = new Map<string, DvlaVehicleData>();

// Create a custom axios instance for DVLA API
let dvlaApi: any = null;

if (USE_DVLA) {
  try {
    dvlaApi = axios.create({
      baseURL: DVLA_BASE_URL,
      headers: {
        'x-api-key': DVLA_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new https.Agent({  
        rejectUnauthorized: false // Only for development, in production use proper certificates
      }),
      timeout: 10000 // 10 second timeout
    });
    console.log('✅ DVLA API client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize DVLA API client:', error);
    dvlaApi = null;
  }
} else {
  console.log('ℹ️  DVLA API key not configured. Running import without DVLA lookups.');
}

/**
 * Look up vehicle details from DVLA API with retry logic
 */
async function lookupVehicleDetails(registration: string, retries = 2, delay = 1000): Promise<DvlaVehicleData | null> {
  // If DVLA is not configured, return null
  if (!dvlaApi) return null;
  
  // Normalize registration (remove spaces and convert to uppercase)
  const normalizedReg = registration.replace(/\s+/g, '').toUpperCase();
  
  // Check cache first
  const cachedData = dvlaCache.get(normalizedReg);
  if (cachedData) {
    return cachedData;
  }

  // Skip if registration is not valid (too short or too long)
  if (!normalizedReg || normalizedReg.length < 2 || normalizedReg.length > 10) {
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 [Attempt ${attempt}] Looking up DVLA details for ${normalizedReg}...`);
      
      const response = await dvlaApi.post('', { 
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
        if (axios.isAxiosError(error) || error instanceof AxiosError) {
          if (error.response) {
            // The request was made and the server responded with an error status code
            if (error.response.status === 404) {
              console.log(`ℹ️  No DVLA record found for ${normalizedReg}`);
            } else {
              console.error(`DVLA API Error for ${normalizedReg}: ${error.response.status} - ${error.response.statusText}`);
              console.error('Response data:', error.response.data);
            }
          } else if (error.code === 'ECONNABORTED') {
            console.error(`DVLA API Timeout for ${normalizedReg}: Request took too long`);
          } else if (error.request) {
            console.error(`DVLA API Error for ${normalizedReg}: No response received`);
          } else {
            console.error(`DVLA API Error for ${normalizedReg}: ${error.message}`);
          }
        } else {
          console.error(`Unexpected error looking up ${normalizedReg}:`, error);
        }
      }
      
      // Wait before next attempt (exponential backoff)
      if (attempt < retries) {
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  return null;
}

// Helper to parse dates from various formats
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  // Try parsing as ISO string
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Try parsing as UK date (DD/MM/YYYY)
  const ukMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [_, day, month, year] = ukMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return null;
}

// Format vehicle registration to standard UK format
function formatRegistration(reg: string): string {
  if (!reg) return '';
  // Remove all whitespace and convert to uppercase
  return reg.replace(/\s+/g, '').toUpperCase();
}

// Generate a unique ID from a string
function stringToId(id: string | undefined | null): number {
  if (!id) return Math.floor(Math.random() * 1000000000);
  
  if (/^\d+$/.test(id)) {
    return parseInt(id, 10);
  }
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Strict customer transform - only imports complete records
function transformCustomer(row: any) {
  // Require at least an ID
  if (!row._ID) {
    console.warn('⚠️  Skipping customer: Missing ID');
    return null;
  }

  // Build name from available fields
  let name = '';
  if (row.nameForename || row.nameSurname) {
    name = [row.nameTitle || '', row.nameForename || '', row.nameSurname || '']
      .map(s => s.trim())
      .filter(Boolean)
      .join(' ');
  } else if (row.nameCompany) {
    name = row.nameCompany.trim();
  }
  
  if (!name) {
    console.warn(`⚠️  Skipping customer ${row._ID}: No name information`);
    return null;
  }
  
  // Get contact info
  const email = row.contactEmail ? row.contactEmail.trim().toLowerCase() : null;
  const phone = (row.contactTelephone || row.contactMobile || '').trim() || null;
  
  // Build address from available components
  const addressParts = [
    row.addressHouseNo ? `${row.addressHouseNo} ${row.addressRoad || ''}`.trim() : '',
    row.addressLocality,
    row.addressTown,
    row.addressCounty,
    row.addressPostCode
  ].filter(Boolean).map(s => s.trim());
  
  const address = addressParts.length > 0 ? addressParts.join(', ') : null;
  
  return {
    id: stringToId(row._ID),
    name,
    email,
    phone,
    address,
    created_at: parseDate(row.sys_TimeStamp_Creation)?.toISOString() || new Date().toISOString(),
    updated_at: parseDate(row.sys_TimeStamp_Modification)?.toISOString() || new Date().toISOString()
  };
}

// Strict vehicle transform - only imports complete records
async function transformVehicle(row: any) {
  // Require at least an ID
  if (!row._ID) {
    console.warn('⚠️  Skipping vehicle: Missing ID');
    return null;
  }
  
  // Require registration number - check both Registration and VRM_Change fields
  let registration = formatRegistration(row.Registration || row.VRM_Change1 || '');
  if (!registration) {
    console.warn(`⚠️  Skipping vehicle ${row._ID}: Missing registration number`);
    return null;
  }
  
  // Get make and model from CSV
  let vehicleMake = row.Make ? row.Make.trim() : null;
  let vehicleModel = row.Model ? row.Model.trim() : null;
  
  // If we're missing make or model, try to get from DVLA
  if ((!vehicleMake || !vehicleModel) && dvlaApi) {
    try {
      const dvlaData = await lookupVehicleDetails(registration);
      if (dvlaData) {
        vehicleMake = vehicleMake || dvlaData.make || null;
        vehicleModel = vehicleModel || dvlaData.model || null;
        
        if (vehicleMake && vehicleModel) {
          console.log(`✅ Enriched ${registration} with DVLA data: ${vehicleMake} ${vehicleModel}`);
        }
      }
    } catch (error) {
      console.error(`Error looking up ${registration} in DVLA:`, error);
    }
  }
  
  // If we still don't have make or model, skip this vehicle
  if (!vehicleMake || !vehicleModel) {
    console.warn(`⚠️  Skipping vehicle ${registration}: Missing make or model`);
    return null;
  }
  
  // Parse and validate year from DateofReg or DateofManufacture
  let year: number | null = null;
  const regDate = parseDate(row.DateofReg) || parseDate(row.DateofManufacture);
  if (regDate) {
    year = regDate.getFullYear();
  }
  
  // Standardize color
  let color = (row.Colour || '').toLowerCase().trim() || null;
  
  // Standardize fuel type
  let fuelType = (row.FuelType || '').toLowerCase().trim() || null;
  
  // Parse engine size if available
  let engineSize = row.EngineCC ? parseFloat(row.EngineCC) : null;
  
  // Parse customer ID if available
  const customerId = row._ID_Customer ? stringToId(row._ID_Customer) : null;
  
  // Initialize MOT fields
  let motExpiryDate = parseDate(row.status_LastInvoiceDate)?.toISOString() || null;
  let motStatus: string | null = null;
  let motLastChecked: string | null = null;
  let motTestNumber: string | null = null;
  let motMileage: number | null = null;
  let motTestResult: string | null = null;
  
  // If we have a valid registration and DVLA is configured, try to enrich with DVLA data
  if (registration && registration.length >= 2 && registration.length <= 10 && dvlaApi) {
    try {
      const dvlaData = await lookupVehicleDetails(registration);
      if (dvlaData) {
        // Update vehicle details from DVLA if we don't have them
        if (!year && dvlaData.yearOfManufacture) {
          // Convert to string first to ensure safe parsing
          const yearValue = typeof dvlaData.yearOfManufacture === 'number' 
            ? dvlaData.yearOfManufacture 
            : parseInt(String(dvlaData.yearOfManufacture), 10);
          
          if (!isNaN(yearValue) && yearValue > 1900 && yearValue <= new Date().getFullYear() + 1) {
            year = yearValue;
            console.log(`📅 Set year to ${year} from DVLA for ${registration}`);
          }
        }
        
        if (!color && dvlaData.colour) {
          color = String(dvlaData.colour).toLowerCase();
          console.log(`🎨 Set color to ${color} from DVLA for ${registration}`);
        }
        
        if (!fuelType && dvlaData.fuelType) {
          fuelType = dvlaData.fuelType.toLowerCase();
          console.log(`⛽ Set fuel type to ${fuelType} from DVLA for ${registration}`);
        }
        
        if (!engineSize && dvlaData.engineCapacity) {
          engineSize = parseInt(String(dvlaData.engineCapacity), 10);
          if (!isNaN(engineSize)) {
            console.log(`🔧 Set engine size to ${engineSize}cc from DVLA for ${registration}`);
          } else {
            engineSize = undefined;
          }
        }
        
        // Get MOT data if available
        if (dvlaData.motStatus) {
          motStatus = dvlaData.motStatus;
          motExpiryDate = dvlaData.motExpiryDate || motExpiryDate;
          
          // Use dateOfLastV5CIssued as a fallback for motLastChecked
          motLastChecked = dvlaData.dateOfLastV5CIssued || motLastChecked;
          
          // Convert engine capacity to a number for motMileage if needed
          if (typeof dvlaData.engineCapacity === 'number') {
            motMileage = Math.round(dvlaData.engineCapacity);
          } else if (typeof dvlaData.engineCapacity === 'string') {
            const mileage = parseInt(dvlaData.engineCapacity, 10);
            if (!isNaN(mileage)) {
              motMileage = mileage;
            }
          }
          
          if (motExpiryDate) {
            console.log(`📋 Set MOT expiry to ${motExpiryDate} from DVLA for ${registration}`);
          }
        }
      }
    } catch (error) {
      console.error(`⚠️  Error enriching vehicle ${registration} with DVLA data:`, error);
    }
  }
  
  // Ensure we have required fields for the database
  const dbYear = year ?? 0; // Default to 0 if year is null
  
  return {
    id: stringToId(row._ID),
    registration,
    make: vehicleMake,
    model: vehicleModel,
    year: dbYear, // Use the non-null year value
    color,
    fuel_type: fuelType,
    engine_size: engineSize,
    customer_id: customerId,
    mot_expiry_date: motExpiryDate,
    mot_status: motStatus,
    mot_last_checked: motLastChecked,
    mot_test_number: motTestNumber,
    mot_mileage: motMileage,
    mot_test_result: motTestResult,
    created_at: parseDate(row.sys_TimeStamp_Creation)?.toISOString() || new Date().toISOString(),
    updated_at: parseDate(row.sys_TimeStamp_Updated)?.toISOString() || new Date().toISOString()
  };
}

// Import configuration
const importConfigs = [
  { 
    name: 'customers', 
    file: 'Customers.csv',
    idField: '_ID',
    transform: transformCustomer
  },
  { 
    name: 'vehicles', 
    file: 'Vehicles.csv',
    idField: '_ID',
    transform: transformVehicle
  },
  // Add other import configurations as needed
];



async function importData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Use the imported stats type

  const stats: ImportStats = {};

  try {
    // Process each import configuration
    for (const config of importConfigs) {
      const { name, file, transform } = config;
      console.log(`\n=== Processing ${name} (${file}) ===`);
      
      stats[name] = { total: 0, inserted: 0, updated: 0, errors: 0, errorDetails: [] };
      
      const filePath = path.join(process.env.HOME!, 'Google Drive/My Drive/Data Exports', file);

      if (!fs.existsSync(filePath)) {
        console.error(`⚠️  File not found: ${filePath}`);
        continue;
      }

      console.log(`Reading ${file}...`);
      const rows = await new Promise<any[]>((resolve, reject) => {
        const results: any[] = [];
        fs.createReadStream(filePath)
          .pipe(csv.parse({ headers: true }))
          .on('data', async (row) => {
            try {
              // Transform the row (await in case transform is async)
              const transformed = transform ? await transform(row) : row;
              if (transformed !== null) {
                results.push(transformed);
              }
            } catch (error) {
              console.warn(`⚠️  Error transforming row:`, error instanceof Error ? error.message : String(error));
            }
          })
          .on('end', () => resolve(results))
          .on('error', reject);
      });

      stats[name].total = rows.length;
      console.log(`Found ${rows.length} valid rows to process`);

      if (rows.length === 0) {
        console.log('No data to import');
        continue;
      }

      // Get column names from first row
      const columns = Object.keys(rows[0] || {});
      if (columns.length === 0) continue;

      // Process rows in batches
      const BATCH_SIZE = 100;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        
        if (batch.length === 0) continue;

        try {
          // Generate placeholders and values for the batch
          const placeholders = batch.map((_, i) => 
            `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(',')})`
          ).join(',');

          // Generate the SET clause for ON CONFLICT UPDATE
          const updateColumns = columns
            .filter(c => c !== 'id' && c !== 'created_at')
            .map(c => `"${c}" = EXCLUDED."${c}"`)
            .join(',');

          const query = `
            INSERT INTO "${name}" (${columns.map(c => `"${c}"`).join(',')})
            VALUES ${placeholders}
            ON CONFLICT (id) DO UPDATE SET
            ${updateColumns}
            RETURNING id
          `;

          // Flatten the batch into a single array of values
          const values = batch.flatMap(row => 
            columns.map(col => {
              const val = row[col];
              if (val === '' || val === undefined || val === null) return null;
              if (typeof val === 'boolean') return val;
              if (typeof val === 'number') return val;
              return String(val);
            })
          );

          // Execute the query
          const client = await pool.connect();
          try {
            const result = await client.query(query, values);
            stats[name].inserted += result.rowCount || 0;
            stats[name].updated += batch.length - (result.rowCount || 0);
          } finally {
            client.release();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Error in batch ${batchNumber}:`, errorMessage);
          stats[name].errors += batch.length;
          stats[name].errorDetails?.push(`Batch ${batchNumber}: ${errorMessage}`);
          
          // Try inserting rows one by one to identify problematic rows
          await processRowsIndividually(pool, name, batch, stats[name]);
        }
      }

      console.log(`✅ ${name}: ${stats[name].inserted} inserted, ${stats[name].updated} updated, ${stats[name].errors} errors`);
    }

    // Save import statistics
    await saveImportStats(stats);

    console.log('\n=== Import Statistics ===');
    console.table(
      Object.entries(stats).map(([table, stat]) => ({
        Table: table,
        'Total Rows': stat.total,
        'Inserted': stat.inserted,
        'Updated': stat.updated,
        'Errors': stat.errors
      }))
    );

    console.log('\n✅ Import completed successfully!');
  }
  catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}


async function processRowsIndividually(pool: Pool, table: string, rows: any[], stats: any) {
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const columns = Object.keys(row);
      
      const placeholders = `(${columns.map((_, i) => `$${i + 1}`).join(',')})`;
      
      const updateColumns = columns
        .filter(c => c !== 'id' && c !== 'created_at')
        .map((c, i) => `"${c}" = $${i + 1 + columns.length}`)
        .join(',');
      
      const query = `
        INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')})
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
        ${updateColumns}
        RETURNING id
      `;
      
      const values = columns.map(col => {
        const val = row[col];
        if (val === '' || val === undefined || val === null) return null;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'number') return val;
        return val;
      });
      
      try {
        await client.query(query, [...values, ...values]); // Values are duplicated for the UPDATE part
        stats.inserted++;
      } catch (error) {
        console.error(`❌ Error inserting row ${i + 1}:`, error instanceof Error ? error.message : String(error));
        console.error('Problematic row:', JSON.stringify(row, null, 2));
        stats.errors++;
        stats.errorDetails?.push(`Row ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    client.release();
  }
}

async function createTableIfNotExists(pool: Pool, tableName: string, columns: string[]) {
  const client = await pool.connect();
  try {
    // Check if table exists
    const tableExists = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
      [tableName]
    );
    
    if (!tableExists.rows[0].exists) {
      console.log(`Creating table ${tableName}...`);
      
      // Define column types based on column names and sample data
      const columnDefs = columns.map(col => {
        // This is a simplified example - you'd want to map column names to appropriate types
        if (col === 'id') return 'id INTEGER PRIMARY KEY';
        if (col.endsWith('_at') || col.endsWith('_date')) return `"${col}" TIMESTAMP`;
        if (col.endsWith('_id')) return `"${col}" INTEGER`;
        if (col === 'email') return `"${col}" TEXT`;
        if (col === 'phone') return `"${col}" TEXT`;
        if (col === 'registration') return `"${col}" TEXT UNIQUE`;
        return `"${col}" TEXT`;
      });
      
      await client.query(`
        CREATE TABLE "${tableName}" (
          ${columnDefs.join(',\n          ')},
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log(`✅ Created table ${tableName}`);
    }
  } finally {
    client.release();
  }
}

async function saveImportStats(stats: ImportStats) {
  const statsPath = path.join(__dirname, '../import-stats.json');
  await fs.promises.writeFile(statsPath, JSON.stringify(stats, null, 2));
  console.log(`\n📊 Import statistics saved to: ${statsPath}`);
}

// Run the enhanced import
importData().catch(error => {
  console.error('❌ Unhandled error in import:', error);
  process.exit(1);
});
