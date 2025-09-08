import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Checking current database schema...')
    
    // Check vehicles table structure
    const vehiclesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `)
    
    // Check all tables
    const allTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    // Check if our new tables exist
    const newTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('api_usage_log', 'api_budgets', 'vehicle_data_cache')
    `)
    
    return NextResponse.json({
      success: true,
      vehiclesTable: {
        exists: vehiclesColumns.rows.length > 0,
        columns: vehiclesColumns.rows
      },
      allTables: allTables.rows.map(row => row.table_name),
      newTables: newTables.rows.map(row => row.table_name),
      message: 'Schema check completed'
    })
    
  } catch (error) {
    console.error('❌ Schema check failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
