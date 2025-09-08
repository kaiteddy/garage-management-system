import { NextResponse } from 'next/server'

const SWS_API_CONFIG = {
  apiKey: process.env.SWS_API_KEY || "C94A0F3F12E88DB916C008B069E34F65",
  username: process.env.SWS_USERNAME || "GarageAssistantGA4",
  password: process.env.SWS_PASSWORD || "HGu76XT5sI1L0XgH816X72F34R991Zd_4g",
  technicalDataUrl: "https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php"
}

export async function GET(request: Request) {
  try {
    console.log('🔍 [SWS-EXPLORE] Testing different API endpoints and formats...')

    const { searchParams } = new URL(request.url)
    const testVRM = (searchParams.get('vrm') || 'LN64XFG').toUpperCase().replace(/\s+/g, '')
    const authHeader = `Basic ${Buffer.from(`${SWS_API_CONFIG.username}:${SWS_API_CONFIG.password}`).toString('base64')}`

    // Test different actions and formats
    const testActions = [
      'LUF', 'LUQ', 'TSB', 'ACG', 'LUB', 'GENARTS', 'REPTIMES',
      'VEHICLE', 'SPECS', 'MAINT', 'DIAG', 'JSON', 'XML', 'DATA'
    ]

    const results: any = {}

    for (const action of testActions) {
      try {
        // Try with different format parameters
        const formats = [
          {},
          { format: 'json' },
          { format: 'xml' },
          { output: 'json' },
          { output: 'xml' },
          { type: 'json' },
          { response: 'json' }
        ]

        for (const [index, formatParams] of formats.entries()) {
          const params = new URLSearchParams({
            APIKey: SWS_API_CONFIG.apiKey,
            VRM: testVRM,
            ACTION: action,
            ...formatParams
          })

          const url = `${SWS_API_CONFIG.technicalDataUrl}?${params}`
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'GarageManager/1.0',
              'Accept': 'application/json, application/xml, text/html',
              'Authorization': authHeader
            },
            cache: 'no-store'
          })

          if (response.ok) {
            const contentType = response.headers.get('content-type') || ''
            const responseText = await response.text()
            
            // Check if it's JSON
            let isJson = false
            let parsedData = null
            
            try {
              parsedData = JSON.parse(responseText)
              isJson = true
            } catch (e) {
              // Not JSON
            }

            const key = `${action}_format${index}`
            results[key] = {
              action,
              formatParams,
              contentType,
              isJson,
              isHtml: responseText.includes('<html>'),
              responseLength: responseText.length,
              responsePreview: responseText.substring(0, 200),
              parsedData: isJson ? parsedData : null
            }

            // If we found JSON data, log it
            if (isJson) {
              console.log(`✅ [SWS-EXPLORE] Found JSON data for ${action} with format:`, formatParams)
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      } catch (error) {
        console.error(`❌ [SWS-EXPLORE] Error testing ${action}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      testVRM,
      results,
      summary: {
        totalTests: Object.keys(results).length,
        jsonResponses: Object.values(results).filter((r: any) => r.isJson).length,
        htmlResponses: Object.values(results).filter((r: any) => r.isHtml).length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
