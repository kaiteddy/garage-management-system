import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Parse database URL
let pool;
try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  
  // Database connection pool with SSL
  pool = new Pool({
    user: dbUrl.username,
    password: dbUrl.password,
    host: dbUrl.hostname,
    port: dbUrl.port,
    database: dbUrl.pathname.split('/')[1],
    ssl: {
      rejectUnauthorized: false
    }
  });
} catch (error) {
  console.error('Error parsing DATABASE_URL:', error.message);
  process.exit(1);
}

async function checkTableStatus() {
  const client = await pool.connect();
  try {
    const tables = ['customers', 'vehicles', 'documents', 'document_extras', 'line_items'];
    const results = [];
    
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        results.push({
          table,
          count: parseInt(res.rows[0].count, 10)
        });
      } catch (error) {
        results.push({
          table,
          error: error.message
        });
      }
    }
    
    console.log('\n=== Database Status ===');
    console.table(results);
    
  } catch (error) {
    console.error('Error checking database status:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStatus().catch(console.error);
