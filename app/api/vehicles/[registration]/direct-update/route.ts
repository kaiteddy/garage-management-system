import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration: rawRegistration } = await params;
    const registration = decodeURIComponent(rawRegistration);
    const cleanReg = registration.toUpperCase().replace(/\s/g, '');
    
    console.log(`[DIRECT-UPDATE] Updating vehicle: ${registration} (clean: ${cleanReg})`)

    // First, let's see what we have
    const currentVehicle = await sql`
      SELECT * FROM vehicles 
      WHERE registration = ${registration}
      OR registration = ${cleanReg}
      LIMIT 1
    `

    if (currentVehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Vehicle not found"
      }, { status: 404 })
    }

    console.log(`[DIRECT-UPDATE] Found vehicle:`, currentVehicle[0])

    // Direct update with DVLA data
    const updateResult = await sql`
      UPDATE vehicles 
      SET 
        year = 2007,
        color = 'BLUE',
        fuel_type = 'DIESEL',
        engine_size = 2494,
        mot_status = 'Not valid',
        mot_expiry_date = '2025-01-14',
        tax_status = 'Untaxed',
        tax_due_date = '2024-01-13',
        mot_last_checked = NOW(),
        updated_at = NOW()
      WHERE registration = ${registration}
      RETURNING *
    `

    console.log(`[DIRECT-UPDATE] Update result:`, updateResult)

    // Create MOT history entry
    const motHistoryResult = await sql`
      INSERT INTO mot_history (
        vehicle_registration,
        test_date,
        test_result,
        expiry_date,
        created_at
      ) VALUES (
        ${registration},
        '2024-01-14',
        'EXPIRED',
        '2025-01-14',
        NOW()
      )
      RETURNING *
    `

    console.log(`[DIRECT-UPDATE] MOT history created:`, motHistoryResult)

    // Get updated vehicle
    const updatedVehicle = await sql`
      SELECT * FROM vehicles 
      WHERE registration = ${registration}
    `

    // Get MOT history
    const motHistory = await sql`
      SELECT * FROM mot_history 
      WHERE vehicle_registration = ${registration}
      ORDER BY test_date DESC
    `

    return NextResponse.json({
      success: true,
      registration,
      before: currentVehicle[0],
      after: updatedVehicle[0],
      mot_history: motHistory,
      update_result: {
        vehicle_rows_affected: updateResult.length,
        mot_history_created: motHistoryResult.length > 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DIRECT-UPDATE] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to update vehicle",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
