import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkTableSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 [SCHEMA-CHECK] Checking database schema...\n');

    // Check vehicles table schema
    const vehicleSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      ORDER BY ordinal_position
    `);

    console.log('🚗 VEHICLES TABLE SCHEMA:');
    vehicleSchema.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) default: ${col.column_default || 'none'}`);
    });

    // Check customers table schema
    const customerSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      ORDER BY ordinal_position
    `);

    console.log('\n👤 CUSTOMERS TABLE SCHEMA:');
    customerSchema.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) default: ${col.column_default || 'none'}`);
    });

    // Sample data from vehicles
    const vehicleSample = await client.query(`
      SELECT * FROM vehicles LIMIT 3
    `);

    console.log('\n🚗 SAMPLE VEHICLES DATA:');
    vehicleSample.rows.forEach((vehicle, index) => {
      console.log(`   Vehicle ${index + 1}:`, vehicle);
    });

    // Sample data from customers
    const customerSample = await client.query(`
      SELECT * FROM customers LIMIT 3
    `);

    console.log('\n👤 SAMPLE CUSTOMERS DATA:');
    customerSample.rows.forEach((customer, index) => {
      console.log(`   Customer ${index + 1}:`, customer);
    });

  } catch (error) {
    console.error('❌ [SCHEMA-CHECK] Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableSchema().catch(console.error);
