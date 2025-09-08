import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables from .env file
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

interface Customer {
  id: string;         // Original ID from CSV
  db_id: number | null; // Auto-generated database ID
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface CsvRow {
  [key: string]: string;
}

// Map to store original ID to database ID mapping
const customerIdMap = new Map<string, number>();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Simple CSV parser function that handles quoted values
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const result: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const obj: Record<string, string> = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        obj[header] = values[j] || '';
      }
      
      result.push(obj);
    } catch (error) {
      console.error(`Error parsing line ${i + 1}: ${lines[i]}`);
      console.error(error);
    }
  }
  
  return result;
}

// Helper function to parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle inQuotes when we hit a quote
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Only split on comma if not in quotes
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  // Remove surrounding quotes from each field
  return result.map(field => 
    field.startsWith('"') && field.endsWith('"') 
      ? field.slice(1, -1) 
      : field
  );
}

// Function to validate and format email
function formatEmail(email?: string): string | null {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email.toLowerCase().trim() : null;
}

// Function to validate and format phone number
function formatPhoneNumber(phone?: string): string | null {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Basic validation for UK numbers
  if (digits.length >= 10) {
    return digits.startsWith('0') ? `+44${digits.substring(1)}` : `+${digits}`;
  }
  return null;
}

// Function to import customers
async function importCustomers(client: any, filePath: string): Promise<{successCount: number, errorCount: number}> {
  console.log(`\nImporting customers from ${filePath}...`);
  
  let successCount = 0;
  let errorCount = 0;
  let rowCount = 0;
  
  // First, get the next sequence value for the ID
  let nextId = 1;
  try {
    const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM customers');
    nextId = parseInt(maxIdResult.rows[0].next_id) || 1;
  } catch (error) {
    console.warn('Could not determine next customer ID, starting from 1');
  }
  
  try {
    console.log(`Reading file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log('File read successfully, parsing CSV...');
    
    const rows = parseCSV(fileContent);
    console.log(`Parsed ${rows.length} rows from CSV`);
    
    for (const [index, row] of rows.entries()) {
      try {
        // Log progress every 100 records
        if (index > 0 && index % 100 === 0) {
          console.log(`Processing row ${index + 1} of ${rows.length}...`);
        }
        
        // Log first row for debugging
        if (index === 0) {
          console.log('First row sample:', JSON.stringify(row, null, 2));
        }
        
        // Skip if no identifier
        if (!row._ID) {
          console.warn(`Skipping row ${index + 1}: Missing customer ID`);
          errorCount++;
          continue;
        }

        // Format customer name
        const nameParts = [];
        if (row.nameForename) nameParts.push(row.nameForename.trim());
        if (row.nameSurname) nameParts.push(row.nameSurname.trim());
        if (nameParts.length === 0 && row.nameCompany) {
          nameParts.push(row.nameCompany.trim());
        }
        const fullName = nameParts.join(' ');
        
        // Format address components
        const addressParts = [
          row.addressHouseNo,
          row.addressRoad,
          row.addressLocality,
          row.addressTown,
          row.addressPostCode,
          row.addressCounty
        ].filter(Boolean);
        
        const address = addressParts.length > 0 ? addressParts.join(', ') : null;
        
        // Get primary phone number
        const phone = formatPhoneNumber(row.contactMobile || row.contactTelephone);
        
        const query = `
          INSERT INTO customers (
            id, name, email, phone, address, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            updated_at = NOW()
          RETURNING id;
        `;
        
        // Store the mapping from original ID to database ID
        const dbId = nextId++;
        customerIdMap.set(row._ID, dbId);
        
        const values: (string | number | null)[] = [
          dbId,
          fullName || 'Unknown Customer',
          formatEmail(row.contactEmail),
          phone,
          address
        ];
        
        await client.query(query, values);
        successCount++;
        
        // Log progress every 100 records
        if (successCount % 100 === 0) {
          console.log(`Processed ${successCount} customers...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`\nError processing customer row ${index + 1} (ID: ${row._ID || 'unknown'}):`);
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          if ('code' in error) {
            console.error('Error code:', (error as any).code);
          }
          if ('detail' in error) {
            console.error('Error details:', (error as any).detail);
          }
          console.error('Error stack:', error.stack);
        } else {
          console.error('Unknown error:', error);
        }
        console.error('Problematic row data:', JSON.stringify(row, null, 2));
      }
    }
    
    console.log(`\nCustomer import complete. Success: ${successCount}, Errors: ${errorCount}`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('\nFATAL ERROR in customer import:');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if ('code' in error) {
        console.error('Error code:', (error as any).code);
      }
      if ('detail' in error) {
        console.error('Error details:', (error as any).detail);
      }
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}

