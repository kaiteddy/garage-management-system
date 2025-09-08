import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'LN64XFG'

    const endpoints = [
      // Original endpoint
      {
        name: 'Original TechnicalData',
        url: `https://www.haynes.com/webapp/wcs/stores/servlet/TechnicalDataAjaxCmd?storeId=10001&catalogId=10001&langId=-1&vehicleRegistration=${vrm}`
      },
      // Alternative endpoints to try
      {
        name: 'Alternative 1',
        url: `https://www.haynes.com/api/vehicle/${vrm}`
      },
      {
        name: 'Alternative 2', 
        url: `https://www.haynes.com/webapp/wcs/stores/servlet/VehicleDataCmd?vehicleRegistration=${vrm}`
      },
      {
        name: 'Alternative 3',
        url: `https://www.haynespro.com/api/vehicle-data?vrm=${vrm}`
      }
    ]

    const results = []

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing: ${endpoint.name}`)
        
        const response = await fetch(endpoint.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.haynes.com/',
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache'
          },
          timeout: 10000
        })

        const responseText = await response.text()
        const isJson = responseText.trim().startsWith('{') || responseText.trim().startsWith('[')
        const isHtml = responseText.trim().toLowerCase().startsWith('<!doctype') || responseText.trim().toLowerCase().startsWith('<html')

        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          responseLength: responseText.length,
          isJson,
          isHtml,
          preview: responseText.substring(0, 200),
          headers: Object.fromEntries(response.headers.entries())
        })

      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      vrm,
      results,
      analysis: {
        workingEndpoints: results.filter(r => r.status === 200 && r.isJson).length,
        htmlResponses: results.filter(r => r.isHtml).length,
        errorResponses: results.filter(r => r.error).length
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
