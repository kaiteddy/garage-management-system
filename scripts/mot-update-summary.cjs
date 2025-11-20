#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function generateMOTUpdateSummary() {
  console.log('Generating MOT Update Summary Report...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // 1. Overall MOT expiry date statistics
    console.log('1. MOT Expiry Date Statistics:');
    const expiryStats = await pool.query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as with_expiry,
        COUNT(CASE WHEN mot_expiry_date IS NULL THEN 1 END) as without_expiry,
        ROUND(COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as percent_with_expiry
      FROM vehicles
    `);
    console.table(expiryStats.rows);
    
    // 2. MOT status distribution
    console.log('\n2. MOT Status Distribution:');
    const statusStats = await pool.query(`
      SELECT 
        mot_status,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM vehicles)::numeric * 100, 2) as percentage
      FROM vehicles
      GROUP BY mot_status
      ORDER BY count DESC
    `);
    console.table(statusStats.rows);
    
    // 3. Recently updated vehicles
    console.log('\n3. Recently Updated Vehicles (last 24 hours):');
    const recentUpdates = await pool.query(`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_last_checked > NOW() - INTERVAL '24 hours'
    `);
    console.log(`Vehicles updated in the last 24 hours: ${recentUpdates.rows[0].count}`);
    
    // 4. Sample of vehicles with expiry dates
    console.log('\n4. Sample of Vehicles with Expiry Dates:');
    const samplesWithExpiry = await pool.query(`
      SELECT registration, make, model, mot_status, mot_expiry_date, mot_last_checked
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      ORDER BY mot_last_checked DESC
      LIMIT 5
    `);
    console.table(samplesWithExpiry.rows);
    
    // 5. Sample of vehicles without expiry dates
    console.log('\n5. Sample of Vehicles without Expiry Dates:');
    const samplesWithoutExpiry = await pool.query(`
      SELECT registration, make, model, mot_status, mot_last_checked
      FROM vehicles
      WHERE mot_expiry_date IS NULL
      ORDER BY mot_last_checked DESC
      LIMIT 5
    `);
    console.table(samplesWithoutExpiry.rows);
    
    // 6. Check for any remaining quoted make/model values
    console.log('\n6. Checking for Quoted Make/Model Values:');
    const quotedStats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN make LIKE '"%"' THEN 1 END) as quoted_make,
        COUNT(CASE WHEN model LIKE '"%"' THEN 1 END) as quoted_model
      FROM vehicles
    `);
    console.table(quotedStats.rows);
    
    // 7. Database column information for mot_expiry_date
    console.log('\n7. Database Column Information for mot_expiry_date:');
    const columnInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles' AND column_name = 'mot_expiry_date'
    `);
    console.table(columnInfo.rows);
    
    console.log('\nMOT Update Summary Report Complete');
    
  } catch (error) {
    console.error('Error generating summary:', error);
  } finally {
    await pool.end();
  }
}

generateMOTUpdateSummary().catch(console.error);
