import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registration: string }> }
) {
  const client = await pool.connect()

  try {
    const { registration: regParam } = await params
    const registration = regParam.toUpperCase()
    console.log(`🔍 Fetching vehicle profile for ${registration}`)
    
    // Get comprehensive vehicle data
    const vehicleQuery = `
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.year,
        v.derivative,
        v.body_style as "bodyStyle",
        v.doors,
        v.transmission,
        v.fuel_type as "fuelType",
        v.color as "colour",
        v.engine_capacity_cc as "engineCapacityCC",
        v.power_bhp as "powerBHP",
        v.torque_nm as "torqueNM",
        v.fuel_economy_combined_mpg as "fuelEconomyCombinedMPG",
        v.co2_emissions as "co2Emissions",
        v.euro_status as "euroStatus",
        v.image_url as "imageUrl",
        v.image_expiry_date as "imageExpiryDate",
        v.technical_specs as "technicalSpecs",
        v.service_data as "serviceData",
        v.factory_options as "factoryOptions",
        v.data_sources as "dataSources",
        v.last_data_update as "lastDataUpdate",
        v.data_completeness_score as "dataCompletenessScore",
        v.mot_expiry_date as "motExpiryDate"
      FROM vehicles v
      WHERE v.registration = $1
    `
    
    const vehicleResult = await client.query(vehicleQuery, [registration])
    
    if (vehicleResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Vehicle not found',
          registration 
        },
        { status: 404 }
      )
    }
    
    const vehicle = vehicleResult.rows[0]
    
    // Get MOT history if available
    let motHistory = []
    try {
      const motQuery = `
        SELECT 
          test_date as "testDate",
          test_result as "testResult",
          expiry_date as "expiryDate",
          odometer_value as "odometerValue",
          odometer_unit as "odometerUnit",
          mot_test_number as "motTestNumber"
        FROM mot_history 
        WHERE registration = $1 
        ORDER BY test_date DESC
      `
      
      const motResult = await client.query(motQuery, [registration])
      motHistory = motResult.rows
    } catch (error) {
      console.log(`⚠️ MOT history not available for ${registration}:`, error)
    }
    
    // Get API cost summary
    const costQuery = `
      SELECT 
        SUM(cost_amount) as total_cost,
        COUNT(*) as total_requests,
        MAX(request_timestamp) as last_request
      FROM api_usage_log 
      WHERE registration = $1
    `
    
    const costResult = await client.query(costQuery, [registration])
    const costData = costResult.rows[0] || {}
    
    // Process and format the data
    const profileData = {
      ...vehicle,
      motHistory,
      totalCost: parseFloat(costData.total_cost || 0),
      totalRequests: parseInt(costData.total_requests || 0),
      lastRequest: costData.last_request,
      
      // Parse JSON fields safely
      technicalSpecs: vehicle.technicalSpecs ? 
        (typeof vehicle.technicalSpecs === 'string' ? 
          JSON.parse(vehicle.technicalSpecs) : vehicle.technicalSpecs) : null,
      serviceData: vehicle.serviceData ? 
        (typeof vehicle.serviceData === 'string' ? 
          JSON.parse(vehicle.serviceData) : vehicle.serviceData) : null,
      factoryOptions: vehicle.factoryOptions ? 
        (typeof vehicle.factoryOptions === 'string' ? 
          JSON.parse(vehicle.factoryOptions) : vehicle.factoryOptions) : null,
      dataSources: vehicle.dataSources ? 
        (typeof vehicle.dataSources === 'string' ? 
          JSON.parse(vehicle.dataSources) : vehicle.dataSources) : []
    }
    
    console.log(`✅ Vehicle profile loaded for ${registration}: ${profileData.dataCompletenessScore}% complete`)
    
    return NextResponse.json({
      success: true,
      vehicle: profileData,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`❌ Error fetching vehicle profile for ${params.registration}:`, error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch vehicle profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

// PUT endpoint to update vehicle profile data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ registration: string }> }
) {
  const client = await pool.connect()

  try {
    const { registration: regParam } = await params
    const registration = regParam.toUpperCase()
    const body = await request.json()
    
    console.log(`🔄 Updating vehicle profile for ${registration}`)
    
    // Build dynamic update query based on provided fields
    const updateFields = []
    const values = []
    let paramCount = 1
    
    // Map of API field names to database column names
    const fieldMapping = {
      make: 'make',
      model: 'model',
      year: 'year',
      derivative: 'derivative',
      bodyStyle: 'body_style',
      doors: 'doors',
      transmission: 'transmission',
      fuelType: 'fuel_type',
      colour: 'color',
      engineCapacityCC: 'engine_capacity_cc',
      powerBHP: 'power_bhp',
      torqueNM: 'torque_nm',
      fuelEconomyCombinedMPG: 'fuel_economy_combined_mpg',
      co2Emissions: 'co2_emissions',
      euroStatus: 'euro_status',
      imageUrl: 'image_url',
      imageExpiryDate: 'image_expiry_date',
      technicalSpecs: 'technical_specs',
      serviceData: 'service_data',
      factoryOptions: 'factory_options',
      dataSources: 'data_sources',
      dataCompletenessScore: 'data_completeness_score',
      motExpiryDate: 'mot_expiry_date'
    }
    
    for (const [apiField, dbField] of Object.entries(fieldMapping)) {
      if (body[apiField] !== undefined) {
        updateFields.push(`${dbField} = $${paramCount + 1}`)
        
        // Handle JSON fields
        if (['technicalSpecs', 'serviceData', 'factoryOptions', 'dataSources'].includes(apiField)) {
          values.push(JSON.stringify(body[apiField]))
        } else {
          values.push(body[apiField])
        }
        paramCount++
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }
    
    // Always update the last_data_update timestamp
    updateFields.push(`last_data_update = NOW()`)
    
    const updateQuery = `
      UPDATE vehicles 
      SET ${updateFields.join(', ')}
      WHERE registration = $1
      RETURNING registration, last_data_update, data_completeness_score
    `
    
    const result = await client.query(updateQuery, [registration, ...values])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }
    
    console.log(`✅ Vehicle profile updated for ${registration}`)
    
    return NextResponse.json({
      success: true,
      vehicle: result.rows[0],
      message: 'Vehicle profile updated successfully'
    })
    
  } catch (error) {
    console.error(`❌ Error updating vehicle profile for ${params.registration}:`, error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update vehicle profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
