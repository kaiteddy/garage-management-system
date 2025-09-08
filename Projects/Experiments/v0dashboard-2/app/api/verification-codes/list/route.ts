import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFICATION-CODES-LIST] Fetching verification recordings")

    // Try to get verification recordings from database
    try {
      const recordings = await sql`
        SELECT 
          recording_sid,
          recording_url,
          transcription_text,
          potential_codes,
          from_number,
          call_sid,
          created_at
        FROM verification_recordings 
        ORDER BY created_at DESC 
        LIMIT 20
      `

      const formattedRecordings = recordings.map(record => ({
        ...record,
        potential_codes: typeof record.potential_codes === 'string' 
          ? JSON.parse(record.potential_codes) 
          : record.potential_codes
      }))

      return NextResponse.json({
        success: true,
        recordings: formattedRecordings,
        count: recordings.length
      })

    } catch (dbError) {
      console.log("[VERIFICATION-CODES-LIST] Database table doesn't exist yet")
      
      // Return empty list if table doesn't exist
      return NextResponse.json({
        success: true,
        recordings: [],
        count: 0,
        message: "No verification recordings table found - will be created automatically when first verification call is received"
      })
    }

  } catch (error) {
    console.error("[VERIFICATION-CODES-LIST] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch verification recordings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
