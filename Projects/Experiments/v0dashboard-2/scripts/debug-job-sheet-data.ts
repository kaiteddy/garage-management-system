import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function debugJobSheetData() {
  console.log('🔍 DEBUGGING JOB SHEET DATA FOR KD55 XUX');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // Find the job sheet for KD55 XUX
    const jobSheet = await client.query(`
      SELECT 
        cd.id,
        cd.document_number,
        cd.vehicle_registration,
        cd.document_type,
        cd.status,
        de.labour_description
      FROM customer_documents cd
      LEFT JOIN document_extras de ON cd.id = de.document_id
      WHERE cd.vehicle_registration = 'KD55 XUX' AND cd.document_type = 'JS'
    `);
    
    if (jobSheet.rows.length === 0) {
      console.log('❌ No job sheet found for KD55 XUX');
      return;
    }
    
    const js = jobSheet.rows[0];
    console.log('📋 Job Sheet Found:');
    console.log(`   ID: ${js.id}`);
    console.log(`   Document Number: ${js.document_number}`);
    console.log(`   Vehicle: ${js.vehicle_registration}`);
    console.log(`   Status: ${js.status}`);
    console.log(`   Description: ${js.labour_description || 'NULL'}`);
    
    // Check what line items are linked to this job sheet
    console.log('\n📊 Line Items for this Job Sheet:');
    const lineItems = await client.query(`
      SELECT 
        li.id,
        li.description,
        li.quantity,
        li.unit_price,
        li.total_amount,
        li.line_type
      FROM line_items li
      WHERE li.document_id = $1
    `, [js.id]);
    
    if (lineItems.rows.length === 0) {
      console.log('   ❌ No line items found for this job sheet');
    } else {
      lineItems.rows.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.description || 'No description'}`);
        console.log(`      Type: ${item.line_type || 'Unknown'}`);
        console.log(`      Qty: ${item.quantity || 0}, Price: £${item.unit_price || 0}, Total: £${item.total_amount || 0}`);
        console.log('');
      });
    }
    
    // Check document_line_items table as well
    console.log('📊 Document Line Items for this Job Sheet:');
    const docLineItems = await client.query(`
      SELECT 
        dli.id,
        dli.description,
        dli.quantity,
        dli.unit_price,
        dli.total_price,
        dli.item_type
      FROM document_line_items dli
      WHERE dli.document_id = $1
    `, [js.id]);
    
    if (docLineItems.rows.length === 0) {
      console.log('   ❌ No document line items found for this job sheet');
    } else {
      docLineItems.rows.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.description || 'No description'}`);
        console.log(`      Type: ${item.item_type || 'Unknown'}`);
        console.log(`      Qty: ${item.quantity || 0}, Price: £${item.unit_price || 0}, Total: £${item.total_price || 0}`);
        console.log('');
      });
    }
    
    // Check if there are any other job sheets with similar data
    console.log('🔍 Checking for data contamination:');
    const similarItems = await client.query(`
      SELECT DISTINCT
        li.description,
        cd.vehicle_registration,
        cd.document_number
      FROM line_items li
      JOIN customer_documents cd ON li.document_id = cd.id
      WHERE li.description LIKE '%TOYOTA YARIS%' OR li.description LIKE '%HY02VUG%'
      ORDER BY cd.vehicle_registration
    `);
    
    if (similarItems.rows.length > 0) {
      console.log('   📋 Found items mentioning TOYOTA YARIS or HY02VUG:');
      similarItems.rows.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.vehicle_registration} (${item.document_number}): ${item.description}`);
      });
    }
    
    // Check the actual vehicle data for KD55 XUX
    console.log('\n🚗 Vehicle Data for KD55 XUX:');
    const vehicleData = await client.query(`
      SELECT * FROM vehicles WHERE registration = 'KD55 XUX' OR registration LIKE '%KD55%'
    `);
    
    if (vehicleData.rows.length === 0) {
      console.log('   ❌ No vehicle data found for KD55 XUX in vehicles table');
    } else {
      vehicleData.rows.forEach((vehicle, index) => {
        console.log(`   ${index + 1}. Registration: ${vehicle.registration}`);
        console.log(`      Make: ${vehicle.make || 'NULL'}`);
        console.log(`      Model: ${vehicle.model || 'NULL'}`);
        console.log(`      Year: ${vehicle.year || 'NULL'}`);
        console.log(`      Color: ${vehicle.color || vehicle.colour || 'NULL'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging job sheet data:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await debugJobSheetData();
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the debug
main();
