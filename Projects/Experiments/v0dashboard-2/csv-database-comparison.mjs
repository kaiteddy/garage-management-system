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
function parseCSVSample(filePath, sampleSize = 5) {
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
    // Get record count
    const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
    const recordCount = parseInt(countResult[0].count);
    
    // Get column information
    const columns = await sql.unsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // Get sample data if records exist
    let sampleData = [];
    if (recordCount > 0) {
      const sample = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 3`);
      sampleData = sample;
    }
    
    // Get table statistics
    const stats = await sql.unsafe(`
      SELECT 
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze
      FROM pg_stat_user_tables 
      WHERE relname = '${tableName}'
    `);
    
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
    console.log('='.repeat(50));
    
    const csvPath = path.join('./data', mapping.csvFile);
    
    // Analyze CSV file
    console.log(`📄 CSV File: ${mapping.csvFile}`);
    const csvInfo = parseCSVSample(csvPath, 3);
    
    if (csvInfo.error) {
      console.log(`❌ CSV Error: ${csvInfo.error}`);
    } else {
      console.log(`   Rows: ${csvInfo.totalRows.toLocaleString()}`);
      console.log(`   Size: ${(csvInfo.fileSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`   Modified: ${csvInfo.lastModified.toISOString().split('T')[0]}`);
      console.log(`   Columns: ${csvInfo.headers.length} (${csvInfo.headers.slice(0, 5).join(', ')}${csvInfo.headers.length > 5 ? '...' : ''})`);
      
      if (csvInfo.sampleData.length > 0) {
        const firstRow = csvInfo.sampleData[0];
        const keyValue = firstRow[mapping.keyField];
        console.log(`   Sample ${mapping.keyField}: ${keyValue}`);
      }
    }
    
    // Analyze database table
    console.log(`\n🗄️ Database Table: ${mapping.dbTable}`);
    const dbInfo = await getDatabaseTableInfo(mapping.dbTable);
    
    if (dbInfo.error) {
      console.log(`❌ DB Error: ${dbInfo.error}`);
    } else {
      console.log(`   Records: ${dbInfo.recordCount.toLocaleString()}`);
      console.log(`   Columns: ${dbInfo.columns.length} (${dbInfo.columns.slice(0, 5).join(', ')}${dbInfo.columns.length > 5 ? '...' : ''})`);
      
      if (dbInfo.stats) {
        const stats = dbInfo.stats;
        console.log(`   Activity: ${stats.inserts || 0} inserts, ${stats.updates || 0} updates, ${stats.deletes || 0} deletes`);
      }
      
      if (dbInfo.sampleData.length > 0) {
        const firstRecord = dbInfo.sampleData[0];
        const possibleKeys = ['id', '_id', 'ID'];
        let keyValue = 'N/A';
        for (const key of possibleKeys) {
          if (firstRecord[key]) {
            keyValue = firstRecord[key];
            break;
          }
        }
        console.log(`   Sample ID: ${keyValue}`);
      }
    }
    
    // Compare and analyze differences
    console.log(`\n🔍 COMPARISON ANALYSIS:`);
    
    let status = 'UNKNOWN';
    let recommendation = 'ANALYZE FURTHER';
    let details = [];
    
    if (!csvInfo.error && !dbInfo.error) {
      const csvCount = csvInfo.totalRows;
      const dbCount = dbInfo.recordCount;
      const difference = Math.abs(csvCount - dbCount);
      const percentDiff = dbCount > 0 ? ((difference / dbCount) * 100).toFixed(1) : 'N/A';
      
      console.log(`   CSV Rows: ${csvCount.toLocaleString()}`);
      console.log(`   DB Records: ${dbCount.toLocaleString()}`);
      console.log(`   Difference: ${difference.toLocaleString()} (${percentDiff}%)`);
      
      if (dbCount === 0 && csvCount > 0) {
        status = 'NEEDS_IMPORT';
        recommendation = 'IMPORT ALL CSV DATA';
        details.push(`Database table is empty but CSV has ${csvCount.toLocaleString()} records`);
      } else if (dbCount > 0 && csvCount === 0) {
        status = 'DB_ONLY';
        recommendation = 'NO IMPORT NEEDED';
        details.push('Database has data but no CSV file');
      } else if (Math.abs(csvCount - dbCount) <= 50) {
        status = 'SYNCHRONIZED';
        recommendation = 'NO IMPORT NEEDED';
        details.push('CSV and database counts are very close - likely synchronized');
      } else if (csvCount > dbCount) {
        status = 'CSV_HAS_MORE';
        recommendation = 'INCREMENTAL IMPORT';
        details.push(`CSV has ${difference.toLocaleString()} more records than database`);
      } else {
        status = 'DB_HAS_MORE';
        recommendation = 'CHECK DATA INTEGRITY';
        details.push(`Database has ${difference.toLocaleString()} more records than CSV`);
      }
      
      // Check column compatibility
      if (csvInfo.headers && dbInfo.columns) {
        const csvHeaders = csvInfo.headers.map(h => h.toLowerCase());
        const dbColumns = dbInfo.columns.map(c => c.toLowerCase());
        
        const csvOnlyFields = csvHeaders.filter(h => !dbColumns.includes(h));
        const dbOnlyFields = dbColumns.filter(c => !csvHeaders.includes(c));
        
        if (csvOnlyFields.length > 0) {
          details.push(`CSV has ${csvOnlyFields.length} fields not in DB: ${csvOnlyFields.slice(0, 3).join(', ')}${csvOnlyFields.length > 3 ? '...' : ''}`);
        }
        if (dbOnlyFields.length > 0) {
          details.push(`DB has ${dbOnlyFields.length} fields not in CSV: ${dbOnlyFields.slice(0, 3).join(', ')}${dbOnlyFields.length > 3 ? '...' : ''}`);
        }
      }
    }
    
    console.log(`   Status: ${status}`);
    console.log(`   Recommendation: ${recommendation}`);
    if (details.length > 0) {
      details.forEach(detail => console.log(`   • ${detail}`));
    }
    
    analysisResults.push({
      mapping,
      csvInfo,
      dbInfo,
      status,
      recommendation,
      details
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  // SUMMARY AND RECOMMENDATIONS
  console.log('📋 OVERALL ANALYSIS SUMMARY');
  console.log('===========================\n');
  
  const needsImport = analysisResults.filter(r => r.status === 'NEEDS_IMPORT');
  const synchronized = analysisResults.filter(r => r.status === 'SYNCHRONIZED');
  const csvHasMore = analysisResults.filter(r => r.status === 'CSV_HAS_MORE');
  const dbHasMore = analysisResults.filter(r => r.status === 'DB_HAS_MORE');
  
  console.log(`✅ Synchronized: ${synchronized.length} tables`);
  synchronized.forEach(r => console.log(`   • ${r.mapping.description}`));
  
  console.log(`\n🔄 Needs Import: ${needsImport.length} tables`);
  needsImport.forEach(r => console.log(`   • ${r.mapping.description} (${r.csvInfo.totalRows?.toLocaleString() || 0} records)`));
  
  console.log(`\n📈 CSV Has More: ${csvHasMore.length} tables`);
  csvHasMore.forEach(r => {
    const diff = (r.csvInfo.totalRows || 0) - (r.dbInfo.recordCount || 0);
    console.log(`   • ${r.mapping.description} (+${diff.toLocaleString()} records)`);
  });
  
  console.log(`\n📊 DB Has More: ${dbHasMore.length} tables`);
  dbHasMore.forEach(r => {
    const diff = (r.dbInfo.recordCount || 0) - (r.csvInfo.totalRows || 0);
    console.log(`   • ${r.mapping.description} (+${diff.toLocaleString()} records)`);
  });
  
  // SPECIFIC DOCUMENTS ANALYSIS
  console.log('\n🎯 DOCUMENTS TABLE SPECIFIC ANALYSIS');
  console.log('====================================');
  
  const documentsAnalysis = analysisResults.find(r => r.mapping.dbTable === 'documents');
  if (documentsAnalysis) {
    console.log(`📄 Documents.csv: ${documentsAnalysis.csvInfo.totalRows?.toLocaleString() || 0} records`);
    console.log(`🗄️ documents table: ${documentsAnalysis.dbInfo.recordCount?.toLocaleString() || 0} records`);
    console.log(`📊 Status: ${documentsAnalysis.status}`);
    console.log(`💡 Recommendation: ${documentsAnalysis.recommendation}`);
    
    if (documentsAnalysis.status === 'NEEDS_IMPORT') {
      console.log('\n🚨 CRITICAL: Documents table is empty but CSV has substantial data!');
      console.log('   This explains why you might be missing service records/invoices.');
      console.log('   Documents.csv should be imported to restore service history.');
    }
    
    // Check related tables
    console.log('\n🔗 Related Tables Status:');
    const relatedTables = ['document_line_items', 'document_receipts', 'document_extras'];
    for (const tableName of relatedTables) {
      try {
        const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   • ${tableName}: ${parseInt(count[0].count).toLocaleString()} records`);
      } catch (e) {
        console.log(`   • ${tableName}: Error checking`);
      }
    }
  }
  
  // FINAL RECOMMENDATIONS
  console.log('\n🎯 FINAL RECOMMENDATIONS');
  console.log('========================');
  
  if (needsImport.length > 0) {
    console.log('🔥 IMMEDIATE ACTION REQUIRED:');
    needsImport.forEach(r => {
      console.log(`   1. Import ${r.mapping.csvFile} → ${r.mapping.dbTable}`);
      console.log(`      Records to import: ${r.csvInfo.totalRows?.toLocaleString() || 0}`);
    });
  }
  
  if (csvHasMore.length > 0) {
    console.log('\n📈 INCREMENTAL IMPORTS RECOMMENDED:');
    csvHasMore.forEach(r => {
      const diff = (r.csvInfo.totalRows || 0) - (r.dbInfo.recordCount || 0);
      console.log(`   • ${r.mapping.description}: Import ${diff.toLocaleString()} additional records`);
    });
  }
  
  if (synchronized.length === analysisResults.length) {
    console.log('\n✅ ALL TABLES SYNCHRONIZED - No imports needed!');
  }
  
  console.log('\n✅ CSV vs Database analysis complete!');
  
  return analysisResults;
}

// Run the analysis
analyzeCSVDatabaseDifferences()
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
