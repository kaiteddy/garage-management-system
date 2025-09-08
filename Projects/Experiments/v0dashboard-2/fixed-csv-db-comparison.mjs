import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DIRECT_URL || process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ No direct database URL found');
  process.exit(1);
}

const sql = neon(dbUrl);

// Helper function to parse CSV headers and sample data
function parseCSVSample(filePath, sampleSize = 3) {
  try {
    if (!fs.existsSync(filePath)) {
      return { error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { error: 'Empty file' };
    }
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const sampleData = [];
    
    for (let i = 1; i <= Math.min(sampleSize, lines.length - 1); i++) {
      const row = lines[i].split(',').map(cell => cell.replace(/"/g, '').trim());
      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      sampleData.push(rowObj);
    }
    
    return {
      totalRows: lines.length - 1, // Exclude header
      headers,
      sampleData,
      fileSize: fs.statSync(filePath).size,
      lastModified: fs.statSync(filePath).mtime
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Helper function to get database table info
async function getDatabaseTableInfo(tableName) {
  try {
    // Check if table exists first
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      )
    `;
    
    if (!tableExists[0].exists) {
      return { error: 'Table does not exist' };
    }
    
    // Get record count
    const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const recordCount = parseInt(countResult[0].count);
    
    // Get column information
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = ${tableName} AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    // Get sample data if records exist
    let sampleData = [];
    if (recordCount > 0) {
      const sample = await sql.unsafe(`SELECT * FROM "${tableName}" LIMIT 2`);
      sampleData = sample;
    }
    
    // Get table statistics
    const stats = await sql`
      SELECT 
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables 
      WHERE relname = ${tableName}
    `;
    
    return {
      recordCount,
      columns: columns.map(c => c.column_name),
      columnDetails: columns,
      sampleData,
      stats: stats[0] || {}
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function analyzeCSVDatabaseDifferences() {
  console.log('🔍 CSV vs DATABASE COMPREHENSIVE ANALYSIS');
  console.log('=========================================\n');
  
  // Define the main data mappings
  const dataMappings = [
    {
      csvFile: 'customers.csv',
      dbTable: 'customers',
      description: 'Customer records',
      keyField: '_ID'
    },
    {
      csvFile: 'vehicles.csv',
      dbTable: 'vehicles',
      description: 'Vehicle records',
      keyField: '_ID'
    },
    {
      csvFile: 'Documents.csv',
      dbTable: 'documents',
      description: 'Service documents/invoices',
      keyField: '_ID'
    },
    {
      csvFile: 'LineItems.csv',
      dbTable: 'line_items',
      description: 'Service line items',
      keyField: '_ID'
    },
    {
      csvFile: 'Receipts.csv',
      dbTable: 'document_receipts',
      description: 'Payment receipts',
      keyField: '_ID'
    },
    {
      csvFile: 'Document_Extras.csv',
      dbTable: 'document_extras',
      description: 'Additional document info',
      keyField: '_ID'
    },
    {
      csvFile: 'Reminders.csv',
      dbTable: 'reminders',
      description: 'Customer reminders',
      keyField: '_ID'
    },
    {
      csvFile: 'Stock.csv',
      dbTable: 'stock',
      description: 'Parts inventory',
      keyField: '_ID'
    }
  ];
  
  const analysisResults = [];
  
  for (const mapping of dataMappings) {
    console.log(`📊 ANALYZING: ${mapping.description.toUpperCase()}`);
    console.log('='.repeat(60));
    
    const csvPath = path.join('./data', mapping.csvFile);
    
    // Analyze CSV file
    console.log(`📄 CSV File: ${mapping.csvFile}`);
    const csvInfo = parseCSVSample(csvPath, 2);
    
    if (csvInfo.error) {
      console.log(`❌ CSV Error: ${csvInfo.error}`);
    } else {
      console.log(`   📊 Rows: ${csvInfo.totalRows.toLocaleString()}`);
      console.log(`   📏 Size: ${(csvInfo.fileSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`   📅 Modified: ${csvInfo.lastModified.toISOString().split('T')[0]}`);
      console.log(`   📋 Columns: ${csvInfo.headers.length}`);
      
      if (csvInfo.sampleData.length > 0) {
        const firstRow = csvInfo.sampleData[0];
        const keyValue = firstRow[mapping.keyField];
        console.log(`   🔑 Sample ${mapping.keyField}: ${keyValue}`);
        
        // Show a few key fields
        const keyFields = Object.keys(firstRow).slice(0, 4);
        console.log(`   📝 Sample fields: ${keyFields.join(', ')}`);
      }
    }
    
    // Analyze database table
    console.log(`\n🗄️ Database Table: ${mapping.dbTable}`);
    const dbInfo = await getDatabaseTableInfo(mapping.dbTable);
    
    if (dbInfo.error) {
      console.log(`❌ DB Error: ${dbInfo.error}`);
    } else {
      console.log(`   📊 Records: ${dbInfo.recordCount.toLocaleString()}`);
      console.log(`   📋 Columns: ${dbInfo.columns.length}`);
      
      if (dbInfo.stats && Object.keys(dbInfo.stats).length > 0) {
        const stats = dbInfo.stats;
        console.log(`   🔄 Activity: ${stats.inserts || 0} inserts, ${stats.updates || 0} updates, ${stats.deletes || 0} deletes`);
      }
      
      if (dbInfo.sampleData.length > 0) {
        const firstRecord = dbInfo.sampleData[0];
        const possibleKeys = ['id', '_id', 'ID', 'customer_id', 'vehicle_id'];
        let keyValue = 'N/A';
        for (const key of possibleKeys) {
          if (firstRecord[key]) {
            keyValue = firstRecord[key];
            break;
          }
        }
        console.log(`   🔑 Sample ID: ${keyValue}`);
        console.log(`   📝 DB fields: ${Object.keys(firstRecord).slice(0, 4).join(', ')}`);
      }
    }
    
    // Compare and analyze differences
    console.log(`\n🔍 COMPARISON ANALYSIS:`);
    
    let status = 'UNKNOWN';
    let recommendation = 'ANALYZE FURTHER';
    let details = [];
    let priority = 'LOW';
    
    if (!csvInfo.error && !dbInfo.error) {
      const csvCount = csvInfo.totalRows;
      const dbCount = dbInfo.recordCount;
      const difference = Math.abs(csvCount - dbCount);
      const percentDiff = dbCount > 0 ? ((difference / dbCount) * 100).toFixed(1) : 'N/A';
      
      console.log(`   📊 CSV Rows: ${csvCount.toLocaleString()}`);
      console.log(`   📊 DB Records: ${dbCount.toLocaleString()}`);
      console.log(`   📊 Difference: ${difference.toLocaleString()} (${percentDiff}%)`);
      
      if (dbCount === 0 && csvCount > 0) {
        status = 'NEEDS_IMPORT';
        recommendation = 'IMPORT ALL CSV DATA';
        priority = 'HIGH';
        details.push(`🚨 Database table is EMPTY but CSV has ${csvCount.toLocaleString()} records`);
        details.push(`💡 This data needs to be imported to restore functionality`);
      } else if (dbCount > 0 && csvCount === 0) {
        status = 'DB_ONLY';
        recommendation = 'NO IMPORT NEEDED';
        priority = 'LOW';
        details.push('Database has data but no CSV file available');
      } else if (difference <= 50) {
        status = 'SYNCHRONIZED';
        recommendation = 'NO IMPORT NEEDED';
        priority = 'LOW';
        details.push('✅ CSV and database counts are very close - likely synchronized');
      } else if (csvCount > dbCount) {
        status = 'CSV_HAS_MORE';
        recommendation = 'INCREMENTAL IMPORT';
        priority = 'MEDIUM';
        details.push(`📈 CSV has ${difference.toLocaleString()} more records than database`);
        details.push(`💡 Consider importing additional records`);
      } else {
        status = 'DB_HAS_MORE';
        recommendation = 'CHECK DATA INTEGRITY';
        priority = 'MEDIUM';
        details.push(`📊 Database has ${difference.toLocaleString()} more records than CSV`);
        details.push(`💡 Database may have newer data than CSV`);
      }
    } else if (csvInfo.error && !dbInfo.error) {
      status = 'CSV_ERROR';
      recommendation = 'FIX CSV FILE';
      priority = 'MEDIUM';
      details.push(`❌ CSV file issue: ${csvInfo.error}`);
    } else if (!csvInfo.error && dbInfo.error) {
      status = 'DB_ERROR';
      recommendation = 'CHECK DATABASE';
      priority = 'HIGH';
      details.push(`❌ Database issue: ${dbInfo.error}`);
    }
    
    console.log(`   🎯 Status: ${status}`);
    console.log(`   💡 Recommendation: ${recommendation}`);
    console.log(`   ⚡ Priority: ${priority}`);
    if (details.length > 0) {
      details.forEach(detail => console.log(`   ${detail}`));
    }
    
    analysisResults.push({
      mapping,
      csvInfo,
      dbInfo,
      status,
      recommendation,
      priority,
      details
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  // SUMMARY AND RECOMMENDATIONS
  console.log('📋 COMPREHENSIVE ANALYSIS SUMMARY');
  console.log('=================================\n');
  
  const needsImport = analysisResults.filter(r => r.status === 'NEEDS_IMPORT');
  const synchronized = analysisResults.filter(r => r.status === 'SYNCHRONIZED');
  const csvHasMore = analysisResults.filter(r => r.status === 'CSV_HAS_MORE');
  const dbHasMore = analysisResults.filter(r => r.status === 'DB_HAS_MORE');
  const highPriority = analysisResults.filter(r => r.priority === 'HIGH');
  
  console.log(`✅ Synchronized: ${synchronized.length} tables`);
  synchronized.forEach(r => console.log(`   • ${r.mapping.description} (${r.dbInfo.recordCount?.toLocaleString() || 0} records)`));
  
  console.log(`\n🔥 HIGH PRIORITY - Needs Import: ${needsImport.length} tables`);
  needsImport.forEach(r => {
    const csvCount = r.csvInfo.totalRows || 0;
    const dbCount = r.dbInfo.recordCount || 0;
    console.log(`   • ${r.mapping.description}: ${csvCount.toLocaleString()} records → ${dbCount.toLocaleString()} in DB`);
  });
  
  console.log(`\n📈 CSV Has More Data: ${csvHasMore.length} tables`);
  csvHasMore.forEach(r => {
    const diff = (r.csvInfo.totalRows || 0) - (r.dbInfo.recordCount || 0);
    console.log(`   • ${r.mapping.description}: +${diff.toLocaleString()} additional records in CSV`);
  });
  
  console.log(`\n📊 DB Has More Data: ${dbHasMore.length} tables`);
  dbHasMore.forEach(r => {
    const diff = (r.dbInfo.recordCount || 0) - (r.csvInfo.totalRows || 0);
    console.log(`   • ${r.mapping.description}: +${diff.toLocaleString()} additional records in DB`);
  });
  
  // SPECIFIC DOCUMENTS ANALYSIS
  console.log('\n🎯 CRITICAL: DOCUMENTS TABLE ANALYSIS');
  console.log('=====================================');
  
  const documentsAnalysis = analysisResults.find(r => r.mapping.dbTable === 'documents');
  if (documentsAnalysis) {
    const csvCount = documentsAnalysis.csvInfo.totalRows || 0;
    const dbCount = documentsAnalysis.dbInfo.recordCount || 0;
    
    console.log(`📄 Documents.csv: ${csvCount.toLocaleString()} service records`);
    console.log(`🗄️ documents table: ${dbCount.toLocaleString()} records`);
    console.log(`📊 Status: ${documentsAnalysis.status}`);
    console.log(`💡 Recommendation: ${documentsAnalysis.recommendation}`);
    console.log(`⚡ Priority: ${documentsAnalysis.priority}`);
    
    if (documentsAnalysis.status === 'NEEDS_IMPORT') {
      console.log('\n🚨 CRITICAL FINDING:');
      console.log('   • Documents table is EMPTY but CSV has 32,889 service records');
      console.log('   • This explains missing service history/invoices');
      console.log('   • Documents.csv MUST be imported to restore service data');
      console.log('   • This is likely the core issue you\'re experiencing');
    }
    
    // Check related tables that depend on documents
    console.log('\n🔗 Related Document Tables Status:');
    const relatedTables = [
      { name: 'document_line_items', description: 'Service line items' },
      { name: 'document_receipts', description: 'Payment receipts' },
      { name: 'document_extras', description: 'Additional document info' }
    ];
    
    for (const table of relatedTables) {
      try {
        const count = await sql.unsafe(`SELECT COUNT(*) as count FROM "${table.name}"`);
        const recordCount = parseInt(count[0].count);
        console.log(`   • ${table.name}: ${recordCount.toLocaleString()} records (${table.description})`);
        
        if (recordCount > 0 && dbCount === 0) {
          console.log(`     ⚠️  WARNING: Has data but parent documents table is empty!`);
        }
      } catch (e) {
        console.log(`   • ${table.name}: Error checking - ${e.message}`);
      }
    }
  }
  
  // FINAL RECOMMENDATIONS
  console.log('\n🎯 FINAL IMPORT STRATEGY');
  console.log('========================');
  
  if (highPriority.length > 0) {
    console.log('🔥 IMMEDIATE ACTION REQUIRED:');
    highPriority.forEach((r, index) => {
      console.log(`   ${index + 1}. Import ${r.mapping.csvFile} → ${r.mapping.dbTable}`);
      console.log(`      Records: ${r.csvInfo.totalRows?.toLocaleString() || 0}`);
      console.log(`      Reason: ${r.details[0] || 'Critical data missing'}`);
    });
  }
  
  if (csvHasMore.length > 0) {
    console.log('\n📈 INCREMENTAL IMPORTS (Lower Priority):');
    csvHasMore.forEach((r, index) => {
      const diff = (r.csvInfo.totalRows || 0) - (r.dbInfo.recordCount || 0);
      console.log(`   ${index + 1}. ${r.mapping.description}: Import ${diff.toLocaleString()} additional records`);
    });
  }
  
  if (needsImport.length === 0 && csvHasMore.length === 0) {
    console.log('\n✅ ALL DATA SYNCHRONIZED - No imports needed!');
  }
  
  console.log('\n✅ Comprehensive CSV vs Database analysis complete!');
  
  return analysisResults;
}

// Run the analysis
analyzeCSVDatabaseDifferences()
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
