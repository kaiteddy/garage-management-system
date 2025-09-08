import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DIRECT_URL || process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ No direct database URL found');
  process.exit(1);
}

const sql = neon(dbUrl);

async function directDatabaseCheck() {
  console.log('🔍 DIRECT DATABASE CHECK');
  console.log('========================\n');
  
  try {
    // Test basic connection
    const connectionTest = await sql`SELECT NOW() as time, current_database() as db_name`;
    console.log(`✅ Connected to: ${connectionTest[0].db_name}`);
    console.log(`⏰ Time: ${connectionTest[0].time}\n`);
    
    // Get all tables and their row counts
    console.log('📊 TABLE COUNTS (Direct Query):');
    console.log('================================');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const mainTables = [
      'customers', 'vehicles', 'documents', 'line_items', 
      'document_receipts', 'document_extras', 'reminders', 'stock',
      'document_line_items', 'customer_documents', 'appointments'
    ];
    
    console.log('Main Business Tables:');
    console.log('---------------------');
    
    for (const tableName of mainTables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        const count = parseInt(result[0].count);
        const status = count > 0 ? '✅' : '⚪';
        console.log(`${status} ${tableName.padEnd(25)}: ${count.toLocaleString().padStart(8)} records`);
      } catch (error) {
        console.log(`❌ ${tableName.padEnd(25)}: Error - ${error.message}`);
      }
    }
    
    console.log('\nOther Tables with Data:');
    console.log('-----------------------');
    
    const otherTables = tables
      .map(t => t.table_name)
      .filter(name => !mainTables.includes(name));
    
    let totalOtherRecords = 0;
    for (const tableName of otherTables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        const count = parseInt(result[0].count);
        if (count > 0) {
          console.log(`✅ ${tableName.padEnd(25)}: ${count.toLocaleString().padStart(8)} records`);
          totalOtherRecords += count;
        }
      } catch (error) {
        // Skip errors for other tables
      }
    }
    
    console.log(`\n📊 Total other table records: ${totalOtherRecords.toLocaleString()}`);
    
    // CSV File Analysis
    console.log('\n📁 CSV FILES ANALYSIS:');
    console.log('======================');
    
    const csvFiles = [
      { file: 'customers.csv', table: 'customers' },
      { file: 'vehicles.csv', table: 'vehicles' },
      { file: 'Documents.csv', table: 'documents' },
      { file: 'LineItems.csv', table: 'line_items' },
      { file: 'Receipts.csv', table: 'document_receipts' },
      { file: 'Document_Extras.csv', table: 'document_extras' },
      { file: 'Reminders.csv', table: 'reminders' },
      { file: 'Stock.csv', table: 'stock' }
    ];
    
    for (const { file, table } of csvFiles) {
      const filePath = `./data/${file}`;
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const estimatedRows = lines.length - 1; // Exclude header
        
        // Get database count
        let dbCount = 0;
        try {
          const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
          dbCount = parseInt(result[0].count);
        } catch (e) {
          // Handle error
        }
        
        const status = dbCount === 0 && estimatedRows > 0 ? '🚨 NEEDS IMPORT' : 
                      Math.abs(dbCount - estimatedRows) <= 50 ? '✅ SYNCHRONIZED' :
                      dbCount > estimatedRows ? '📊 DB HAS MORE' : '📈 CSV HAS MORE';
        
        console.log(`📄 ${file.padEnd(20)}: ${estimatedRows.toLocaleString().padStart(8)} rows (${sizeInMB}MB) → ${dbCount.toLocaleString().padStart(8)} in DB | ${status}`);
      } else {
        console.log(`❌ ${file.padEnd(20)}: File not found`);
      }
    }
    
    // CRITICAL ANALYSIS
    console.log('\n🎯 CRITICAL FINDINGS:');
    console.log('=====================');
    
    // Check documents specifically
    try {
      const documentsCount = await sql`SELECT COUNT(*) as count FROM documents`;
      const documentsInDB = parseInt(documentsCount[0].count);
      
      if (documentsInDB === 0) {
        console.log('🚨 CRITICAL: Documents table is EMPTY!');
        console.log('   • This table should contain service records/invoices');
        console.log('   • Documents.csv has ~32,889 records that need importing');
        console.log('   • This is likely why service history is missing');
      } else {
        console.log(`✅ Documents table has ${documentsInDB.toLocaleString()} records`);
      }
    } catch (e) {
      console.log(`❌ Could not check documents table: ${e.message}`);
    }
    
    // Check related document tables
    try {
      const docLineItems = await sql`SELECT COUNT(*) as count FROM document_line_items`;
      const docReceipts = await sql`SELECT COUNT(*) as count FROM document_receipts`;
      const docExtras = await sql`SELECT COUNT(*) as count FROM document_extras`;
      
      console.log('\n🔗 Related Document Tables:');
      console.log(`   • document_line_items: ${parseInt(docLineItems[0].count).toLocaleString()} records`);
      console.log(`   • document_receipts: ${parseInt(docReceipts[0].count).toLocaleString()} records`);
      console.log(`   • document_extras: ${parseInt(docExtras[0].count).toLocaleString()} records`);
      
      const totalDocRelated = parseInt(docLineItems[0].count) + parseInt(docReceipts[0].count) + parseInt(docExtras[0].count);
      
      if (totalDocRelated > 0) {
        console.log(`\n⚠️  WARNING: Document-related tables have ${totalDocRelated.toLocaleString()} records`);
        console.log('   but the main documents table might be empty!');
        console.log('   This suggests data integrity issues.');
      }
    } catch (e) {
      console.log(`❌ Could not check related document tables: ${e.message}`);
    }
    
    // RECOMMENDATIONS
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    
    const documentsCount = await sql`SELECT COUNT(*) as count FROM documents`;
    const documentsInDB = parseInt(documentsCount[0].count);
    
    if (documentsInDB === 0) {
      console.log('🔥 IMMEDIATE ACTION REQUIRED:');
      console.log('   1. Import Documents.csv → documents table (32,889 records)');
      console.log('   2. This will restore service history and invoices');
      console.log('   3. Verify data integrity after import');
    }
    
    // Check other empty tables
    const emptyTables = [];
    for (const tableName of mainTables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        const count = parseInt(result[0].count);
        if (count === 0) {
          emptyTables.push(tableName);
        }
      } catch (e) {
        // Skip
      }
    }
    
    if (emptyTables.length > 1) {
      console.log(`\n📋 Other empty tables that may need import: ${emptyTables.join(', ')}`);
    }
    
    console.log('\n✅ Direct database check complete!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
}

// Run the check
directDatabaseCheck();
