import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function importLineItemsDirect() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔄 Starting direct import of line items from CSV...');

    const lineItemsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    
    // Read file
    const fileContent = fs.readFileSync(lineItemsPath, 'utf-8');
    const lines = fileContent.split('\n');
    
    console.log(`📊 Processing ${lines.length} lines from CSV`);
    
    // Get header and find column positions
    const headerLine = lines[0];
    const headerFields = headerLine.split(',');
    
    console.log('📋 CSV Headers:', headerFields.slice(0, 10)); // Show first 10 headers
    
    // Find column indices (case insensitive)
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

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Process ALL lines from CSV (~90,000 line items)
    const testLines = lines.slice(1); // Skip header, process all data lines
    console.log(`📊 Processing ALL ${testLines.length.toLocaleString()} line items from CSV...`);
    
    for (let i = 0; i < testLines.length; i++) {
      try {
        const line = testLines[i].trim();
        if (!line) continue;

        // Simple CSV parsing (handle quoted fields)
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
        fields.push(current.trim()); // Add last field

        // Extract line item data
        const lineItemId = fields[columnIndices.id] ? fields[columnIndices.id].replace(/"/g, '').trim() : '';
        
        if (!lineItemId || lineItemId.length < 5) {
          skipped++;
          continue;
        }

        // Get document ID and validate
        const documentId = fields[columnIndices.documentId] ? fields[columnIndices.documentId].replace(/"/g, '').trim() : '';
        
        if (!documentId) {
          skipped++;
          continue;
        }

        // Parse monetary values
        const parseMonetary = (value) => {
          if (!value) return null;
          const cleaned = value.replace(/[£$,]/g, '').trim();
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? null : parsed;
        };

        // Parse quantity
        const parseQuantity = (value) => {
          if (!value) return 1;
          const parsed = parseFloat(value.replace(/"/g, '').trim());
          return isNaN(parsed) ? 1 : parsed;
        };

        const description = fields[columnIndices.description] ? fields[columnIndices.description].replace(/"/g, '').trim() : '';
        
        // Skip if no description
        if (!description || description.length < 2) {
          skipped++;
          continue;
        }

        // Handle stock_id - set to null if empty to avoid foreign key constraint
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

        // Import line item
        await sql`
          INSERT INTO line_items (
            id, document_id, stock_id, line_type, description, quantity,
            unit_price, tax_rate, tax_amount, total_amount, notes
          ) VALUES (
            ${lineItem.id},
            ${lineItem.document_id},
            ${lineItem.stock_id},
            ${lineItem.line_type},
            ${lineItem.description},
            ${lineItem.quantity || 1},
            ${lineItem.unit_price || 0},
            ${lineItem.tax_rate || 0},
            ${lineItem.tax_amount || 0},
            ${lineItem.total_amount || 0},
            ${lineItem.notes || ''}
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
        
        imported++;

        if (imported % 1000 === 0) {
          console.log(`✅ Imported ${imported.toLocaleString()} line items...`);
        }

        // Show first few successful imports
        if (imported <= 10) {
          console.log(`📦 Sample: ${lineItem.description} - £${lineItem.unit_price} (${lineItem.line_type})`);
        }

      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`❌ Error on line ${i + 1}:`, error.message);
        }
      }
    }

    // Get final statistics
    const finalCount = await sql`SELECT COUNT(*) as count FROM line_items`;
    const totalLineItems = parseInt(finalCount[0].count);

    // Get line item statistics
    const stats = await sql`
      SELECT 
        COUNT(DISTINCT document_id) as documents_with_items,
        SUM(total_amount) as total_line_value,
        AVG(total_amount) as avg_line_value,
        COUNT(CASE WHEN line_type ILIKE '%service%' THEN 1 END) as service_items,
        COUNT(CASE WHEN line_type ILIKE '%part%' THEN 1 END) as part_items,
        COUNT(CASE WHEN unit_price > 0 THEN 1 END) as items_with_price
      FROM line_items
    `;

    console.log('\\n📊 Import Summary:');
    console.log(`✅ Imported: ${imported} line items`);
    console.log(`⚠️  Skipped: ${skipped} line items`);
    console.log(`❌ Errors: ${errors} line items`);
    console.log(`📦 Total in database: ${totalLineItems} line items`);
    
    if (stats[0]) {
      console.log(`\\n📈 Statistics:`);
      console.log(`  - Documents with items: ${stats[0].documents_with_items}`);
      console.log(`  - Total value: £${parseFloat(stats[0].total_line_value || 0).toFixed(2)}`);
      console.log(`  - Average value: £${parseFloat(stats[0].avg_line_value || 0).toFixed(2)}`);
      console.log(`  - Service items: ${stats[0].service_items}`);
      console.log(`  - Part items: ${stats[0].part_items}`);
      console.log(`  - Items with price: ${stats[0].items_with_price}`);
    }

    // Show sample of imported data
    const sampleImported = await sql`
      SELECT line_type, description, unit_price, quantity, total_amount
      FROM line_items 
      WHERE unit_price > 0
      ORDER BY total_amount DESC
      LIMIT 10
    `;

    if (sampleImported.length > 0) {
      console.log('\\n🏆 Top 10 valuable line items:');
      sampleImported.forEach((item, i) => {
        console.log(`${i + 1}. ${item.description} (${item.line_type}) - £${item.unit_price} x ${item.quantity} = £${item.total_amount}`);
      });
    }

    console.log('\\n🎉 Direct import completed successfully!');

  } catch (error) {
    console.error('❌ Direct import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the import
importLineItemsDirect();
