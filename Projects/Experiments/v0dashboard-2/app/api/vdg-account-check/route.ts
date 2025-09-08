import { NextRequest, NextResponse } from 'next/server'

const VDG_API_KEY = process.env.VDG_API_KEY
const VDG_BASE_URL = 'https://uk1.ukvehicledata.co.uk/api'

export async function GET(request: NextRequest) {
  console.log(`🔍 [VDG-ACCOUNT] Checking VDG account status and available packages`)
  
  if (!VDG_API_KEY) {
    return NextResponse.json({
      error: 'VDG_API_KEY not configured',
      status: 'error'
    }, { status: 500 })
  }
  
  const results: any = {
    apiKey: VDG_API_KEY ? `${VDG_API_KEY.substring(0, 8)}...` : 'NOT_SET',
    timestamp: new Date().toISOString(),
    tests: {}
  }
  
  try {
    // Test 1: Check account status/info endpoint
    console.log(`🧪 [VDG-ACCOUNT] Test 1: Account status check`)
    try {
      const accountUrl = `${VDG_BASE_URL}/account/info?auth_apikey=${VDG_API_KEY}`
      const accountResponse = await fetch(accountUrl, { method: 'GET' })
      const accountData = await accountResponse.json()
      
      results.tests.accountInfo = {
        url: accountUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
        status: accountResponse.status,
        statusText: accountResponse.statusText,
        data: accountData
      }
      
    } catch (error) {
      results.tests.accountInfo = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Test 2: Check available packages endpoint
    console.log(`🧪 [VDG-ACCOUNT] Test 2: Available packages check`)
    try {
      const packagesUrl = `${VDG_BASE_URL}/packages?auth_apikey=${VDG_API_KEY}`
      const packagesResponse = await fetch(packagesUrl, { method: 'GET' })
      const packagesData = await packagesResponse.json()
      
      results.tests.availablePackages = {
        url: packagesUrl.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
        status: packagesResponse.status,
        statusText: packagesResponse.statusText,
        data: packagesData
      }
      
    } catch (error) {
      results.tests.availablePackages = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Test 3: Try different API endpoints that might exist
    console.log(`🧪 [VDG-ACCOUNT] Test 3: Alternative endpoints`)
    const alternativeEndpoints = [
      '/account',
      '/user',
      '/subscription',
      '/credits',
      '/status'
    ]
    
    for (const endpoint of alternativeEndpoints) {
      try {
        const url = `${VDG_BASE_URL}${endpoint}?auth_apikey=${VDG_API_KEY}`
        const response = await fetch(url, { method: 'GET' })
        const data = await response.json()
        
        results.tests[`alternative_${endpoint.replace('/', '')}`] = {
          url: url.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
          status: response.status,
          statusText: response.statusText,
          data: data
        }
        
        if (response.status === 200) {
          console.log(`✅ [VDG-ACCOUNT] Found working endpoint: ${endpoint}`)
        }
        
      } catch (error) {
        results.tests[`alternative_${endpoint.replace('/', '')}`] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    // Test 4: Try the datapackage endpoint with different parameters
    console.log(`🧪 [VDG-ACCOUNT] Test 4: Datapackage endpoint variations`)
    const packageTests = [
      // Test without specific package
      `${VDG_BASE_URL}/datapackage?auth_apikey=${VDG_API_KEY}`,
      // Test with different version
      `${VDG_BASE_URL}/datapackage?v=1&auth_apikey=${VDG_API_KEY}`,
      // Test with different format
      `${VDG_BASE_URL}/datapackage/info?auth_apikey=${VDG_API_KEY}`,
    ]
    
    for (let i = 0; i < packageTests.length; i++) {
      try {
        const url = packageTests[i]
        const response = await fetch(url, { method: 'GET' })
        const data = await response.json()
        
        results.tests[`package_test_${i + 1}`] = {
          url: url.replace(VDG_API_KEY, 'API_KEY_HIDDEN'),
          status: response.status,
          statusText: response.statusText,
          data: data
        }
        
        if (response.status === 200) {
          console.log(`✅ [VDG-ACCOUNT] Package test ${i + 1} successful`)
        }
        
      } catch (error) {
        results.tests[`package_test_${i + 1}`] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    // Test 5: Check if IP whitelisting is the issue
    console.log(`🧪 [VDG-ACCOUNT] Test 5: IP and authentication check`)
    try {
      // Get our current IP
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()
      
      results.tests.ipCheck = {
        currentIP: ipData.ip,
        note: "This IP may need to be whitelisted in VDG account settings"
      }
      
    } catch (error) {
      results.tests.ipCheck = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Analysis and recommendations
    results.analysis = {
      apiKeyFormat: VDG_API_KEY?.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i) ? 'Valid UUID format' : 'Invalid format',
      authenticationIssue: true,
      possibleCauses: [
        'API key not activated in VDG backend',
        'Required packages not selected in account',
        'IP address not whitelisted',
        'Account subscription inactive',
        'API key expired or regenerated'
      ],
      nextSteps: [
        'Contact VDG support with account details',
        'Request package activation in backend',
        'Verify IP whitelisting requirements',
        'Check account subscription status',
        'Request new API key if needed'
      ]
    }
    
    console.log(`🎯 [VDG-ACCOUNT] Account check complete`)
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error(`❌ [VDG-ACCOUNT] Account check failed:`, error)
    return NextResponse.json({
      error: 'VDG account check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}
