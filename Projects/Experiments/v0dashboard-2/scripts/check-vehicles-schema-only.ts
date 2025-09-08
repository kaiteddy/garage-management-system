import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkVehiclesSchema() {
  const client = await pool.connect();
  try {
    console.log('\n🚗 Vehicles Table Schema:');
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vehicles';
    `);
    
    console.table(res.rows);
    
    // Also check constraints
    console.log('\n🔑 Primary Key:');
    const pkRes = await client.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'vehicles' 
        AND tc.constraint_type = 'PRIMARY KEY';
    `);
    console.log('Primary Key:', pkRes.rows);
    
    // Check foreign keys
    console.log('\n🔗 Foreign Keys:');
    const fkRes = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'vehicles';
    `);
    console.table(fkRes.rows);
    
  } catch (error) {
    console.error('❌ Error checking vehicles schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkVehiclesSchema().catch(console.error);
