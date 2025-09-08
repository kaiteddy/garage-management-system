import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables (try .env.local first, then fallback to process.env)
try {
  const env = dotenv.config({ path: '.env.local' });
  dotenvExpand.expand(env);
} catch (error) {
  // .env.local might not exist, that's okay if DATABASE_URL is set via environment
}

async function quickHealthCheck() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔍 Quick Database Health Check\n');

    // Test connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    const connectionTest = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Connection successful');
    console.log(`   Database time: ${connectionTest.rows[0].current_time}`);
    console.log(`   Database version: ${connectionTest.rows[0].db_version.split(' ')[0]}`);

    // Check table counts
    console.log('\n2. Checking table record counts...');
    const tables = ['customers', 'vehicles', 'documents', 'line_items', 'appointments', 'reminders'];

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table.padEnd(15)}: ${count.toLocaleString()} records`);
      } catch (error) {
        console.log(`   ${table.padEnd(15)}: ❌ Table not found or error`);
      }
    }

    // Check for recent activity
    console.log('\n3. Checking recent activity...');
    try {
      const recentCustomers = await client.query(`
        SELECT COUNT(*) as count
        FROM customers
        WHERE created_at > NOW() - INTERVAL '7 days'
      `);
      console.log(`   New customers (last 7 days): ${recentCustomers.rows[0].count}`);

      const recentVehicles = await client.query(`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE created_at > NOW() - INTERVAL '7 days'
      `);
      console.log(`   New vehicles (last 7 days): ${recentVehicles.rows[0].count}`);
    } catch (error) {
      console.log('   ⚠️  Could not check recent activity (tables may not have created_at columns)');
    }

    // Check for data quality issues
    console.log('\n4. Quick data quality check...');

    // Empty customer names
    try {
      const emptyNames = await client.query(`
        SELECT COUNT(*) as count
        FROM customers
        WHERE name IS NULL OR name = ''
      `);
      const emptyCount = parseInt(emptyNames.rows[0].count);
      if (emptyCount > 0) {
        console.log(`   ⚠️  ${emptyCount} customers with empty names`);
      } else {
        console.log('   ✅ All customers have names');
      }
    } catch (error) {
      console.log('   ⚠️  Could not check customer names');
    }

    // Duplicate vehicle registrations
    try {
      const duplicates = await client.query(`
        SELECT COUNT(*) as count
        FROM (
          SELECT registration
          FROM vehicles
          WHERE registration IS NOT NULL AND registration != ''
          GROUP BY registration
          HAVING COUNT(*) > 1
        ) duplicates
      `);
      const dupCount = parseInt(duplicates.rows[0].count);
      if (dupCount > 0) {
        console.log(`   ⚠️  ${dupCount} duplicate vehicle registrations`);
      } else {
        console.log('   ✅ No duplicate vehicle registrations');
      }
    } catch (error) {
      console.log('   ⚠️  Could not check for duplicate registrations');
    }

    // Database size
    console.log('\n5. Database size information...');
    try {
      const sizeQuery = await client.query(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          current_database() as db_name
      `);
      console.log(`   Database size: ${sizeQuery.rows[0].db_size}`);
      console.log(`   Database name: ${sizeQuery.rows[0].db_name}`);
    } catch (error) {
      console.log('   ⚠️  Could not get database size information');
    }

    client.release();
    console.log('\n✅ Quick health check completed successfully!');

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickHealthCheck().catch(console.error);
}

export { quickHealthCheck };
