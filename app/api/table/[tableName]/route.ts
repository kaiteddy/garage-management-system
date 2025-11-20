import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a new connection
const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: Request,
  { params }: { params: { tableName: string } }
) {
  const { tableName } = params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    // First verify the table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) as exists
    `;
    
    if (!tableExists[0]?.exists) {
      return NextResponse.json(
        { success: false, message: `Table '${tableName}' does not exist` },
        { status: 404 }
      );
    }
    
    // Get column information
    const columns = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    // Get row count
    const countResult = await sql`
      SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}
    `;

    const rowCount = countResult?.[0]?.count || 0;

    // Get sample data (first 5 rows)
    let sampleData: any[] = [];
    if (rowCount > 0) {
      try {
        // Use unsafe for dynamic table name
        sampleData = await sql`
          SELECT * FROM ${sql.unsafe(tableName)} LIMIT 5
        `;
      } catch (dataError) {
        console.error('Error fetching sample data:', dataError);
      }
    }

    // If action is 'count', just return the count
    if (action === 'count') {
      return NextResponse.json({
        success: true,
        count: rowCount
      });
    }

    // If action is 'schema', return just the schema
    if (action === 'schema') {
      return NextResponse.json({
        success: true,
        table: tableName,
        columns
      });
    }

    // Default: return everything
    return NextResponse.json({
      success: true,
      table: tableName,
      rowCount,
      columns,
      sampleData: sampleData || []
    });

  } catch (error) {
    console.error(`Error processing request for table '${tableName}':`, error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Error processing request for table '${tableName}'`,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
