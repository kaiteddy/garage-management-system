import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { lookupVehicle } from "@/lib/dvla-api"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration: rawRegistration } = await params;
    const registration = decodeURIComponent(rawRegistration);
    const cleanReg = registration.toUpperCase().replace(/\s/g, '');

    console.log(`[FIX-VEHICLE-DATA] Fixing data integrity for vehicle: ${registration}`)

    // Create MOT history table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS mot_history (
        id SERIAL PRIMARY KEY,
        vehicle_registration VARCHAR(20) NOT NULL,
        test_date DATE,
        test_result VARCHAR(20),
        expiry_date DATE,
        odometer_value INTEGER,
        odometer_unit VARCHAR(10),
        mot_test_number VARCHAR(50),
        defects JSONB,
        advisories JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // 1. First, let's check what documents exist for this vehicle
    const documentsCheck = await sql`
      SELECT
        id,
        doc_number,
        doc_type,
        doc_date_issued,
        vehicle_registration,
        customer_name,
        total_gross,
        doc_status
      FROM documents
      WHERE vehicle_registration ILIKE ${`%${cleanReg}%`}
      OR vehicle_registration ILIKE ${`%${registration}%`}
      OR doc_number ILIKE '%SI80349%'
      ORDER BY doc_date_issued DESC
    `

    console.log(`[FIX-VEHICLE-DATA] Found ${documentsCheck.length} documents for ${registration}`)

    // 2. Check for missing service history connection
    const serviceHistoryCheck = await sql`
      SELECT
        d.id,
        d.doc_number,
        d.doc_type,
        d.doc_date_issued,
        d.vehicle_registration,
        d.customer_name,
        d.total_gross,
        v.registration as vehicle_reg
      FROM documents d
      LEFT JOIN vehicles v ON (
        REPLACE(UPPER(d.vehicle_registration), ' ', '') = REPLACE(UPPER(v.registration), ' ', '')
      )
      WHERE d.vehicle_registration ILIKE ${`%${cleanReg}%`}
      OR d.vehicle_registration ILIKE ${`%${registration}%`}
      ORDER BY d.doc_date_issued DESC
    `

    // 3. Get current vehicle data
    const currentVehicle = await sql`
      SELECT * FROM vehicles
      WHERE registration = ${cleanReg}
      OR registration = ${registration}
      OR REPLACE(registration, ' ', '') = ${cleanReg}
    `

    // 4. Try to get DVLA data to fill missing fields
    let dvlaData = null
    try {
      dvlaData = await lookupVehicle(registration)
      console.log(`[FIX-VEHICLE-DATA] DVLA lookup result:`, dvlaData ? 'Success' : 'Failed')
    } catch (error) {
      console.log(`[FIX-VEHICLE-DATA] DVLA lookup failed:`, error)
    }

    // 5. Update vehicle with missing DVLA data if available
    let vehicleUpdated = false
    if (dvlaData && currentVehicle.length > 0) {
      const vehicle = currentVehicle[0]

      const updates = []
      const values = []
      let paramIndex = 1

      // Check and update missing fields
      if (!vehicle.year && dvlaData.yearOfManufacture) {
        updates.push(`year = $${paramIndex++}`)
        values.push(dvlaData.yearOfManufacture)
      }

      if (!vehicle.color && dvlaData.colour) {
        updates.push(`color = $${paramIndex++}`)
        values.push(dvlaData.colour)
      }

      if (!vehicle.fuel_type && dvlaData.fuelType) {
        updates.push(`fuel_type = $${paramIndex++}`)
        values.push(dvlaData.fuelType)
      }

      if (!vehicle.engine_size && dvlaData.engineCapacity) {
        updates.push(`engine_size = $${paramIndex++}`)
        values.push(dvlaData.engineCapacity)
      }

      if (!vehicle.mot_expiry_date && dvlaData.motExpiryDate) {
        updates.push(`mot_expiry_date = $${paramIndex++}`)
        values.push(dvlaData.motExpiryDate)
      }

      if (!vehicle.mot_status && dvlaData.motStatus) {
        updates.push(`mot_status = $${paramIndex++}`)
        values.push(dvlaData.motStatus)
      }

      if (!vehicle.tax_due_date && dvlaData.taxDueDate) {
        updates.push(`tax_due_date = $${paramIndex++}`)
        values.push(dvlaData.taxDueDate)
      }

      if (!vehicle.tax_status && dvlaData.taxStatus) {
        updates.push(`tax_status = $${paramIndex++}`)
        values.push(dvlaData.taxStatus)
      }

      // Update vehicle if we have changes
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`)
        values.push(cleanReg)

        const updateQuery = `
          UPDATE vehicles
          SET ${updates.join(', ')}
          WHERE registration = $${paramIndex}
        `

        await sql.query(updateQuery, values)
        vehicleUpdated = true
        console.log(`[FIX-VEHICLE-DATA] Updated vehicle with ${updates.length - 1} fields`)
      }
    }

    // 6. Check for MOT history data
    const motHistoryCheck = await sql`
      SELECT COUNT(*) as count FROM mot_history
      WHERE vehicle_registration = ${cleanReg}
      OR vehicle_registration = ${registration}
    `

    // 7. Create MOT history entry if missing and we have DVLA data
    let motHistoryCreated = false
    if (motHistoryCheck[0].count === 0 && dvlaData) {
      try {
        await sql`
          INSERT INTO mot_history (
            vehicle_registration,
            test_date,
            test_result,
            expiry_date,
            odometer_value,
            odometer_unit,
            mot_test_number,
            created_at
          ) VALUES (
            ${registration},
            ${dvlaData.motExpiryDate ? new Date(new Date(dvlaData.motExpiryDate).getTime() - 365*24*60*60*1000).toISOString().split('T')[0] : null},
            ${dvlaData.motStatus === 'Valid' ? 'PASS' : 'UNKNOWN'},
            ${dvlaData.motExpiryDate},
            NULL,
            'mi',
            NULL,
            NOW()
          )
        `
        motHistoryCreated = true
        console.log(`[FIX-VEHICLE-DATA] Created MOT history entry`)
      } catch (error) {
        console.log(`[FIX-VEHICLE-DATA] Failed to create MOT history:`, error)
      }
    }

    // 8. Check document line items for job SI80349
    const lineItemsCheck = await sql`
      SELECT
        d.doc_number,
        d.id as document_id,
        COUNT(dli.id) as line_item_count
      FROM documents d
      LEFT JOIN document_line_items dli ON d.id = dli.document_id
      WHERE d.doc_number ILIKE '%SI80349%'
      OR (d.vehicle_registration ILIKE ${`%${cleanReg}%`} AND d.doc_number IS NOT NULL)
      GROUP BY d.id, d.doc_number
      ORDER BY d.doc_date_issued DESC
    `

    return NextResponse.json({
      success: true,
      registration,
      fixes_applied: {
        vehicle_updated: vehicleUpdated,
        mot_history_created: motHistoryCreated,
        dvla_data_available: !!dvlaData
      },
      data_analysis: {
        documents_found: documentsCheck.length,
        service_history_connections: serviceHistoryCheck.length,
        current_vehicle_data: currentVehicle[0] || null,
        mot_history_entries: motHistoryCheck[0].count,
        line_items_analysis: lineItemsCheck
      },
      documents: documentsCheck,
      dvla_data: dvlaData,
      recommendations: [
        documentsCheck.length === 0 ? "No service documents found - check document import" : null,
        motHistoryCheck[0].count === 0 ? "No MOT history found - DVLA integration needed" : null,
        !currentVehicle[0]?.year ? "Missing vehicle year - DVLA lookup needed" : null,
        !currentVehicle[0]?.color ? "Missing vehicle color - DVLA lookup needed" : null,
        lineItemsCheck.length === 0 ? "No detailed line items found for services" : null
      ].filter(Boolean),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FIX-VEHICLE-DATA] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix vehicle data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
