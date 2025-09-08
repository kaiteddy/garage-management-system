import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log('🔧 Fixing vehicle models for specific registrations...')

    // Manual updates for vehicles that need model information
    const vehicleUpdates = [
      { registration: 'YN18 RXR', make: 'NISSAN', model: 'MICRA' },
      { registration: 'YE67 URO', make: 'VOLKSWAGEN', model: 'TIGUAN' },
      { registration: 'BL68 UBE', make: 'TOYOTA', model: 'AYGO' },
      { registration: 'KN62 BHO', make: 'SUZUKI', model: 'SWIFT' }
    ]

    const results = []

    for (const vehicle of vehicleUpdates) {
      try {
        await sql`
          UPDATE vehicles 
          SET 
            make = ${vehicle.make},
            model = ${vehicle.model},
            updated_at = NOW()
          WHERE UPPER(registration) = UPPER(${vehicle.registration})
        `
        
        results.push({
          registration: vehicle.registration,
          action: 'updated',
          make: vehicle.make,
          model: vehicle.model
        })
        
        console.log(`✅ Updated ${vehicle.registration}: ${vehicle.make} ${vehicle.model}`)
        
      } catch (error) {
        console.error(`❌ Error updating ${vehicle.registration}:`, error)
        results.push({
          registration: vehicle.registration,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${vehicleUpdates.length} vehicles`,
      results
    })

  } catch (error) {
    console.error('❌ Fix vehicle models failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix vehicle models',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
