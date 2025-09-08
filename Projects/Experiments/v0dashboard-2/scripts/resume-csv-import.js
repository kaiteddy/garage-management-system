import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function resumeCSVImport() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔄 RESUMING CSV IMPORT FROM 57,195');
    console.log('==================================');

    // Check current status
    const currentCount = await sql`SELECT COUNT(*) as count FROM line_items`;
    console.log(`📊 Current items in database: ${currentCount[0].count.toLocaleString()}`);

    // Read CSV file
    const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    console.log(`📄 Reading CSV: ${csvPath}`);
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📋 Total CSV lines: ${lines.length.toLocaleString()}`);
    
    // Get header
    const header = lines[0].split(',').map(h => h.replace(/"/g, ''));
    console.log(`📊 CSV columns: ${header.join(', ')}`);

    // Find where to resume - get the last imported ID
    const lastImported = await sql`
      SELECT id FROM line_items 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    let startLineIndex = 1; // Start after header
    if (lastImported.length > 0) {
      const lastId = lastImported[0].id;
      console.log(`🔍 Last imported ID: ${lastId}`);
      
      // Find this ID in the CSV to know where to resume
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = line.split(',').map(v => v.replace(/"/g, ''));
        const csvId = values[0];
        
        if (csvId === lastId) {
          startLineIndex = i + 1; // Start from next line
          console.log(`✅ Found last imported ID at CSV line ${i}, resuming from line ${startLineIndex}`);
          break;
        }
      }
    }

    console.log(`🚀 Starting import from CSV line ${startLineIndex}`);
    console.log(`📦 Remaining lines to process: ${lines.length - startLineIndex}`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 100;
    let batch = [];

    for (let i = startLineIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = line.split(',').map(v => v.replace(/"/g, ''));
        
        const lineItem = {
          id: values[0] || null,
          document_id: values[1] || null,
          description: values[2] || '',
          unit_price: parseFloat(values[3]) || 0,
          quantity: parseFloat(values[4]) || 0,
          total_amount: parseFloat(values[5]) || 0,
          vat_rate: parseFloat(values[6]) || 0,
          vat_amount: parseFloat(values[7]) || 0,
          line_total: parseFloat(values[8]) || 0
        };

        // Skip if ID is null or empty
        if (!lineItem.id) {
          skipped++;
          continue;
        }

        batch.push(lineItem);

        // Process batch
        if (batch.length >= batchSize) {
          await processBatch(sql, batch);
          imported += batch.length;
          batch = [];
          
          if (imported % 1000 === 0) {
            console.log(`✅ Imported ${imported} items (CSV line ${i})`);
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
      await processBatch(sql, batch);
      imported += batch.length;
    }

    // Final status
    const finalCount = await sql`SELECT COUNT(*) as count FROM line_items`;
    const finalValue = await sql`SELECT SUM(total_amount) as total FROM line_items`;
    
    console.log('\n🎉 IMPORT COMPLETE!');
    console.log('==================');
    console.log(`✅ Imported: ${imported} new items`);
    console.log(`⚠️  Skipped: ${skipped} items`);
    console.log(`❌ Errors: ${errors} items`);
    console.log(`📊 Final total: ${finalCount[0].count.toLocaleString()} items`);
    console.log(`💰 Total value: £${parseFloat(finalValue[0].total || 0).toLocaleString()}`);

    if (finalCount[0].count >= 90000) {
      console.log('\n🎉 SUCCESS: Complete CSV import achieved!');
    } else {
      console.log(`\n⚡ Progress: ${(finalCount[0].count / 90063 * 100).toFixed(1)}% complete`);
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function processBatch(sql, batch) {
  for (const item of batch) {
    try {
      // Use INSERT ... ON CONFLICT DO NOTHING to handle duplicates
      await sql`
        INSERT INTO line_items (
          id, document_id, description, unit_price, quantity, 
          total_amount, vat_rate, vat_amount, line_total, created_at
        ) VALUES (
          ${item.id}, ${item.document_id}, ${item.description},
          ${item.unit_price}, ${item.quantity}, ${item.total_amount},
          ${item.vat_rate}, ${item.vat_amount}, ${item.line_total}, NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;
    } catch (error) {
      // Skip individual errors to keep batch processing
      console.log(`⚠️  Skipped item ${item.id}: ${error.message}`);
    }
  }
}

// Run the import
resumeCSVImport();
