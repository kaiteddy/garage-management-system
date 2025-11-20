import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
const { existsSync } = await import('fs');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  console.log('🔌 Testing database connection...');
  console.log(`   Using database: ${process.env.DATABASE_URL.split('@')[1]?.split('?')[0] || 'unknown'}`);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test a simple query
    const result = await pool.query('SELECT current_database(), current_user, version()');
    console.log('✅ Database connection successful!');
    console.log('   Database:', result.rows[0].current_database);
    console.log('   User:', result.rows[0].current_user);
    console.log('   Version:', result.rows[0].version.split('\n')[0]);
    
    // Check if we can create tables
    try {
      await pool.query('CREATE TEMP TABLE test_permissions (id SERIAL PRIMARY KEY, name TEXT)');
      await pool.query('INSERT INTO test_permissions (name) VALUES ($1) RETURNING id', ['test']);
      const selectResult = await pool.query('SELECT * FROM test_permissions');
      console.log('✅ Write permissions confirmed');
      console.log('   Test record ID:', selectResult.rows[0].id);
      
      // Clean up
      await pool.query('DROP TABLE IF EXISTS test_permissions');
    } catch (error) {
      console.error('❌ Write permissions test failed:', error instanceof Error ? error.message : String(error));
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection().catch(console.error);
