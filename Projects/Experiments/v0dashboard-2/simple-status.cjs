require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function simpleStatus() {
  console.log('🔍 SIMPLE STATUS CHECK');
  console.log('======================');
  
  try {
    // 1. Database connection
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT NOW() as time, version() as version`;
    console.log('✅ Database: CONNECTED');
    console.log('📅 Time:', result[0].time);
    
    // 2. Check main tables
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('📋 Tables:', tables.length, 'found');
    console.log('📝 Table list:', tables.map(t => t.table_name).join(', '));
    
    // 3. Check record counts
    const mainTables = ['customers', 'vehicles', 'documents'];
    for (const table of mainTables) {
      try {
        const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`📊 ${table}:`, count[0].count, 'records');
      } catch (e) {
        console.log(`❌ ${table}: Not found`);
      }
    }
    
    // 4. Check data files
    const dataDir = path.join(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      console.log('📁 Data files:', files.length);
      files.forEach(f => {
        const stats = fs.statSync(path.join(dataDir, f));
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`  - ${f} (${sizeKB}KB)`);
      });
    } else {
      console.log('❌ No data directory');
    }
    
    console.log('');
    console.log('✅ STATUS CHECK COMPLETE');
    console.log('🎯 Ready for import!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

simpleStatus();
