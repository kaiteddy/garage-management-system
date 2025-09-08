#!/usr/bin/env node

/**
 * 🎯 RELIABLE FAST IMPORT
 * 
 * Uses proven individual INSERT statements with proper error handling
 * Should complete in 5-10 minutes maximum
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.NEON_DATABASE_URL);

async function reliableFastImport() {
  console.log('🎯 RELIABLE FAST IMPORT');
  console.log('=======================\n');
  
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
    
    // Import documents
    if (parseInt(docs[0].count) < 30000) {
      console.log('📄 IMPORTING DOCUMENTS...');
      await importDocumentsReliable();
    }
    
    // Import reminders
    if (parseInt(rems[0].count) < 10000) {
      console.log('⏰ IMPORTING REMINDERS...');
      await importRemindersReliable();
    }
    
    // Import stock
    if (parseInt(stock[0].count) < 200) {
      console.log('📦 IMPORTING STOCK...');
      await importStockReliable();
    }
    
    // Final verification
    const [finalDocs, finalRems, finalStock] = await Promise.all([
      sql`SELECT COUNT(*) FROM documents`,
      sql`SELECT COUNT(*) FROM reminders`,
      sql`SELECT COUNT(*) FROM stock`
    ]);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 RELIABLE FAST IMPORT COMPLETED!');
    console.log('==================================');
    console.log(`📄 Documents: ${parseInt(finalDocs[0].count).toLocaleString()}`);
    console.log(`⏰ Reminders: ${parseInt(finalRems[0].count).toLocaleString()}`);
    console.log(`📦 Stock: ${parseInt(finalStock[0].count).toLocaleString()}`);
    console.log(`⏱️  Total time: ${duration} seconds`);
    
    if (duration < 600) { // Less than 10 minutes
      console.log('\n🚀 SUCCESS! Import completed quickly as expected!');
    }
    
  } catch (error) {
    console.error('❌ Reliable fast import failed:', error);
    process.exit(1);
  }
}

async function importDocumentsReliable() {
  const csvPath = './data/Documents.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Documents.csv not found');
    return;
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  console.log(`   Processing ${lines.length - 1} documents...`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  // Process in smaller batches for reliability
  const batchSize = 50;
  
  for (let i = 1; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    
    // Process each record in the batch
    for (const line of batch) {
      try {
        const fields = line.split(',').map(f => f.replace(/"/g, '').trim());
        const record = {};
        headers.forEach((h, idx) => record[h] = fields[idx] || '');
        
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
    
    // Progress update every 10 batches
    if ((Math.floor((i - 1) / batchSize) + 1) % 10 === 0) {
      console.log(`   Progress: ${imported + skipped + errors}/${lines.length - 1} processed (${imported} imported, ${skipped} skipped, ${errors} errors)`);
    }
  }
  
  console.log(`   ✅ Documents: ${imported.toLocaleString()} imported, ${skipped.toLocaleString()} skipped, ${errors.toLocaleString()} errors`);
}

async function importRemindersReliable() {
  const csvPath = './data/Reminders.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Reminders.csv not found');
    return;
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  console.log(`   Processing ${lines.length - 1} reminders...`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = lines[i].split(',').map(f => f.replace(/"/g, '').trim());
      const record = {};
      headers.forEach((h, idx) => record[h] = fields[idx] || '');
      
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
      if (i % 1000 === 0) {
        console.log(`   Progress: ${i}/${lines.length - 1} processed`);
      }
      
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.error(`   Reminder error: ${error.message}`);
      }
    }
  }
  
  console.log(`   ✅ Reminders: ${imported.toLocaleString()} imported, ${skipped.toLocaleString()} skipped, ${errors.toLocaleString()} errors`);
}

async function importStockReliable() {
  const csvPath = './data/Stock.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Stock.csv not found');
    return;
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  console.log(`   Processing ${lines.length - 1} stock items...`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = lines[i].split(',').map(f => f.replace(/"/g, '').trim());
      const record = {};
      headers.forEach((h, idx) => record[h] = fields[idx] || '');
      
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
}

// Run the import
reliableFastImport();
