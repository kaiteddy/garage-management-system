import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a new connection pool
const sql = neon(process.env.DATABASE_URL!);

// Helper function to safely execute SQL queries
async function executeQuery(query: string, params: any[] = []) {
  try {
    // Use the query method for parameterized queries
    const result = await sql.query(query, params);
    return { data: result.rows, error: null };
  } catch (error) {
    console.error('Query error:', { query, error });
    return { data: null, error };
  }
}

export async function GET() {
  try {
    // Get list of all tables in the public schema
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    if (!tables || tables.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tables found in the database',
        tables: []
      });
    }

    // Get schema for each table
    const result = [];

    for (const table of tables) {
      const tableName = table.table_name;

      try {
        // Get columns
        const columns = await sql`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
          ORDER BY ordinal_position
        `;

        // Get row count using dynamic table name
        const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = countResult?.[0]?.count || 0;

        // Get sample data (first 5 rows)
        const sampleRows = await sql.unsafe(`SELECT * FROM "${tableName}" LIMIT 5`);

        result.push({
          tableName,
          columns: columns || [],
          rowCount: parseInt(rowCount),
          sampleData: sampleRows || []
        });
      } catch (error) {
        console.error(`Error processing table ${tableName}:`, error);
        result.push({
          tableName,
          columns: [],
          rowCount: 0,
          sampleData: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      database: process.env.PGDATABASE || 'unknown',
      schema: 'public',
      tables: result
    });

  } catch (error) {
    console.error('Error fetching database schema:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching database schema',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
