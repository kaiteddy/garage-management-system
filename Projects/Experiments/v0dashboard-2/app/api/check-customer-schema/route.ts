import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Check customer table schema
    const customerSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      ORDER BY ordinal_position
    `
    
    // Get a sample customer to see actual data
    const sampleCustomer = await sql`
      SELECT * FROM customers LIMIT 1
    `

    return NextResponse.json({
      success: true,
      schema: customerSchema,
      sample: sampleCustomer[0] || null
    })

  } catch (error) {
    console.error('Error checking customer schema:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check customer schema",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
