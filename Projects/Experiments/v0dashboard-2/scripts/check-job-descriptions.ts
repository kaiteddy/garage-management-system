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

async function checkJobDescriptions() {
  console.log('🔍 CHECKING JOB DESCRIPTIONS FOR JOB SHEETS');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // Check if document_extras table exists and has job descriptions for JS documents
    const jobDescriptions = await client.query(`
      SELECT 
        de.document_id,
        de.labour_description,
        de.doc_notes,
        cd.vehicle_registration,
        cd.document_number
      FROM document_extras de
      JOIN customer_documents cd ON de.document_id = cd.id
      WHERE cd.document_type = 'JS'
      ORDER BY cd.vehicle_registration
      LIMIT 10
    `);
    
    console.log('📊 Job Sheet Descriptions Found:');
    if (jobDescriptions.rows.length === 0) {
      console.log('   ❌ No job descriptions found for job sheets');
      
      // Check if document_extras table exists at all
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'document_extras'
        )
      `);
      
      if (!tableExists.rows[0].exists) {
        console.log('   ❌ document_extras table does not exist');
      } else {
        console.log('   ✅ document_extras table exists but no JS descriptions');
        
        // Check total document_extras count
        const totalExtras = await client.query(`
          SELECT COUNT(*) as total FROM document_extras
        `);
        console.log(`   📊 Total document_extras records: ${totalExtras.rows[0].total}`);
      }
    } else {
      jobDescriptions.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.vehicle_registration} (${row.document_number})`);
        console.log(`      Description: ${row.labour_description ? row.labour_description.substring(0, 100) + '...' : 'NULL'}`);
        console.log(`      Notes: ${row.doc_notes || 'NULL'}`);
        console.log('');
      });
    }
    
    // Check line items for job sheets instead
    console.log('\n📊 Checking Line Items for Job Sheets:');
    const lineItems = await client.query(`
      SELECT 
        li.document_id,
        li.description,
        cd.vehicle_registration,
        cd.document_number
      FROM line_items li
      JOIN customer_documents cd ON li.document_id = cd.id
      WHERE cd.document_type = 'JS'
      ORDER BY cd.vehicle_registration
      LIMIT 10
    `);
    
    if (lineItems.rows.length === 0) {
      console.log('   ❌ No line items found for job sheets');
    } else {
      lineItems.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.vehicle_registration} (${row.document_number})`);
        console.log(`      Line Item: ${row.description || 'NULL'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking job descriptions:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkJobDescriptions();
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
main();
