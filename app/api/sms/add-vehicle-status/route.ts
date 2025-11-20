import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[SMS-ADD-STATUS] Adding status column to vehicles table...")

    // Check if status column exists
    const statusColumnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'status'
    `

    if (statusColumnExists.length === 0) {
      console.log("[SMS-ADD-STATUS] Adding status column...")
      
      // Add status column
      await sql`
        ALTER TABLE vehicles 
        ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE'
      `
      
      console.log("[SMS-ADD-STATUS] Added status column successfully")
    } else {
      console.log("[SMS-ADD-STATUS] Status column already exists")
    }

    // Check if sold_date column exists
    const soldDateColumnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'sold_date'
    `

    if (soldDateColumnExists.length === 0) {
      console.log("[SMS-ADD-STATUS] Adding sold_date column...")
      
      // Add sold_date column
      await sql`
        ALTER TABLE vehicles 
        ADD COLUMN sold_date DATE
      `
      
      console.log("[SMS-ADD-STATUS] Added sold_date column successfully")
    } else {
      console.log("[SMS-ADD-STATUS] Sold_date column already exists")
    }

    // Create index on status column for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)
    `

    return NextResponse.json({
      success: true,
      message: "Vehicle status columns added successfully"
    })

  } catch (error) {
    console.error("[SMS-ADD-STATUS] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to add vehicle status columns"
    }, { status: 500 })
  }
}
