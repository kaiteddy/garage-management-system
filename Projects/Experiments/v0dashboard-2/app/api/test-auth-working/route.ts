import { NextRequest, NextResponse } from 'next/server'
import zlib from 'zlib'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'BJ11XWZ'
    const apiKey = 'C94A0F3F12E88DB916C008B069E34F65'
    const basicAuth = "R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc="

    console.log(`🔐 [AUTH-TEST] Testing SWS API with Basic Authentication for ${vrm}`)

    // Test the complete authentication flow
    const response = await fetch('https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
        'User-Agent': 'GarageManagerPro/1.0',
      },
      body: new URLSearchParams({
        apikey: apiKey,
        action: 'TSB',
        vrm: vrm
      }).toString()
    })

    const responseText = await response.text()
    console.log(`📊 [AUTH-TEST] HTTP Status: ${response.status}`)
    console.log(`📄 [AUTH-TEST] Response: ${responseText}`)

    // Parse the response
    let jsonData
    try {
      jsonData = JSON.parse(responseText)
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse SWS response',
        debug: {
          httpStatus: response.status,
          responseText: responseText.substring(0, 500)
        }
      })
    }

    // Check for API-level errors
    const responseData = jsonData?.["0"]
    if (responseData?.reply === "Error") {
      return NextResponse.json({
        success: false,
        error: 'SWS API Key Error',
        details: {
          httpStatus: response.status,
          apiError: responseData.code,
          message: 'Basic Authentication worked, but API key is invalid',
          authenticationStatus: 'Basic Auth: ✅ Working',
          apiKeyStatus: '❌ Invalid or needs activation'
        },
        progress: {
          step1_httpAuth: '✅ HTTP Basic Authentication successful',
          step2_apiKey: '❌ API Key validation failed',
          step3_vehicleData: '⏸️ Cannot proceed without valid API key',
          step4_imageExtraction: '⏸️ Waiting for valid API key'
        },
        recommendations: [
          '✅ Basic Authentication is working correctly',
          '❌ API Key needs to be activated or replaced',
          '📞 Contact SWS Solutions to activate the API key',
          '🔑 Request a valid API key for vehicle data access',
          '🚀 System is ready to work once API key is valid'
        ]
      })
    }

    // Check for vehicle technical data
    const technicalData = responseData?.TechnicalData
    if (technicalData) {
      const imageUrl = technicalData.modelPictureMimeDataName
      
      return NextResponse.json({
        success: true,
        message: '🎉 Complete SWS API success!',
        data: {
          vrm,
          vehicleFound: true,
          hasImageUrl: !!imageUrl,
          imageUrl: imageUrl || null,
          isValidSvgz: imageUrl?.endsWith('.svgz') || false,
          vehicleDetails: {
            id: technicalData.id,
            fullName: technicalData.fullName,
            make: technicalData.make,
            model: technicalData.model
          }
        },
        authenticationFlow: {
          step1_httpAuth: '✅ HTTP Basic Authentication successful',
          step2_apiKey: '✅ API Key validation successful',
          step3_vehicleData: '✅ Vehicle data retrieved',
          step4_imageExtraction: imageUrl ? '✅ Ready for SVGZ extraction' : '⚠️ No image available'
        },
        nextSteps: imageUrl ? [
          '✅ Authentication complete',
          '✅ Vehicle data retrieved',
          '✅ SVGZ image URL found',
          '🚀 Ready to download and decompress SVGZ'
        ] : [
          '✅ Authentication complete',
          '✅ Vehicle data retrieved',
          '❌ No SVGZ image available for this vehicle',
          'ℹ️ Try a different VRM that has image data'
        ]
      })
    }

    // Unknown response structure
    return NextResponse.json({
      success: false,
      error: 'Unexpected response structure',
      debug: {
        httpStatus: response.status,
        responseStructure: Object.keys(jsonData || {}),
        fullResponse: jsonData
      }
    })

  } catch (error) {
    console.error('❌ [AUTH-TEST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, { status: 500 })
  }
}

// Test with a known vehicle that should have image data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const testVrms = body.vrms || ['BJ11XWZ', 'LS06YLW', 'LN64XFG', 'AB12CDE']

    console.log(`🧪 [AUTH-TEST-BULK] Testing multiple VRMs for image availability`)

    const results = []
    const apiKey = 'C94A0F3F12E88DB916C008B069E34F65'
    const basicAuth = "R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc="

    for (const vrm of testVrms.slice(0, 5)) { // Limit to 5 VRMs
      try {
        const response = await fetch('https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
            'User-Agent': 'GarageManagerPro/1.0',
          },
          body: new URLSearchParams({
            apikey: apiKey,
            action: 'TSB',
            vrm: vrm
          }).toString()
        })

        const responseText = await response.text()
        const jsonData = JSON.parse(responseText)
        const responseData = jsonData?.["0"]

        if (responseData?.reply === "Error") {
          results.push({
            vrm,
            status: 'API Key Error',
            error: responseData.code,
            hasImage: false
          })
        } else if (responseData?.TechnicalData) {
          const imageUrl = responseData.TechnicalData.modelPictureMimeDataName
          results.push({
            vrm,
            status: 'Success',
            hasImage: !!imageUrl,
            imageUrl: imageUrl || null,
            vehicleName: responseData.TechnicalData.fullName || 'Unknown'
          })
        } else {
          results.push({
            vrm,
            status: 'No Data',
            hasImage: false
          })
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.push({
          vrm,
          status: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error',
          hasImage: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bulk VRM test completed',
      results,
      summary: {
        total: results.length,
        withImages: results.filter(r => r.hasImage).length,
        apiKeyErrors: results.filter(r => r.status === 'API Key Error').length,
        successful: results.filter(r => r.status === 'Success').length
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
