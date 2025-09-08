import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = decodeURIComponent(params.registration)
    const cleanReg = registration.toUpperCase().replace(/\s/g, '')
    
    console.log(`[VEHICLE-OPTIMIZED] 🚗 Fetching vehicle data for ${registration}`)

    // Single optimized query to get all vehicle data at once
    const vehicleData = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.year,
        v.color,
        v.fuel_type,
        v.mot_status,
        v.mot_expiry_date,
        v.mot_test_date,
        v.mot_test_number,
        v.mot_test_result,
        v.mot_odometer_value,
        v.mot_odometer_unit,
        v.mot_last_checked,
        v.customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        -- Count MOT records
        (SELECT COUNT(*) FROM mot_history mh WHERE mh.vehicle_registration = v.registration) as mot_count,
        -- Count service records  
        (SELECT COUNT(*) FROM documents d WHERE d.vehicle_registration = v.registration) as service_count
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.registration = ${registration}
      OR v.registration = ${cleanReg}
      OR UPPER(REPLACE(v.registration, ' ', '')) = ${cleanReg}
      LIMIT 1
    `

    if (!vehicleData.length) {
      return NextResponse.json({
        success: false,
        error: "Vehicle not found"
      }, { status: 404 })
    }

    const vehicle = vehicleData[0]

    // Only fetch detailed MOT history if there are records (lazy loading)
    let motHistory = []
    if (vehicle.mot_count > 0) {
      const motHistoryResult = await sql`
        SELECT
          test_date,
          expiry_date,
          test_result,
          odometer_value,
          odometer_unit,
          mot_test_number,
          defects,
          advisories
        FROM mot_history
        WHERE vehicle_registration = ${registration}
        ORDER BY test_date DESC
        LIMIT 20
      `

      motHistory = motHistoryResult.map(record => ({
        testDate: record.test_date,
        expiryDate: record.expiry_date,
        result: record.test_result,
        mileage: record.odometer_value || 0,
        mileageUnit: record.odometer_unit || 'mi',
        testNumber: record.mot_test_number || 'Unknown',
        defects: record.defects || [],
        advisories: record.advisories || []
      }))
    }

    // Only fetch service history if there are records (lazy loading)
    let serviceHistory = []
    if (vehicle.service_count > 0) {
      const serviceResult = await sql`
        SELECT
          d.id,
          d.doc_number as document_number,
          d.doc_date_issued as date,
          d.doc_type as type,
          d.total_gross as amount,
          de.labour_description
        FROM documents d
        LEFT JOIN document_extras de ON d.id::text = de.document_id::text
        WHERE d.vehicle_registration = ${registration}
        ORDER BY d.doc_date_issued DESC
        LIMIT 10
      `

      serviceHistory = serviceResult.map(record => ({
        id: record.id,
        documentNumber: record.document_number,
        date: record.date,
        type: record.type,
        amount: parseFloat(record.amount) || 0,
        description: record.labour_description || 'Service'
      }))
    }

    // Build optimized response
    const response = {
      success: true,
      vehicle: {
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        fuelType: vehicle.fuel_type,
        motStatus: vehicle.mot_status,
        motExpiryDate: vehicle.mot_expiry_date,
        motTestDate: vehicle.mot_test_date,
        motTestNumber: vehicle.mot_test_number,
        motTestResult: vehicle.mot_test_result,
        motOdometerValue: vehicle.mot_odometer_value,
        motOdometerUnit: vehicle.mot_odometer_unit,
        motLastChecked: vehicle.mot_last_checked,
        customer: vehicle.customer_id ? {
          id: vehicle.customer_id,
          firstName: vehicle.first_name,
          lastName: vehicle.last_name,
          name: `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim(),
          phone: vehicle.phone,
          email: vehicle.email
        } : null,
        motHistory: motHistory,
        serviceHistory: serviceHistory,
        stats: {
          motRecords: parseInt(vehicle.mot_count) || 0,
          serviceRecords: parseInt(vehicle.service_count) || 0
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("[VEHICLE-OPTIMIZED] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch vehicle data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
