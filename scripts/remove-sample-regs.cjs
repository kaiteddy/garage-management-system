#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Sample registrations to remove
const sampleRegs = ['AB12CDE', 'BC23FGH', 'DE45IJK'];

async function removeSampleRegistrations() {
  console.log('Removing sample registrations from the database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Delete the sample registrations
    const result = await pool.query(`
      DELETE FROM vehicles
      WHERE registration IN ($1, $2, $3)
      RETURNING registration
    `, sampleRegs);
    
    console.log(`Removed ${result.rowCount} sample registrations:`);
    result.rows.forEach(row => console.log(`- ${row.registration}`));
    
    // Show updated stats
    const statsResult = await pool.query(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as with_expiry 
      FROM vehicles
    `);
    
    console.log('\nUpdated database statistics:');
    console.table(statsResult.rows);
  } catch (error) {
    console.error('Error removing sample registrations:', error);
  } finally {
    await pool.end();
  }
}

removeSampleRegistrations().catch(console.error);
