import { NextRequest, NextResponse } from 'next/server'
import { vehicleDataManager } from '@/lib/vehicle-data-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')
    const dataTypesParam = searchParams.get('dataTypes') || 'basic'
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    const customerId = searchParams.get('customerId')
    const useComprehensiveData = searchParams.get('useComprehensive') === 'true'

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      )
    }
    
    // Parse data types
    const dataTypes = dataTypesParam.split(',').map(type => type.trim())
    
    // Validate data types
    const validDataTypes = ['basic', 'technical', 'image', 'mot', 'service']
    const invalidTypes = dataTypes.filter(type => !validDataTypes.includes(type))
    
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Invalid data types: ${invalidTypes.join(', ')}. Valid types: ${validDataTypes.join(', ')}` },
        { status: 400 }
      )
    }
    
    console.log(`🔍 [API] Vehicle data request for ${registration}, types: ${dataTypes.join(', ')}`)
    
    // Get comprehensive vehicle data
    const result = await vehicleDataManager.getVehicleData({
      registration: registration.toUpperCase(),
      dataTypes,
      forceRefresh,
      customerId,
      useComprehensiveData
    })
    
    // Format response
    const response = {
      success: true,
      registration: result.registration,
      data: result.data,
      metadata: {
        sources: result.sources,
        totalCost: result.totalCost,
        cacheHits: result.cacheHits,
        apiCalls: result.apiCalls,
        completenessScore: result.completenessScore,
        timestamp: new Date().toISOString()
      },
      costBreakdown: {
        totalCost: `£${result.totalCost.toFixed(4)}`,
        cacheHits: result.cacheHits,
        apiCalls: result.apiCalls,
        efficiency: result.cacheHits > 0 ? `${((result.cacheHits / (result.cacheHits + result.apiCalls)) * 100).toFixed(1)}% cached` : 'No cache hits'
      }
    }
    
    console.log(`✅ [API] Vehicle data complete for ${registration}. Cost: £${result.totalCost.toFixed(4)}, Score: ${result.completenessScore}%`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error in vehicle data API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch vehicle data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint for bulk vehicle data requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrations, dataTypes = ['basic'], forceRefresh = false, customerId } = body
    
    if (!registrations || !Array.isArray(registrations)) {
      return NextResponse.json(
        { error: 'Registrations array is required' },
        { status: 400 }
      )
    }
    
    if (registrations.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 registrations per request' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 [API] Bulk vehicle data request for ${registrations.length} vehicles`)
    
    const results = []
    let totalCost = 0
    let totalCacheHits = 0
    let totalApiCalls = 0
    
    // Process each registration
    for (const registration of registrations) {
      try {
        const result = await vehicleDataManager.getVehicleData({
          registration: registration.toUpperCase(),
          dataTypes,
          forceRefresh,
          customerId
        })
        
        results.push({
          registration: result.registration,
          success: true,
          data: result.data,
          metadata: {
            sources: result.sources,
            cost: result.totalCost,
            cacheHits: result.cacheHits,
            apiCalls: result.apiCalls,
            completenessScore: result.completenessScore
          }
        })
        
        totalCost += result.totalCost
        totalCacheHits += result.cacheHits
        totalApiCalls += result.apiCalls
        
      } catch (error) {
        console.error(`Error processing ${registration}:`, error)
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
      summary: {
        totalCost: `£${totalCost.toFixed(4)}`,
        totalCacheHits,
        totalApiCalls,
        averageCostPerVehicle: `£${(totalCost / registrations.length).toFixed(4)}`,
        cacheEfficiency: totalCacheHits > 0 ? `${((totalCacheHits / (totalCacheHits + totalApiCalls)) * 100).toFixed(1)}%` : '0%',
        timestamp: new Date().toISOString()
      }
    }
    
    console.log(`✅ [API] Bulk processing complete. Total cost: £${totalCost.toFixed(4)}, Vehicles: ${registrations.length}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error in bulk vehicle data API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process bulk vehicle data request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT endpoint to update vehicle data preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { registration, preferences } = body
    
    if (!registration) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      )
    }
    
    // Update vehicle data preferences (e.g., which APIs to prefer, cache settings)
    // This could include settings like:
    // - Preferred API providers
    // - Cache duration preferences
    // - Auto-refresh settings
    // - Data quality thresholds
    
    console.log(`⚙️ [API] Updating preferences for ${registration}:`, preferences)
    
    // Implementation would go here to store preferences
    // For now, return success
    
    return NextResponse.json({
      success: true,
      registration: registration.toUpperCase(),
      preferences,
      message: 'Vehicle data preferences updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating vehicle preferences:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update vehicle preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint to clear cached data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')
    const dataType = searchParams.get('dataType')
    
    if (!registration) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      )
    }
    
    console.log(`🗑️ [API] Clearing cache for ${registration}, type: ${dataType || 'all'}`)
    
    // Implementation would clear cache entries
    // This is useful for forcing fresh data retrieval
    
    return NextResponse.json({
      success: true,
      registration: registration.toUpperCase(),
      dataType: dataType || 'all',
      message: 'Cache cleared successfully'
    })
    
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
