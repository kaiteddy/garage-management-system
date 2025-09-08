import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    // Check customers table
    console.log('\n📋 Customers Table Schema:');
    const customersRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customers';
    `);
    console.table(customersRes.rows);

    // Check vehicles table
    console.log('\n🚗 Vehicles Table Schema:');
    const vehiclesRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vehicles';
    `);
    console.table(vehiclesRes.rows);

  } catch (error) {
    console.error('❌ Error checking schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema()
  .catch(console.error);
