import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local if not in production
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(process.cwd(), '.env.local');
  const { existsSync } = await import('fs');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.warn('Warning: .env.local not found, using process.env');
  }
}

async function killHangingProcesses() {
  try {
    console.log('🛑 Killing any hanging processes...');
    await execAsync('pkill -f "tsx scripts/" || true');
    console.log('✅ Cleaned up any hanging processes');
  } catch (error) {
    console.warn('⚠️  Could not kill hanging processes:', error instanceof Error ? error.message : String(error));
  }
}

async function cleanupDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  console.log('🔌 Connecting to database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000, // 10 seconds
    idleTimeoutMillis: 5000,
    max: 1 // Use a single connection for cleanup
  });

  const client = await pool.connect();
  let constraintsToRecreate: Array<{conname: string, table_name: string, constraint_def: string}> = [];
  
  try {
    console.log('🔍 Getting list of tables...');
    // Get all tables
    const tables = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    
    console.log(`🧹 Found ${tables.rows.length} tables to clean up`);
    
    // First, drop constraints to avoid foreign key issues
    console.log('🔓 Dropping foreign key constraints...');
    const constraints = await client.query(`
      SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS constraint_def
      FROM pg_constraint 
      WHERE contype = 'f' 
      AND conrelid::regclass::text IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != 'migrations'
      )
    `);
    
    // Store the constraints to recreate them later
    constraintsToRecreate = constraints.rows;
    
    // Drop the constraints
    for (const constraint of constraintsToRecreate) {
      try {
        await client.query(`
          ALTER TABLE ${constraint.table_name} 
          DROP CONSTRAINT ${constraint.conname}
        `);
      } catch (error) {
        console.warn(`  ⚠️ Could not drop constraint ${constraint.conname}:`, 
          error instanceof Error ? error.message : String(error));
      }
    }
    
    // Now truncate all tables except migrations
    for (const table of tables.rows) {
      if (table.tablename !== 'migrations') {
        try {
          console.log(`  - Truncating table: ${table.tablename}`);
          await client.query(`TRUNCATE TABLE "${table.tablename}"`);
        } catch (error) {
          console.error(`  ❌ Error truncating table ${table.tablename}: `, 
            error instanceof Error ? error.message : String(error));
          // Continue with next table
        }
      }
    }
    
    console.log('✅ Database cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    try {
      // Recreate the constraints
      console.log('🔒 Recreating foreign key constraints...');
      for (const constraint of constraintsToRecreate) {
        try {
          await client.query(`
            ALTER TABLE ${constraint.table_name} 
            ADD CONSTRAINT ${constraint.conname} ${constraint.constraint_def}
          `);
        } catch (error) {
          console.warn(`  ⚠️ Could not recreate constraint ${constraint.conname}:`, 
            error instanceof Error ? error.message : String(error));
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not recreate constraints:', e instanceof Error ? e.message : String(e));
    }
    
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Starting database cleanup...');
  
  try {
    await killHangingProcesses();
    await cleanupDatabase();
    console.log('✨ Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the cleanup
main();
