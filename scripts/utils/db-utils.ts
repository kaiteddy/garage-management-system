import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env.local' });

// Parse the database URL
const parseDatabaseUrl = (url: string) => {
  try {
    const dbUrl = new URL(url);
    return {
      user: dbUrl.username,
      password: dbUrl.password,
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port, 10) || 5432,
      database: dbUrl.pathname.split('/')[1],
      ssl: process.env.NODE_ENV === 'production' 
        ? { 
            rejectUnauthorized: true,
            ca: process.env.DB_CA_CERT,
            cert: process.env.DB_CLIENT_CERT,
            key: process.env.DB_CLIENT_KEY
          }
        : { rejectUnauthorized: false }
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
};

// Create a database connection pool
const createPool = (): Pool => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const config = parseDatabaseUrl(process.env.DATABASE_URL);
  
  return new Pool({
    ...config,
    max: 20, // Maximum number of clients in the pool
    connectionTimeoutMillis: 10000, // 10 seconds
    idleTimeoutMillis: 30000, // 30 seconds
  });
};

// Get a database client with error handling
const getClient = async () => {
  const pool = createPool();
  const client = await pool.connect();
  
  // Add a release method that also ends the pool
  const release = client.release;
  client.release = () => {
    release.apply(client);
    pool.end();
  };
  
  return client;
};

export { createPool, getClient, parseDatabaseUrl };
