import { NextRequest, NextResponse } from 'next/server'
import { VehicleDataManager } from '@/lib/vehicle-data-manager'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration: rawRegistration } = await params
    const registration = decodeURIComponent(rawRegistration).toUpperCase()
    
    console.log(`🔍 [ENHANCE-DATA] Starting comprehensive data enhancement for ${registration}`)
    
    const body = await request.json()
    const { packageType = 'comprehensive', useComprehensiveData = true } = body

    const vdm = new VehicleDataManager()

    // Determine data types based on package selection
    const dataTypes = packageType === 'comprehensive'
      ? ['basic', 'technical', 'image', 'mot', 'service']
      : ['basic', 'technical', 'image']

    // Fetch comprehensive data to eliminate N/A values
    const result = await vdm.getVehicleData({
      registration,
      dataTypes,
      forceRefresh: true,
      useComprehensiveData,
      maxCost: packageType === 'comprehensive' ? 0.50 : 0.20
    })

    // VehicleDataManager always returns a result, check if we got meaningful data
    if (result && result.data && Object.keys(result.data).length > 0) {
      console.log(`✅ [ENHANCE-DATA] Successfully enhanced data for ${registration}`)
      console.log(`💰 [ENHANCE-DATA] Total cost: £${result.totalCost?.toFixed(4) || '0.0000'}`)
      console.log(`📊 [ENHANCE-DATA] Completeness score: ${result.completenessScore}%`)
      console.log(`💾 [ENHANCE-DATA] Cache hits: ${result.cacheHits}, API calls: ${result.apiCalls}`)

      // Verify caching is working for future requests
      const cacheIntegrity = await vdm.verifyCacheIntegrity(registration, dataTypes)
      console.log(`🔍 [ENHANCE-DATA] Cache integrity verified: ${cacheIntegrity}`)

      // Determine which fields were enhanced based on the data returned
      const fieldsEnhanced = []
      if (result.data.technical) {
        const tech = result.data.technical
        if (tech.euroStatus || tech.euro_status) fieldsEnhanced.push('euroStatus')
        if (tech.engineCode || tech.engine_code) fieldsEnhanced.push('engineCode')
        if (tech.tyreSizeFront || tech.tyre_size_front) fieldsEnhanced.push('tyreSizeFront')
        if (tech.tyreSizeRear || tech.tyre_size_rear) fieldsEnhanced.push('tyreSizeRear')
        if (tech.tyrePressureFront || tech.tyre_pressure_front) fieldsEnhanced.push('tyrePressureFront')
        if (tech.tyrePressureRear || tech.tyre_pressure_rear) fieldsEnhanced.push('tyrePressureRear')
        if (tech.timingBeltInterval || tech.timing_belt_interval) fieldsEnhanced.push('timingBeltInterval')
      }

      return NextResponse.json({
        success: true,
        message: `Vehicle data enhanced successfully for ${registration}`,
        data: result.data,
        cost: result.totalCost,
        sources: result.sources,
        completenessScore: result.completenessScore,
        cacheHits: result.cacheHits,
        apiCalls: result.apiCalls,
        fieldsEnhanced,
        packageType
      })
    } else {
      console.log(`⚠️ [ENHANCE-DATA] No data returned for ${registration}`)

      return NextResponse.json({
        success: false,
        error: 'No vehicle data could be retrieved or enhanced',
        registration,
        result: result || null
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error(`❌ [ENHANCE-DATA] Error enhancing data:`, error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while enhancing vehicle data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check current data completeness
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration: rawRegistration } = await params
    const registration = decodeURIComponent(rawRegistration).toUpperCase()
    
    const vdm = new VehicleDataManager()
    const currentData = await vdm.getVehicleData({
      registration,
      dataTypes: ['basic', 'technical'],
      forceRefresh: false
    })

    if (currentData && currentData.data) {
      const data = currentData.data.technical || currentData.data.basic || {}

      // Check which fields are missing (showing as N/A)
      const missingFields = []
      if (!data.euroStatus && !data.euro_status) missingFields.push('euroStatus')
      if (!data.engineCode && !data.engine_code) missingFields.push('engineCode')
      if (!data.tyreSizeFront && !data.tyre_size_front) missingFields.push('tyreSizeFront')
      if (!data.tyreSizeRear && !data.tyre_size_rear) missingFields.push('tyreSizeRear')
      if (!data.tyrePressureFront && !data.tyre_pressure_front) missingFields.push('tyrePressureFront')
      if (!data.tyrePressureRear && !data.tyre_pressure_rear) missingFields.push('tyrePressureRear')
      if (!data.timingBeltInterval && !data.timing_belt_interval) missingFields.push('timingBeltInterval')

      const completenessPercentage = Math.round(((7 - missingFields.length) / 7) * 100)

      return NextResponse.json({
        success: true,
        registration,
        completenessPercentage,
        missingFields,
        enhancementAvailable: missingFields.length > 0,
        estimatedCost: missingFields.length > 0 ? 0.40 : 0,
        currentData: {
          euroStatus: data.euroStatus || data.euro_status || null,
          engineCode: data.engineCode || data.engine_code || null,
          tyreSizeFront: data.tyreSizeFront || data.tyre_size_front || null,
          tyreSizeRear: data.tyreSizeRear || data.tyre_size_rear || null,
          tyrePressureFront: data.tyrePressureFront || data.tyre_pressure_front || null,
          tyrePressureRear: data.tyrePressureRear || data.tyre_pressure_rear || null,
          timingBeltInterval: data.timingBeltInterval || data.timing_belt_interval || null
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Vehicle not found or no data available',
        registration
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error(`❌ [ENHANCE-DATA] Error checking data completeness:`, error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while checking data completeness',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
