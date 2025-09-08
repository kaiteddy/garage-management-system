import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setupImportTracking() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS import_logs (
        id SERIAL PRIMARY KEY,
        import_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        total_records INTEGER,
        successful_records INTEGER,
        failed_records INTEGER,
        error_details JSONB
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS import_issues (
        id SERIAL PRIMARY KEY,
        import_log_id INTEGER REFERENCES import_logs(id) ON DELETE CASCADE,
        record_type VARCHAR(50) NOT NULL,
        record_identifier VARCHAR(255),
        issue_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        raw_data JSONB,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMPTZ,
        resolution_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_import_issues_import_log_id ON import_issues(import_log_id);
      CREATE INDEX IF NOT EXISTS idx_import_issues_resolved ON import_issues(resolved);
      CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
    `);
    await client.query('COMMIT');
    console.log('✅ Import tracking tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up import tracking:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupImportTracking().catch(console.error);
