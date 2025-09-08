import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG] Checking table structures...")

    // Check if sms_log table exists and get its structure
    const smsLogStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sms_log'
      ORDER BY ordinal_position
    `

    // Check if table exists at all
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sms_log'
      )
    `

    return NextResponse.json({
      success: true,
      sms_log_table: {
        exists: tableExists[0].exists,
        columns: smsLogStructure.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable,
          default: col.column_default
        }))
      }
    })

  } catch (error) {
    console.error("[DEBUG] Error checking table structure:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check table structure",
      details: error.message
    }, { status: 500 })
  }
}
