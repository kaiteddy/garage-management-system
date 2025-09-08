import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Fetching vehicle data summary...')
    
    // Get comprehensive vehicle data summary
    const query = `
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.year,
        COALESCE(v.data_completeness_score, 0) as data_completeness_score,
        v.last_data_update,
        COALESCE(v.data_sources, '[]'::jsonb) as data_sources,
        CASE 
          WHEN v.image_url IS NOT NULL AND (v.image_expiry_date IS NULL OR v.image_expiry_date > NOW()) 
          THEN true 
          ELSE false 
        END as has_valid_image,
        CASE 
          WHEN v.technical_specs IS NOT NULL 
          THEN true 
          ELSE false 
        END as has_technical_specs,
        CASE 
          WHEN v.service_data IS NOT NULL 
          THEN true 
          ELSE false 
        END as has_service_data,
        COALESCE(cost_summary.total_cost, 0) as total_cost,
        COALESCE(cost_summary.last_lookup_cost, 0) as last_lookup_cost
      FROM vehicles v
      LEFT JOIN (
        SELECT 
          registration,
          SUM(cost_amount) as total_cost,
          MAX(cost_amount) as last_lookup_cost
        FROM api_usage_log 
        GROUP BY registration
      ) cost_summary ON v.registration = cost_summary.registration
      ORDER BY v.registration
    `
    
    const result = await client.query(query)
    
    // Process the results
    const vehicles = result.rows.map(row => ({
      registration: row.registration,
      make: row.make,
      model: row.model,
      year: row.year,
      dataCompletenessScore: parseInt(row.data_completeness_score || 0),
      lastDataUpdate: row.last_data_update,
      dataSources: Array.isArray(row.data_sources) ? row.data_sources : [],
      hasValidImage: row.has_valid_image,
      hasTechnicalSpecs: row.has_technical_specs,
      hasServiceData: row.has_service_data,
      totalCost: parseFloat(row.total_cost || 0),
      lastLookupCost: parseFloat(row.last_lookup_cost || 0)
    }))
    
    // Calculate summary statistics
    const totalVehicles = vehicles.length
    const averageCompleteness = totalVehicles > 0 
      ? vehicles.reduce((sum, v) => sum + v.dataCompletenessScore, 0) / totalVehicles 
      : 0
    const totalCost = vehicles.reduce((sum, v) => sum + v.totalCost, 0)
    const vehiclesWithImages = vehicles.filter(v => v.hasValidImage).length
    const vehiclesWithTechnicalSpecs = vehicles.filter(v => v.hasTechnicalSpecs).length
    const vehiclesWithServiceData = vehicles.filter(v => v.hasServiceData).length
    
    // Get data source breakdown
    const sourceBreakdown = vehicles.reduce((acc, vehicle) => {
      vehicle.dataSources.forEach(source => {
        acc[source] = (acc[source] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)
    
    // Get completeness distribution
    const completenessDistribution = {
      high: vehicles.filter(v => v.dataCompletenessScore >= 80).length,
      medium: vehicles.filter(v => v.dataCompletenessScore >= 60 && v.dataCompletenessScore < 80).length,
      low: vehicles.filter(v => v.dataCompletenessScore < 60).length
    }
    
    const response = {
      success: true,
      vehicles,
      summary: {
        totalVehicles,
        averageCompleteness: Math.round(averageCompleteness * 10) / 10,
        totalCost,
        vehiclesWithImages,
        vehiclesWithTechnicalSpecs,
        vehiclesWithServiceData,
        sourceBreakdown,
        completenessDistribution
      },
      timestamp: new Date().toISOString()
    }
    
    console.log(`✅ Vehicle data summary complete: ${totalVehicles} vehicles, avg completeness: ${averageCompleteness.toFixed(1)}%`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error fetching vehicle data summary:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch vehicle data summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

// POST endpoint to bulk update vehicle data
export async function POST(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    const body = await request.json()
    const { registrations, dataTypes = ['basic'], forceRefresh = false } = body
    
    if (!registrations || !Array.isArray(registrations)) {
      return NextResponse.json(
        { error: 'Registrations array is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔄 Bulk updating vehicle data for ${registrations.length} vehicles`)
    
    const results = []
    let totalCost = 0
    
    // Import the vehicle data manager
    const { vehicleDataManager } = await import('@/lib/vehicle-data-manager')
    
    for (const registration of registrations) {
      try {
        const result = await vehicleDataManager.getVehicleData({
          registration: registration.toUpperCase(),
          dataTypes,
          forceRefresh
        })
        
        results.push({
          registration: result.registration,
          success: true,
          completenessScore: result.completenessScore,
          cost: result.totalCost,
          sources: result.sources
        })
        
        totalCost += result.totalCost
        
      } catch (error) {
        console.error(`Error updating ${registration}:`, error)
        results.push({
          registration: registration.toUpperCase(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    const response = {
      success: true,
      processed: registrations.length,
      results,
      totalCost,
      averageCostPerVehicle: totalCost / registrations.length,
      timestamp: new Date().toISOString()
    }
    
    console.log(`✅ Bulk update complete: ${registrations.length} vehicles, total cost: £${totalCost.toFixed(4)}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error in bulk vehicle data update:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to bulk update vehicle data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
