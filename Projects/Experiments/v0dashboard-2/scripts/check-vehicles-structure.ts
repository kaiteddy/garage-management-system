import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkVehiclesTable() {
  const client = await pool.connect();
  
  try {
    // Get table columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Vehicles table columns:');
    console.table(columns.rows);
    
    // Get sample data
    const sampleData = await client.query('SELECT * FROM vehicles LIMIT 3');
    console.log('\n📝 Sample vehicle data:');
    console.table(sampleData.rows);
    
  } catch (error) {
    console.error('Error checking vehicles table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkVehiclesTable().catch(console.error);
