import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import readline from 'readline';

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

async function clearDatabase() {
  const client = await pool.connect();
  
  // Create readline interface for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Get table names
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );

    if (tables.rows.length === 0) {
      console.log('No tables found in the database.');
      return;
    }

    console.log('\n⚠️  WARNING: This will delete all data from the following tables:');
    tables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This operation will delete ALL data from the database!');
    console.log('This action cannot be undone!');
    
    const answer = await new Promise<string>((resolve) => {
      rl.question('Type "CLEAR" to confirm deletion of all data: ', (input) => {
        resolve(input);
      });
    });
    
    // Close readline here to prevent hanging
    rl.close();

    if (answer.trim().toUpperCase() !== 'CLEAR') {
      console.log('Operation cancelled.');
      return;
    }

    console.log('\n🧹 Clearing database tables...');
    
    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = "replica";');
    
    // Truncate all tables
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
    
    // Re-enable foreign key checks
    await client.query('SET session_replication_role = "origin";');
    
    console.log('\n✅ Database cleared successfully!');
    
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    try {
      rl.close();
    } catch (e) {
      // Ignore errors when closing readline
    }
    client.release();
    await pool.end();
  }
}

clearDatabase().catch(console.error);
