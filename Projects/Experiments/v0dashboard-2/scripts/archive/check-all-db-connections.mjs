import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from both files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function testDatabaseConnection(name, url) {
  if (!url) {
    console.log(`❌ ${name}: No URL provided`);
    return null;
  }

  try {
    console.log(`🔍 Testing ${name}...`);
    console.log(`   URL: ${url.replace(/:[^:]*@/, ':***@')}`);
    
    const sql = neon(url);
    const testResult = await sql`SELECT NOW() as time, version() as version`;
    
    // Get table count
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    // Get record counts for main tables
    const mainTables = ['customers', 'vehicles', 'documents', 'line_items'];
    const counts = {};
    let totalRecords = 0;
    
    for (const tableName of mainTables) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(result[0]?.count || 0);
        counts[tableName] = count;
        totalRecords += count;
      } catch (e) {
        counts[tableName] = 'N/A';
      }
    }
    
    console.log(`✅ ${name}: Connected successfully`);
    console.log(`   Database time: ${testResult[0].time}`);
    console.log(`   Database version: ${testResult[0].version.split(' ')[0]}`);
    console.log(`   Total tables: ${tables.length}`);
    console.log(`   Main table counts:`);
    for (const [table, count] of Object.entries(counts)) {
      console.log(`     ${table}: ${count}`);
    }
    console.log(`   Total records in main tables: ${totalRecords}`);
    console.log('');
    
    return {
      success: true,
      tables: tables.length,
      counts,
      totalRecords,
      time: testResult[0].time
    };
    
  } catch (error) {
    console.log(`❌ ${name}: Connection failed`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkAllConnections() {
  console.log('🔍 CHECKING ALL DATABASE CONNECTIONS...\n');
  
  const connections = [
    {
      name: 'DIRECT_URL (.env.local)',
      url: process.env.DIRECT_URL
    },
    {
      name: 'NEON_DATABASE_URL (.env.local)', 
      url: process.env.NEON_DATABASE_URL
    },
    {
      name: 'DATABASE_URL (.env)',
      url: process.env.DATABASE_URL
    }
  ];
  
  const results = {};
  
  for (const conn of connections) {
    results[conn.name] = await testDatabaseConnection(conn.name, conn.url);
  }
  
  console.log('📊 SUMMARY:');
  console.log('===========');
  
  for (const [name, result] of Object.entries(results)) {
    if (result && result.success) {
      console.log(`✅ ${name}: ${result.totalRecords} records in main tables`);
    } else {
      console.log(`❌ ${name}: Failed to connect`);
    }
  }
  
  // Find the connection with the most data
  const successfulConnections = Object.entries(results)
    .filter(([name, result]) => result && result.success)
    .sort(([,a], [,b]) => (b.totalRecords || 0) - (a.totalRecords || 0));
  
  if (successfulConnections.length > 0) {
    const [bestName, bestResult] = successfulConnections[0];
    console.log(`\n🎯 RECOMMENDED CONNECTION: ${bestName}`);
    console.log(`   Contains ${bestResult.totalRecords} records in main tables`);
    
    if (bestResult.totalRecords > 0) {
      console.log(`\n🎉 DATA FOUND! The database contains data.`);
    } else {
      console.log(`\n⚠️  All databases are empty. Data import may be needed.`);
    }
  } else {
    console.log(`\n❌ No successful database connections found.`);
  }
}

// Run the check
checkAllConnections()
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
