import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Use DIRECT_URL for direct connection
const dbUrl = process.env.DIRECT_URL || process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ No direct database URL found');
  process.exit(1);
}

const sql = neon(dbUrl);

async function extensivePreImportCheck() {
  console.log('🔍 EXTENSIVE PRE-IMPORT DATABASE CHECK');
  console.log('=====================================\n');
  
  try {
    // 1. CONNECTION AND BASIC INFO
    console.log('1️⃣ DATABASE CONNECTION & INFO');
    console.log('==============================');
    
    const connectionTest = await sql`SELECT NOW() as time, version() as version, current_database() as db_name`;
    console.log(`✅ Connected to: ${connectionTest[0].db_name}`);
    console.log(`⏰ Database time: ${connectionTest[0].time}`);
    console.log(`📊 Version: ${connectionTest[0].version.split(' ')[0]}`);
    console.log('');

    // 2. COMPREHENSIVE TABLE ANALYSIS
    console.log('2️⃣ COMPREHENSIVE TABLE ANALYSIS');
    console.log('================================');
    
    // Get all tables with detailed info
    const tableInfo = await sql`
      SELECT 
        t.table_name,
        t.table_type,
        COALESCE(s.n_tup_ins, 0) as inserts,
        COALESCE(s.n_tup_upd, 0) as updates,
        COALESCE(s.n_tup_del, 0) as deletes,
        COALESCE(s.n_live_tup, 0) as live_tuples,
        COALESCE(s.n_dead_tup, 0) as dead_tuples,
        COALESCE(s.last_vacuum, NULL) as last_vacuum,
        COALESCE(s.last_autovacuum, NULL) as last_autovacuum,
        COALESCE(s.last_analyze, NULL) as last_analyze
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
      WHERE t.table_schema = 'public'
      ORDER BY s.n_live_tup DESC NULLS LAST, t.table_name
    `;

    console.log(`📋 Found ${tableInfo.length} tables\n`);
    
    let totalRecords = 0;
    let tablesWithData = 0;
    let tablesWithActivity = 0;
    
    console.log('TABLE ANALYSIS:');
    console.log('Name'.padEnd(35) + 'Records'.padStart(10) + 'Inserts'.padStart(10) + 'Updates'.padStart(10) + 'Deletes'.padStart(10) + 'Status');
    console.log('='.repeat(100));
    
    for (const table of tableInfo) {
      const records = parseInt(table.live_tuples) || 0;
      const inserts = parseInt(table.inserts) || 0;
      const updates = parseInt(table.updates) || 0;
      const deletes = parseInt(table.deletes) || 0;
      
      totalRecords += records;
      if (records > 0) tablesWithData++;
      if (inserts > 0 || updates > 0 || deletes > 0) tablesWithActivity++;
      
      let status = '⚪ Empty';
      if (records > 0) status = '✅ Has Data';
      if (inserts > 0 || updates > 0 || deletes > 0) status += ' 🔄 Activity';
      
      console.log(
        table.table_name.padEnd(35) + 
        records.toLocaleString().padStart(10) + 
        inserts.toLocaleString().padStart(10) + 
        updates.toLocaleString().padStart(10) + 
        deletes.toLocaleString().padStart(10) + 
        ' ' + status
      );
    }
    
    console.log('='.repeat(100));
    console.log(`📊 SUMMARY: ${totalRecords.toLocaleString()} total records, ${tablesWithData} tables with data, ${tablesWithActivity} tables with activity\n`);

    // 3. DETAILED ANALYSIS OF KEY TABLES
    console.log('3️⃣ KEY TABLES DETAILED ANALYSIS');
    console.log('===============================');
    
    const keyTables = [
      'customers', 'vehicles', 'documents', 'line_items', 'receipts', 
      'appointments', 'reminders', 'customer_correspondence', 
      'whatsapp_conversations', 'whatsapp_messages', 'sms_log',
      'mot_history', 'parts', 'stock'
    ];
    
    for (const tableName of keyTables) {
      try {
        // Check if table exists
        const tableExists = tableInfo.find(t => t.table_name === tableName);
        if (!tableExists) {
          console.log(`❌ ${tableName}: Table does not exist`);
          continue;
        }
        
        // Get record count and sample data
        const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
        const recordCount = parseInt(count[0].count);
        
        if (recordCount > 0) {
          // Get column info
          const columns = await sql.unsafe(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = '${tableName}' AND table_schema = 'public'
            ORDER BY ordinal_position
          `);
          
          // Get sample record
          const sample = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 1`);
          
          console.log(`✅ ${tableName.toUpperCase()}: ${recordCount.toLocaleString()} records`);
          console.log(`   Columns: ${columns.length} (${columns.map(c => c.column_name).slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''})`);
          
          if (sample.length > 0) {
            const sampleKeys = Object.keys(sample[0]).slice(0, 3);
            console.log(`   Sample data: ${sampleKeys.map(k => `${k}=${sample[0][k]}`).join(', ')}`);
          }
          
          // Check for recent activity
          if (columns.find(c => c.column_name.includes('created_at') || c.column_name.includes('updated_at'))) {
            try {
              const recentActivity = await sql.unsafe(`
                SELECT COUNT(*) as recent_count 
                FROM ${tableName} 
                WHERE created_at > NOW() - INTERVAL '30 days' 
                   OR updated_at > NOW() - INTERVAL '30 days'
              `);
              if (recentActivity[0].recent_count > 0) {
                console.log(`   🔥 Recent activity: ${recentActivity[0].recent_count} records in last 30 days`);
              }
            } catch (e) {
              // Ignore if timestamp columns don't exist
            }
          }
        } else {
          console.log(`⚪ ${tableName.toUpperCase()}: Empty table`);
        }
        console.log('');
      } catch (error) {
        console.log(`❌ ${tableName.toUpperCase()}: Error - ${error.message}`);
        console.log('');
      }
    }

    // 4. DATA RELATIONSHIPS CHECK
    console.log('4️⃣ DATA RELATIONSHIPS & INTEGRITY');
    console.log('==================================');
    
    try {
      // Check foreign key constraints
      const foreignKeys = await sql`
        SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
      `;
      
      console.log(`🔗 Found ${foreignKeys.length} foreign key relationships`);
      
      if (foreignKeys.length > 0) {
        console.log('\nKey relationships:');
        foreignKeys.slice(0, 10).forEach(fk => {
          console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
        if (foreignKeys.length > 10) {
          console.log(`   ... and ${foreignKeys.length - 10} more`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not check foreign keys: ${error.message}`);
    }
    console.log('');

    // 5. RECENT DATABASE ACTIVITY
    console.log('5️⃣ RECENT DATABASE ACTIVITY');
    console.log('===========================');
    
    try {
      // Check for recent database activity
      const recentActivity = await sql`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          last_vacuum,
          last_autovacuum,
          last_analyze
        FROM pg_stat_user_tables 
        WHERE n_tup_ins > 0 OR n_tup_upd > 0 OR n_tup_del > 0
        ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
        LIMIT 10
      `;
      
      if (recentActivity.length > 0) {
        console.log('Tables with database activity:');
        recentActivity.forEach(activity => {
          console.log(`   ${activity.tablename}: ${activity.inserts} inserts, ${activity.updates} updates, ${activity.deletes} deletes`);
        });
      } else {
        console.log('⚪ No recent database activity detected');
      }
    } catch (error) {
      console.log(`⚠️ Could not check recent activity: ${error.message}`);
    }
    console.log('');

    // 6. CSV DATA ANALYSIS
    console.log('6️⃣ CSV DATA FILES ANALYSIS');
    console.log('==========================');
    
    const dataDir = './data';
    const csvFiles = [
      'customers.csv', 'vehicles.csv', 'Documents.csv', 'LineItems.csv', 
      'Receipts.csv', 'Document_Extras.csv', 'Reminders.csv', 'Stock.csv'
    ];
    
    for (const csvFile of csvFiles) {
      const filePath = path.join(dataDir, csvFile);
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          const modifiedDate = stats.mtime.toISOString().split('T')[0];
          
          // Try to read first few lines to get header info
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          const headers = lines[0] ? lines[0].split(',').length : 0;
          const estimatedRows = lines.length - 1; // Subtract header
          
          console.log(`📄 ${csvFile}:`);
          console.log(`   Size: ${sizeInMB} MB`);
          console.log(`   Modified: ${modifiedDate}`);
          console.log(`   Estimated rows: ${estimatedRows.toLocaleString()}`);
          console.log(`   Columns: ${headers}`);
          
          if (lines[0]) {
            const headerSample = lines[0].split(',').slice(0, 5).join(', ');
            console.log(`   Headers: ${headerSample}${headers > 5 ? '...' : ''}`);
          }
        } else {
          console.log(`❌ ${csvFile}: File not found`);
        }
        console.log('');
      } catch (error) {
        console.log(`❌ ${csvFile}: Error reading file - ${error.message}`);
        console.log('');
      }
    }

    // 7. IMPORT HISTORY CHECK
    console.log('7️⃣ IMPORT HISTORY & LOGS');
    console.log('========================');
    
    // Check for import logs
    const logFiles = ['import.log', 'import_pipeline/import.log'];
    
    for (const logFile of logFiles) {
      try {
        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          const sizeInKB = (stats.size / 1024).toFixed(2);
          const modifiedDate = stats.mtime.toISOString();
          
          console.log(`📋 ${logFile}:`);
          console.log(`   Size: ${sizeInKB} KB`);
          console.log(`   Last modified: ${modifiedDate}`);
          
          // Read last few lines for recent activity
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.trim().split('\n');
          if (lines.length > 0) {
            console.log(`   Total log entries: ${lines.length}`);
            console.log(`   Last entry: ${lines[lines.length - 1].substring(0, 100)}...`);
          }
        } else {
          console.log(`⚪ ${logFile}: No log file found`);
        }
        console.log('');
      } catch (error) {
        console.log(`❌ ${logFile}: Error reading log - ${error.message}`);
        console.log('');
      }
    }

    // 8. FINAL RECOMMENDATIONS
    console.log('8️⃣ PRE-IMPORT RECOMMENDATIONS');
    console.log('=============================');
    
    if (totalRecords === 0) {
      console.log('✅ SAFE TO IMPORT: Database is completely empty');
      console.log('   • No data will be overwritten');
      console.log('   • Fresh import can proceed safely');
    } else if (totalRecords > 0) {
      console.log('⚠️  CAUTION: Database contains existing data');
      console.log(`   • ${totalRecords.toLocaleString()} total records found`);
      console.log(`   • ${tablesWithData} tables have data`);
      console.log(`   • ${tablesWithActivity} tables show activity`);
      console.log('   • Consider backup before importing');
      console.log('   • Review import strategy (append vs replace)');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    if (totalRecords === 0) {
      console.log('   1. Proceed with full data import');
      console.log('   2. Use turbo-import for best performance');
      console.log('   3. Verify data integrity after import');
    } else {
      console.log('   1. Create database backup');
      console.log('   2. Analyze existing vs new data');
      console.log('   3. Choose import strategy (merge/replace)');
      console.log('   4. Test with small dataset first');
    }
    
    console.log('\n✅ EXTENSIVE PRE-IMPORT CHECK COMPLETE!');
    
    return {
      success: true,
      totalRecords,
      tablesWithData,
      tablesWithActivity,
      recommendation: totalRecords === 0 ? 'SAFE_TO_IMPORT' : 'CAUTION_EXISTING_DATA'
    };
    
  } catch (error) {
    console.error('❌ Pre-import check failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the extensive check
extensivePreImportCheck()
  .then(result => {
    if (result.success) {
      console.log(`\n🎉 Check completed: ${result.recommendation}`);
    } else {
      console.log(`\n💥 Check failed: ${result.error}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
