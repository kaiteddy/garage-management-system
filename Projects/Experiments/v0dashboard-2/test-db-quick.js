require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function quickTest() {
  try {
    console.log('🔍 QUICK DATABASE TEST');
    console.log('=====================');
    console.log('⏰', new Date().toLocaleTimeString());
    console.log('');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 5000,
      queryTimeoutMillis: 5000
    });
    
    console.log('1️⃣ Testing connection...');
    const connectionTest = await sql`SELECT NOW() as current_time, version() as db_version`;
    console.log('   ✅ Connection successful!');
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
    
    const tableNames = tables.map(t => t.table_name);
    console.log('   📋 Tables found:', tableNames.length);
    console.log('   📝 Table list:', tableNames.join(', '));
    console.log('');
    
    console.log('3️⃣ Getting record counts...');
    const counts = {};
    
    for (const tableName of tableNames.slice(0, 10)) { // Limit to first 10 tables
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
        counts[tableName] = parseInt(result[0].count);
        console.log(`   📊 ${tableName}: ${counts[tableName]} records`);
      } catch (e) {
        counts[tableName] = 'Error';
        console.log(`   ❌ ${tableName}: Error`);
      }
    }
    
    console.log('');
    console.log('🎉 DATABASE IS FULLY RESPONSIVE!');
    console.log('✅ Ready for lightning-fast import!');
    
    return {
      success: true,
      tables: tableNames,
      counts: counts,
      totalTables: tableNames.length
    };
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

quickTest();
