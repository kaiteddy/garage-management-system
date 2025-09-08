import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DIRECT_URL || process.env.NEON_DATABASE_URL;
const sql = neon(dbUrl);

async function simpleTableCheck() {
  console.log('🔍 SIMPLE TABLE CHECK');
  console.log('=====================\n');
  
  try {
    // Test connection
    const test = await sql`SELECT NOW() as time`;
    console.log(`✅ Connected at: ${test[0].time}\n`);
    
    // Check specific tables using simple queries
    console.log('📊 MAIN TABLE COUNTS:');
    console.log('====================');
    
    // Customers
    try {
      const customers = await sql`SELECT COUNT(*) FROM customers`;
      console.log(`✅ customers: ${parseInt(customers[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ customers: ${e.message}`);
    }
    
    // Vehicles
    try {
      const vehicles = await sql`SELECT COUNT(*) FROM vehicles`;
      console.log(`✅ vehicles: ${parseInt(vehicles[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ vehicles: ${e.message}`);
    }
    
    // Documents
    try {
      const documents = await sql`SELECT COUNT(*) FROM documents`;
      console.log(`✅ documents: ${parseInt(documents[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ documents: ${e.message}`);
    }
    
    // Line Items
    try {
      const lineItems = await sql`SELECT COUNT(*) FROM line_items`;
      console.log(`✅ line_items: ${parseInt(lineItems[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ line_items: ${e.message}`);
    }
    
    // Document Receipts
    try {
      const docReceipts = await sql`SELECT COUNT(*) FROM document_receipts`;
      console.log(`✅ document_receipts: ${parseInt(docReceipts[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ document_receipts: ${e.message}`);
    }
    
    // Document Extras
    try {
      const docExtras = await sql`SELECT COUNT(*) FROM document_extras`;
      console.log(`✅ document_extras: ${parseInt(docExtras[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ document_extras: ${e.message}`);
    }
    
    // Document Line Items
    try {
      const docLineItems = await sql`SELECT COUNT(*) FROM document_line_items`;
      console.log(`✅ document_line_items: ${parseInt(docLineItems[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ document_line_items: ${e.message}`);
    }
    
    // Reminders
    try {
      const reminders = await sql`SELECT COUNT(*) FROM reminders`;
      console.log(`✅ reminders: ${parseInt(reminders[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ reminders: ${e.message}`);
    }
    
    // Stock
    try {
      const stock = await sql`SELECT COUNT(*) FROM stock`;
      console.log(`✅ stock: ${parseInt(stock[0].count).toLocaleString()} records`);
    } catch (e) {
      console.log(`❌ stock: ${e.message}`);
    }
    
    console.log('\n📁 CSV FILE SIZES:');
    console.log('==================');
    
    const csvFiles = [
      'customers.csv',
      'vehicles.csv', 
      'Documents.csv',
      'LineItems.csv',
      'Receipts.csv',
      'Document_Extras.csv',
      'Reminders.csv',
      'Stock.csv'
    ];
    
    for (const file of csvFiles) {
      const path = `./data/${file}`;
      if (fs.existsSync(path)) {
        const stats = fs.statSync(path);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const rows = lines.length - 1; // Exclude header
        
        console.log(`📄 ${file.padEnd(20)}: ${rows.toLocaleString().padStart(8)} rows (${sizeMB}MB)`);
      } else {
        console.log(`❌ ${file.padEnd(20)}: File not found`);
      }
    }
    
    console.log('\n✅ Simple table check complete!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
simpleTableCheck();
