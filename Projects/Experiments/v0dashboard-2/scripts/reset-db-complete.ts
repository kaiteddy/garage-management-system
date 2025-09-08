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
    
    // Get all tables
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
    
    // Drop all tables in reverse order to handle dependencies
    // This is a best-effort approach since we can't disable foreign key checks
    const tablesToDrop = tables.rows.map(row => row.table_name);
    
    // Sort tables to drop those with foreign keys first
    // This is a simple approach - for complex schemas, you might need to handle this differently
    const sortedTables = [
      'document_extras',
      'documents',
      'appointments',
      'receipts',
      'line_items',
      'reminders',
      'reminder_templates',
      'mot_history',
      'vehicles',
      'customers',
      'stock'
    ].filter(table => tablesToDrop.includes(table));
    
    for (const table of sortedTables) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✓ Dropped table: ${table}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error dropping table ${table}:`, errorMessage);
        // Continue with other tables even if one fails
      }
    }
    
    console.log('\n✅ Database reset completed successfully!');
    console.log('\nYou can now restart your application to initialize the database with the correct schema.');
    
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
