import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function completeRemainingImport() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🚀 COMPLETING REMAINING CSV IMPORT');
    console.log('==================================');

    // Check current status
    const currentStats = await sql`SELECT COUNT(*) as count FROM line_items`;
    console.log(`📊 Current database records: ${currentStats[0].count.toLocaleString()}`);

    // Read CSV file
    const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    console.log(`📄 Reading CSV: ${csvPath}`);
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📋 Total CSV lines: ${lines.length.toLocaleString()}`);
    
    // Get header and map columns
    const header = lines[0].split(',').map(h => h.replace(/"/g, ''));
    console.log(`📊 CSV columns detected: ${header.length} columns`);

    // Find column indices
    const idIndex = header.findIndex(h => h === '_ID');
    const docIdIndex = header.findIndex(h => h === '_ID_Document');
    const descIndex = header.findIndex(h => h === 'itemDescription');
    const unitPriceIndex = header.findIndex(h => h === 'itemUnitPrice');
    const qtyIndex = header.findIndex(h => h === 'itemQuantity');
    const netIndex = header.findIndex(h => h === 'itemSub_Net');
    const taxRateIndex = header.findIndex(h => h === 'itemTaxRate');
    const taxIndex = header.findIndex(h => h === 'itemSub_Tax');
    const grossIndex = header.findIndex(h => h === 'itemSub_Gross');

    console.log(`🔍 Column mapping:`);
    console.log(`  ID: ${idIndex}, Doc: ${docIdIndex}, Desc: ${descIndex}`);
    console.log(`  Price: ${unitPriceIndex}, Qty: ${qtyIndex}, Net: ${netIndex}`);
    console.log(`  Tax Rate: ${taxRateIndex}, Tax: ${taxIndex}, Gross: ${grossIndex}`);

    // Get existing IDs to avoid duplicates
    console.log('🔍 Getting existing IDs to avoid duplicates...');
    const existingIds = await sql`SELECT id FROM line_items`;
    const existingIdSet = new Set(existingIds.map(row => row.id));
    console.log(`📋 Found ${existingIdSet.size.toLocaleString()} existing IDs`);

    // Process CSV and import missing records
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 500;
    let batch = [];

    console.log('\n🚀 Starting import of missing records...');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = line.split(',').map(v => v.replace(/"/g, ''));
        
        const id = values[idIndex] || null;
        if (!id || existingIdSet.has(id)) {
          skipped++;
          continue;
        }

        const lineItem = {
          id: id,
          document_id: values[docIdIndex] || null,
          description: values[descIndex] || '',
          unit_price: parseFloat(values[unitPriceIndex]) || 0,
          quantity: parseFloat(values[qtyIndex]) || 0,
          total_amount: parseFloat(values[netIndex]) || 0,
          vat_rate: parseFloat(values[taxRateIndex]) || 0,
          vat_amount: parseFloat(values[taxIndex]) || 0,
          line_total: parseFloat(values[grossIndex]) || 0
        };

        batch.push(lineItem);

        // Process batch when full
        if (batch.length >= batchSize) {
          const batchResult = await processBatch(sql, batch);
          imported += batchResult.imported;
          errors += batchResult.errors;
          batch = [];
          
          if (imported % 2000 === 0) {
            console.log(`✅ Imported ${imported.toLocaleString()} new records (CSV line ${i})`);
          }
        }

      } catch (error) {
        errors++;
        if (errors < 10) {
          console.log(`❌ Error on CSV line ${i}: ${error.message}`);
        }
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const batchResult = await processBatch(sql, batch);
      imported += batchResult.imported;
      errors += batchResult.errors;
    }

    // Final verification
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_items,
        SUM(total_amount) as total_value,
        COUNT(CASE WHEN description NOT ILIKE '%labour%' AND total_amount > 0 THEN 1 END) as parts_count,
        COUNT(DISTINCT document_id) as unique_documents
      FROM line_items
    `;

    console.log('\n🎉 IMPORT COMPLETION RESULTS');
    console.log('============================');
    console.log(`✅ New records imported: ${imported.toLocaleString()}`);
    console.log(`⚠️  Records skipped: ${skipped.toLocaleString()}`);
    console.log(`❌ Errors encountered: ${errors.toLocaleString()}`);
    console.log('');
    console.log(`📊 FINAL DATABASE STATUS:`);
    console.log(`  📦 Total records: ${finalStats[0].total_items.toLocaleString()}`);
    console.log(`  💰 Total value: £${parseFloat(finalStats[0].total_value).toLocaleString()}`);
    console.log(`  🔧 Parts found: ${finalStats[0].parts_count.toLocaleString()}`);
    console.log(`  📄 Documents: ${finalStats[0].unique_documents.toLocaleString()}`);

    // Check completion percentage
    const targetTotal = 90062; // Based on verification
    const completionPercentage = (finalStats[0].total_items / targetTotal * 100);
    
    console.log('');
    console.log(`📈 Completion: ${completionPercentage.toFixed(1)}% (${finalStats[0].total_items}/${targetTotal})`);

    if (completionPercentage >= 95) {
      console.log('\n🎉 SUCCESS: Import is essentially complete!');
      console.log('✅ Your comprehensive automotive parts pricing intelligence system is ready!');
    } else {
      console.log(`\n⚡ Progress made: ${imported.toLocaleString()} new records added`);
      console.log(`📊 ${(100 - completionPercentage).toFixed(1)}% remaining`);
    }

    return {
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalStats[0].total_items),
      completionPercentage
    };

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function processBatch(sql, batch) {
  let imported = 0;
  let errors = 0;

  for (const item of batch) {
    try {
      await sql`
        INSERT INTO line_items (
          id, document_id, description, unit_price, quantity, 
          total_amount, vat_rate, vat_amount, line_total, created_at
        ) VALUES (
          ${item.id}, ${item.document_id}, ${item.description},
          ${item.unit_price}, ${item.quantity}, ${item.total_amount},
          ${item.vat_rate}, ${item.vat_amount}, ${item.line_total}, NOW()
        )
      `;
      imported++;
    } catch (error) {
      errors++;
      // Skip individual errors to continue batch processing
    }
  }

  return { imported, errors };
}

// Run the import
completeRemainingImport()
  .then(result => {
    console.log('\n🎯 IMPORT COMPLETION SUMMARY:');
    console.log(`✅ Successfully imported ${result.imported.toLocaleString()} new records`);
    console.log(`📊 Database now contains ${result.finalCount.toLocaleString()} total records`);
    console.log(`📈 ${result.completionPercentage.toFixed(1)}% of CSV data imported`);
    
    if (result.completionPercentage >= 95) {
      console.log('\n🎉 AUTOMOTIVE PARTS PRICING INTELLIGENCE SYSTEM READY!');
      process.exit(0);
    } else {
      console.log('\n⚡ Significant progress made - system substantially improved');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('❌ Import completion failed:', error);
    process.exit(1);
  });
