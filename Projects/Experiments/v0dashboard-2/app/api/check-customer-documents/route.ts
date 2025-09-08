import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Check customer_documents table schema
    const schema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customer_documents' 
      ORDER BY ordinal_position
    `
    
    // Get a sample customer document
    const sample = await sql`
      SELECT * FROM customer_documents LIMIT 3
    `

    // Check if there are vehicle registrations in customer_documents
    const vehicleRegCount = await sql`
      SELECT COUNT(*) as count
      FROM customer_documents 
      WHERE vehicle_registration IS NOT NULL
      AND vehicle_registration != ''
    `

    return NextResponse.json({
      success: true,
      schema,
      sample,
      vehicleRegCount: parseInt(vehicleRegCount[0].count)
    })

  } catch (error) {
    console.error('Error checking customer_documents:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check customer_documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
