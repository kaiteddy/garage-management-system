import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';
import * as dotenv from 'dotenv';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local if not in production
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.warn('Warning: .env.local not found, using process.env');
  }
}

dotenv.config();

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

interface ImportStats {
  [table: string]: {
    total: number;
    inserted: number;
    updated: number;
    errors: number;
    errorDetails?: string[];
  };
}

// Helper to parse dates from various formats
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD-MM-YYYY',
    'YYYY/MM/DD'
  ];
  
  for (const format of formats) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  return new Date(); // Default to current date if parsing fails
}

async function importData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stats: ImportStats = {};
  
  // Helper function to ensure pool is properly closed
  const cleanup = async () => {
    try {
      await pool.end();
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
  };
  
  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\nGracefully shutting down...');
    await cleanup();
    process.exit(0);
  });
  
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled rejection:', reason);
    await cleanup();
    process.exit(1);
  });
  
  // Define import order based on dependencies
  const importConfigs = [
    { 
      name: 'customers', 
      file: 'Customers.csv',
      idField: '_ID',
      transform: (row: any) => {
        // Generate a stable ID from the row data or create a hash if _ID is missing
        const generateId = (id: string): number => {
          if (!id) {
            // If no ID, create a hash from other fields to maintain consistency
            const source = [
              row.first_name,
              row.last_name,
              row.email,
              row.phone,
              row.address_line1,
              row.city,
              row.postcode
            ].filter(Boolean).join('_');
            
            if (!source) return Math.floor(Math.random() * 1000000000); // Fallback random ID
            
            let hash = 0;
            for (let i = 0; i < source.length; i++) {
              const char = source.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            return Math.abs(hash);
          }
          
          if (/^\d+$/.test(id)) {
            return parseInt(id, 10);
          }
          
          // Hash string IDs
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };
        
        const id = generateId(row._ID);
        
        // Create name from available fields
        let name = 'Unknown Customer';
        if (row.first_name || row.last_name) {
          name = [row.first_name || '', row.last_name || ''].filter(Boolean).join(' ').trim();
        } else if (row.name) {
          name = row.name;
        } else if (row.email) {
          name = row.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ').trim();
          if (!name) name = 'Customer ' + id.toString().slice(-4);
        }
        
        // Create contact info
        const email = row.email || '';
        const phone = row.phone || row.mobile || row.telephone || '';
        
        // Build address from available components
        const addressParts = [
          row.address_line1 || row.address1 || row.street || row.street_address,
          row.address_line2 || row.address2,
          row.city || row.town,
          row.county || row.region || row.province,
          row.postcode || row.postal_code || row.zip_code
        ].filter(Boolean);
        
        const address = addressParts.join(', ');
        
        // Log warnings for missing critical data
        if (!row._ID) console.warn(`⚠️  Generated ID for customer: ${id} (missing _ID)`);
        if (!email && !phone) console.warn(`⚠️  Customer ${id}: No contact information (email/phone)`);
        if (addressParts.length === 0) console.warn(`⚠️  Customer ${id}: No address information`);
        
        return {
          id,
          name,
          email,
          phone,
          address,
          created_at: parseDate(row.sys_TimeStamp_Creation)?.toISOString() || new Date().toISOString(),
          updated_at: parseDate(row.sys_TimeStamp_Updated)?.toISOString() || new Date().toISOString()
        };
      }
    },
    {
      name: 'vehicles',
      file: 'Vehicles.csv',
      idField: '_ID',
      transform: (row: any) => {
        // Convert string ID to integer if it's a number, otherwise hash it
        const stringToId = (id: string): number => {
          if (/^\d+$/.test(id)) {
            return parseInt(id, 10);
          }
          // Simple hash function for string IDs
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          return Math.abs(hash);
        };
        
        // Generate a default registration if missing, ensuring it's unique
        let registration = row.registration || row.reg_number || row.reg;
        
        if (!registration) {
          // Create a more unique registration using a hash of the ID, timestamp, and a random number
          const timestamp = Date.now().toString(36).slice(-4);
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const uniquePart = String(stringToId([
            row._ID,
            row.make,
            row.model,
            row.year,
            timestamp,
            random
          ].filter(Boolean).join('_'))).slice(-8);
          
          registration = `UNK-${timestamp}${random}${uniquePart}`.slice(0, 20); // Ensure reasonable length
          console.warn(`⚠️  Vehicle ${row._ID}: Missing registration number, using generated: ${registration}`);
        }
        
        // If customer ID is missing, we'll still import but log a warning
        if (!row._ID_Customer) {
          console.warn(`⚠️  Vehicle ${row._ID}: Missing customer ID, will be set to NULL`);
        }
        
        // Parse year as integer if it exists and is a valid number
        const year = row.year && !isNaN(parseInt(row.year, 10)) ? parseInt(row.year, 10) : null;
        
        return {
          id: stringToId(row._ID),
          registration: registration,
          make: row.make || row.manufacturer || row.brand || '',
          model: row.model || '',
          year: year,
          color: row.color || row.colour || '',
          fuel_type: row.fuel_type || row.fuel || '',
          engine_size: row.engine_size || row.engine || '',
          customer_id: row._ID_Customer ? stringToId(row._ID_Customer) : null,
          mot_expiry_date: row.mot_expiry_date || row.mot_expiry || null,
          mot_status: row.mot_status || '',
          mot_test_number: row.mot_test_number || row.mot_number || '',
          mot_mileage: row.mot_mileage && !isNaN(parseInt(row.mot_mileage, 10)) ? parseInt(row.mot_mileage, 10) : null,
          mot_test_result: row.mot_test_result || row.mot_result || '',
          created_at: parseDate(row.sys_TimeStamp_Creation)?.toISOString() || new Date().toISOString(),
          updated_at: parseDate(row.sys_TimeStamp_Updated)?.toISOString() || new Date().toISOString()
        };
      }
    },
    {
      name: 'documents',
      file: 'Documents.csv',
      idField: '_ID',
      transform: (row: any) => {
        // Reuse the stringToId function from vehicles
        const stringToId = (id: string): number => {
          if (!id) return 0; // Return 0 for null/undefined
          if (/^\d+$/.test(id)) {
            return parseInt(id, 10);
          }
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };
        
        return {
          id: stringToId(row._ID),
          document_type: row.document_type || 'other',
          customer_id: row._ID_Customer ? stringToId(row._ID_Customer) : null,
          vehicle_id: row._ID_Vehicle ? stringToId(row._ID_Vehicle) : null,
          status: row.status || '',
          total_amount: row.total_amount ? parseFloat(row.total_amount) : 0,
          created_at: parseDate(row.sys_TimeStamp_Creation)?.toISOString() || new Date().toISOString(),
          updated_at: parseDate(row.sys_TimeStamp_Updated)?.toISOString() || new Date().toISOString()
        };
      }
    },
    {
      name: 'document_extras',
      file: 'Document_Extras.csv',
      idField: '_ID',
      transform: (row: any) => {
        const stringToId = (id: string): number => {
          if (!id) return 0;
          if (/^\d+$/.test(id)) return parseInt(id, 10);
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };
        
        return {
          id: stringToId(row._ID),
          document_id: row._ID_Document ? stringToId(row._ID_Document) : null,
          name: row.name || '',
          type: row.type || '',
          data: row.data || null,
          created_at: parseDate(row.created_at)?.toISOString() || new Date().toISOString(),
          updated_at: parseDate(row.updated_at)?.toISOString() || new Date().toISOString()
        };
      }
    },
    {
      name: 'line_items',
      file: 'LineItems.csv',
      idField: '_ID',
      transform: (row: any) => {
        const stringToId = (id: string): number => {
          if (!id) return 0;
          if (/^\d+$/.test(id)) return parseInt(id, 10);
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };
        
        return {
          id: stringToId(row._ID),
          document_id: row._ID_Document ? stringToId(row._ID_Document) : null,
          description: row.itemDescription || '',
          quantity: row.itemQuantity ? parseFloat(row.itemQuantity) : 1,
          unit_price: row.itemUnitPrice ? parseFloat(row.itemUnitPrice) : 0,
          total_price: row.itemSub_Net ? parseFloat(row.itemSub_Net) : 0,
          tax_amount: row.itemSub_Tax ? parseFloat(row.itemSub_Tax) : 0,
          created_at: parseDate(row.sys_TimeStamp_Creation)?.toISOString() || new Date().toISOString()
        };
      }
    },
    {
      name: 'receipts',
      file: 'Receipts.csv',
      idField: '_ID',
      transform: (row: any) => {
        const stringToId = (id: string): number => {
          if (!id) return 0;
          if (/^\d+$/.test(id)) return parseInt(id, 10);
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };
        
        return {
          id: stringToId(row._ID),
          document_id: row._ID_Document ? stringToId(row._ID_Document) : null,
          amount: row.Amount ? parseFloat(row.Amount) : 0,
          payment_date: parseDate(row.Date)?.toISOString() || new Date().toISOString(),
          payment_method: row.Method || '',
          reference: row.Description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    },
    {
      name: 'appointments',
      file: 'Appointments.csv',
      idField: '_ID',
      transform: (row: any) => {
        const stringToId = (id: string): number => {
          if (!id) return 0;
          if (/^\d+$/.test(id)) return parseInt(id, 10);
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };
        
        return {
          id: stringToId(row._ID),
          customer_id: row._ID_Customer ? stringToId(row._ID_Customer) : null,
          vehicle_id: row._ID_Vehicle ? stringToId(row._ID_Vehicle) : null,
          start_time: parseDate(row.start_time)?.toISOString() || new Date().toISOString(),
          end_time: parseDate(row.end_time)?.toISOString() || new Date().toISOString(),
          status: row.status || 'scheduled',
          notes: row.notes || '',
          created_at: parseDate(row.sys_TimeStamp_Creation)?.toISOString() || new Date().toISOString(),
          updated_at: parseDate(row.sys_TimeStamp_Updated)?.toISOString() || new Date().toISOString()
        };
      }
    }
  ];

  // Create tables if they don't exist
  await createTablesIfNotExist(pool);

  for (const config of importConfigs) {
    const { name, file, idField, transform } = config;
    console.log(`\n=== Processing ${name} (${file}) ===`);
    
    stats[name] = { total: 0, inserted: 0, updated: 0, errors: 0, errorDetails: [] };
    
    const filePath = path.join(
      process.env.HOME!,
      'Google Drive/My Drive/Data Exports',
      file
    );

    if (!fs.existsSync(filePath)) {
      console.error(`⚠️  File not found: ${filePath}`);
      continue;
    }

    console.log(`Reading ${file}...`);
    const rows = await new Promise<any[]>((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => {
          const transformed = transform ? transform(row) : row;
          if (transformed !== null) {
            results.push(transformed);
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    stats[name].total = rows.length;
    console.log(`Found ${rows.length} valid rows to process (after filtering out invalid rows)`);

    // Process in batches
    const batchSize = 50; // Reduced batch size for reliability
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(rows.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, rows.length)} of ${rows.length})`);

      // Skip empty batches (shouldn't happen but just in case)
      if (batch.length === 0) continue;

      const columns = Object.keys(batch[0]);
      const values = batch.flatMap(row => 
        columns.map(col => {
          const val = row[col];
          if (val === '' || val === undefined) return null;
          if (val === 'true') return true;
          if (val === 'false') return false;
          return val;
        })
      );

      const placeholders = batch.map((_, i) => 
        `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(',')})`
      ).join(',');

      const updateColumns = columns
        .filter(c => c !== 'id' && c !== 'created_at') // Don't update created_at
        .map(c => `${c} = EXCLUDED.${c}`)
        .join(',');

      const query = `
        INSERT INTO ${name} (${columns.join(',')})
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
        ${updateColumns}
        RETURNING id
      `;

      try {
        const client = await pool.connect();
        try {
          const result = await client.query(query, values);
          stats[name].inserted += result.rowCount || 0;
          stats[name].updated += batch.length - (result.rowCount || 0);
        } finally {
          client.release();
        }
      } catch (error: any) {
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
  await writeFile(
    'import-stats.json',
    JSON.stringify(stats, null, 2)
  );
  
  console.log('\n=== Import Statistics ===');
  console.table(
    Object.entries(stats).map(([table, stat]) => ({
      Table: table,
      Total: stat.total,
      Inserted: stat.inserted,
      Updated: stat.updated,
      Errors: stat.errors
    }))
  );

  return stats;
}

async function processRowsIndividually(pool: Pool, table: string, rows: any[], stats: any) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const columns = Object.keys(row);
    const values = columns.map(col => {
      const val = row[col];
      if (val === '' || val === undefined) return null;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    });

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
    const updateColumns = columns
      .filter(c => c !== 'id' && c !== 'created_at')
      .map(c => `${c} = EXCLUDED.${c}`)
      .join(',');

    const query = `
      INSERT INTO ${table} (${columns.join(',')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET
      ${updateColumns}
      RETURNING id
    `;

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(query, values);
        if (result.rowCount && result.rowCount > 0) {
          stats.inserted++;
          stats.errors--; // Adjust error count since we're now processing individually
        } else {
          stats.updated++;
        }
      } finally {
        client.release();
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error inserting row ${i + 1}:`, errorMessage);
      console.error('Problematic row:', JSON.stringify(row, null, 2));
    }
  }
}

async function createTablesIfNotExist(pool: Pool) {
  console.log('Ensuring tables exist...');
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      postcode TEXT,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE
    )`,
    
    `CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      registration TEXT,
      make TEXT,
      model TEXT,
      year INTEGER,
      color TEXT,
      vin TEXT,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT unique_registration UNIQUE (registration)
    )`,
    
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      document_type TEXT,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      status TEXT,
      total_amount DECIMAL(10, 2),
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE
    )`,
    
    `CREATE TABLE IF NOT EXISTS document_extras (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
      name TEXT,
      type TEXT,
      data JSONB,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE
    )`,
    
    `CREATE TABLE IF NOT EXISTS line_items (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
      description TEXT,
      quantity DECIMAL(10, 2),
      unit_price DECIMAL(10, 2),
      total_price DECIMAL(10, 2),
      tax_amount DECIMAL(10, 2),
      created_at TIMESTAMP WITH TIME ZONE
    )`,
    
    `CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2),
      payment_date TIMESTAMP WITH TIME ZONE,
      payment_method TEXT,
      reference TEXT,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE
    )`,
    
    `CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      status TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE
    )`
  ];

  for (const query of tables) {
    try {
      const client = await pool.connect();
      try {
        await client.query(query);
      } finally {
        client.release();
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating table:`, errorMessage);
      throw error;
    }
  }
  
  console.log('All tables verified/created');
}

// Run the import
importData()
  .then(async () => {
    console.log('✅ Import completed successfully!');
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
