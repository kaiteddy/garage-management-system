#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function fixQuotedMakeModel() {
  console.log('Fixing quoted make and model values in the database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // 1. Get count of vehicles with quoted make/model
    const beforeCount = await pool.query(`
      SELECT COUNT(*) as total FROM vehicles 
      WHERE make LIKE '"%"' OR model LIKE '"%"'
    `);
    
    console.log(`Found ${beforeCount.rows[0].total} vehicles with quoted make/model values`);
    
    // 2. Update make values
    const makeResult = await pool.query(`
      UPDATE vehicles
      SET make = REPLACE(REPLACE(make, '"', ''), '"', '')
      WHERE make LIKE '"%"'
    `);
    
    console.log(`Fixed make values for ${makeResult.rowCount} vehicles`);
    
    // 3. Update model values
    const modelResult = await pool.query(`
      UPDATE vehicles
      SET model = REPLACE(REPLACE(model, '"', ''), '"', '')
      WHERE model LIKE '"%"'
    `);
    
    console.log(`Fixed model values for ${modelResult.rowCount} vehicles`);
    
    // 4. Verify fix
    const afterCount = await pool.query(`
      SELECT COUNT(*) as total FROM vehicles 
      WHERE make LIKE '"%"' OR model LIKE '"%"'
    `);
    
    console.log(`\nRemaining vehicles with quoted make/model: ${afterCount.rows[0].total}`);
    
    // 5. Show sample of fixed vehicles
    const sampleFixed = await pool.query(`
      SELECT registration, make, model
      FROM vehicles
      LIMIT 10
    `);
    
    console.log('\nSample of fixed vehicles:');
    console.table(sampleFixed.rows);
    
  } catch (error) {
    console.error('Error fixing quoted make/model:', error);
  } finally {
    await pool.end();
  }
}

fixQuotedMakeModel().catch(console.error);
