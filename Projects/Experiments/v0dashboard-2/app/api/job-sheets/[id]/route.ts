import { NextRequest, NextResponse } from "next/server"
import { testConnection, query } from "@/lib/database/simple-db-client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobSheetId } = await params
    console.log(`[JOB-SHEET-DETAIL] Loading job sheet from customer_documents: ${jobSheetId}`)

    // Test database connection first
    const isConnected = await testConnection()
    if (!isConnected) {
      console.log('[JOB-SHEET-DETAIL] Database connection failed')
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 })
    }

    // Get the specific job sheet from customer_documents table
    console.log(`[JOB-SHEET-DETAIL] Executing query for job sheet: ${jobSheetId}`)
    const jobSheetResult = await query(`
      SELECT *
      FROM customer_documents
      WHERE id = $1 OR document_number = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [jobSheetId])
    console.log(`[JOB-SHEET-DETAIL] Query completed, found ${jobSheetResult.length} results`)

    if (jobSheetResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet not found'
      }, { status: 404 })
    }

    const jobSheet = jobSheetResult[0]

    // Get customer information if customer_id exists
    let customerInfo = null
    if (jobSheet.customer_id) {
      try {
        const customerResult = await query(`
          SELECT first_name, last_name, phone, email,
                 address_line1, address_line2, city, postcode, country
          FROM customers
          WHERE id = $1
          LIMIT 1
        `, [jobSheet.customer_id])
        if (customerResult.length > 0) {
          customerInfo = customerResult[0]
        }
      } catch (error) {
        console.log('Error fetching customer:', error)
      }
    }

    // Get vehicle information if vehicle_registration exists
    let vehicleInfo = null
    if (jobSheet.vehicle_registration) {
      try {
        const vehicleResult = await query(`
          SELECT
            make, model, derivative, year, color,
            engine_code, euro_status,
            tyre_size_front, tyre_size_rear,
            tyre_pressure_front, tyre_pressure_rear,
            timing_belt_interval
          FROM vehicles
          WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE($1, ' ', ''))
          LIMIT 1
        `, [jobSheet.vehicle_registration])
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
    if (jobSheet.vehicle_registration && (!vehicleInfo || !vehicleInfo.make || !vehicleInfo.model)) {
      try {
        console.log(`🔍 [JOB-SHEET-DETAIL] Enhancing vehicle data for ${jobSheet.vehicle_registration}`)

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

    const formattedJobSheet = {
      id: jobSheet.id.toString(),
      jobNumber: jobSheet.document_number,
      registration: jobSheet.vehicle_registration || '',
      makeModel: makeModel || '',
      customer: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() : '',
      status: jobSheet.status || 'Open',
      date: jobSheet.created_at,
      total: parseFloat(jobSheet.total_gross) || 0,
      customerId: jobSheet.customer_id,
      customerMobile: '',
      customerPhone: customerInfo?.phone || '',
      customerEmail: customerInfo?.email || '',
      description: jobSheet.description || '',
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

    // Update the job sheet in the customer_documents table
    const updateResult = await query(`
      UPDATE customer_documents
      SET
        vehicle_registration = $1,
        description = $2,
        notes = $3,
        status = $4,
        total_gross = $5,
        updated_at = NOW()
      WHERE id = $6 OR document_number = $6
      RETURNING *
    `, [
      body.registration || '',
      body.description || '',
      body.notes || '',
      body.status || 'Open',
      body.totalAmount || 0,
      jobSheetId
    ])

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
      const voidResult = await query(`
        UPDATE customer_documents
        SET
          status = 'VOIDED',
          updated_at = NOW()
        WHERE (id = $1 OR document_number = $1)
        AND document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE')
        RETURNING id, document_number, status
      `, [jobSheetId])

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
        message: `Job sheet ${voidResult[0].document_number} has been voided`,
        jobSheet: voidResult[0]
      })

    } else {
      // Hard delete the job sheet (permanent removal)
      const deleteResult = await query(`
        DELETE FROM customer_documents
        WHERE (id = $1 OR document_number = $1)
        AND document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE')
        RETURNING id, document_number
      `, [jobSheetId])

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
        message: `Job sheet ${deleteResult[0].document_number} has been permanently deleted`,
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
