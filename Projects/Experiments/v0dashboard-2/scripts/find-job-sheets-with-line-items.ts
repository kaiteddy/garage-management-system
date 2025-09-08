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

async function findJobSheetsWithLineItems() {
  console.log('🔍 FINDING JOB SHEETS WITH LINE ITEMS');
  console.log('='.repeat(50));

  const client = await pool.connect();
  try {
    // Find job sheets that have line items
    const jobSheetsWithItems = await client.query(`
      SELECT DISTINCT
        cd.id,
        cd.document_number,
        cd.vehicle_registration,
        cd.customer_id,
        COUNT(li.id) as line_item_count
      FROM customer_documents cd
      INNER JOIN line_items li ON cd.id = li.document_id
      WHERE cd.document_type = 'JS'
      GROUP BY cd.id, cd.document_number, cd.vehicle_registration, cd.customer_id
      ORDER BY line_item_count DESC
      LIMIT 10
    `);

    if (jobSheetsWithItems.rows.length === 0) {
      console.log('❌ No job sheets found with line items');

      // Check document_line_items table instead
      const jobSheetsWithDocItems = await client.query(`
        SELECT DISTINCT
          cd.id,
          cd.document_number,
          cd.vehicle_registration,
          cd.customer_id,
          COUNT(dli.id) as line_item_count
        FROM customer_documents cd
        INNER JOIN document_line_items dli ON cd.id = dli.document_id
        WHERE cd.document_type = 'JS'
        GROUP BY cd.id, cd.document_number, cd.vehicle_registration, cd.customer_id
        ORDER BY line_item_count DESC
        LIMIT 10
      `);

      if (jobSheetsWithDocItems.rows.length > 0) {
        console.log('📋 Job sheets with document line items:');
        jobSheetsWithDocItems.rows.forEach((js, index) => {
          console.log(`   ${index + 1}. ${js.vehicle_registration} (${js.document_number}) - Customer ID: ${js.customer_id}`);
          console.log(`      ID: ${js.id}`);
          console.log(`      Line Items: ${js.line_item_count}`);
          console.log('');
        });
      } else {
        console.log('❌ No job sheets found with document line items either');
      }
    } else {
      console.log('📋 Job sheets with line items:');
      jobSheetsWithItems.rows.forEach((js, index) => {
        console.log(`   ${index + 1}. ${js.vehicle_registration} (${js.document_number}) - Customer ID: ${js.customer_id}`);
        console.log(`      ID: ${js.id}`);
        console.log(`      Line Items: ${js.line_item_count}`);
        console.log('');
      });
    }

    // Also check total counts
    const totalJobSheets = await client.query(`
      SELECT COUNT(*) as count FROM customer_documents WHERE document_type = 'JS'
    `);

    const totalLineItems = await client.query(`
      SELECT COUNT(*) as count FROM line_items
    `);

    const totalDocLineItems = await client.query(`
      SELECT COUNT(*) as count FROM document_line_items
    `);

    console.log('📊 Summary:');
    console.log(`   Total Job Sheets: ${totalJobSheets.rows[0].count}`);
    console.log(`   Total Line Items: ${totalLineItems.rows[0].count}`);
    console.log(`   Total Document Line Items: ${totalDocLineItems.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error finding job sheets with line items:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await findJobSheetsWithLineItems();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();
