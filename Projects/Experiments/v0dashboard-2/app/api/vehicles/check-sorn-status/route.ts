import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CHECK-SORN-STATUS] Checking SORN status for vehicles...")

    // Note: This is a framework for SORN checking
    // In production, you would need:
    // 1. DVLA API access credentials
    // 2. Proper rate limiting
    // 3. Error handling for API failures

    // For now, we'll enhance our SORN detection based on MOT patterns
    let sornChecked = 0
    let sornUpdated = 0

    // Get vehicles that might be SORN
    const suspiciousVehicles = await sql`
      SELECT
        registration,
        make,
        model,
        mot_expiry_date,
        vehicle_age,
        sorn_status
      FROM vehicles
      WHERE mot_expiry_date < CURRENT_DATE - INTERVAL '6 months'
      OR (vehicle_age > 20 AND mot_expiry_date < CURRENT_DATE - INTERVAL '3 months')
      ORDER BY mot_expiry_date ASC
      LIMIT 100
    `

    console.log(`[CHECK-SORN-STATUS] Found ${suspiciousVehicles.length} vehicles to check`)

    // Enhanced SORN detection logic
    for (const vehicle of suspiciousVehicles) {
      try {
        let newSornStatus = 'unknown'

        // Logic based on MOT expiry and vehicle age
        const daysSinceExpiry = Math.floor((new Date().getTime() - new Date(vehicle.mot_expiry_date).getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceExpiry > 730) { // 2+ years expired
          newSornStatus = 'likely_sorn'
        } else if (daysSinceExpiry > 365 && vehicle.vehicle_age > 15) { // 1+ year expired and old
          newSornStatus = 'likely_sorn'
        } else if (daysSinceExpiry > 180 && vehicle.vehicle_age > 20) { // 6+ months expired and very old
          newSornStatus = 'possibly_sorn'
        } else if (daysSinceExpiry > 90) { // 3+ months expired
          newSornStatus = 'possibly_sorn'
        } else if (daysSinceExpiry <= 0) { // Valid MOT
          newSornStatus = 'active'
        } else { // Recently expired
          newSornStatus = 'recently_expired'
        }

        // TODO: In production, make actual DVLA API call here
        // const dvlaResponse = await checkDVLAStatus(vehicle.registration)
        // newSornStatus = dvlaResponse.sornStatus

        if (newSornStatus !== vehicle.sorn_status) {
          await sql`
            UPDATE vehicles
            SET
              sorn_status = ${newSornStatus},
              updated_at = NOW()
            WHERE registration = ${vehicle.registration}
          `
          sornUpdated++
        }

        sornChecked++

      } catch (error) {
        console.error(`[CHECK-SORN-STATUS] Error checking vehicle ${vehicle.registration}:`, error)
      }
    }

    // Get updated statistics
    const sornStats = await sql`
      SELECT
        sorn_status,
        COUNT(*) as count,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_customer
      FROM vehicles
      WHERE sorn_status IS NOT NULL
      GROUP BY sorn_status
      ORDER BY count DESC
    `

    // Get critical vehicles that might be SORN
    const criticalSorn = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        v.vehicle_age,
        v.sorn_status,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.sorn_status IN ('likely_sorn', 'possibly_sorn')
      AND v.mot_expiry_date IS NOT NULL
      AND (
        v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
        OR v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
      )
      ORDER BY v.mot_expiry_date ASC
      LIMIT 20
    `

    return NextResponse.json({
      success: true,
      message: "SORN status check completed",
      results: {
        vehiclesChecked: sornChecked,
        statusUpdated: sornUpdated,
        criticalSornVehicles: criticalSorn.length
      },
      sornDistribution: sornStats,
      criticalSornVehicles: criticalSorn,
      notes: [
        "SORN detection is currently based on MOT expiry patterns",
        "For accurate SORN status, DVLA API integration would be required",
        "Vehicles with MOT expired >2 years are marked as 'likely_sorn'",
        "Vehicles with MOT expired >6 months and age >15 years are marked as 'possibly_sorn'"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-SORN-STATUS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check SORN status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// TODO: Implement actual DVLA API integration
// async function checkDVLAStatus(registration: string) {
//   // This would require DVLA API credentials and proper implementation
//   // const response = await fetch(`https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles`, {
//   //   method: 'POST',
//   //   headers: {
//   //     'x-api-key': process.env.DVLA_API_KEY,
//   //     'Content-Type': 'application/json'
//   //   },
//   //   body: JSON.stringify({ registrationNumber: registration })
//   // })
//   // return response.json()
//   return { sornStatus: 'unknown' }
// }
