import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testSingleInsert() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔍 TESTING SINGLE RECORD INSERT');
    console.log('===============================');

    // Read CSV and test one failing record
    const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    // Get existing IDs
    const existingIds = await sql`SELECT id FROM line_items LIMIT 100`;
    const existingIdSet = new Set(existingIds.map(row => row.id));

    // Find a record that should be missing
    let testRecord = null;
    for (let i = 1; i < Math.min(1000, lines.length); i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const id = values[0];
      
      if (id && !existingIdSet.has(id)) {
        testRecord = {
          line: i,
          id: id,
          document_id: values[1] || null,
          stock_id: values[2] || null,
          description: values[11] || '',
          quantity: parseFloat(values[19]) || 0,
          unit_price: parseFloat(values[38]) || 0,
          tax_rate: parseFloat(values[28]) || 0,
          tax_amount: parseFloat(values[22]) || 0,
          total_amount: parseFloat(values[21]) || 0,
          line_type: values[29] || '2'
        };
        break;
      }
    }

    if (!testRecord) {
      console.log('❌ No missing records found in first 1000 lines');
      return;
    }

    console.log('📋 Testing record:');
    console.log(`  Line: ${testRecord.line}`);
    console.log(`  ID: ${testRecord.id}`);
    console.log(`  Description: ${testRecord.description}`);
    console.log(`  Line Type: ${testRecord.line_type}`);
    console.log(`  Total: ${testRecord.total_amount}`);

    // Try to insert it
    try {
      await sql`
        INSERT INTO line_items (
          id, document_id, stock_id, description, quantity, 
          unit_price, tax_rate, tax_amount, total_amount, line_type, created_at
        ) VALUES (
          ${testRecord.id}, ${testRecord.document_id}, ${testRecord.stock_id}, ${testRecord.description},
          ${testRecord.quantity}, ${testRecord.unit_price}, ${testRecord.tax_rate}, 
          ${testRecord.tax_amount}, ${testRecord.total_amount}, ${testRecord.line_type}, NOW()
        )
      `;
      
      console.log('\n✅ SUCCESS: Record inserted successfully!');
      
      // Clean up
      await sql`DELETE FROM line_items WHERE id = ${testRecord.id}`;
      console.log('✅ Test record cleaned up');
      
    } catch (error) {
      console.log(`\n❌ INSERT FAILED: ${error.message}`);
      console.log('💡 This is the exact error causing the import failures');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSingleInsert();
