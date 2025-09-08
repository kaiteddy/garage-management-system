import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables from .env file
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

async function fixSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  const client = await pool.connect();
  
  try {
    console.log('Fixing database schema...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // 1. First, drop foreign key constraints that might be using the owner_id
    console.log('Dropping foreign key constraints...');
    await client.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT conname, conrelid::regclass AS table_name
          FROM pg_constraint
          WHERE contype = 'f' 
          AND conname LIKE '%owner_id%'
        ) LOOP
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.conname);
          RAISE NOTICE 'Dropped constraint: % on table %', r.conname, r.table_name;
        END LOOP;
      END $$;
    `);
    
    // 2. Alter the owner_id column in vehicles to match customers.id type
    console.log('Altering vehicles.owner_id column type...');
    await client.query(`
      ALTER TABLE vehicles 
      ALTER COLUMN owner_id TYPE INTEGER USING (NULLIF(owner_id, '')::INTEGER);
    `);
    
    // 3. Recreate the foreign key constraint
    console.log('Recreating foreign key constraints...');
    await client.query(`
      ALTER TABLE vehicles
      ADD CONSTRAINT fk_vehicles_customers
      FOREIGN KEY (owner_id) 
      REFERENCES customers(id)
      ON DELETE SET NULL;
    `);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Database schema fixed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema()
  .then(() => console.log('✅ Schema fix completed'))
  .catch(error => {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  });
