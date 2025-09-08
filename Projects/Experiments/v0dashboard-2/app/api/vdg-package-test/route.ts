import { NextRequest, NextResponse } from 'next/server'

const VDG_API_KEY = process.env.VDG_API_KEY
const VDG_ENDPOINT = 'https://uk.api.vehicledataglobal.com/r2/lookup'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const registration = searchParams.get('registration') || 'LN64XFG'
  
  console.log(`🧪 [VDG-PACKAGE-TEST] Testing all VDG packages for ${registration}`)
  
  if (!VDG_API_KEY) {
    return NextResponse.json({
      error: 'VDG_API_KEY not configured'
    }, { status: 500 })
  }
  
  const packages = [
    'VehicleDetails',
    'VehicleDetailsWithImage', 
    'SpecAndOptionsDetails',
    'MotHistoryDetails',
    'TyreDetails',
    'BatteryDetails'
  ]
  
  const results: any = {
    registration: registration.toUpperCase(),
    timestamp: new Date().toISOString(),
    apiKey: VDG_API_KEY ? `${VDG_API_KEY.substring(0, 8)}...` : 'NOT_SET',
    packageTests: {},
    summary: {
      totalPackages: packages.length,
      enabledPackages: 0,
      disabledPackages: 0,
      errorPackages: 0,
      totalCost: 0
    },
    recommendations: []
  }
  
  for (const packageName of packages) {
    console.log(`📦 [VDG-PACKAGE-TEST] Testing ${packageName}`)
    
    try {
      const url = `${VDG_ENDPOINT}?apiKey=${VDG_API_KEY}&packageName=${packageName}&vrm=${registration}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GarageManager/1.0'
        }
      })
      
      if (!response.ok) {
        results.packageTests[packageName] = {
          status: 'HTTP_ERROR',
          httpStatus: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          enabled: false,
          cost: 0
        }
        results.summary.errorPackages++
        continue
      }
      
      const data = await response.json()
      
      const isSuccess = data.ResponseInformation?.IsSuccessStatusCode
      const statusCode = data.ResponseInformation?.StatusCode
      const statusMessage = data.ResponseInformation?.StatusMessage
      const cost = data.BillingInformation?.TransactionCost || 0
      
      results.packageTests[packageName] = {
        status: isSuccess ? 'ENABLED' : 'DISABLED_OR_ERROR',
        statusCode,
        statusMessage,
        enabled: isSuccess,
        cost: cost,
        hasData: isSuccess && (
          data.Results?.VehicleDetails ||
          data.Results?.ModelDetails ||
          data.Results?.VehicleImageDetails ||
          data.Results?.VehicleMOTTestHistory ||
          data.Results?.TyreDetails ||
          data.Results?.BatteryDetails
        ),
        dataTypes: []
      }
      
      // Analyze what data types are available
      if (data.Results?.VehicleDetails) {
        results.packageTests[packageName].dataTypes.push('VehicleDetails')
      }
      if (data.Results?.ModelDetails) {
        results.packageTests[packageName].dataTypes.push('ModelDetails')
      }
      if (data.Results?.VehicleImageDetails) {
        results.packageTests[packageName].dataTypes.push('VehicleImages')
      }
      if (data.Results?.VehicleMOTTestHistory) {
        results.packageTests[packageName].dataTypes.push('MOTHistory')
      }
      
      if (isSuccess) {
        results.summary.enabledPackages++
        results.summary.totalCost += cost
      } else {
        results.summary.disabledPackages++
      }
      
      console.log(`${isSuccess ? '✅' : '❌'} [VDG-PACKAGE-TEST] ${packageName}: ${statusMessage} (Cost: £${cost})`)
      
    } catch (error) {
      results.packageTests[packageName] = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        enabled: false,
        cost: 0
      }
      results.summary.errorPackages++
      console.error(`❌ [VDG-PACKAGE-TEST] ${packageName} error:`, error)
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Generate recommendations based on results
  const enabled = Object.entries(results.packageTests)
    .filter(([_, test]: [string, any]) => test.enabled)
    .map(([name, _]) => name)
  
  const disabled = Object.entries(results.packageTests)
    .filter(([_, test]: [string, any]) => !test.enabled && test.status !== 'ERROR')
    .map(([name, _]) => name)
  
  // Recommendations
  if (enabled.includes('VehicleDetailsWithImage')) {
    results.recommendations.push('✅ VehicleDetailsWithImage is enabled - Perfect for complete vehicle profiles')
  } else if (disabled.includes('VehicleDetailsWithImage')) {
    results.recommendations.push('⚠️ Enable VehicleDetailsWithImage in your VDG portal for complete vehicle data + images')
  }
  
  if (enabled.includes('VehicleDetails')) {
    results.recommendations.push('✅ VehicleDetails is enabled - Good backup option')
  } else if (disabled.includes('VehicleDetails')) {
    results.recommendations.push('⚠️ Consider enabling VehicleDetails as a budget option')
  }
  
  if (enabled.includes('MotHistoryDetails')) {
    results.recommendations.push('💰 MotHistoryDetails is enabled but you have free MOT API - consider disabling to save costs')
  }
  
  if (enabled.includes('TyreDetails') || enabled.includes('BatteryDetails')) {
    results.recommendations.push('💰 TyreDetails/BatteryDetails enabled - disable unless specifically needed to save costs')
  }
  
  if (results.summary.enabledPackages === 0) {
    results.recommendations.push('🚨 No packages enabled! Visit your VDG portal to enable VehicleDetailsWithImage')
  }
  
  // Cost analysis
  results.costAnalysis = {
    currentSetup: `£${results.summary.totalCost.toFixed(4)} per lookup`,
    recommendedSetup: '£0.1400 per lookup (VehicleDetailsWithImage only)',
    monthlyCost50Vehicles: `£${(results.summary.totalCost * 50).toFixed(2)}`,
    monthlyCost200Vehicles: `£${(results.summary.totalCost * 200).toFixed(2)}`,
    monthlyCost500Vehicles: `£${(results.summary.totalCost * 500).toFixed(2)}`
  }
  
  console.log(`🎯 [VDG-PACKAGE-TEST] Summary: ${results.summary.enabledPackages} enabled, ${results.summary.disabledPackages} disabled, ${results.summary.errorPackages} errors`)
  
  return NextResponse.json(results)
}
