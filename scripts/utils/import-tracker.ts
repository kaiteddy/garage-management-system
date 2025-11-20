import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export interface ImportIssue {
  type: string;
  record: any;
  description: string;
}

export interface ImportOptions {
  onIssue?: (issue: ImportIssue) => Promise<void>;
}

export async function trackImport<T extends object>(
  importType: string,
  importFn: (options: ImportOptions) => Promise<T>,
  clientPool = pool
): Promise<T & { logId: number }> {
  let logId: number;
  try {
    // Start import log
    const logResult = await clientPool.query(
      `INSERT INTO import_logs (import_type, status, started_at)
       VALUES ($1, 'in_progress', NOW())
       RETURNING id`,
      [importType]
    );
    logId = logResult.rows[0].id;

    const handleIssue = async (issue: ImportIssue) => {
      try {
        await clientPool.query(
          `INSERT INTO import_issues 
           (import_log_id, record_type, record_identifier, issue_type, description, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            logId,
            importType,
            issue.record?.id || issue.record?.registration || 'unknown',
            issue.type,
            issue.description,
            issue.record ? JSON.stringify(issue.record) : null
          ]
        );
      } catch (error) {
        console.error('❌ Failed to log import issue:', error);
      }
    };

    const result = await importFn({ onIssue: handleIssue });

    await clientPool.query(
      `UPDATE import_logs 
       SET status = 'completed', 
           completed_at = NOW()
       WHERE id = $1`,
      [logId]
    );

    return { ...result, logId };
  } catch (error) {
    if (logId) {
      await clientPool.query(
        `UPDATE import_logs 
         SET status = 'failed', 
             completed_at = NOW(),
             error_details = $2
         WHERE id = $1`,
        [logId, { error: error.message, stack: error.stack }]
      );
    }
    throw error;
  }
}

export async function getImportLogs(limit = 50) {
  const result = await pool.query(`
    SELECT 
      id, import_type, status, started_at, completed_at,
      successful_records, failed_records,
      EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
    FROM import_logs
    ORDER BY started_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

export async function getImportIssues(logId?: number) {
  const query = `
    SELECT 
      i.*, l.import_type, l.started_at as import_started_at
    FROM import_issues i
    JOIN import_logs l ON i.import_log_id = l.id
    ${logId ? 'WHERE i.import_log_id = $1' : 'WHERE i.resolved = FALSE'}
    ORDER BY i.created_at DESC
  `;
  const result = await pool.query(
    query,
    logId ? [logId] : undefined
  );
  return result.rows;
}

export async function markIssueAsResolved(issueId: number, notes: string = '') {
  await pool.query(
    `UPDATE import_issues
     SET resolved = TRUE,
         resolved_at = NOW(),
         resolution_notes = $2
     WHERE id = $1
     RETURNING *`,
    [issueId, notes]
  );
}

process.on('beforeExit', async () => {
  await pool.end();
});