// Function to extract year from various date formats
function extractYear(dateStr?: string, registration?: string): number | null {
  // Try to extract from date string (DD/MM/YYYY or MM/DD/YYYY)
  if (dateStr) {
    // Try DD/MM/YYYY format
    let dateParts = dateStr.split('/');
    if (dateParts.length === 3) {
      // If first part is > 12, it's probably DD/MM/YYYY
      if (parseInt(dateParts[0]) > 12) {
        return parseInt(dateParts[2]);
      }
      // Otherwise assume MM/DD/YYYY
      return parseInt(dateParts[2]);
    }
    
    // Try YYYY-MM-DD format
    const isoMatch = dateStr.match(/^(\d{4})/);
    if (isoMatch) {
      return parseInt(isoMatch[1]);
    }
  }
  
  // Try to extract from registration (UK format)
  if (registration) {
    // Match last two digits (for years 2000-2099)
    const yearMatch = registration.match(/(\d{2})[^\d]*$/);
    if (yearMatch) {
      const yearPrefix = parseInt(yearMatch[1]);
      return 2000 + yearPrefix;
    }
    
    // Match first two digits (for years 2000-2099)
    const prefixMatch = registration.match(/^(\d{2})/);
    if (prefixMatch) {
      const yearPrefix = parseInt(prefixMatch[1]);
      return yearPrefix < 50 ? 2000 + yearPrefix : 1900 + yearPrefix;
    }
  }
  
  return null;
}

// Function to normalize fuel type
function normalizeFuelType(fuelType?: string): string | null {
  if (!fuelType) return null;
  
  const type = fuelType.trim().toLowerCase();
  if (type.includes('petrol')) return 'Petrol';
  if (type.includes('diesel')) return 'Diesel';
  if (type.includes('electric') || type.includes('ev')) return 'Electric';
  if (type.includes('hybrid')) return 'Hybrid';
  if (type.includes('lpg') || type.includes('gas')) return 'LPG';
  
  // Default to capitalizing first letter
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Function to normalize color
function normalizeColor(color?: string): string | null {
  if (!color) return null;
  
  // Remove extra spaces and special characters
  let normalized = color.trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-]/g, '')
    .toLowerCase();
  
  // Capitalize first letter of each word
  return normalized.replace(/\b\w/g, l => l.toUpperCase());
}

