import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-MOT-TABLE] Checking MOT history table structure...")

    // Check table structure
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'mot_history'
      ORDER BY ordinal_position
    `

    // Check if table exists and has any data
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mot_history'
      )
    `

    let recordCount = 0
    let sampleData = []
    
    if (tableExists[0].exists) {
      const countResult = await sql`SELECT COUNT(*) as count FROM mot_history`
      recordCount = parseInt(countResult[0].count)
      
      if (recordCount > 0) {
        sampleData = await sql`
          SELECT * FROM mot_history 
          ORDER BY created_at DESC 
          LIMIT 3
        `
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tableExists: tableExists[0].exists,
        tableStructure,
        recordCount,
        sampleData
      }
    })

  } catch (error) {
    console.error("[CHECK-MOT-TABLE] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to check MOT table structure",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
