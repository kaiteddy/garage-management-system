import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a new connection
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Get list of all tables in the public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    // If no tables found
    if (!tables || tables.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tables found in the database',
        tables: []
      });
    }

    // Get table names
    const tableNames = tables.map((t: any) => t.table_name);
    
    // Get row counts for each table
    const tableInfo = [];
    
    for (const tableName of tableNames) {
      try {
        // Get row count
        const countResult: any[] = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        const rowCount = countResult[0]?.count || 0;
        
        // Get column info
        const columnsResult: any[] = await sql`
          SELECT 
            column_name, 
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          ORDER BY ordinal_position;
        `;
        
        // Get sample data (first 3 rows)
        let sampleData: any[] = [];
        if (rowCount > 0) {
          sampleData = await sql`SELECT * FROM ${sql(tableName)} LIMIT 3`;
        }
        
        tableInfo.push({
          tableName,
          rowCount,
          columns: columnsResult || [],
          sampleData: sampleData || []
        });
        
      } catch (error) {
        console.error(`Error processing table ${tableName}:`, error);
        tableInfo.push({
          tableName,
          error: error instanceof Error ? error.message : 'Unknown error',
          rowCount: -1,
          columns: [],
          sampleData: []
        });
      }
    }

    return NextResponse.json({
      success: true,
      database: process.env.PGDATABASE || 'neondb',
      schema: 'public',
      tables: tableInfo
    });

  } catch (error) {
    console.error('Error fetching database schema:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching database schema',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
