// Script to fix database schema and clean registration numbers
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Function to clean registration numbers
function cleanRegistration(reg) {
  if (!reg) return null;
  
  // Remove all non-alphanumeric characters except hyphens
  let cleaned = reg.toString().replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  
  // Remove any hyphens that might be in the middle
  cleaned = cleaned.replace(/-/g, '');
  
  // Basic validation for UK registration format
  // Format: 1-3 letters, 1-4 numbers, 1-3 letters (optional)
  const ukRegEx = /^[A-Z]{1,3}\d{1,4}[A-Z]{0,3}$/;
  
  return ukRegEx.test(cleaned) ? cleaned : null;
}

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 1/3 - Adding mot_raw_data column if needed...');
    await client.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS mot_raw_data JSONB
    `);
    
    console.log('🧹 2/3 - Cleaning up registration numbers...');
    // First, get all registrations that need cleaning
    const registrations = await client.query(
      `SELECT registration FROM vehicles WHERE registration ~ '[^a-zA-Z0-9-]' OR registration ~ '^\s+|\s+$'`
    );
    
    console.log(`   Found ${registrations.rowCount} registrations to clean`);
    
    for (const row of registrations.rows) {
      const oldReg = row.registration;
      const newReg = cleanRegistration(oldReg);
      
      if (newReg && newReg !== oldReg) {
        try {
          // Check if the new registration already exists
          const exists = await client.query(
            'SELECT 1 FROM vehicles WHERE registration = $1',
            [newReg]
          );
          
          if (exists.rowCount === 0) {
            // Update to cleaned registration
            await client.query(
              'UPDATE vehicles SET registration = $1 WHERE registration = $2',
              [newReg, oldReg]
            );
            console.log(`   Updated: "${oldReg}" -> "${newReg}"`);
          } else {
            console.log(`   ❌ Skipped (duplicate): "${oldReg}" -> "${newReg}"`);
          }
        } catch (error) {
          console.error(`   Error updating registration "${oldReg}":`, error.message);
        }
      }
    }
    
    console.log('✅ 3/3 - Database fixes completed');
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database fix:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixDatabase()
  .then(() => {
    console.log('\n🎉 Database fix completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Database fix failed:', error);
    process.exit(1);
  });
