import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[ADD-ENGINE-CODE-COLUMN] Adding engine_code column to vehicles table...")

    // Add engine_code column to vehicles table
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS engine_code VARCHAR(50)
    `

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicles_engine_code 
      ON vehicles(engine_code) 
      WHERE engine_code IS NOT NULL
    `

    console.log("✅ [ADD-ENGINE-CODE-COLUMN] Successfully added engine_code column")

    return NextResponse.json({
      success: true,
      message: "engine_code column added successfully",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [ADD-ENGINE-CODE-COLUMN] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if engine_code column exists
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vehicles'
        AND column_name = 'engine_code'
      ) as exists
    `

    return NextResponse.json({
      success: true,
      column_exists: columnExists[0].exists,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [ADD-ENGINE-CODE-COLUMN] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
