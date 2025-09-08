import { NextRequest, NextResponse } from 'next/server'

const VDG_API_KEY = process.env.VDG_API_KEY
const VDG_BASE_URL = 'https://uk1.ukvehicledata.co.uk/api/datapackage'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const registration = searchParams.get('registration') || 'LN64XFG'
  
  console.log(`🔍 [VDG-DEBUG] Starting comprehensive VDG API test for ${registration}`)
  
  if (!VDG_API_KEY) {
    return NextResponse.json({
      error: 'VDG_API_KEY not configured',
      registration
    }, { status: 500 })
  }
  
  const cleanReg = registration.replace(/\s+/g, '').toUpperCase()
  const results: any = {
    registration: cleanReg,
    apiKey: VDG_API_KEY ? `${VDG_API_KEY.substring(0, 8)}...` : 'NOT_SET',
    baseUrl: VDG_BASE_URL,
    tests: {}
  }
  
  try {
    // Test 1: VehicleDetails package
    console.log(`🧪 [VDG-DEBUG] Test 1: VehicleDetails package`)
    const vehicleDetailsUrl = `${VDG_BASE_URL}/VehicleDetails?v=2&api_nullitems=1&auth_apikey=${VDG_API_KEY}&key_VRM=${cleanReg}`
    
    try {
      const vehicleResponse = await fetch(vehicleDetailsUrl, { method: 'GET' })
      const vehicleData = await vehicleResponse.json()
      
      results.tests.vehicleDetails = {
        url: vehicleDetailsUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
        status: vehicleResponse.status,
        statusText: vehicleResponse.statusText,
        headers: Object.fromEntries(vehicleResponse.headers.entries()),
        data: vehicleData,
        dataKeys: Object.keys(vehicleData || {}),
        statusCode: vehicleData?.StatusCode,
        statusMessage: vehicleData?.StatusMessage,
        hasResults: !!vehicleData?.Results,
        resultsKeys: vehicleData?.Results ? Object.keys(vehicleData.Results) : []
      }
      
      console.log(`✅ [VDG-DEBUG] VehicleDetails response:`, {
        status: vehicleResponse.status,
        statusCode: vehicleData?.StatusCode,
        statusMessage: vehicleData?.StatusMessage,
        hasResults: !!vehicleData?.Results
      })
      
    } catch (error) {
      results.tests.vehicleDetails = {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: vehicleDetailsUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN')
      }
      console.error(`❌ [VDG-DEBUG] VehicleDetails error:`, error)
    }
    
    // Test 2: VehicleDetailsWithImage package
    console.log(`🧪 [VDG-DEBUG] Test 2: VehicleDetailsWithImage package`)
    const imageUrl = `${VDG_BASE_URL}/VehicleDetailsWithImage?v=2&api_nullitems=1&auth_apikey=${VDG_API_KEY}&key_VRM=${cleanReg}`
    
    try {
      const imageResponse = await fetch(imageUrl, { method: 'GET' })
      const imageData = await imageResponse.json()
      
      results.tests.vehicleDetailsWithImage = {
        url: imageUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        headers: Object.fromEntries(imageResponse.headers.entries()),
        data: imageData,
        dataKeys: Object.keys(imageData || {}),
        statusCode: imageData?.StatusCode,
        statusMessage: imageData?.StatusMessage,
        hasResults: !!imageData?.Results,
        hasImageDetails: !!(imageData?.Results?.VehicleImageDetails || imageData?.VehicleImageDetails),
        imageUrl: imageData?.Results?.VehicleImageDetails?.VehicleImageList?.[0]?.ImageUrl || 
                  imageData?.VehicleImageDetails?.VehicleImageList?.[0]?.ImageUrl ||
                  imageData?.Results?.VehicleImageDetails?.ImageUrl ||
                  imageData?.VehicleImageDetails?.ImageUrl
      }
      
      console.log(`✅ [VDG-DEBUG] VehicleDetailsWithImage response:`, {
        status: imageResponse.status,
        statusCode: imageData?.StatusCode,
        statusMessage: imageData?.StatusMessage,
        hasResults: !!imageData?.Results,
        hasImageDetails: !!(imageData?.Results?.VehicleImageDetails || imageData?.VehicleImageDetails)
      })
      
    } catch (error) {
      results.tests.vehicleDetailsWithImage = {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: imageUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN')
      }
      console.error(`❌ [VDG-DEBUG] VehicleDetailsWithImage error:`, error)
    }
    
    // Test 3: SpecAndOptionsDetails package
    console.log(`🧪 [VDG-DEBUG] Test 3: SpecAndOptionsDetails package`)
    const specsUrl = `${VDG_BASE_URL}/SpecAndOptionsDetails?v=2&api_nullitems=1&auth_apikey=${VDG_API_KEY}&key_VRM=${cleanReg}`
    
    try {
      const specsResponse = await fetch(specsUrl, { method: 'GET' })
      const specsData = await specsResponse.json()
      
      results.tests.specAndOptionsDetails = {
        url: specsUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
        status: specsResponse.status,
        statusText: specsResponse.statusText,
        headers: Object.fromEntries(specsResponse.headers.entries()),
        data: specsData,
        dataKeys: Object.keys(specsData || {}),
        statusCode: specsData?.StatusCode,
        statusMessage: specsData?.StatusMessage,
        hasResults: !!specsData?.Results,
        hasSpecifications: !!(specsData?.Results?.VehicleSpecifications || specsData?.VehicleSpecifications)
      }
      
      console.log(`✅ [VDG-DEBUG] SpecAndOptionsDetails response:`, {
        status: specsResponse.status,
        statusCode: specsData?.StatusCode,
        statusMessage: specsData?.StatusMessage,
        hasResults: !!specsData?.Results,
        hasSpecifications: !!(specsData?.Results?.VehicleSpecifications || specsData?.VehicleSpecifications)
      })
      
    } catch (error) {
      results.tests.specAndOptionsDetails = {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: specsUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN')
      }
      console.error(`❌ [VDG-DEBUG] SpecAndOptionsDetails error:`, error)
    }
    
    // Test 4: MotHistoryDetails package
    console.log(`🧪 [VDG-DEBUG] Test 4: MotHistoryDetails package`)
    const motUrl = `${VDG_BASE_URL}/MotHistoryDetails?v=2&api_nullitems=1&auth_apikey=${VDG_API_KEY}&key_VRM=${cleanReg}`
    
    try {
      const motResponse = await fetch(motUrl, { method: 'GET' })
      const motData = await motResponse.json()
      
      results.tests.motHistoryDetails = {
        url: motUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
        status: motResponse.status,
        statusText: motResponse.statusText,
        headers: Object.fromEntries(motResponse.headers.entries()),
        data: motData,
        dataKeys: Object.keys(motData || {}),
        statusCode: motData?.StatusCode,
        statusMessage: motData?.StatusMessage,
        hasResults: !!motData?.Results,
        hasMOTHistory: !!(motData?.Results?.VehicleMOTTestHistory || motData?.VehicleMOTTestHistory)
      }
      
      console.log(`✅ [VDG-DEBUG] MotHistoryDetails response:`, {
        status: motResponse.status,
        statusCode: motData?.StatusCode,
        statusMessage: motData?.StatusMessage,
        hasResults: !!motData?.Results,
        hasMOTHistory: !!(motData?.Results?.VehicleMOTTestHistory || motData?.VehicleMOTTestHistory)
      })
      
    } catch (error) {
      results.tests.motHistoryDetails = {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: motUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN')
      }
      console.error(`❌ [VDG-DEBUG] MotHistoryDetails error:`, error)
    }
    
    // Test 5: Check our current VDG integration
    console.log(`🧪 [VDG-DEBUG] Test 5: Current VDG integration`)
    try {
      const { getVDGVehicleDataWithPackages } = await import('@/lib/vehicle-data-global')
      const integrationResult = await getVDGVehicleDataWithPackages(cleanReg, ['VehicleDetailsWithImage'])
      
      results.tests.currentIntegration = {
        result: integrationResult,
        hasData: !!integrationResult,
        dataKeys: integrationResult ? Object.keys(integrationResult) : [],
        make: integrationResult?.make,
        model: integrationResult?.model,
        year: integrationResult?.year,
        imageUrl: integrationResult?.imageUrl,
        specifications: integrationResult?.specifications?.length || 0
      }
      
      console.log(`✅ [VDG-DEBUG] Current integration result:`, {
        hasData: !!integrationResult,
        make: integrationResult?.make,
        model: integrationResult?.model,
        specifications: integrationResult?.specifications?.length || 0
      })
      
    } catch (error) {
      results.tests.currentIntegration = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.error(`❌ [VDG-DEBUG] Current integration error:`, error)
    }
    
    // Summary analysis
    results.analysis = {
      apiKeyConfigured: !!VDG_API_KEY,
      allTestsCompleted: Object.keys(results.tests).length === 5,
      successfulTests: Object.values(results.tests).filter((test: any) => !test.error).length,
      failedTests: Object.values(results.tests).filter((test: any) => test.error).length,
      recommendations: []
    }
    
    // Add recommendations based on results
    if (!VDG_API_KEY) {
      results.analysis.recommendations.push('Configure VDG_API_KEY environment variable')
    }
    
    const vehicleDetailsTest = results.tests.vehicleDetails
    if (vehicleDetailsTest && vehicleDetailsTest.statusCode !== 0) {
      results.analysis.recommendations.push(`VDG API returned error: ${vehicleDetailsTest.statusMessage} (Code: ${vehicleDetailsTest.statusCode})`)
    }
    
    if (vehicleDetailsTest && !vehicleDetailsTest.hasResults) {
      results.analysis.recommendations.push('VDG API returned no results - vehicle may not be in their database')
    }
    
    console.log(`🎯 [VDG-DEBUG] Analysis complete:`, results.analysis)
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error(`❌ [VDG-DEBUG] Comprehensive test failed:`, error)
    return NextResponse.json({
      error: 'Comprehensive VDG test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      registration: cleanReg,
      results
    }, { status: 500 })
  }
}
