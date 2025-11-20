#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkMOTUpdates() {
  console.log('Checking MOT update issues...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // 1. Check if any vehicles have MOT expiry dates
    const expiryStats = await pool.query(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as with_expiry 
      FROM vehicles
    `);
    
    console.log('MOT Expiry Date Status:');
    console.table(expiryStats.rows);
    
    // 2. Check for vehicles with quoted make/model
    const quotedStats = await pool.query(`
      SELECT COUNT(*) as total FROM vehicles 
      WHERE make LIKE '"%"' OR model LIKE '"%"'
    `);
    
    console.log('\nVehicles with quoted make/model:');
    console.log(`Total: ${quotedStats.rows[0].total}`);
    
    // 3. Test update on a specific vehicle
    const testReg = 'AG09LPV'; // One of the recently processed vehicles
    
    // First check current state
    const beforeUpdate = await pool.query(`
      SELECT registration, make, model, mot_status, mot_expiry_date, mot_last_checked 
      FROM vehicles 
      WHERE registration = $1
    `, [testReg]);
    
    console.log('\nBefore test update:');
    console.table(beforeUpdate.rows);
    
    // Try to update with a test expiry date
    const testUpdate = await pool.query(`
      UPDATE vehicles
      SET 
        mot_expiry_date = '2026-05-27T23:59:59.000Z',
        updated_at = NOW()
      WHERE registration = $1
      RETURNING registration, make, model, mot_status, mot_expiry_date, mot_last_checked
    `, [testReg]);
    
    console.log('\nAfter test update:');
    console.table(testUpdate.rows);
    
    // 4. Check database constraints on mot_expiry_date column
    const columnInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles' AND column_name = 'mot_expiry_date'
    `);
    
    console.log('\nMOT expiry date column info:');
    console.table(columnInfo.rows);
    
  } catch (error) {
    console.error('Error during checks:', error);
  } finally {
    await pool.end();
  }
}

checkMOTUpdates().catch(console.error);
