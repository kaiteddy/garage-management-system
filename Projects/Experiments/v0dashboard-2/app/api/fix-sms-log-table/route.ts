import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[FIX-SMS-LOG] Adding missing columns to sms_log table...")
    
    // Add missing columns
    await sql`
      ALTER TABLE sms_log 
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS phone_number TEXT
    `
    
    // Update phone_number from to_number if empty
    await sql`
      UPDATE sms_log 
      SET phone_number = to_number 
      WHERE phone_number IS NULL
    `
    
    // Verify the table structure
    const tableInfo = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sms_log'
      ORDER BY ordinal_position
    `
    
    return NextResponse.json({
      success: true,
      message: "SMS log table fixed successfully",
      columns: tableInfo.map(col => ({
        name: col.column_name,
        type: col.data_type
      }))
    })
    
  } catch (error) {
    console.error("[FIX-SMS-LOG] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fix SMS log table",
      details: error.message
    }, { status: 500 })
  }
}
