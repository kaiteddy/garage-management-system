#!/usr/bin/env node

/**
 * 🔧 FIXED CSV IMPORT
 * 
 * Properly handles CSV parsing with correct line endings
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.NEON_DATABASE_URL);

async function fixedCsvImport() {
  console.log('🔧 FIXED CSV IMPORT');
  console.log('===================\n');
  
  const startTime = Date.now();
  
  try {
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connected\n');
    
    // Check current state
    const [docs, rems, stock] = await Promise.all([
      sql`SELECT COUNT(*) FROM documents`,
      sql`SELECT COUNT(*) FROM reminders`,
      sql`SELECT COUNT(*) FROM stock`
    ]);
    
    console.log('📊 Current state:');
    console.log(`   Documents: ${parseInt(docs[0].count).toLocaleString()}`);
    console.log(`   Reminders: ${parseInt(rems[0].count).toLocaleString()}`);
    console.log(`   Stock: ${parseInt(stock[0].count).toLocaleString()}\n`);
    
    // Import documents with proper CSV parsing
    if (parseInt(docs[0].count) < 30000) {
      console.log('📄 IMPORTING DOCUMENTS WITH FIXED CSV PARSING...');
      await importDocumentsFixed();
    }
    
    // Import reminders
    if (parseInt(rems[0].count) < 10000) {
      console.log('⏰ IMPORTING REMINDERS...');
      await importRemindersFixed();
    }
    
    // Import stock
    if (parseInt(stock[0].count) < 200) {
      console.log('📦 IMPORTING STOCK...');
      await importStockFixed();
    }
    
    // Final verification
    const [finalDocs, finalRems, finalStock] = await Promise.all([
      sql`SELECT COUNT(*) FROM documents`,
      sql`SELECT COUNT(*) FROM reminders`,
      sql`SELECT COUNT(*) FROM stock`
    ]);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 FIXED CSV IMPORT COMPLETED!');
    console.log('==============================');
    console.log(`📄 Documents: ${parseInt(finalDocs[0].count).toLocaleString()}`);
    console.log(`⏰ Reminders: ${parseInt(finalRems[0].count).toLocaleString()}`);
    console.log(`📦 Stock: ${parseInt(finalStock[0].count).toLocaleString()}`);
    console.log(`⏱️  Total time: ${duration} seconds`);
    
    if (duration < 600) { // Less than 10 minutes
      console.log('\n🚀 SUCCESS! Import completed quickly!');
    }
    
  } catch (error) {
    console.error('❌ Fixed CSV import failed:', error);
    process.exit(1);
  }
}

async function importDocumentsFixed() {
  const csvPath = './data/Documents.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Documents.csv not found');
    return;
  }
  
  console.log('   Reading CSV with proper parser...');
  
  try {
    // Use proper CSV parser instead of manual splitting
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`   ✅ Parsed ${records.length.toLocaleString()} documents correctly!`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches for speed
    const batchSize = 100;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Process each record in the batch
      for (const record of batch) {
        try {
          // Map fields carefully
          const docId = record._ID || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const customerId = record._ID_Customer || null;
          const vehicleId = record._ID_Vehicle || null;
          const docType = (record.docType || 'INVOICE').substring(0, 50);
          const docNumber = (record.docNumber || '').substring(0, 50) || null;
          const totalGross = parseFloat(record.docTotal_GROSS || '0') || 0;
          const totalNet = parseFloat(record.docTotal_NET || '0') || 0;
          const totalTax = parseFloat(record.docTotal_TAX || '0') || 0;
          const customerName = (record.customerName || '').substring(0, 255) || null;
          const vehicleReg = (record.vehicleRegistration || '').substring(0, 20) || null;
          
          // Insert individual record
          const result = await sql`
            INSERT INTO documents (
              _id, _id_customer, _id_vehicle, doc_type, doc_number,
              total_gross, total_net, total_tax, customer_name, vehicle_registration,
              created_at, updated_at
            ) VALUES (
              ${docId}, ${customerId}, ${vehicleId}, ${docType}, ${docNumber},
              ${totalGross}, ${totalNet}, ${totalTax}, ${customerName}, ${vehicleReg},
              NOW(), NOW()
            )
            ON CONFLICT (_id) DO NOTHING
            RETURNING _id
          `;
          
          if (result.length > 0) {
            imported++;
          } else {
            skipped++;
          }
          
        } catch (error) {
          if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
            skipped++;
          } else {
            errors++;
            if (errors <= 5) {
              console.error(`   Error: ${error.message}`);
            }
          }
        }
      }
      
      // Progress update every 10 batches (1000 records)
      if ((Math.floor(i / batchSize) + 1) % 10 === 0) {
        console.log(`   Progress: ${imported + skipped + errors}/${records.length} processed (${imported} imported, ${skipped} skipped, ${errors} errors)`);
      }
    }
    
    console.log(`   ✅ Documents: ${imported.toLocaleString()} imported, ${skipped.toLocaleString()} skipped, ${errors.toLocaleString()} errors`);
    
  } catch (error) {
    console.error(`   ❌ Documents import failed: ${error.message}`);
  }
}

async function importRemindersFixed() {
  const csvPath = './data/Reminders.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Reminders.csv not found');
    return;
  }
  
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`   Processing ${records.length.toLocaleString()} reminders...`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const record of records) {
      try {
        const remId = record._ID || `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const vehicleId = record._ID_Vehicle || null;
        const customerId = record._ID_Customer || null;
        const reminderType = (record.reminderType || 'general').substring(0, 50);
        const reminderStatus = (record.reminderStatus || 'pending').substring(0, 50);
        const reminderMessage = (record.reminderMessage || '').substring(0, 1000) || null;
        
        const result = await sql`
          INSERT INTO reminders (
            _id, _id_vehicle, _id_customer, reminder_type, reminder_status, reminder_message,
            created_at, updated_at
          ) VALUES (
            ${remId}, ${vehicleId}, ${customerId}, ${reminderType}, ${reminderStatus}, ${reminderMessage},
            NOW(), NOW()
          )
          ON CONFLICT (_id) DO NOTHING
          RETURNING _id
        `;
        
        if (result.length > 0) {
          imported++;
        } else {
          skipped++;
        }
        
        // Progress update every 1000 records
        if ((imported + skipped + errors) % 1000 === 0) {
          console.log(`   Progress: ${imported + skipped + errors}/${records.length} processed`);
        }
        
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`   Reminder error: ${error.message}`);
        }
      }
    }
    
    console.log(`   ✅ Reminders: ${imported.toLocaleString()} imported, ${skipped.toLocaleString()} skipped, ${errors.toLocaleString()} errors`);
    
  } catch (error) {
    console.error(`   ❌ Reminders import failed: ${error.message}`);
  }
}

async function importStockFixed() {
  const csvPath = './data/Stock.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Stock.csv not found');
    return;
  }
  
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`   Processing ${records.length.toLocaleString()} stock items...`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const record of records) {
      try {
        const stockId = record._ID || `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const itemCode = (record.itemCode || record.itemBarcodeNumber || '').substring(0, 100) || null;
        const itemDescription = (record.itemDescription || '').substring(0, 500) || null;
        const itemCategory = (record.itemCategory || '').substring(0, 100) || null;
        const unitPrice = parseFloat(record.itemUnitPrice || record.itemPrice || '0') || 0;
        const costPrice = parseFloat(record.itemCostPrice || record.itemCost || '0') || 0;
        const quantity = parseInt(record.itemQuantity_InStock || record.itemQuantity || '0') || 0;
        
        const result = await sql`
          INSERT INTO stock (
            _id, item_code, item_description, item_category,
            item_unit_price, item_cost_price, item_quantity_in_stock,
            created_at, updated_at
          ) VALUES (
            ${stockId}, ${itemCode}, ${itemDescription}, ${itemCategory},
            ${unitPrice}, ${costPrice}, ${quantity},
            NOW(), NOW()
          )
          ON CONFLICT (_id) DO NOTHING
          RETURNING _id
        `;
        
        if (result.length > 0) {
          imported++;
        } else {
          skipped++;
        }
        
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`   Stock error: ${error.message}`);
        }
      }
    }
    
    console.log(`   ✅ Stock: ${imported.toLocaleString()} imported, ${skipped.toLocaleString()} skipped, ${errors.toLocaleString()} errors`);
    
  } catch (error) {
    console.error(`   ❌ Stock import failed: ${error.message}`);
  }
}

// Run the import
fixedCsvImport();
