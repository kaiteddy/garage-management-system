import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[FIX-MOT-HISTORY] Fixing MOT history table structure...")

    // Drop and recreate MOT history table with correct structure
    await sql`DROP TABLE IF EXISTS mot_history`
    
    await sql`
      CREATE TABLE mot_history (
        id SERIAL PRIMARY KEY,
        vehicle_registration VARCHAR(20) NOT NULL,
        test_date DATE,
        test_result VARCHAR(20),
        expiry_date DATE,
        odometer_value INTEGER,
        odometer_unit VARCHAR(10) DEFAULT 'mi',
        mot_test_number VARCHAR(50),
        defects JSONB DEFAULT '[]',
        advisories JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_mot_history_registration 
      ON mot_history(vehicle_registration)
    `

    console.log("[FIX-MOT-HISTORY] MOT history table recreated successfully")

    return NextResponse.json({
      success: true,
      message: "MOT history table structure fixed",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FIX-MOT-HISTORY] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fix MOT history table",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