// Function to import vehicles
async function importVehicles(client: any, filePath: string): Promise<{successCount: number, errorCount: number}> {
  console.log(`\nImporting vehicles from ${filePath}...`);
  
  let successCount = 0;
  let errorCount = 0;
  let rowCount = 0;
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(fileContent);
    
    for (const [index, row] of rows.entries()) {
      try {
        // Skip if no identifier or registration
        if (!row._ID) {
          console.warn(`Skipping row ${index + 1}: Missing vehicle ID`);
          errorCount++;
          continue;
        }
        
        // Get registration (prefer Registration, fall back to VRM_Change1)
        const registration = (row.Registration || row.VRM_Change1 || '').trim().toUpperCase();
        if (!registration) {
          console.warn(`Skipping vehicle ${row._ID}: Missing registration`);
          errorCount++;
          continue;
        }
        
        // Extract make and model (both are required)
        const make = (row.Make || '').trim();
        const model = (row.Model || '').trim();
        
        if (!make || !model) {
          console.warn(`Skipping vehicle ${registration}: Missing make or model`);
          errorCount++;
          continue;
        }
        
        // Extract and validate year
        const year = extractYear(row.DateofReg, registration);
        if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
          console.warn(`Vehicle ${registration}: Invalid year (${year}), using null`);
        }
        
        // Format other fields
        const color = normalizeColor(row.Colour);
        const fuelType = normalizeFuelType(row.FuelType);
        const engineSize = row.EngineCC ? parseFloat(row.EngineCC).toString() : null;
        // Note: VIN column doesn't exist in the database, we'll store it in mot_test_number for now
        const vin = (row.VIN || '').trim().toUpperCase() || null;
        
        // Look up the database ID for this customer
        let customerDbId = null;
        if (row._ID_Customer) {
          customerDbId = customerIdMap.get(row._ID_Customer) || null;
          if (!customerDbId) {
            console.warn(`Customer ${row._ID_Customer} not found in imported data for vehicle ${registration}`);
          }
        }
        
        // Format MOT and tax dates
        let motExpiryDate = null;
        if (row.MOT_Expiry_Date) {
          const motDate = new Date(row.MOT_Expiry_Date);
          motExpiryDate = isNaN(motDate.getTime()) ? null : motDate.toISOString().split('T')[0];
        }
        
        const query = `
          INSERT INTO vehicles (
            id, registration, make, model, year, 
            color, fuel_type, engine_size, 
            customer_id, mot_status, mot_expiry_date, mot_test_number,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            registration = EXCLUDED.registration,
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            color = EXCLUDED.color,
            fuel_type = EXCLUDED.fuel_type,
            engine_size = EXCLUDED.engine_size,
            customer_id = EXCLUDED.customer_id,
            mot_status = EXCLUDED.mot_status,
            mot_expiry_date = EXCLUDED.mot_expiry_date,
            mot_test_number = EXCLUDED.mot_test_number,
            updated_at = NOW()
          RETURNING id;
        `;
        
        const values = [
          row._ID,
          registration,
          make,
          model,
          year && year >= 1900 && year <= new Date().getFullYear() + 1 ? year : null,
          color,
          fuelType,
          engineSize,
          customerDbId,
          row.MOT_Status || null,
          motExpiryDate,
          vin // Storing VIN in mot_test_number for now
        ];
        
        await client.query(query, values);
        successCount++;
        
        // Log progress every 100 records
        if (successCount % 100 === 0) {
          console.log(`Processed ${successCount} vehicles...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error importing vehicle at row ${index + 1} (ID: ${row._ID || 'unknown'}):`, error instanceof Error ? error.message : error);
      }
    }
    
    console.log(`\nVehicle import complete. Success: ${successCount}, Errors: ${errorCount}`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('Error in vehicle import:', error);
    throw error;
  }
}

// Function to check if tables exist
async function checkTablesExist(client: import('pg').PoolClient): Promise<boolean> {
  try {
    // Check customers table
    await client.query(`
      SELECT 1 FROM customers LIMIT 1
    `);
    
    // Check vehicles table
    await client.query(`
      SELECT 1 FROM vehicles LIMIT 1
    `);
    
    return true;
  } catch (error) {
    console.error('Error: Required tables do not exist. Please run migrations first.');
    return false;
  }
}

// Function to create indexes after import
async function createIndexes(client: import('pg').PoolClient) {
  try {
    console.log('\nCreating indexes for better query performance...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
      CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
    `);
    
    console.log('Indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Non-fatal error, continue
  }
}

// Main function
async function main() {
  const client = await pool.connect();
  
  try {
    console.log('Starting data import process...');
    
    // Check if tables exist
    if (!await checkTablesExist(client)) {
      process.exit(1);
    }
    
    // Import customers
    console.log('\n=== Importing Customers ===');
    const customersPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv';
    const customerResult = await importCustomers(client, customersPath);
    if (customerResult.errorCount > 0) {
      console.warn(`\n${customerResult.errorCount} customer import errors occurred. Check the logs for details.`);
    }
    
    // Import vehicles
    console.log('\n=== Importing Vehicles ===');
    const vehiclesPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Vehicles.csv';
    const vehicleResult = await importVehicles(client, vehiclesPath);
    
    // Create indexes
    await createIndexes(client);
    
    console.log('\n=== Import Summary ===');
    console.log(`Customers: ${customerResult.successCount} imported, ${customerResult.errorCount} failed`);
    console.log(`Vehicles: ${vehicleResult.successCount} imported, ${vehicleResult.errorCount} failed`);
    console.log('\nImport completed successfully!');
    
  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
main().catch(console.error);
