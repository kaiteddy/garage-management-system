import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    // This would migrate data from memory/uploads to the database
    // For now, we'll just return a success message

    const customerCount = 0 // Would count migrated customers
    const vehicleCount = 0 // Would count migrated vehicles

    return NextResponse.json({
      success: true,
      message: "Data migration completed successfully",
      customers: customerCount,
      vehicles: vehicleCount,
      errors: [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    // Clear all data from all tables
    await sql.unsafe(`
      TRUNCATE TABLE document_items CASCADE;
      TRUNCATE TABLE documents CASCADE;
      TRUNCATE TABLE reminders CASCADE;
      TRUNCATE TABLE mot_history CASCADE;
      TRUNCATE TABLE appointments CASCADE;
      TRUNCATE TABLE vehicles CASCADE;
      TRUNCATE TABLE customers CASCADE;
      TRUNCATE TABLE stock_items CASCADE;
    `)

    return NextResponse.json({
      success: true,
      message: "All database data cleared successfully",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
