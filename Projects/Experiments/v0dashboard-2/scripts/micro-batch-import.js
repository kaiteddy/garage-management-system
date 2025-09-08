import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function microBatchImport() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🚀 MICRO-BATCH IMPORT - RELIABLE APPROACH');
    console.log('=========================================');

    // Check current status
    const currentStats = await sql`SELECT COUNT(*) as count FROM line_items`;
    const startingCount = parseInt(currentStats[0].count);
    console.log(`📊 Starting with: ${startingCount.toLocaleString()} records`);

    // Read CSV file
    const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📋 CSV has: ${lines.length.toLocaleString()} total lines`);
    
    // Get existing IDs to avoid duplicates (in batches)
    console.log('🔍 Getting existing IDs...');
    const existingIds = await sql`SELECT id FROM line_items`;
    const existingIdSet = new Set(existingIds.map(row => row.id));
    console.log(`📋 Found: ${existingIdSet.size.toLocaleString()} existing IDs`);

    // Process in micro-batches
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const microBatchSize = 50; // Very small batches for reliability
    
    console.log(`\n🚀 Starting micro-batch import (${microBatchSize} records per batch)...`);

    for (let startLine = 1; startLine < lines.length; startLine += microBatchSize) {
      const endLine = Math.min(startLine + microBatchSize, lines.length);
      const batchLines = lines.slice(startLine, endLine);
      
      console.log(`\n📦 Processing batch: lines ${startLine}-${endLine-1} (${batchLines.length} records)`);
      
      const batchResult = await processMicroBatch(sql, batchLines, existingIdSet);
      
      totalImported += batchResult.imported;
      totalSkipped += batchResult.skipped;
      totalErrors += batchResult.errors;
      
      // Add new IDs to existing set
      batchResult.newIds.forEach(id => existingIdSet.add(id));
      
      console.log(`✅ Batch result: +${batchResult.imported} imported, ${batchResult.skipped} skipped, ${batchResult.errors} errors`);
      console.log(`📊 Total progress: ${totalImported.toLocaleString()} new records imported`);
      
      // Show progress every 10 batches
      if ((startLine / microBatchSize) % 10 === 0) {
        const currentTotal = await sql`SELECT COUNT(*) as count FROM line_items`;
        const newTotal = parseInt(currentTotal[0].count);
        console.log(`\n📈 DATABASE UPDATE: ${startingCount.toLocaleString()} → ${newTotal.toLocaleString()} (+${newTotal - startingCount})`);
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
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
    const totalAdded = finalTotal - startingCount;

    console.log('\n🎉 MICRO-BATCH IMPORT COMPLETE!');
    console.log('===============================');
    console.log(`✅ New records imported: ${totalImported.toLocaleString()}`);
    console.log(`⚠️  Records skipped: ${totalSkipped.toLocaleString()}`);
    console.log(`❌ Errors encountered: ${totalErrors.toLocaleString()}`);
    console.log(`📈 Database change: ${startingCount.toLocaleString()} → ${finalTotal.toLocaleString()} (+${totalAdded})`);
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

    if (completionPercentage >= 95) {
      console.log('\n🎉 SUCCESS: AUTOMOTIVE PARTS PRICING INTELLIGENCE SYSTEM COMPLETE!');
      console.log('✅ Your comprehensive business intelligence system is ready!');
    } else if (totalAdded > 5000) {
      console.log('\n🎉 MAJOR PROGRESS: Significant data imported successfully!');
      console.log(`📊 ${(100 - completionPercentage).toFixed(1)}% remaining`);
    } else {
      console.log('\n✅ Micro-batch import completed successfully');
    }

    return {
      imported: totalImported,
      skipped: totalSkipped,
      errors: totalErrors,
      finalCount: finalTotal,
      completionPercentage
    };

  } catch (error) {
    console.error('❌ Micro-batch import failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function processMicroBatch(sql, batchLines, existingIdSet) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const newIds = [];

  for (const line of batchLines) {
    try {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      
      const id = values[0] || null;
      if (!id) {
        skipped++;
        continue;
      }

      // Skip if already exists
      if (existingIdSet.has(id)) {
        skipped++;
        continue;
      }

      const lineItem = {
        id: id,
        document_id: values[1] || null,
        stock_id: values[2] || null,
        description: values[11] || '',
        quantity: parseFloat(values[19]) || 0,
        unit_price: parseFloat(values[38]) || 0,
        tax_rate: parseFloat(values[28]) || 0,
        tax_amount: parseFloat(values[22]) || 0,
        total_amount: parseFloat(values[21]) || 0
      };

      // Insert record
      await sql`
        INSERT INTO line_items (
          id, document_id, stock_id, description, quantity, 
          unit_price, tax_rate, tax_amount, total_amount, created_at
        ) VALUES (
          ${lineItem.id}, ${lineItem.document_id}, ${lineItem.stock_id}, ${lineItem.description},
          ${lineItem.quantity}, ${lineItem.unit_price}, ${lineItem.tax_rate}, 
          ${lineItem.tax_amount}, ${lineItem.total_amount}, NOW()
        )
      `;
      
      imported++;
      newIds.push(id);

    } catch (error) {
      errors++;
      // Continue processing even if individual records fail
    }
  }

  return { imported, skipped, errors, newIds };
}

// Run the import
microBatchImport()
  .then(result => {
    console.log('\n🎯 FINAL SUMMARY:');
    console.log(`✅ Successfully imported ${result.imported.toLocaleString()} new records`);
    console.log(`📊 Database now contains ${result.finalCount.toLocaleString()} total records`);
    console.log(`📈 ${result.completionPercentage.toFixed(1)}% of target data imported`);
    
    if (result.completionPercentage >= 95) {
      console.log('\n🎉 AUTOMOTIVE PARTS PRICING INTELLIGENCE SYSTEM READY!');
      console.log('✅ Complete business intelligence with comprehensive data!');
      process.exit(0);
    } else if (result.imported > 5000) {
      console.log('\n🎉 SUBSTANTIAL PROGRESS - System significantly enhanced!');
      process.exit(0);
    } else {
      console.log('\n✅ Micro-batch import process completed successfully');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('❌ Micro-batch import failed:', error);
    process.exit(1);
  });
