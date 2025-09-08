import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function investigateErrors() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔍 INVESTIGATING WHY 32,867 RECORDS FAILED');
    console.log('==========================================');

    // Read CSV and analyze the failing records
    const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    console.log(`📄 CSV total lines: ${lines.length}`);

    // Get existing IDs
    const existingIds = await sql`SELECT id FROM line_items`;
    const existingIdSet = new Set(existingIds.map(row => row.id));
    console.log(`📊 Existing IDs in database: ${existingIdSet.size}`);

    // Check CSV header structure
    const header = lines[0].split(',').map(h => h.replace(/"/g, ''));
    console.log(`\n📋 CSV HEADER ANALYSIS:`);
    console.log(`  Total columns: ${header.length}`);
    console.log(`  Column 0: ${header[0]}`);
    console.log(`  Column 11: ${header[11]}`);
    console.log(`  Column 21: ${header[21]}`);
    console.log(`  Column 38: ${header[38] || 'MISSING!'}`);

    if (header.length < 39) {
      console.log(`\n❌ CRITICAL: CSV only has ${header.length} columns, but we need column 38!`);
      console.log('💡 This explains why all 32,867 records failed!');
      return;
    }

    // Analyze failing records
    let errorAnalysis = {
      emptyId: 0,
      invalidFormat: 0,
      columnMismatch: 0,
      dataTypeErrors: 0,
      constraintViolations: 0,
      validButMissing: 0
    };

    console.log('\n🔍 Analyzing first 10 missing records...');

    let foundMissing = 0;
    for (let i = 1; i < lines.length && foundMissing < 10; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      const id = values[0];
      
      if (!id) {
        errorAnalysis.emptyId++;
        continue;
      }
      
      if (!existingIdSet.has(id)) {
        foundMissing++;
        
        console.log(`\n❌ Missing Record ${foundMissing}:`);
        console.log(`  Line: ${i}`);
        console.log(`  ID: ${id} (length: ${id.length})`);
        console.log(`  Columns: ${values.length}`);
        console.log(`  Doc ID: ${values[1] || 'NULL'}`);
        console.log(`  Description: ${values[11] || 'NULL'}`);
        console.log(`  Unit Price: ${values[38] || 'NULL'}`);
        console.log(`  Total Amount: ${values[21] || 'NULL'}`);
        
        // Test specific data issues
        try {
          const testRecord = {
            id: values[0],
            document_id: values[1] || null,
            stock_id: values[2] || null,
            description: values[11] || '',
            quantity: parseFloat(values[19]) || 0,
            unit_price: parseFloat(values[38]) || 0,
            tax_rate: parseFloat(values[28]) || 0,
            tax_amount: parseFloat(values[22]) || 0,
            total_amount: parseFloat(values[21]) || 0
          };
          
          console.log(`  Parsed Values:`);
          console.log(`    Quantity: ${testRecord.quantity}`);
          console.log(`    Unit Price: ${testRecord.unit_price}`);
          console.log(`    Total: ${testRecord.total_amount}`);
          
          // Identify the specific error
          if (values.length < 39) {
            console.log(`  ❌ ERROR: Insufficient columns (${values.length} < 39)`);
            errorAnalysis.columnMismatch++;
          } else if (isNaN(testRecord.unit_price) && values[38]) {
            console.log(`  ❌ ERROR: Invalid unit price: '${values[38]}'`);
            errorAnalysis.dataTypeErrors++;
          } else if (isNaN(testRecord.total_amount) && values[21]) {
            console.log(`  ❌ ERROR: Invalid total amount: '${values[21]}'`);
            errorAnalysis.dataTypeErrors++;
          } else {
            console.log(`  ✅ Data appears valid - testing database insert...`);
            
            // Try actual database insert to see the real error
            try {
              await sql`
                INSERT INTO line_items (
                  id, document_id, stock_id, description, quantity, 
                  unit_price, tax_rate, tax_amount, total_amount, created_at
                ) VALUES (
                  ${testRecord.id}, ${testRecord.document_id}, ${testRecord.stock_id}, ${testRecord.description},
                  ${testRecord.quantity}, ${testRecord.unit_price}, ${testRecord.tax_rate}, 
                  ${testRecord.tax_amount}, ${testRecord.total_amount}, NOW()
                )
              `;
              console.log(`  ✅ SUCCESS: Record can be inserted!`);
              errorAnalysis.validButMissing++;
              
              // Remove it to not affect the count
              await sql`DELETE FROM line_items WHERE id = ${testRecord.id}`;
              
            } catch (dbError) {
              console.log(`  ❌ DATABASE ERROR: ${dbError.message}`);
              errorAnalysis.constraintViolations++;
            }
          }
          
        } catch (error) {
          console.log(`  ❌ PARSING ERROR: ${error.message}`);
          errorAnalysis.invalidFormat++;
        }
      }
    }

    console.log('\n📊 ERROR ANALYSIS SUMMARY:');
    console.log(`  Empty IDs: ${errorAnalysis.emptyId}`);
    console.log(`  Column mismatches: ${errorAnalysis.columnMismatch}`);
    console.log(`  Data type errors: ${errorAnalysis.dataTypeErrors}`);
    console.log(`  Invalid format: ${errorAnalysis.invalidFormat}`);
    console.log(`  Constraint violations: ${errorAnalysis.constraintViolations}`);
    console.log(`  Valid but missing: ${errorAnalysis.validButMissing}`);

    // Provide recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (errorAnalysis.columnMismatch > 5) {
      console.log('❌ MAJOR ISSUE: Column mapping is incorrect');
      console.log('🔧 FIX: Adjust column indices in import script');
    } else if (errorAnalysis.dataTypeErrors > 5) {
      console.log('❌ MAJOR ISSUE: Data type conversion problems');
      console.log('🔧 FIX: Improve number parsing and validation');
    } else if (errorAnalysis.constraintViolations > 5) {
      console.log('❌ MAJOR ISSUE: Database constraint violations');
      console.log('🔧 FIX: Check table constraints and data validation');
    } else if (errorAnalysis.validButMissing > 5) {
      console.log('✅ GOOD NEWS: Data is valid, import logic issue');
      console.log('🔧 FIX: Improve import script logic');
    } else {
      console.log('🔍 MIXED ISSUES: Multiple problems detected');
      console.log('🔧 FIX: Address each issue type individually');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error(error.stack);
  }
}

// Run the investigation
investigateErrors();
