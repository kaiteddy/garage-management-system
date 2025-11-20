import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CRITICAL-MOT-CHECK] Starting critical MOT check with last visit data...")

    // Get vehicles with critical MOT status and their customer/last visit information
    const criticalVehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.mot_expiry_date,
        v.mot_status,
        v.vehicle_age,
        v.sorn_status,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'expiring_soon'
          ELSE 'other'
        END as mot_urgency,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN
            CURRENT_DATE - v.mot_expiry_date
          ELSE
            v.mot_expiry_date - CURRENT_DATE
        END as days_difference,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.city,
        c.postcode,
        d.doc_date_issued as last_visit_date,
        d.total_gross as last_visit_amount,
        d.customer_name as last_visit_description
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      LEFT JOIN LATERAL (
        SELECT doc_date_issued, total_gross, customer_name
        FROM documents
        WHERE vehicle_registration = v.registration
        AND doc_type IN ('Invoice', 'Receipt', 'Job Sheet')
        ORDER BY doc_date_issued DESC
        LIMIT 1
      ) d ON true
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      ORDER BY v.mot_expiry_date ASC
      LIMIT 500
    `

    console.log(`[CRITICAL-MOT-CHECK] Found ${criticalVehicles.length} vehicles with critical MOT status`)

    // Transform the data for the frontend
    const transformedData = criticalVehicles.map((vehicle: any) => ({
      id: vehicle.registration, // Use registration as ID since there's no id column
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vehicleAge: vehicle.vehicle_age,
      sornStatus: vehicle.sorn_status,
      motExpiryDate: vehicle.mot_expiry_date,
      motStatus: vehicle.mot_status,
      urgency: vehicle.mot_urgency,
      daysUntilExpiry: vehicle.days_difference,
      customer: {
        name: `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim() || 'Unknown',
        phone: vehicle.phone,
        email: vehicle.email,
        address: `${vehicle.address_line1 || ''}, ${vehicle.city || ''}, ${vehicle.postcode || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
      },
      lastVisit: {
        date: vehicle.last_visit_date,
        amount: vehicle.last_visit_amount ? parseFloat(vehicle.last_visit_amount) : null,
        description: vehicle.last_visit_description
      }
    }))

    // Categorize the results
    const expired = transformedData.filter(v => v.urgency === 'expired')
    const expiringSoon = transformedData.filter(v => v.urgency === 'expiring_soon')

    const summary = {
      total: transformedData.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      lastChecked: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: {
        vehicles: transformedData,
        summary,
        categories: {
          expired,
          expiringSoon
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CRITICAL-MOT-CHECK] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch critical MOT data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
