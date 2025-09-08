import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log('🔧 Updating specific vehicles with derivative information...')

    // Specific vehicle updates with proper derivatives
    const vehicleUpdates = [
      { registration: 'YN18 RXR', make: 'NISSAN', model: 'MICRA', derivative: 'VISIA' },
      { registration: 'YE67 URO', make: 'VOLKSWAGEN', model: 'TIGUAN', derivative: 'SE TSI BLUEMOTION TECHNOLOGY' },
      { registration: 'BL68 UBE', make: 'TOYOTA', model: 'AYGO', derivative: 'X-PLAY VVT-I' },
      { registration: 'KN62 BHO', make: 'SUZUKI', model: 'SWIFT', derivative: 'SZ3 DUALJET' },
      { registration: 'NH19 VPP', make: 'TOYOTA', model: 'YARIS', derivative: 'VVT-I ICON TECH' }
    ]

    const results = []

    for (const vehicle of vehicleUpdates) {
      try {
        // Check if vehicle exists first
        const existingVehicle = await sql`
          SELECT registration FROM vehicles 
          WHERE UPPER(registration) = UPPER(${vehicle.registration})
        `

        if (existingVehicle.length > 0) {
          // Update existing vehicle with derivative
          await sql`
            UPDATE vehicles 
            SET 
              make = ${vehicle.make},
              model = ${vehicle.model},
              derivative = ${vehicle.derivative},
              updated_at = NOW()
            WHERE UPPER(registration) = UPPER(${vehicle.registration})
          `
        } else {
          // Create new vehicle record with derivative
          await sql`
            INSERT INTO vehicles (
              registration, make, model, derivative, created_at, updated_at
            ) VALUES (
              ${vehicle.registration.toUpperCase()},
              ${vehicle.make},
              ${vehicle.model},
              ${vehicle.derivative},
              NOW(),
              NOW()
            )
          `
        }
        
        results.push({
          registration: vehicle.registration,
          action: existingVehicle.length > 0 ? 'updated' : 'created',
          make: vehicle.make,
          model: vehicle.model,
          derivative: vehicle.derivative,
          fullName: `${vehicle.make} ${vehicle.model} ${vehicle.derivative}`
        })
        
        console.log(`✅ ${existingVehicle.length > 0 ? 'Updated' : 'Created'} ${vehicle.registration}: ${vehicle.make} ${vehicle.model} ${vehicle.derivative}`)
        
      } catch (error) {
        console.error(`❌ Error processing ${vehicle.registration}:`, error)
        results.push({
          registration: vehicle.registration,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${vehicleUpdates.length} vehicles with derivative information`,
      results
    })

  } catch (error) {
    console.error('❌ Update specific derivatives failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update specific derivatives',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
