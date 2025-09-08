import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../../../lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    // Check a few sample registrations from both tables
    const vehicleRegs = await sql`
      SELECT registration 
      FROM vehicles 
      WHERE registration IN ('1431NE', '195D605', '196D612', '241DK', '300D137')
      ORDER BY registration
    `
    
    const docRegs = await sql`
      SELECT DISTINCT vehicle_registration 
      FROM customer_documents 
      WHERE vehicle_registration IN ('1431NE', '195D605', '196D612', '241DK', '300D137')
      ORDER BY vehicle_registration
    `
    
    // Check if there are any exact matches
    const exactMatches = await sql`
      SELECT v.registration as vehicle_reg, cd.vehicle_registration as doc_reg
      FROM vehicles v
      JOIN customer_documents cd ON v.registration = cd.vehicle_registration
      WHERE v.registration IN ('1431NE', '195D605', '196D612', '241DK', '300D137')
      LIMIT 5
    `
    
    return NextResponse.json({
      vehicle_registrations: vehicleRegs,
      document_registrations: docRegs,
      exact_matches: exactMatches,
      message: 'Registration format comparison'
    })
    
  } catch (error) {
    console.error('Debug registrations error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
