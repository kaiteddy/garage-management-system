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

async function checkDatabaseCounts() {
  try {
    console.log('🔍 CHECKING DATABASE COUNTS...\n');

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

    // Check counts for main tables
    const mainTables = [
      { name: 'customers', icon: '👥' },
      { name: 'vehicles', icon: '🚗' },
      { name: 'documents', icon: '📄' },
      { name: 'customer_documents', icon: '📋' },
      { name: 'document_line_items', icon: '📝' },
      { name: 'line_items', icon: '📊' },
      { name: 'receipts', icon: '🧾' },
      { name: 'appointments', icon: '📅' },
      { name: 'reminders', icon: '⏰' },
      { name: 'stock', icon: '📦' },
      { name: 'stock_items', icon: '🔧' },
      { name: 'mot_history', icon: '🔍' },
      { name: 'vehicle_technical_data', icon: '⚙️' },
      { name: 'vehicle_oils', icon: '🛢️' },
      { name: 'customer_correspondence', icon: '💬' },
      { name: 'whatsapp_conversations', icon: '📱' },
      { name: 'whatsapp_messages', icon: '💭' }
    ];

    const counts = {};
    let totalRecords = 0;
    const tableNames = tables.map(t => t.table_name);

    console.log('📊 TABLE COUNTS:');
    console.log('================');

    for (const table of mainTables) {
      try {
        if (tableNames.includes(table.name)) {
          const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
          const count = parseInt(result[0]?.count || 0);
          counts[table.name] = count;
          totalRecords += count;
          console.log(`${table.icon} ${table.name.padEnd(25)}: ${count.toLocaleString().padStart(10)}`);
        } else {
          console.log(`❌ ${table.name.padEnd(25)}: Table not found`);
          counts[table.name] = 0;
        }
      } catch (e) {
        console.log(`⚠️  ${table.name.padEnd(25)}: Error - ${e.message}`);
        counts[table.name] = 'Error';
      }
    }

    console.log('================');
    console.log(`📈 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);
    console.log('');

    // Show all tables found
    console.log('📋 ALL TABLES IN DATABASE:');
    console.log('===========================');
    tables.forEach((table, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${table.table_name}`);
    });

    console.log('');
    console.log('✅ Database status check complete!');

    return {
      success: true,
      totalTables: tables.length,
      totalRecords,
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
checkDatabaseCounts()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Check completed successfully!');
    } else {
      console.log('\n💥 Check failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
