// MOT Summary Report Generator
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function generateReport() {
  console.log('📊 MOT Check Summary Report');
  console.log('===========================\n');
  
  try {
    // MOT Status Distribution
    const statusQuery = `
      SELECT mot_status, COUNT(*) 
      FROM vehicles 
      WHERE mot_status IS NOT NULL 
      GROUP BY mot_status 
      ORDER BY COUNT(*) DESC
    `;
    const statusResult = await pool.query(statusQuery);
    console.log('MOT Status Distribution:');
    console.table(statusResult.rows);
    
    // MOT Expiry Status
    const expiryQuery = `
      SELECT 
        CASE 
          WHEN mot_expiry_date IS NULL THEN 'No Expiry Date' 
          WHEN mot_expiry_date < CURRENT_DATE THEN 'Expired' 
          WHEN mot_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon' 
          ELSE 'Valid' 
        END as expiry_status, 
        COUNT(*) 
      FROM vehicles 
      WHERE mot_last_checked IS NOT NULL 
      GROUP BY expiry_status 
      ORDER BY COUNT(*) DESC
    `;
    const expiryResult = await pool.query(expiryQuery);
    console.log('\nMOT Expiry Status:');
    console.table(expiryResult.rows);
    
    // Top Makes
    const makeQuery = `
      SELECT make, COUNT(*) 
      FROM vehicles 
      WHERE mot_last_checked IS NOT NULL 
      GROUP BY make 
      ORDER BY COUNT(*) DESC 
      LIMIT 10
    `;
    const makeResult = await pool.query(makeQuery);
    console.log('\nTop 10 Makes Checked:');
    console.table(makeResult.rows);
    
    // Overall Progress
    const progressQuery = `
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN mot_last_checked IS NOT NULL THEN 1 END) as checked,
        COUNT(CASE WHEN mot_status IS NOT NULL THEN 1 END) as with_status
      FROM vehicles
    `;
    const progressResult = await pool.query(progressQuery);
    const percent = ((progressResult.rows[0].checked / progressResult.rows[0].total) * 100).toFixed(2);
    console.log(`\nOverall Progress: ${progressResult.rows[0].checked}/${progressResult.rows[0].total} (${percent}%)`);
    
  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    await pool.end();
  }
}

// Run the report
generateReport();
