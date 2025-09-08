import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function fastBatchImport() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🚀 FAST BATCH IMPORT - OPTIMIZED FOR SPEED');
    console.log('==========================================');

    const lineItemsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    
    // Read file
    const fileContent = fs.readFileSync(lineItemsPath, 'utf-8');
    const lines = fileContent.split('\n');
    
    console.log(`📊 Processing ${lines.length.toLocaleString()} lines from CSV`);
    
    // Get header and find column positions
    const headerLine = lines[0];
    const headerFields = headerLine.split(',');
    
    const findColumnIndex = (columnName) => {
      return headerFields.findIndex(field => 
        field.toLowerCase().replace(/"/g, '').trim() === columnName.toLowerCase()
      );
    };

    const columnIndices = {
      id: findColumnIndex('_ID'),
      documentId: findColumnIndex('_ID_Document'),
      stockId: findColumnIndex('_ID_Stock'),
      lineType: findColumnIndex('itemType'),
      description: findColumnIndex('itemDescription'),
      quantity: findColumnIndex('itemQuantity'),
      unitPrice: findColumnIndex('itemUnitPrice'),
      taxRate: findColumnIndex('itemTaxRate'),
      taxAmount: findColumnIndex('itemSub_Tax'),
      totalAmount: findColumnIndex('itemSub_Gross'),
      notes: findColumnIndex('itemGuarantee_Notes')
    };

    console.log('🔍 Column indices found:', columnIndices);

    // Process in large batches for speed
    const BATCH_SIZE = 1000;
    const dataLines = lines.slice(1); // Skip header
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    const startTime = Date.now();

    for (let batchStart = 0; batchStart < dataLines.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, dataLines.length);
      const batch = dataLines.slice(batchStart, batchEnd);
      
      console.log(`📦 Processing batch ${Math.floor(batchStart/BATCH_SIZE) + 1}: lines ${batchStart + 1}-${batchEnd}`);
      
      // Prepare batch data
      const batchData = [];
      
      for (let i = 0; i < batch.length; i++) {
        try {
          const line = batch[i].trim();
          if (!line) continue;

          // Simple CSV parsing
          const fields = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              fields.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          fields.push(current.trim());

          // Extract line item data
          const lineItemId = fields[columnIndices.id] ? fields[columnIndices.id].replace(/"/g, '').trim() : '';
          
          if (!lineItemId || lineItemId.length < 5) {
            skipped++;
            continue;
          }

          const documentId = fields[columnIndices.documentId] ? fields[columnIndices.documentId].replace(/"/g, '').trim() : '';
          
          if (!documentId) {
            skipped++;
            continue;
          }

          const description = fields[columnIndices.description] ? fields[columnIndices.description].replace(/"/g, '').trim() : '';
          
          if (!description || description.length < 2) {
            skipped++;
            continue;
          }

          // Parse values
          const parseMonetary = (value) => {
            if (!value) return null;
            const cleaned = value.replace(/[£$,]/g, '').trim();
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
          };

          const parseQuantity = (value) => {
            if (!value) return 1;
            const parsed = parseFloat(value.replace(/"/g, '').trim());
            return isNaN(parsed) ? 1 : parsed;
          };

          // Handle stock_id - set to null if empty
          const stockIdRaw = fields[columnIndices.stockId] ? fields[columnIndices.stockId].replace(/"/g, '').trim() : '';
          const stockId = stockIdRaw && stockIdRaw !== '' && stockIdRaw !== '0' ? stockIdRaw : null;

          const lineItem = {
            id: lineItemId,
            document_id: documentId,
            stock_id: stockId,
            line_type: fields[columnIndices.lineType] ? fields[columnIndices.lineType].replace(/"/g, '').trim() : 'service',
            description: description,
            quantity: parseQuantity(fields[columnIndices.quantity] ? fields[columnIndices.quantity] : '1'),
            unit_price: parseMonetary(fields[columnIndices.unitPrice] ? fields[columnIndices.unitPrice].replace(/"/g, '').trim() : ''),
            tax_rate: parseMonetary(fields[columnIndices.taxRate] ? fields[columnIndices.taxRate].replace(/"/g, '').trim() : ''),
            tax_amount: parseMonetary(fields[columnIndices.taxAmount] ? fields[columnIndices.taxAmount].replace(/"/g, '').trim() : ''),
            total_amount: parseMonetary(fields[columnIndices.totalAmount] ? fields[columnIndices.totalAmount].replace(/"/g, '').trim() : ''),
            notes: fields[columnIndices.notes] ? fields[columnIndices.notes].replace(/"/g, '').trim() : ''
          };

          batchData.push(lineItem);

        } catch (error) {
          errors++;
        }
      }

      // Batch insert using COPY or bulk insert
      if (batchData.length > 0) {
        try {
          // Use a single transaction for the entire batch
          await sql.begin(async (sql) => {
            for (const item of batchData) {
              await sql`
                INSERT INTO line_items (
                  id, document_id, stock_id, line_type, description, quantity,
                  unit_price, tax_rate, tax_amount, total_amount, notes
                ) VALUES (
                  ${item.id},
                  ${item.document_id},
                  ${item.stock_id},
                  ${item.line_type},
                  ${item.description},
                  ${item.quantity || 1},
                  ${item.unit_price || 0},
                  ${item.tax_rate || 0},
                  ${item.tax_amount || 0},
                  ${item.total_amount || 0},
                  ${item.notes || ''}
                )
                ON CONFLICT (id) DO UPDATE SET
                  document_id = EXCLUDED.document_id,
                  stock_id = EXCLUDED.stock_id,
                  line_type = EXCLUDED.line_type,
                  description = EXCLUDED.description,
                  quantity = EXCLUDED.quantity,
                  unit_price = EXCLUDED.unit_price,
                  tax_rate = EXCLUDED.tax_rate,
                  tax_amount = EXCLUDED.tax_amount,
                  total_amount = EXCLUDED.total_amount,
                  notes = EXCLUDED.notes,
                  updated_at = NOW()
              `;
            }
          });
          
          imported += batchData.length;
          
          // Progress update
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = imported / elapsed;
          const eta = (dataLines.length - (batchStart + BATCH_SIZE)) / rate;
          
          console.log(`✅ Batch complete: ${imported.toLocaleString()} total imported`);
          console.log(`⚡ Speed: ${rate.toFixed(1)} items/sec | ETA: ${Math.round(eta/60)}m ${Math.round(eta%60)}s`);
          
        } catch (batchError) {
          console.error(`❌ Batch error:`, batchError.message);
          errors += batchData.length;
        }
      }
    }

    // Final statistics
    const finalCount = await sql`SELECT COUNT(*) as count FROM line_items`;
    const totalValue = await sql`SELECT SUM(total_amount) as total FROM line_items`;
    const partsCount = await sql`
      SELECT COUNT(*) as count 
      FROM line_items 
      WHERE description NOT ILIKE '%labour%' AND total_amount > 0
    `;

    console.log('\\n🎉 FAST IMPORT COMPLETE!');
    console.log('========================');
    console.log(`✅ Total imported: ${imported.toLocaleString()}`);
    console.log(`⚠️  Skipped: ${skipped.toLocaleString()}`);
    console.log(`❌ Errors: ${errors.toLocaleString()}`);
    console.log(`📦 Final database count: ${finalCount[0].count.toLocaleString()}`);
    console.log(`💰 Total value: £${parseFloat(totalValue[0].total || 0).toLocaleString()}`);
    console.log(`🔧 Parts found: ${partsCount[0].count.toLocaleString()}`);
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`⚡ Total time: ${Math.round(totalTime/60)}m ${Math.round(totalTime%60)}s`);
    console.log(`📈 Average speed: ${(imported/totalTime).toFixed(1)} items/sec`);

  } catch (error) {
    console.error('❌ Fast import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the fast import
fastBatchImport();
