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

    console.log(`[COMPLETE-FIX] Starting comprehensive fix for vehicle: ${registration}`)

    const fixes = {
      vehicle_updated: false,
      mot_history_created: false,
      dvla_data_retrieved: false,
      missing_documents_identified: false
    }

    // 1. Get DVLA data
    let dvlaData = null
    try {
      dvlaData = await lookupVehicle(registration)
      if (dvlaData) {
        fixes.dvla_data_retrieved = true
        console.log(`[COMPLETE-FIX] DVLA data retrieved successfully`)
      }
    } catch (error) {
      console.log(`[COMPLETE-FIX] DVLA lookup failed:`, error)
    }

    // 2. Get current vehicle data
    const currentVehicle = await sql`
      SELECT * FROM vehicles
      WHERE registration = ${cleanReg}
      OR registration = ${registration}
      OR REPLACE(registration, ' ', '') = ${cleanReg}
    `

    if (currentVehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Vehicle not found in database"
      }, { status: 404 })
    }

    const vehicle = currentVehicle[0]

    // 3. Update vehicle with DVLA data
    if (dvlaData) {
      const updates = []
      const values = []
      let paramIndex = 1

      // Update missing fields with DVLA data (force update if null)
      if (dvlaData.yearOfManufacture) {
        updates.push(`year = $${paramIndex++}`)
        values.push(dvlaData.yearOfManufacture)
        console.log(`[COMPLETE-FIX] Adding year: ${dvlaData.yearOfManufacture}`)
      }

      if (dvlaData.colour) {
        updates.push(`color = $${paramIndex++}`)
        values.push(dvlaData.colour)
        console.log(`[COMPLETE-FIX] Adding color: ${dvlaData.colour}`)
      }

      if (dvlaData.fuelType) {
        updates.push(`fuel_type = $${paramIndex++}`)
        values.push(dvlaData.fuelType)
        console.log(`[COMPLETE-FIX] Adding fuel_type: ${dvlaData.fuelType}`)
      }

      if (dvlaData.engineCapacity) {
        updates.push(`engine_size = $${paramIndex++}`)
        values.push(dvlaData.engineCapacity)
        console.log(`[COMPLETE-FIX] Adding engine_size: ${dvlaData.engineCapacity}`)
      }

      // Always update MOT and tax status from DVLA (most current)
      updates.push(`mot_status = $${paramIndex++}`)
      values.push(dvlaData.motStatus)

      if (dvlaData.motExpiryDate) {
        updates.push(`mot_expiry_date = $${paramIndex++}`)
        values.push(dvlaData.motExpiryDate)
      }

      if (dvlaData.taxStatus) {
        updates.push(`tax_status = $${paramIndex++}`)
        values.push(dvlaData.taxStatus)
      }

      if (dvlaData.taxDueDate) {
        updates.push(`tax_due_date = $${paramIndex++}`)
        values.push(dvlaData.taxDueDate)
      }

      // Update last checked timestamp
      updates.push(`mot_last_checked = NOW()`)
      updates.push(`updated_at = NOW()`)

      if (updates.length > 0) {
        values.push(cleanReg)

        const updateQuery = `
          UPDATE vehicles
          SET ${updates.join(', ')}
          WHERE registration = $${paramIndex}
        `

        console.log(`[COMPLETE-FIX] Executing update query:`, updateQuery)
        console.log(`[COMPLETE-FIX] With values:`, values)

        const result = await sql.query(updateQuery, values)
        fixes.vehicle_updated = true
        console.log(`[COMPLETE-FIX] Updated vehicle with ${updates.length - 2} data fields, affected rows:`, result.rowCount)
      }
    }

    // 4. Create/update MOT history
    const motHistoryCheck = await sql`
      SELECT COUNT(*) as count FROM mot_history
      WHERE vehicle_registration = ${cleanReg}
      OR vehicle_registration = ${registration}
    `

    if (motHistoryCheck[0].count === 0 && dvlaData && dvlaData.motExpiryDate) {
      try {
        // Create a basic MOT history entry based on DVLA data
        const testDate = new Date(new Date(dvlaData.motExpiryDate).getTime() - 365*24*60*60*1000).toISOString().split('T')[0]
        const testResult = dvlaData.motStatus === 'Valid' ? 'PASS' :
                          dvlaData.motStatus === 'Not valid' ? 'EXPIRED' : 'UNKNOWN'

        console.log(`[COMPLETE-FIX] Creating MOT history: testDate=${testDate}, result=${testResult}, expiry=${dvlaData.motExpiryDate}`)

        await sql`
          INSERT INTO mot_history (
            vehicle_registration,
            test_date,
            test_result,
            expiry_date,
            created_at
          ) VALUES (
            ${registration},
            ${testDate},
            ${testResult},
            ${dvlaData.motExpiryDate},
            NOW()
          )
        `
        fixes.mot_history_created = true
        console.log(`[COMPLETE-FIX] Created MOT history entry successfully`)
      } catch (error) {
        console.log(`[COMPLETE-FIX] Failed to create MOT history:`, error)
      }
    }

    // 5. Check for missing documents (this is the main issue)
    const documentsCheck = await sql`
      SELECT COUNT(*) as total_documents FROM documents
    `

    const customerDocuments = await sql`
      SELECT
        COUNT(*) as customer_documents
      FROM documents
      WHERE _id_customer = ${vehicle.owner_id}
    `

    const vehicleDocuments = await sql`
      SELECT
        COUNT(*) as vehicle_documents
      FROM documents
      WHERE vehicle_registration ILIKE ${`%${cleanReg}%`}
      OR _id_vehicle = ${vehicle.owner_id}
    `

    fixes.missing_documents_identified = true

    // 6. Get updated vehicle data to return
    const updatedVehicle = await sql`
      SELECT * FROM vehicles
      WHERE registration = ${cleanReg}
      OR registration = ${registration}
      OR REPLACE(registration, ' ', '') = ${cleanReg}
    `

    // 7. Get MOT history
    const motHistory = await sql`
      SELECT * FROM mot_history
      WHERE vehicle_registration = ${cleanReg}
      OR vehicle_registration = ${registration}
      ORDER BY test_date DESC
    `

    return NextResponse.json({
      success: true,
      registration,
      fixes_applied: fixes,
      data_integrity_analysis: {
        vehicle_data_complete: !!(updatedVehicle[0]?.year && updatedVehicle[0]?.color && updatedVehicle[0]?.fuel_type),
        mot_history_available: motHistory.length > 0,
        documents_missing: {
          total_documents_in_db: documentsCheck[0].total_documents,
          customer_documents: customerDocuments[0].customer_documents,
          vehicle_documents: vehicleDocuments[0].vehicle_documents,
          critical_issue: vehicleDocuments[0].vehicle_documents === 0
        }
      },
      updated_vehicle: updatedVehicle[0],
      mot_history: motHistory,
      dvla_data: dvlaData,
      critical_issues: [
        vehicleDocuments[0].vehicle_documents === 0 ? "NO SERVICE HISTORY FOUND - Job SI80349 and other documents missing from database" : null,
        !updatedVehicle[0]?.year ? "Vehicle year still missing after DVLA lookup" : null,
        motHistory.length === 0 ? "No MOT history available" : null
      ].filter(Boolean),
      recommendations: [
        "Re-import documents from original database to restore service history",
        "Verify document import process captured all records",
        "Check if job SI80349 exists in source data",
        "Ensure vehicle registration matching is working correctly in document import"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[COMPLETE-FIX] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete vehicle data fix",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
