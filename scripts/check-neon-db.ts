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

async function checkDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking Neon database...');
    
    // Check total vehicles
    const vehiclesCount = await client.query('SELECT COUNT(*) as count FROM vehicles');
    console.log(`\n🚗 Total vehicles in database: ${vehiclesCount.rows[0].count}`);
    
    // Check total customers
    const customersCount = await client.query('SELECT COUNT(*) as count FROM customers');
    console.log(`👥 Total customers in database: ${customersCount.rows[0].count}`);
    
    // Show some sample data
    console.log('\n📋 Sample vehicle registrations:');
    const sampleVehicles = await client.query('SELECT registration, make, model, year FROM vehicles LIMIT 5');
    console.table(sampleVehicles.rows);
    
    // Check database size
    const dbSize = await client.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
    );
    console.log(`\n💾 Database size: ${dbSize.rows[0].size}`);
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase().catch(console.error);
