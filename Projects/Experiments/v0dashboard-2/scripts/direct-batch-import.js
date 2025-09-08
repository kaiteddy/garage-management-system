import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function directBatchImport() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🚀 DIRECT BATCH IMPORT - TESTING APPROACH');
    console.log('=========================================');

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
    console.log(`📊 Header: ${header.slice(0, 5).join(', ')}...`);

    // Find column indices
    const idIndex = 0; // _ID
    const docIdIndex = 1; // _ID_Document  
    const descIndex = 11; // itemDescription
    const unitPriceIndex = 38; // itemUnitPrice
    const qtyIndex = 19; // itemQuantity
    const netIndex = 21; // itemSub_Net
    const taxRateIndex = 28; // itemTaxRate
    const taxIndex = 22; // itemSub_Tax
    const grossIndex = 20; // itemSub_Gross

    console.log(`🔍 Using columns: ID=${idIndex}, Desc=${descIndex}, Net=${netIndex}`);

    // Process first 1000 lines to test
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const testLimit = 1000;

    console.log(`\n🧪 Testing import of first ${testLimit} CSV lines...`);

    for (let i = 1; i <= Math.min(testLimit, lines.length - 1); i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = line.split(',').map(v => v.replace(/"/g, ''));
        
        const id = values[idIndex] || null;
        if (!id) {
          skipped++;
          continue;
        }

        // Check if already exists
        const exists = await sql`SELECT 1 FROM line_items WHERE id = ${id} LIMIT 1`;
        if (exists.length > 0) {
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

        // Insert record
        await sql`
          INSERT INTO line_items (
            id, document_id, description, unit_price, quantity, 
            total_amount, vat_rate, vat_amount, line_total, created_at
          ) VALUES (
            ${lineItem.id}, ${lineItem.document_id}, ${lineItem.description},
            ${lineItem.unit_price}, ${lineItem.quantity}, ${lineItem.total_amount},
            ${lineItem.vat_rate}, ${lineItem.vat_amount}, ${lineItem.line_total}, NOW()
          )
        `;
        
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} new records (CSV line ${i})`);
        }

      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.log(`❌ Error on CSV line ${i}: ${error.message}`);
        }
      }
    }

    // Check results
    const newStats = await sql`SELECT COUNT(*) as count FROM line_items`;
    const newTotal = parseInt(newStats[0].count);
    const added = newTotal - parseInt(currentStats[0].count);

    console.log('\n📊 TEST BATCH RESULTS:');
    console.log(`✅ New records imported: ${imported}`);
    console.log(`⚠️  Records skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Database total: ${currentStats[0].count} → ${newTotal} (+${added})`);

    if (imported > 0) {
      console.log('\n🎉 SUCCESS: Import method works!');
      console.log('💡 Ready to process remaining records');
      
      // If test successful, continue with full import
      if (imported >= 50) {
        console.log('\n🚀 Starting full import of remaining records...');
        await fullImport(sql, lines, header, currentStats[0].count);
      }
    } else {
      console.log('\n⚠️  No new records imported in test batch');
      console.log('💡 All tested records may already exist');
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
  }
}

async function fullImport(sql, lines, header, startingCount) {
  console.log('🚀 FULL IMPORT STARTING...');
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  const idIndex = 0;
  const docIdIndex = 1;
  const descIndex = 11;
  const unitPriceIndex = 38;
  const qtyIndex = 19;
  const netIndex = 21;
  const taxRateIndex = 28;
  const taxIndex = 22;
  const grossIndex = 20;

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

      // Check if already exists (batch check would be more efficient)
      const exists = await sql`SELECT 1 FROM line_items WHERE id = ${id} LIMIT 1`;
      if (exists.length > 0) {
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

      await sql`
        INSERT INTO line_items (
          id, document_id, description, unit_price, quantity, 
          total_amount, vat_rate, vat_amount, line_total, created_at
        ) VALUES (
          ${lineItem.id}, ${lineItem.document_id}, ${lineItem.description},
          ${lineItem.unit_price}, ${lineItem.quantity}, ${lineItem.total_amount},
          ${lineItem.vat_rate}, ${lineItem.vat_amount}, ${lineItem.line_total}, NOW()
        )
      `;
      
      imported++;
      
      if (imported % 1000 === 0) {
        console.log(`✅ Imported ${imported} new records (CSV line ${i})`);
      }

    } catch (error) {
      errors++;
      if (errors <= 10) {
        console.log(`❌ Error on CSV line ${i}: ${error.message}`);
      }
    }
  }

  const finalStats = await sql`SELECT COUNT(*) as count FROM line_items`;
  const finalTotal = parseInt(finalStats[0].count);
  const totalAdded = finalTotal - startingCount;

  console.log('\n🎉 FULL IMPORT COMPLETE!');
  console.log(`✅ Total new records: ${totalAdded}`);
  console.log(`📊 Final database total: ${finalTotal.toLocaleString()}`);
  
  const completionPercentage = (finalTotal / 90062 * 100);
  console.log(`📈 Completion: ${completionPercentage.toFixed(1)}%`);
  
  if (completionPercentage >= 98) {
    console.log('🎉 AUTOMOTIVE PARTS PRICING INTELLIGENCE SYSTEM COMPLETE!');
  }
}

// Run the import
directBatchImport();
