require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('🔍 DATABASE STATUS CHECK');
console.log('========================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function checkStatus() {
  try {
    console.log('1️⃣ Testing connection...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 5000,
      queryTimeoutMillis: 5000
    });
    
    const connectionTest = await sql`SELECT NOW() as current_time, version() as db_version`;
    console.log('   ✅ Connection: WORKING');
    console.log('   📅 Time:', connectionTest[0].current_time);
    console.log('   🗄️  Version:', connectionTest[0].db_version.split(' ')[0]);
    console.log('');
    
    console.log('2️⃣ Checking tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('   📋 Tables found:', tables.length);
    console.log('   📝 Table names:', tables.map(t => t.table_name).join(', '));
    console.log('');
    
    console.log('3️⃣ Checking record counts...');
    const mainTables = ['customers', 'vehicles', 'documents'];
    const counts = {};
    
    for (const tableName of mainTables) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
        counts[tableName] = parseInt(result[0].count);
        console.log(`   📊 ${tableName}: ${counts[tableName]} records`);
      } catch (e) {
        counts[tableName] = 'Table not found';
        console.log(`   ❌ ${tableName}: Table not found`);
      }
    }
    console.log('');
    
    console.log('4️⃣ Checking data directory...');
    const fs = require('fs');
    const path = require('path');
    
    const dataDir = path.join(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      const csvFiles = files.filter(f => f.endsWith('.csv'));
      console.log('   📁 Data directory: EXISTS');
      console.log('   📄 Total files:', files.length);
      console.log('   📊 CSV files:', csvFiles.length);
      
      if (csvFiles.length > 0) {
        console.log('   📋 CSV files found:');
        csvFiles.forEach(file => {
          const filePath = path.join(dataDir, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          console.log(`      - ${file} (${sizeKB}KB)`);
        });
      }
    } else {
      console.log('   ❌ Data directory: NOT FOUND');
      console.log('   📍 Expected location:', dataDir);
    }
    console.log('');
    
    console.log('📊 STATUS SUMMARY:');
    console.log('==================');
    console.log('🔗 Database Connection:', '✅ WORKING');
    console.log('📋 Tables Available:', tables.length);
    console.log('👥 Customers:', counts.customers || 'N/A');
    console.log('🚗 Vehicles:', counts.vehicles || 'N/A');
    console.log('📄 Documents:', counts.documents || 'N/A');
    console.log('');
    
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      const csvFiles = files.filter(f => f.endsWith('.csv'));
      console.log('🎯 READY FOR IMPORT:', csvFiles.length > 0 ? '✅ YES' : '❌ NO CSV FILES');
    } else {
      console.log('🎯 READY FOR IMPORT:', '❌ NO DATA DIRECTORY');
    }
    
    console.log('');
    console.log('✅ STATUS CHECK COMPLETE!');
    
  } catch (error) {
    console.log('❌ Status check failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   - Check DATABASE_URL in .env.local');
    console.log('   - Verify database is running');
    console.log('   - Check network connectivity');
  }
}

checkStatus();
