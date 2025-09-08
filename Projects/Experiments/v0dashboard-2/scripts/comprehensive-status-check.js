require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function comprehensiveStatusCheck() {
  try {
    console.log('🔍 COMPREHENSIVE STATUS CHECK\n');

    // 1. Basic connection test
    console.log('1. Testing database connection...');
    const connectionTest = await sql`SELECT NOW() as current_time`;
    console.log(`   ✅ Database connected: ${connectionTest[0].current_time}`);

    // 2. Check table counts
    console.log('\n2. Checking table counts...');
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    
    console.log(`   📊 Current counts:`);
    console.log(`      - Customers: ${counts[0].customers}`);
    console.log(`      - Vehicles: ${counts[0].vehicles}`);
    console.log(`      - Documents: ${counts[0].documents}`);

    // 3. Check recent activity
    console.log('\n3. Checking recent database activity...');
    
    try {
      const recentCustomers = await sql`
        SELECT COUNT(*) as recent_count
        FROM customers 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      console.log(`   📈 Customers created in last hour: ${recentCustomers[0].recent_count}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check recent customers: ${error.message}`);
    }

    try {
      const recentVehicles = await sql`
        SELECT COUNT(*) as recent_count
        FROM vehicles 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      console.log(`   📈 Vehicles created in last hour: ${recentVehicles[0].recent_count}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check recent vehicles: ${error.message}`);
    }

    // 4. Check for any data at all
    console.log('\n4. Checking for any existing data...');
    
    try {
      const anyCustomers = await sql`
        SELECT id, first_name, last_name, created_at
        FROM customers 
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      if (anyCustomers.length > 0) {
        console.log(`   📋 Found ${anyCustomers.length} customers:`);
        anyCustomers.forEach(customer => {
          console.log(`      - ${customer.id}: ${customer.first_name} ${customer.last_name} (${customer.created_at})`);
        });
      } else {
        console.log(`   ❌ No customers found in database`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking customers: ${error.message}`);
    }

    // 5. Check database schema
    console.log('\n5. Checking database schema...');
    
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      console.log(`   📋 Available tables:`);
      tables.forEach(table => {
        console.log(`      - ${table.table_name}`);
      });
    } catch (error) {
      console.log(`   ❌ Error checking schema: ${error.message}`);
    }

    // 6. Check for any import errors or locks
    console.log('\n6. Checking for database locks or issues...');
    
    try {
      const locks = await sql`
        SELECT 
          pid,
          usename,
          application_name,
          state,
          query_start,
          LEFT(query, 100) as query_preview
        FROM pg_stat_activity 
        WHERE state != 'idle'
          AND pid != pg_backend_pid()
        ORDER BY query_start DESC
      `;
      
      if (locks.length > 0) {
        console.log(`   ⚠️  Found ${locks.length} active database connections:`);
        locks.forEach(lock => {
          console.log(`      - PID ${lock.pid}: ${lock.state} - ${lock.query_preview}...`);
        });
      } else {
        console.log(`   ✅ No active database locks or long-running queries`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check locks: ${error.message}`);
    }

    // 7. Summary and recommendations
    console.log('\n📊 STATUS SUMMARY:');
    
    const totalRecords = parseInt(counts[0].customers) + parseInt(counts[0].vehicles) + parseInt(counts[0].documents);
    
    if (totalRecords === 0) {
      console.log('❌ DATABASE IS EMPTY');
      console.log('   Possible causes:');
      console.log('   - Import failed and rolled back');
      console.log('   - Database was cleared but import didn\'t complete');
      console.log('   - Connection issues during import');
      console.log('\n💡 RECOMMENDATION: Re-run the ultra-efficient import');
    } else if (totalRecords < 50000) {
      console.log('⚠️  DATABASE IS PARTIALLY POPULATED');
      console.log('   Import may have been interrupted');
      console.log('\n💡 RECOMMENDATION: Check what\'s missing and complete import');
    } else {
      console.log('✅ DATABASE APPEARS FULLY POPULATED');
      console.log('\n💡 RECOMMENDATION: Proceed with WhatsApp integration');
    }

  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
}

comprehensiveStatusCheck();
