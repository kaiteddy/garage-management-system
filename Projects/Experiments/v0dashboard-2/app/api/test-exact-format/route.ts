import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'BJ11XWZ'
    const apiKey = 'C94A0F3F12E88DB916C008B069E34F65'

    console.log(`🧪 [EXACT-FORMAT] Testing exact format from your working example for ${vrm}`)

    // Use Basic Authentication with your encoded credentials
    const basicAuth = "R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc="

    const response = await fetch('https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'X-Api-Key': apiKey,
        'User-Agent': 'GarageManagerPro/1.0',
      },
      body: JSON.stringify({
        apikey: apiKey,
        action: 'TSB',
        vrm: vrm
      })
    })

    const responseText = await response.text()
    console.log(`📊 [EXACT-FORMAT] Response status: ${response.status}`)
    console.log(`📄 [EXACT-FORMAT] Response length: ${responseText.length}`)
    console.log(`📄 [EXACT-FORMAT] Response preview: ${responseText.substring(0, 200)}`)

    // Check for 401 or valid data
    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'API Key Authentication Failed',
        details: {
          status: response.status,
          message: 'The API key may need activation, registration, or has expired',
          apiKey: apiKey.substring(0, 8) + '...',
          responsePreview: responseText.substring(0, 300)
        },
        recommendations: [
          '1. Contact SWS Solutions to verify API key status',
          '2. Check if the API key needs activation or registration',
          '3. Verify if there are IP restrictions on the API',
          '4. Confirm the API key has not expired',
          '5. Check if additional authentication headers are required'
        ]
      })
    }

    // Try to parse as JSON
    let jsonData
    try {
      jsonData = JSON.parse(responseText)
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse response as JSON',
        details: {
          status: response.status,
          responsePreview: responseText.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      })
    }

    // Check for vehicle data structure
    const carData = jsonData?.["0"]?.TechnicalData
    const imageUrl = carData?.modelPictureMimeDataName

    if (carData) {
      return NextResponse.json({
        success: true,
        message: '🎉 SWS API call successful!',
        data: {
          vrm,
          vehicleFound: true,
          hasImageUrl: !!imageUrl,
          imageUrl: imageUrl || null,
          isValidSvgz: imageUrl?.endsWith('.svgz') || false,
          technicalDataKeys: Object.keys(carData),
          fullVehicleData: carData
        },
        nextSteps: imageUrl ? [
          '✅ Vehicle found in SWS database',
          '✅ Image URL available',
          '🚀 Ready to download and decompress SVGZ'
        ] : [
          '✅ Vehicle found in SWS database',
          '❌ No image URL available for this vehicle',
          'ℹ️ Vehicle exists but no SVGZ image in database'
        ]
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No vehicle data found',
        details: {
          vrm,
          responseStructure: Object.keys(jsonData || {}),
          fullResponse: jsonData
        }
      })
    }

  } catch (error) {
    console.error('❌ [EXACT-FORMAT] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, { status: 500 })
  }
}

// Also create a POST endpoint to test different request methods
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vrm = 'BJ11XWZ', apiKey = 'C94A0F3F12E88DB916C008B069E34F65' } = body

    console.log(`🧪 [EXACT-FORMAT-POST] Testing POST format for ${vrm}`)

    // Test multiple request formats
    const testFormats = [
      {
        name: 'JSON Body',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'User-Agent': 'GarageManagerPro/1.0'
        },
        body: JSON.stringify({
          apikey: apiKey,
          action: 'TSB',
          vrm: vrm
        })
      },
      {
        name: 'Form Data',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GarageManagerPro/1.0'
        },
        body: new URLSearchParams({
          apikey: apiKey,
          action: 'TSB',
          vrm: vrm
        }).toString()
      }
    ]

    const results = []

    for (const format of testFormats) {
      try {
        const response = await fetch('https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php', {
          method: 'POST',
          headers: format.headers,
          body: format.body
        })

        const responseText = await response.text()
        
        results.push({
          format: format.name,
          status: response.status,
          statusText: response.statusText,
          responseLength: responseText.length,
          isJson: responseText.trim().startsWith('{'),
          preview: responseText.substring(0, 200)
        })
      } catch (error) {
        results.push({
          format: format.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tested multiple request formats',
      vrm,
      results,
      analysis: {
        successfulFormats: results.filter(r => r.status === 200).length,
        jsonResponses: results.filter(r => r.isJson).length,
        authErrors: results.filter(r => r.status === 401).length
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
