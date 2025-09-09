import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobSheetId } = await params
    console.log(`[JOB-SHEET-DETAIL] Loading job sheet from documents: ${jobSheetId}`)

    // Get the specific job sheet from documents table (same as main job sheets API)
    console.log(`[JOB-SHEET-DETAIL] Executing query for job sheet: ${jobSheetId}`)
    const jobSheetResult = await sql`
      SELECT *
      FROM documents
      WHERE id = ${jobSheetId} OR doc_number = ${jobSheetId}
      ORDER BY created_at DESC
      LIMIT 1
    `
    console.log(`[JOB-SHEET-DETAIL] Query completed, found ${jobSheetResult.length} results`)

    if (jobSheetResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet not found'
      }, { status: 404 })
    }

    const jobSheet = jobSheetResult[0]

    // Get enrichment data (customers and vehicles) for documents that don't have this data
    const [customersResult, vehiclesResult] = await Promise.all([
      sql`
        SELECT id, first_name, last_name, email, phone,
               address_line1, address_line2, city, postcode, country
        FROM customers
        WHERE (first_name IS NOT NULL AND first_name != '') OR (last_name IS NOT NULL AND last_name != '')
        ORDER BY RANDOM()
        LIMIT 100
      `,
      sql`
        SELECT *
        FROM vehicles
        WHERE registration IS NOT NULL AND registration != ''
        ORDER BY RANDOM()
        LIMIT 10
      `
    ])

    const customers = customersResult
    const vehicles = vehiclesResult

    // Enrich job sheet with customer and vehicle data (same logic as main API)
    let customerInfo = null
    let vehicleRegistration = jobSheet.vehicle_registration

    // If no customer_name, assign a random customer for demo purposes
    if (!jobSheet.customer_name && customers.length > 0) {
      const randomCustomer = customers[parseInt(jobSheet.id) % customers.length]
      customerInfo = randomCustomer
    } else if (jobSheet.customer_id) {
      // Try to get specific customer if customer_id exists
      try {
        const customerResult = await sql`
          SELECT first_name, last_name, phone, email,
                 address_line1, address_line2, city, postcode, country
          FROM customers
          WHERE id = ${jobSheet.customer_id}
          LIMIT 1
        `
        if (customerResult.length > 0) {
          customerInfo = customerResult[0]
        }
      } catch (error) {
        console.log('Error fetching specific customer:', error)
      }
    }

    // If no vehicle_registration, assign a random vehicle for demo purposes
    if (!jobSheet.vehicle_registration && vehicles.length > 0) {
      const randomVehicle = vehicles[parseInt(jobSheet.id) % vehicles.length]
      vehicleRegistration = randomVehicle.registration
    }

    // Get vehicle information using enriched vehicle registration
    let vehicleInfo = null
    if (vehicleRegistration) {
      try {
        const vehicleResult = await sql`
          SELECT
            make, model, derivative, year, color,
            engine_code, euro_status, fuel_type,
            engine_capacity, engine_capacity_cc,
            co2_emissions, mot_status, mot_expiry_date,
            tax_status, tax_due_date
          FROM vehicles
          WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${vehicleRegistration}, ' ', ''))
          LIMIT 1
        `
        if (vehicleResult.length > 0) {
          vehicleInfo = vehicleResult[0]
        }
      } catch (error) {
        console.log('Error fetching vehicle:', error)
      }
    }

    // Enhanced vehicle data lookup with VDG integration
    let enhancedVehicleInfo = vehicleInfo

    // If we don't have complete vehicle data, try to enhance it with VDG
    if (vehicleRegistration && (!vehicleInfo || !vehicleInfo.make || !vehicleInfo.model)) {
      try {
        console.log(`🔍 [JOB-SHEET-DETAIL] Enhancing vehicle data for ${vehicleRegistration}`)

        // Try to get enhanced vehicle data from our vehicle data API (use current origin to avoid port issues)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
        const enhancedResponse = await fetch(`${baseUrl}/api/vehicle-data?registration=${encodeURIComponent(jobSheet.vehicle_registration)}&dataTypes=basic,technical&useComprehensive=true`)

        if (enhancedResponse.ok) {
          const enhancedData = await enhancedResponse.json()
          if (enhancedData.success && enhancedData.data) {
            const basicData = enhancedData.data.basic
            const technicalData = enhancedData.data.technical

            // Use the enhanced data if available
            if (basicData || technicalData) {
              const sourceData = technicalData || basicData
              enhancedVehicleInfo = {
                make: sourceData.make || vehicleInfo?.make || '',
                model: sourceData.model || vehicleInfo?.model || '',
                derivative: sourceData.derivative || vehicleInfo?.derivative || '',
                year: sourceData.year || vehicleInfo?.year || '',
                color: sourceData.colour || sourceData.color || vehicleInfo?.color || '',
                // Additional technical fields to preload UI and avoid N/A flicker
                engineCode: technicalData?.engineCode || vehicleInfo?.engine_code || null,
                tyreSize: technicalData?.tyreSize || technicalData?.tyreSizeFront || null,
                tyrePressureFront: technicalData?.tyrePressureFront || null,
                tyrePressureRear: technicalData?.tyrePressureRear || null,
                timingBeltInterval: technicalData?.timingBeltInterval || null,
              }
              console.log(`✅ [JOB-SHEET-DETAIL] Enhanced vehicle data:`, enhancedVehicleInfo)
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ [JOB-SHEET-DETAIL] Failed to enhance vehicle data:`, error)
        // Continue with existing data
      }
    }

    // Format the job sheet data with enhanced vehicle information
    const makeModelParts = []
    if (enhancedVehicleInfo?.make) makeModelParts.push(enhancedVehicleInfo.make)
    if (enhancedVehicleInfo?.model) makeModelParts.push(enhancedVehicleInfo.model)
    if (enhancedVehicleInfo?.derivative) makeModelParts.push(enhancedVehicleInfo.derivative)
    const makeModel = makeModelParts.join(' ').trim()

    // Create customer name (same logic as main API)
    let customerName = jobSheet.customer_name
    if (customerInfo && customerInfo.id) {
      customerName = `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim()
    }

    const formattedJobSheet = {
      id: jobSheet.id.toString(),
      jobNumber: jobSheet.doc_number || `${jobSheet.doc_type}-${jobSheet.id}`,
      registration: vehicleRegistration || '',
      makeModel: makeModel || '',
      customer: customerName || '',
      status: jobSheet.status || 'active',
      date: jobSheet.created_at,
      total: parseFloat(jobSheet.total_gross) || 0,
      customerId: jobSheet.customer_id,
      customerMobile: '',
      customerPhone: customerInfo?.phone || '',
      customerEmail: customerInfo?.email || '',
      description: jobSheet.doc_notes || '',
      notes: jobSheet.notes || '',
      // Customer address information
      customerAddress: customerInfo ? {
        houseNumber: '', // Not available in current schema
        road: customerInfo.address_line1 || '',
        locality: customerInfo.address_line2 || '',
        town: customerInfo.city || '',
        county: '', // Not available in current schema
        postCode: customerInfo.postcode || '',
        country: customerInfo.country || ''
      } : null,
      // Additional fields for the form
      vehicleMake: enhancedVehicleInfo?.make || '',
      vehicleModel: enhancedVehicleInfo?.model || '',
      vehicleDerivative: enhancedVehicleInfo?.derivative || '',
      vehicleYear: enhancedVehicleInfo?.year || null,
      vehicleColor: enhancedVehicleInfo?.color || '',
      // Preload technical details to avoid UI flicker
      engineCode: enhancedVehicleInfo?.engineCode || vehicleInfo?.engine_code || '',
      euroStatus: vehicleInfo?.euro_status || '',
      tyreSize: enhancedVehicleInfo?.tyreSize || vehicleInfo?.tyre_size_front || vehicleInfo?.tyre_size_rear || '',
      tyrePressureFrontNS: enhancedVehicleInfo?.tyrePressureFront || vehicleInfo?.tyre_pressure_front || '',
      tyrePressureFrontOS: enhancedVehicleInfo?.tyrePressureFront || vehicleInfo?.tyre_pressure_front || '',
      tyrePressureRearNS: enhancedVehicleInfo?.tyrePressureRear || vehicleInfo?.tyre_pressure_rear || '',
      tyrePressureRearOS: enhancedVehicleInfo?.tyrePressureRear || vehicleInfo?.tyre_pressure_rear || '',
      timingBeltInterval: enhancedVehicleInfo?.timingBeltInterval || '',
      radioCode: enhancedVehicleInfo?.radioCode || '',
      mileage: 0,
      createdAt: jobSheet.created_at,
      updatedAt: jobSheet.updated_at
    }

    console.log(`[JOB-SHEET-DETAIL] Found job sheet:`, formattedJobSheet)

    return NextResponse.json({
      success: true,
      jobSheet: formattedJobSheet,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[JOB-SHEET-DETAIL] Error:', error)
    console.error('[JOB-SHEET-DETAIL] Error stack:', error instanceof Error ? error.stack : 'No stack')

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobSheetId = params.id
    const body = await request.json()

    console.log(`[JOB-SHEET-UPDATE] Updating job sheet: ${jobSheetId}`, body)

    // Update the job sheet in the documents table
    const updateResult = await sql`
      UPDATE documents
      SET
        vehicle_registration = ${body.registration || ''},
        doc_notes = ${body.description || ''},
        notes = ${body.notes || ''},
        status = ${body.status || 'active'},
        total_gross = ${body.totalAmount || 0},
        updated_at = NOW()
      WHERE id = ${jobSheetId} OR doc_number = ${jobSheetId}
      RETURNING *
    `

    if (updateResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet not found or could not be updated'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Job sheet updated successfully',
      jobSheet: updateResult[0],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[JOB-SHEET-UPDATE] Error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobSheetId } = await params
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'delete' // 'delete' or 'void'

    console.log(`[JOB-SHEET-DELETE] ${action.toUpperCase()} job sheet: ${jobSheetId}`)

    if (action === 'void') {
      // Void the job sheet (soft delete - mark as voided)
      const voidResult = await sql`
        UPDATE documents
        SET
          status = 'VOIDED',
          updated_at = NOW()
        WHERE (id = ${jobSheetId} OR doc_number = ${jobSheetId})
        AND doc_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE')
        RETURNING id, doc_number, status
      `

      if (voidResult.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Job sheet not found'
        }, { status: 404 })
      }

      console.log(`[JOB-SHEET-DELETE] Successfully voided job sheet: ${jobSheetId}`)

      return NextResponse.json({
        success: true,
        action: 'voided',
        message: `Job sheet ${voidResult[0].doc_number} has been voided`,
        jobSheet: voidResult[0]
      })

    } else {
      // Hard delete the job sheet (permanent removal)
      const deleteResult = await sql`
        DELETE FROM documents
        WHERE (id = ${jobSheetId} OR doc_number = ${jobSheetId})
        AND doc_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE')
        RETURNING id, doc_number
      `

      if (deleteResult.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Job sheet not found'
        }, { status: 404 })
      }

      console.log(`[JOB-SHEET-DELETE] Successfully deleted job sheet: ${jobSheetId}`)

      return NextResponse.json({
        success: true,
        action: 'deleted',
        message: `Job sheet ${deleteResult[0].doc_number} has been permanently deleted`,
        jobSheet: deleteResult[0]
      })
    }

  } catch (error) {
    console.error('[JOB-SHEET-DELETE] Error deleting/voiding job sheet:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete/void job sheet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
