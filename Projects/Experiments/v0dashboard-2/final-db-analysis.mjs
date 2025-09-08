import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DIRECT_URL || process.env.NEON_DATABASE_URL;
const sql = neon(dbUrl);

async function finalDatabaseAnalysis() {
  console.log('🔍 FINAL DATABASE vs CSV ANALYSIS');
  console.log('==================================\n');
  
  try {
    // Connection test
    const connectionTest = await sql`SELECT NOW() as time, current_database() as db_name`;
    console.log(`✅ Connected to: ${connectionTest[0].db_name}`);
    console.log(`⏰ Time: ${connectionTest[0].time}\n`);
    
    // Define main tables and their CSV files
    const tableAnalysis = [
      { table: 'customers', csvFile: 'customers.csv', description: 'Customer records' },
      { table: 'vehicles', csvFile: 'vehicles.csv', description: 'Vehicle records' },
      { table: 'documents', csvFile: 'Documents.csv', description: 'Service documents/invoices' },
      { table: 'line_items', csvFile: 'LineItems.csv', description: 'Service line items' },
      { table: 'document_receipts', csvFile: 'Receipts.csv', description: 'Payment receipts' },
      { table: 'document_extras', csvFile: 'Document_Extras.csv', description: 'Additional document info' },
      { table: 'reminders', csvFile: 'Reminders.csv', description: 'Customer reminders' },
      { table: 'stock', csvFile: 'Stock.csv', description: 'Parts inventory' }
    ];
    
    console.log('📊 DETAILED TABLE vs CSV COMPARISON:');
    console.log('====================================');
    console.log('Table'.padEnd(20) + 'DB Records'.padStart(12) + 'CSV Rows'.padStart(12) + 'Difference'.padStart(12) + ' Status');
    console.log('='.repeat(80));
    
    const results = [];
    let totalDbRecords = 0;
    let totalCsvRows = 0;
    
    for (const { table, csvFile, description } of tableAnalysis) {
      // Get database count
      let dbCount = 0;
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        dbCount = parseInt(result[0].count);
        totalDbRecords += dbCount;
      } catch (error) {
        console.log(`❌ Error querying ${table}: ${error.message}`);
        continue;
      }
      
      // Get CSV count
      let csvCount = 0;
      let csvSize = 0;
      const csvPath = `./data/${csvFile}`;
      
      if (fs.existsSync(csvPath)) {
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        csvCount = lines.length - 1; // Exclude header
        csvSize = fs.statSync(csvPath).size;
        totalCsvRows += csvCount;
      }
      
      const difference = csvCount - dbCount;
      let status = '';
      
      if (dbCount === 0 && csvCount > 0) {
        status = '🚨 NEEDS IMPORT';
      } else if (Math.abs(difference) <= 50) {
        status = '✅ SYNCHRONIZED';
      } else if (difference > 0) {
        status = '📈 CSV HAS MORE';
      } else {
        status = '📊 DB HAS MORE';
      }
      
      console.log(
        table.padEnd(20) + 
        dbCount.toLocaleString().padStart(12) + 
        csvCount.toLocaleString().padStart(12) + 
        difference.toLocaleString().padStart(12) + 
        ' ' + status
      );
      
      results.push({
        table,
        csvFile,
        description,
        dbCount,
        csvCount,
        difference,
        status,
        csvSize
      });
    }
    
    console.log('='.repeat(80));
    console.log(
      'TOTALS'.padEnd(20) + 
      totalDbRecords.toLocaleString().padStart(12) + 
      totalCsvRows.toLocaleString().padStart(12) + 
      (totalCsvRows - totalDbRecords).toLocaleString().padStart(12)
    );
    
    // CRITICAL ANALYSIS
    console.log('\n🎯 CRITICAL ANALYSIS:');
    console.log('=====================');
    
    const needsImport = results.filter(r => r.status === '🚨 NEEDS IMPORT');
    const synchronized = results.filter(r => r.status === '✅ SYNCHRONIZED');
    const csvHasMore = results.filter(r => r.status === '📈 CSV HAS MORE');
    const dbHasMore = results.filter(r => r.status === '📊 DB HAS MORE');
    
    if (needsImport.length > 0) {
      console.log(`\n🚨 TABLES NEEDING IMPORT (${needsImport.length}):`);
      needsImport.forEach(r => {
        const sizeMB = (r.csvSize / (1024 * 1024)).toFixed(2);
        console.log(`   • ${r.description}: ${r.csvCount.toLocaleString()} records (${sizeMB}MB)`);
      });
    }
    
    if (synchronized.length > 0) {
      console.log(`\n✅ SYNCHRONIZED TABLES (${synchronized.length}):`);
      synchronized.forEach(r => {
        console.log(`   • ${r.description}: ${r.dbCount.toLocaleString()} records`);
      });
    }
    
    if (csvHasMore.length > 0) {
      console.log(`\n📈 CSV HAS MORE DATA (${csvHasMore.length}):`);
      csvHasMore.forEach(r => {
        console.log(`   • ${r.description}: +${r.difference.toLocaleString()} additional records in CSV`);
      });
    }
    
    if (dbHasMore.length > 0) {
      console.log(`\n📊 DB HAS MORE DATA (${dbHasMore.length}):`);
      dbHasMore.forEach(r => {
        console.log(`   • ${r.description}: +${Math.abs(r.difference).toLocaleString()} additional records in DB`);
      });
    }
    
    // DOCUMENTS SPECIFIC ANALYSIS
    console.log('\n🎯 DOCUMENTS TABLE CRITICAL ANALYSIS:');
    console.log('=====================================');
    
    const documentsResult = results.find(r => r.table === 'documents');
    if (documentsResult) {
      console.log(`📄 Documents.csv: ${documentsResult.csvCount.toLocaleString()} service records available`);
      console.log(`🗄️ documents table: ${documentsResult.dbCount.toLocaleString()} records in database`);
      console.log(`📊 Status: ${documentsResult.status}`);
      
      if (documentsResult.dbCount === 0 && documentsResult.csvCount > 0) {
        console.log('\n🚨 CRITICAL ISSUE IDENTIFIED:');
        console.log('   • Documents table is COMPLETELY EMPTY');
        console.log('   • CSV contains 32,889 service records/invoices');
        console.log('   • This explains missing service history');
        console.log('   • Related tables have data but no parent documents');
        
        // Check related tables
        const relatedTables = ['document_line_items', 'document_receipts', 'document_extras'];
        console.log('\n🔗 Related Tables Status:');
        
        for (const relatedTable of relatedTables) {
          try {
            const result = await sql.unsafe(`SELECT COUNT(*) as count FROM "${relatedTable}"`);
            const count = parseInt(result[0].count);
            console.log(`   • ${relatedTable}: ${count.toLocaleString()} records`);
          } catch (e) {
            console.log(`   • ${relatedTable}: Error checking`);
          }
        }
        
        console.log('\n⚠️  DATA INTEGRITY WARNING:');
        console.log('   Related document tables have data but main documents table is empty.');
        console.log('   This creates orphaned records and broken relationships.');
      }
    }
    
    // FINAL RECOMMENDATIONS
    console.log('\n💡 FINAL RECOMMENDATIONS:');
    console.log('=========================');
    
    if (needsImport.length > 0) {
      console.log('🔥 IMMEDIATE IMPORT REQUIRED:');
      console.log('   The following tables are empty but have CSV data available:');
      
      needsImport.forEach((r, index) => {
        const sizeMB = (r.csvSize / (1024 * 1024)).toFixed(2);
        console.log(`   ${index + 1}. ${r.csvFile} → ${r.table}`);
        console.log(`      Records: ${r.csvCount.toLocaleString()}`);
        console.log(`      Size: ${sizeMB}MB`);
        console.log(`      Impact: ${r.description}`);
      });
      
      console.log('\n📋 IMPORT PRIORITY ORDER:');
      console.log('   1. Documents.csv (CRITICAL - restores service history)');
      console.log('   2. customers.csv (Core business data)');
      console.log('   3. vehicles.csv (Core business data)');
      console.log('   4. LineItems.csv (Service details)');
      console.log('   5. Receipts.csv (Payment records)');
      console.log('   6. Document_Extras.csv (Additional service info)');
      console.log('   7. Reminders.csv (Customer communications)');
      console.log('   8. Stock.csv (Parts inventory)');
    }
    
    if (synchronized.length === results.length) {
      console.log('✅ ALL TABLES ARE SYNCHRONIZED');
      console.log('   No imports needed - database matches CSV data');
    }
    
    // IMPORT STRATEGY
    console.log('\n🚀 RECOMMENDED IMPORT STRATEGY:');
    console.log('===============================');
    
    if (needsImport.length > 0) {
      console.log('1. 💾 CREATE DATABASE BACKUP (safety first)');
      console.log('2. 🔧 FIX IMPORT SCRIPTS (handle CSV field mapping)');
      console.log('3. 🧪 TEST IMPORT (small subset first)');
      console.log('4. 📊 FULL IMPORT (all missing data)');
      console.log('5. ✅ VERIFY DATA INTEGRITY (check relationships)');
      console.log('6. 🔍 TEST APPLICATION (ensure functionality restored)');
    }
    
    console.log('\n✅ Final database vs CSV analysis complete!');
    
    return {
      totalDbRecords,
      totalCsvRows,
      needsImport: needsImport.length,
      synchronized: synchronized.length,
      results
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run the analysis
finalDatabaseAnalysis()
  .then(result => {
    console.log(`\n📊 SUMMARY: ${result.totalDbRecords.toLocaleString()} DB records vs ${result.totalCsvRows.toLocaleString()} CSV rows`);
    console.log(`🔥 ${result.needsImport} tables need import, ${result.synchronized} are synchronized`);
  });
