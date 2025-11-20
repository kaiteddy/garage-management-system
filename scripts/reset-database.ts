import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Create a direct connection to Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Getting list of tables...');
    
    // Get table names
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );

    if (tables.rows.length === 0) {
      console.log('No tables found in the database.');
      return;
    }

    console.log('\n🧹 Clearing the following tables:');
    tables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    console.log('\n⚠️  WARNING: This will delete ALL data from the database!');
    console.log('Starting database reset in 3 seconds... (Press Ctrl+C to abort)');
    
    // Small delay to allow for aborting
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🚀 Starting database reset...');
    
    // Get all tables in the correct order to handle foreign key constraints
    const tableNames = tables.rows.map(row => `"${row.table_name}"`).join(', ');
    
    try {
      // First, drop all foreign key constraints
      const fkQuery = `
        SELECT 
          'ALTER TABLE "' || n.nspname || '"."' || t.relname || '" DROP CONSTRAINT "' || c.conname || '" CASCADE;' as drop_query
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE c.contype = 'f' AND n.nspname = 'public';
      `;
      
      const fkResult = await client.query(fkQuery);
      
      // Now truncate all tables
      for (const row of tables.rows) {
        const table = row.table_name;
        try {
          await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
          console.log(`✓ Cleared table: ${table}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error clearing table ${table}:`, errorMessage);
        }
      }
      
      // Recreate foreign key constraints
      // Note: This is a simplified approach. In a production environment, 
      // you would want to capture and restore the exact foreign key definitions.
      console.log('\n🔧 Note: Foreign key constraints were dropped and need to be recreated.');
      console.log('   You may need to run your database migrations to restore constraints.');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error during database reset:', errorMessage);
      throw error;
    }
    
    console.log('\n✅ Database reset completed successfully!');
    
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the reset
resetDatabase().catch(console.error);
