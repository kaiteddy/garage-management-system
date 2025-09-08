import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Get some sample vehicle registrations from vehicles table
    const vehicleRegs = await sql`
      SELECT registration 
      FROM vehicles 
      WHERE registration IS NOT NULL 
      LIMIT 10
    `

    // Get some sample vehicle registrations from customer_documents table
    const documentRegs = await sql`
      SELECT DISTINCT vehicle_registration 
      FROM customer_documents 
      WHERE vehicle_registration IS NOT NULL 
      AND vehicle_registration != ''
      LIMIT 10
    `

    // Check for exact matches between the two
    const exactMatches = await sql`
      SELECT 
        v.registration as vehicle_reg,
        cd.vehicle_registration as document_reg,
        COUNT(cd.id) as document_count
      FROM vehicles v
      INNER JOIN customer_documents cd ON v.registration = cd.vehicle_registration
      GROUP BY v.registration, cd.vehicle_registration
      LIMIT 10
    `

    // Check for matches ignoring spaces and case
    const fuzzyMatches = await sql`
      SELECT 
        v.registration as vehicle_reg,
        cd.vehicle_registration as document_reg,
        COUNT(cd.id) as document_count
      FROM vehicles v
      INNER JOIN customer_documents cd ON 
        UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(cd.vehicle_registration, ' ', ''))
      GROUP BY v.registration, cd.vehicle_registration
      LIMIT 10
    `

    // Check total counts
    const totalVehicleRegs = await sql`
      SELECT COUNT(DISTINCT registration) as count 
      FROM vehicles 
      WHERE registration IS NOT NULL
    `

    const totalDocumentRegs = await sql`
      SELECT COUNT(DISTINCT vehicle_registration) as count 
      FROM customer_documents 
      WHERE vehicle_registration IS NOT NULL 
      AND vehicle_registration != ''
    `

    return NextResponse.json({
      success: true,
      vehicleRegs,
      documentRegs,
      exactMatches,
      fuzzyMatches,
      totalVehicleRegs: totalVehicleRegs[0].count,
      totalDocumentRegs: totalDocumentRegs[0].count
    })

  } catch (error) {
    console.error('Error investigating registration matching:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to investigate registration matching",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
