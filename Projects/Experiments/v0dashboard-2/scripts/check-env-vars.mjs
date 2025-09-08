import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('Environment variables from .env.local:');
console.log('----------------------------------');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '***' : 'Not set'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
console.log(`DVSA_API_KEY: ${process.env.DVSA_API_KEY ? '***' : 'Not set'}`);
console.log(`DVLA_API_KEY: ${process.env.DVLA_API_KEY ? '***' : 'Not set'}`);
console.log('----------------------------------');

// Verify database connection if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  console.log('Testing database connection...');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
    } else {
      console.log('✅ Database connection successful!');
      console.log('   Current timestamp:', res.rows[0].now);
    }
    pool.end();
  });
} else {
  console.log('Skipping database connection test - DATABASE_URL not set');
}
