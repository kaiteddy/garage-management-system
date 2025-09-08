import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[TEST-JOB-SHEET] Testing customer_documents query...')

    // Simple test query
    const result = await sql`
      SELECT *
      FROM customer_documents
      WHERE id = 'D69674AF2C5FEB4382954FD98B327C2E'
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      result: result,
      count: result.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[TEST-JOB-SHEET] Error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
