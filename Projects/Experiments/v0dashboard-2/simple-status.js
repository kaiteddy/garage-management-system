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
      files.forEach(f => console.log('  -', f));
    } else {
      console.log('❌ No data directory');
    }
    
    console.log('✅ STATUS CHECK COMPLETE');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

simpleStatus();
