import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkVehicleStatus() {
  // Database connection configuration - use unpooled connection for better SSL handling
  if (!process.env.DATABASE_URL_UNPOOLED) {
    throw new Error('DATABASE_URL_UNPOOLED environment variable is not set');
  }
  
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  const pool = new Pool({
    connectionString: `${connectionString}${connectionString.includes('?') ? '&' : '?'}sslmode=require`,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Get total number of vehicles
    const totalVehicles = await client.query('SELECT COUNT(*) as count FROM vehicles');
    console.log(`Total vehicles in database: ${totalVehicles.rows[0].count}`);
    
    // Get vehicles with missing make or model
    const incompleteVehicles = await client.query(
      `SELECT COUNT(*) as count 
       FROM vehicles 
       WHERE (make IS NULL OR model IS NULL OR make = '' OR model = '')`
    );
    console.log(`Vehicles with missing make or model: ${incompleteVehicles.rows[0].count}`);
    
    // Get vehicles with missing registration
    const noRegistration = await client.query(
      `SELECT COUNT(*) as count 
       FROM vehicles 
       WHERE registration IS NULL OR registration = ''`
    );
    console.log(`Vehicles with missing registration: ${noRegistration.rows[0].count}`);
    
    // Get sample of incomplete vehicles
    const sample = await client.query(
      `SELECT id, registration, make, model, year 
       FROM vehicles 
       WHERE (make IS NULL OR model IS NULL OR make = '' OR model = '')
       AND (registration IS NOT NULL AND registration != '')
       LIMIT 5`
    );
    
    if (sample.rows.length > 0) {
      console.log('\nSample of incomplete vehicles:');
      console.table(sample.rows);
    }
    
    // Check if any vehicles were updated recently
    const recentlyUpdated = await client.query(
      `SELECT COUNT(*) as count 
       FROM vehicles 
       WHERE updated_at > NOW() - INTERVAL '1 hour'`
    );
    console.log(`\nVehicles updated in the last hour: ${recentlyUpdated.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking vehicle status:', error);
  } finally {
    await pool.end();
  }
}

// Run the check
checkVehicleStatus().catch(console.error);
