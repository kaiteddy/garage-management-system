import { NextResponse } from "next/server"
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, {
      connectionTimeoutMillis: 5000,
      queryTimeoutMillis: 5000
    })
    
    // Basic connection test
    const connectionTest = await sql`SELECT NOW() as current_time, version() as db_version`
    
    // Check what tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    
    // Get counts for existing tables
    const tableNames = tables.map(t => t.table_name)
    const counts: Record<string, number | string> = {}
    
    for (const tableName of tableNames) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
        counts[tableName] = parseInt(result[0].count)
      } catch (e) {
        counts[tableName] = 'Error'
      }
    }
    
    return NextResponse.json({
      success: true,
      connection: {
        time: connectionTest[0].current_time,
        version: connectionTest[0].db_version.split(' ')[0]
      },
      tables: tableNames,
      counts: counts,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
