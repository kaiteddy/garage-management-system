import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

async function verifyMotData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    console.log('=== MOT Data Verification ===\n');
    
    // 1. Count vehicles with MOT data
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(mot_expiry_date) as with_mot_date,
        COUNT(CASE WHEN mot_status = 'Valid' THEN 1 END) as with_valid_mot,
        COUNT(CASE WHEN mot_status = 'Expired' THEN 1 END) as with_expired_mot
      FROM vehicles;
    `);

    console.log('MOT Data Summary:');
    console.table(countResult.rows[0]);

    // 2. Show vehicles with MOTs expiring soon (next 30 days)
    const expiringSoon = await client.query(`
      SELECT 
        v.registration, 
        v.make, 
        v.model, 
        v.mot_expiry_date,
        c.name as owner_name,
        c.phone
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.mot_expiry_date BETWEEN NOW() AND (NOW() + INTERVAL '30 days')
      ORDER BY v.mot_expiry_date ASC
      LIMIT 10;
    `);

    console.log('\nVehicles with MOTs expiring soon:');
    console.table(expiringSoon.rows);

    // 3. Check for data quality issues
    const dataQuality = await client.query(`
      SELECT 
        'Vehicles with invalid MOT dates' as check_name,
        COUNT(*) as count
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL 
        AND mot_expiry_date < '2000-01-01' -- Unrealistically old dates
      
      UNION ALL
      
      SELECT 
        'Vehicles with MOT status but no date' as check_name,
        COUNT(*) as count
      FROM vehicles 
      WHERE mot_status IS NOT NULL 
        AND mot_expiry_date IS NULL;
    `);

    console.log('\nData Quality Checks:');
    console.table(dataQuality.rows);

  } catch (error) {
    console.error('Error verifying MOT data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMotData().catch(console.error);
