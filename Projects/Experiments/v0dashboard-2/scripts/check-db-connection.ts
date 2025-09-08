import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkDbConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    return;
  }

  console.log('🔍 Checking database connection...');
  
  // Mask the password in the URL for logging
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:]+)@/, ':***@');
  console.log(`🔗 Using database: ${maskedUrl}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    
    // Test a simple query
    const result = await client.query('SELECT current_database() as db, current_user as user');
    console.log('\n📊 Database Info:');
    console.log(`- Database: ${result.rows[0].db}`);
    console.log(`- User: ${result.rows[0].user}`);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Available tables:');
    tables.rows.forEach((row, i) => {
      console.log(`- ${i + 1}. ${row.table_name}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error connecting to the database:');
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkDbConnection().catch(console.error);
