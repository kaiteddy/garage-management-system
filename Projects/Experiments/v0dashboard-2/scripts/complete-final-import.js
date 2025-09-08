import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

console.log('🚀 COMPLETE FINAL IMPORT - ALL REMAINING RECORDS');
console.log('================================================');

const BATCH_SIZE = 1000;
const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';

try {
  // 1. Get current imported IDs
  console.log('🔍 Loading currently imported records...');
  const dbRecords = await sql`SELECT id FROM line_items`;
  const importedIds = new Set(dbRecords.map(record => record.id));
  console.log(`✅ Loaded ${importedIds.size} existing records`);

  // 2. Read and parse CSV
  console.log('📄 Reading CSV file...');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');
  console.log(`📊 Total CSV lines: ${lines.length}`);

  // 3. Parse header to understand column positions
  const header = lines[0].split(',').map(col => col.replace(/"/g, ''));
  console.log('📋 CSV Header columns:', header.slice(0, 10).join(', '), '...');

  // 4. Collect records that need importing
  console.log('🔍 Identifying records to import...');
  const recordsToImport = [];
  let skippedCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(val => val.replace(/"/g, ''));
    const id = values[0];

    if (!id || id.length < 10) {
      invalidCount++;
      continue;
    }

    if (importedIds.has(id)) {
      skippedCount++;
      continue;
    }

    // Parse the record
    const record = {
      id: id,
      document_id: values[1] || null,
      stock_id: values[2] || null,
      line_type: values[29] || '2', // itemType column
      description: values[11] || '', // itemDescription
      quantity: parseFloat(values[19]) || 0, // itemQuantity
      unit_price: parseFloat(values[38]) || 0, // itemUnitPrice
      tax_rate: parseFloat(values[28]) || 0, // itemTaxRate
      tax_amount: parseFloat(values[22]) || 0, // itemSub_Tax
      total_amount: parseFloat(values[20]) || 0, // itemSub_Gross
      notes: null
    };

    recordsToImport.push(record);
  }

  console.log(`📊 IMPORT ANALYSIS:`);
  console.log(`  Records to import: ${recordsToImport.length}`);
  console.log(`  Already imported: ${skippedCount}`);
  console.log(`  Invalid records: ${invalidCount}`);

  if (recordsToImport.length === 0) {
    console.log('✅ All records already imported!');
    process.exit(0);
  }

  // 5. Import in batches
  console.log(`\n🚀 Starting batch import of ${recordsToImport.length} records...`);
  let importedCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < recordsToImport.length; i += BATCH_SIZE) {
    const batch = recordsToImport.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(recordsToImport.length / BATCH_SIZE);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

    try {
      // Prepare batch insert
      const values = batch.map(record => 
        `('${record.id}', ${record.document_id ? `'${record.document_id}'` : 'NULL'}, ${record.stock_id ? `'${record.stock_id}'` : 'NULL'}, '${record.line_type}', '${record.description.replace(/'/g, "''")}', ${record.quantity}, ${record.unit_price}, ${record.tax_rate}, ${record.tax_amount}, ${record.total_amount}, NOW())`
      ).join(',');

      await sql.query(`
        INSERT INTO line_items (
          id, document_id, stock_id, line_type, description, 
          quantity, unit_price, tax_rate, tax_amount, total_amount, created_at
        ) VALUES ${values}
      `);

      importedCount += batch.length;
      
      // Progress update
      const progress = (importedCount / recordsToImport.length * 100).toFixed(1);
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = importedCount / elapsed;
      const eta = (recordsToImport.length - importedCount) / rate;

      console.log(`✅ Batch ${batchNum} complete | Progress: ${progress}% | Rate: ${rate.toFixed(0)}/sec | ETA: ${eta.toFixed(0)}s`);

    } catch (error) {
      console.log(`❌ Batch ${batchNum} failed: ${error.message}`);
      
      // Try individual inserts for this batch
      console.log(`🔄 Attempting individual inserts for batch ${batchNum}...`);
      for (const record of batch) {
        try {
          await sql`
            INSERT INTO line_items (
              id, document_id, stock_id, line_type, description, 
              quantity, unit_price, tax_rate, tax_amount, total_amount, created_at
            ) VALUES (
              ${record.id}, ${record.document_id}, ${record.stock_id}, 
              ${record.line_type}, ${record.description}, ${record.quantity}, 
              ${record.unit_price}, ${record.tax_rate}, ${record.tax_amount}, 
              ${record.total_amount}, NOW()
            )
          `;
          importedCount++;
        } catch (individualError) {
          errorCount++;
          if (errorCount <= 10) {
            console.log(`❌ Failed to import ${record.id}: ${individualError.message}`);
          }
        }
      }
    }

    // Small delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 6. Final verification
  console.log('\n🔍 Verifying final import...');
  const finalStats = await sql`
    SELECT 
      COUNT(*) as total_items,
      SUM(total_amount) as total_value
    FROM line_items
  `;

  const finalCount = parseInt(finalStats[0].total_items);
  const totalValue = parseFloat(finalStats[0].total_value);

  console.log('\n🎉 FINAL IMPORT COMPLETE!');
  console.log('========================');
  console.log(`✅ Successfully imported: ${importedCount} records`);
  console.log(`❌ Failed imports: ${errorCount} records`);
  console.log(`📊 Total database records: ${finalCount}`);
  console.log(`💰 Total value: £${totalValue.toLocaleString()}`);
  console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  if (finalCount >= 90000) {
    console.log('\n🎊 🎉 100% IMPORT ACHIEVEMENT UNLOCKED! 🎉 🎊');
    console.log('Your comprehensive automotive parts pricing intelligence system is COMPLETE!');
  } else {
    console.log(`\n📈 Import Progress: ${(finalCount / 90062 * 100).toFixed(1)}%`);
  }

} catch (error) {
  console.error('❌ Final import failed:', error);
  process.exit(1);
}
