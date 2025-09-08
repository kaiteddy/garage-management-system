import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Use DIRECT_URL or NEON_DATABASE_URL instead of DATABASE_URL (which is Prisma Accelerate)
const dbUrl = process.env.DIRECT_URL || process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ No direct database URL found. Please set DIRECT_URL or NEON_DATABASE_URL');
  process.exit(1);
}

const sql = neon(dbUrl);

async function comprehensiveDatabaseCheck() {
  try {
    console.log('🔍 COMPREHENSIVE DATABASE CHECK...\n');
    
    // Test connection
    const testResult = await sql`SELECT NOW() as time, version() as version`;
    console.log('✅ Database connected:', testResult[0].time);
    console.log('📊 Database version:', testResult[0].version.split(' ')[0]);
    console.log('');
    
    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log(`📋 Found ${tables.length} tables in database\n`);
    
    // Get counts for ALL tables
    const tableNames = tables.map(t => t.table_name);
    const counts = {};
    let totalRecords = 0;
    let tablesWithData = 0;
    
    console.log('📊 ALL TABLE COUNTS:');
    console.log('====================');
    
    for (const tableName of tableNames) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(result[0]?.count || 0);
        counts[tableName] = count;
        totalRecords += count;
        
        if (count > 0) {
          tablesWithData++;
          console.log(`✅ ${tableName.padEnd(30)}: ${count.toLocaleString().padStart(10)} records`);
        } else {
          console.log(`⚪ ${tableName.padEnd(30)}: ${count.toLocaleString().padStart(10)} records`);
        }
      } catch (e) {
        console.log(`❌ ${tableName.padEnd(30)}: Error - ${e.message}`);
        counts[tableName] = 'Error';
      }
    }
    
    console.log('====================');
    console.log(`📈 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);
    console.log(`📊 TABLES WITH DATA: ${tablesWithData}/${tables.length}`);
    console.log(`📋 EMPTY TABLES: ${tables.length - tablesWithData}`);
    console.log('');
    
    // Show tables with data
    if (tablesWithData > 0) {
      console.log('🎯 TABLES WITH DATA:');
      console.log('====================');
      const tablesWithDataList = Object.entries(counts)
        .filter(([name, count]) => typeof count === 'number' && count > 0)
        .sort(([,a], [,b]) => b - a); // Sort by count descending
      
      tablesWithDataList.forEach(([tableName, count]) => {
        console.log(`📊 ${tableName.padEnd(30)}: ${count.toLocaleString().padStart(10)} records`);
      });
      console.log('');
    }
    
    // Database schema info
    console.log('🏗️  DATABASE SCHEMA INFO:');
    console.log('=========================');
    
    // Get table sizes (approximate)
    try {
      const tableSizes = await sql`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename
        LIMIT 10
      `;
      
      if (tableSizes.length > 0) {
        console.log('📏 Sample table statistics available');
      }
    } catch (e) {
      console.log('📏 Table statistics not available');
    }
    
    // Check for indexes
    try {
      const indexes = await sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;
      
      console.log(`🔍 Total indexes: ${indexes.length}`);
    } catch (e) {
      console.log('🔍 Index information not available');
    }
    
    console.log('');
    console.log('✅ Comprehensive database check complete!');
    
    return {
      success: true,
      totalTables: tables.length,
      totalRecords,
      tablesWithData,
      emptyTables: tables.length - tablesWithData,
      counts,
      allTables: tableNames
    };
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the check
comprehensiveDatabaseCheck()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Check completed successfully!');
      console.log(`\n📋 SUMMARY:`);
      console.log(`   • Total Tables: ${result.totalTables}`);
      console.log(`   • Total Records: ${result.totalRecords.toLocaleString()}`);
      console.log(`   • Tables with Data: ${result.tablesWithData}`);
      console.log(`   • Empty Tables: ${result.emptyTables}`);
    } else {
      console.log('\n💥 Check failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
