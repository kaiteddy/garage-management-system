import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CREATE-SWS-SESSIONS-TABLE] Creating SWS sessions table...")

    // Create SWS sessions table for caching authentication
    await sql`
      CREATE TABLE IF NOT EXISTS sws_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(session_id)
      )
    `

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sws_sessions_expires_at 
      ON sws_sessions(expires_at)
    `

    // Clean up any expired sessions
    await sql`
      DELETE FROM sws_sessions WHERE expires_at < NOW()
    `

    console.log("✅ [CREATE-SWS-SESSIONS-TABLE] SWS sessions table created successfully")

    return NextResponse.json({
      success: true,
      message: "SWS sessions table created successfully",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [CREATE-SWS-SESSIONS-TABLE] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if table exists and show current sessions
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sws_sessions'
      ) as exists
    `

    let sessions = []
    if (tableExists[0].exists) {
      sessions = await sql`
        SELECT 
          id,
          session_id,
          expires_at,
          created_at,
          (expires_at > NOW()) as is_valid
        FROM sws_sessions 
        ORDER BY created_at DESC
        LIMIT 10
      `
    }

    return NextResponse.json({
      success: true,
      table_exists: tableExists[0].exists,
      sessions: sessions.map(session => ({
        id: session.id,
        session_id: session.session_id.substring(0, 8) + '...',
        expires_at: session.expires_at,
        created_at: session.created_at,
        is_valid: session.is_valid,
        expires_in_minutes: session.is_valid 
          ? Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000)
          : 0
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [CREATE-SWS-SESSIONS-TABLE] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
