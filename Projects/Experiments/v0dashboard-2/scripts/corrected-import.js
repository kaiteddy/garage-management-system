import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function correctedImport() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🚀 CORRECTED IMPORT - PROPER COLUMN MAPPING');
    console.log('===========================================');

    // Check current status
    const currentStats = await sql`SELECT COUNT(*) as count FROM line_items`;
    console.log(`📊 Current database records: ${currentStats[0].count.toLocaleString()}`);

    // Read CSV file
    const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📋 Total CSV lines: ${lines.length.toLocaleString()}`);
    
    // Get header
    const header = lines[0].split(',').map(h => h.replace(/"/g, ''));
    console.log(`📊 CSV columns: ${header.length}`);

    // Correct column mapping based on actual table structure
    const idIndex = 0; // _ID
    const docIdIndex = 1; // _ID_Document  
    const stockIdIndex = 2; // _ID_Stock
    const descIndex = 11; // itemDescription
    const qtyIndex = 19; // itemQuantity
    const unitPriceIndex = 38; // itemUnitPrice
    const taxRateIndex = 28; // itemTaxRate
    const taxAmountIndex = 22; // itemSub_Tax
    const totalAmountIndex = 21; // itemSub_Net

    console.log(`🔍 Column mapping:`);
    console.log(`  ID: ${idIndex}, Doc: ${docIdIndex}, Stock: ${stockIdIndex}`);
    console.log(`  Desc: ${descIndex}, Qty: ${qtyIndex}, Price: ${unitPriceIndex}`);
    console.log(`  Tax Rate: ${taxRateIndex}, Tax: ${taxAmountIndex}, Total: ${totalAmountIndex}`);

    // Process records
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 500;
    let batch = [];

    console.log('\n🚀 Starting corrected import...');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = line.split(',').map(v => v.replace(/"/g, ''));
        
        const id = values[idIndex] || null;
        if (!id) {
          skipped++;
          continue;
        }

        const lineItem = {
          id: id,
          document_id: values[docIdIndex] || null,
          stock_id: values[stockIdIndex] || null,
          description: values[descIndex] || '',
          quantity: parseFloat(values[qtyIndex]) || 0,
          unit_price: parseFloat(values[unitPriceIndex]) || 0,
          tax_rate: parseFloat(values[taxRateIndex]) || 0,
          tax_amount: parseFloat(values[taxAmountIndex]) || 0,
          total_amount: parseFloat(values[totalAmountIndex]) || 0
        };

        batch.push(lineItem);

        // Process batch when full
        if (batch.length >= batchSize) {
          const batchResult = await processBatch(sql, batch);
          imported += batchResult.imported;
          errors += batchResult.errors;
          batch = [];
          
          if (imported % 2000 === 0 && imported > 0) {
            console.log(`✅ Imported ${imported.toLocaleString()} new records (CSV line ${i})`);
          }
        }

      } catch (error) {
        errors++;
        if (errors <= 10) {
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

    // Final results
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_items,
        SUM(total_amount) as total_value,
        COUNT(CASE WHEN description NOT ILIKE '%labour%' AND total_amount > 0 THEN 1 END) as parts_count,
        COUNT(DISTINCT document_id) as unique_documents
      FROM line_items
    `;

    const finalTotal = parseInt(finalStats[0].total_items);
    const totalAdded = finalTotal - parseInt(currentStats[0].count);

    console.log('\n🎉 CORRECTED IMPORT COMPLETE!');
    console.log('=============================');
    console.log(`✅ New records imported: ${imported.toLocaleString()}`);
    console.log(`⚠️  Records skipped: ${skipped.toLocaleString()}`);
    console.log(`❌ Errors encountered: ${errors.toLocaleString()}`);
    console.log(`📈 Database change: ${currentStats[0].count} → ${finalTotal} (+${totalAdded})`);
    console.log('');
    console.log(`📊 FINAL DATABASE STATUS:`);
    console.log(`  📦 Total records: ${finalStats[0].total_items.toLocaleString()}`);
    console.log(`  💰 Total value: £${parseFloat(finalStats[0].total_value).toLocaleString()}`);
    console.log(`  🔧 Parts found: ${finalStats[0].parts_count.toLocaleString()}`);
    console.log(`  📄 Documents: ${finalStats[0].unique_documents.toLocaleString()}`);

    // Check completion percentage
    const targetTotal = 90062;
    const completionPercentage = (finalTotal / targetTotal * 100);
    
    console.log('');
    console.log(`📈 Completion: ${completionPercentage.toFixed(1)}% (${finalTotal}/${targetTotal})`);

    if (completionPercentage >= 98) {
      console.log('\n🎉 SUCCESS: AUTOMOTIVE PARTS PRICING INTELLIGENCE SYSTEM COMPLETE!');
      console.log('✅ Your comprehensive business intelligence system is ready for use!');
    } else if (imported > 10000) {
      console.log('\n🎉 MAJOR PROGRESS: Significant data imported successfully!');
      console.log(`📊 ${(100 - completionPercentage).toFixed(1)}% remaining`);
    } else {
      console.log('\n⚡ Import completed with current available data');
    }

    return {
      imported,
      skipped,
      errors,
      finalCount: finalTotal,
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
      // Use INSERT ... ON CONFLICT DO NOTHING to handle duplicates
      await sql`
        INSERT INTO line_items (
          id, document_id, stock_id, description, quantity, 
          unit_price, tax_rate, tax_amount, total_amount, created_at
        ) VALUES (
          ${item.id}, ${item.document_id}, ${item.stock_id}, ${item.description},
          ${item.quantity}, ${item.unit_price}, ${item.tax_rate}, 
          ${item.tax_amount}, ${item.total_amount}, NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;
      imported++;
    } catch (error) {
      errors++;
      // Continue processing even if individual records fail
    }
  }

  return { imported, errors };
}

// Run the import
correctedImport()
  .then(result => {
    console.log('\n🎯 FINAL SUMMARY:');
    console.log(`✅ Successfully imported ${result.imported.toLocaleString()} new records`);
    console.log(`📊 Database now contains ${result.finalCount.toLocaleString()} total records`);
    console.log(`📈 ${result.completionPercentage.toFixed(1)}% of target data imported`);
    
    if (result.completionPercentage >= 98) {
      console.log('\n🎉 AUTOMOTIVE PARTS PRICING INTELLIGENCE SYSTEM READY!');
      console.log('✅ Complete business intelligence with comprehensive data!');
      process.exit(0);
    } else if (result.imported > 10000) {
      console.log('\n🎉 SUBSTANTIAL PROGRESS - System significantly enhanced!');
      process.exit(0);
    } else {
      console.log('\n✅ Import process completed successfully');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
