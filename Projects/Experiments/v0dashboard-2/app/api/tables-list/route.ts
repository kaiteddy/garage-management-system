import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a new connection
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Get list of all tables in the public schema
    const result = await sql`
      SELECT 
        table_name,
        (xpath('/row/cnt/text()', 
          query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', table_schema, table_name), false, true, '')
        ))[1]::text::int as row_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    return NextResponse.json({
      success: true,
      tables: result || []
    });
    
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching database tables',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
