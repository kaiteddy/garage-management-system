import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { lookupVehicle } from "@/lib/dvla-api"

export async function GET() {
  try {
    // Get a few vehicles that are showing as unknown
    const testRegistrations = ['YN18 RXR', 'YE67 URO', 'BL68 UBE', 'KN62 BHO']
    
    const results = []
    
    for (const registration of testRegistrations) {
      console.log(`\n🔍 Testing: ${registration}`)
      
      // Check current database state
      const dbVehicle = await sql`
        SELECT make, model FROM vehicles 
        WHERE UPPER(registration) = UPPER(${registration})
      `
      
      // Get DVLA data
      let dvlaData = null
      try {
        dvlaData = await lookupVehicle(registration)
      } catch (error) {
        console.log(`❌ DVLA lookup failed for ${registration}:`, error)
      }
      
      results.push({
        registration,
        database: dbVehicle[0] || null,
        dvla: dvlaData ? {
          make: dvlaData.make,
          model: dvlaData.model,
          year: dvlaData.yearOfManufacture,
          colour: dvlaData.colour
        } : null
      })
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
