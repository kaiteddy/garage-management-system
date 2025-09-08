import { NextRequest, NextResponse } from 'next/server'
import { VehicleDataManager } from '@/lib/vehicle-data-manager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration: rawRegistration } = await params
    const registration = decodeURIComponent(rawRegistration).toUpperCase()
    
    console.log(`🔍 [CACHE-STATUS] Checking cache status for ${registration}`)
    
    const vdm = new VehicleDataManager()
    
    // Check cache for all data types
    const dataTypes = ['basic', 'technical', 'image', 'mot', 'service']
    const cacheIntegrity = await vdm.verifyCacheIntegrity(registration, dataTypes)
    
    // Get current cached data
    const currentData = await vdm.getVehicleData({
      registration,
      dataTypes,
      forceRefresh: false
    })
    
    const cacheStatus = {
      registration,
      cacheIntegrity,
      totalCacheHits: currentData.cacheHits,
      totalApiCalls: currentData.apiCalls,
      lastRequestCost: currentData.totalCost,
      completenessScore: currentData.completenessScore,
      cachedDataTypes: Object.keys(currentData.data),
      estimatedSavings: currentData.cacheHits * 0.14, // Average API cost
      cacheEfficiency: currentData.cacheHits > 0 ? 
        Math.round((currentData.cacheHits / (currentData.cacheHits + currentData.apiCalls)) * 100) : 0
    }
    
    console.log(`📊 [CACHE-STATUS] Cache efficiency: ${cacheStatus.cacheEfficiency}% for ${registration}`)
    
    return NextResponse.json({
      success: true,
      ...cacheStatus
    })
    
  } catch (error) {
    console.error(`❌ [CACHE-STATUS] Error checking cache status:`, error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while checking cache status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
