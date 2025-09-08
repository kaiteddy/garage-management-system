import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'LS06YLW'
    const apiKey = 'C94A0F3F12E88DB916C008B069E34F65'

    const testFormats = [
      {
        name: 'Format 1: GET with query params (your example)',
        method: 'GET',
        url: 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php',
        params: {
          'APIKey': apiKey,
          'ACTION': 'GET_INITIAL_SUBJECTS',
          'VRM': vrm,
          'REPID': '',
          'NODEID': '',
          'query': ''
        }
      },
      {
        name: 'Format 2: POST with form data (Python style)',
        method: 'POST',
        url: 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php',
        formData: {
          'apikey': apiKey,
          'action': 'summary',
          'vrm': vrm
        }
      },
      {
        name: 'Format 3: POST with URLSearchParams',
        method: 'POST',
        url: 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php',
        urlParams: {
          'APIKey': apiKey,
          'ACTION': 'GET_INITIAL_SUBJECTS',
          'VRM': vrm
        }
      },
      {
        name: 'Format 4: Different action',
        method: 'GET',
        url: 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php',
        params: {
          'APIKey': apiKey,
          'ACTION': 'TECHNICALDATA',
          'VRM': vrm
        }
      }
    ]

    const results = []

    for (const format of testFormats) {
      try {
        console.log(`🔍 Testing: ${format.name}`)
        
        let response
        
        if (format.method === 'GET' && format.params) {
          const params = new URLSearchParams(format.params)
          const url = `${format.url}?${params.toString()}`
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache'
            }
          })
        } else if (format.method === 'POST' && format.formData) {
          const formData = new FormData()
          Object.entries(format.formData).forEach(([key, value]) => {
            formData.append(key, value)
          })
          response = await fetch(format.url, {
            method: 'POST',
            body: formData,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })
        } else if (format.method === 'POST' && format.urlParams) {
          const params = new URLSearchParams(format.urlParams)
          response = await fetch(format.url, {
            method: 'POST',
            body: params,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })
        }

        const responseText = await response.text()
        const isJson = responseText.trim().startsWith('{') || responseText.trim().startsWith('[')
        const isHtml = responseText.trim().toLowerCase().includes('<!doctype') || responseText.trim().toLowerCase().includes('<html')
        
        let parsedData = null
        if (isJson) {
          try {
            parsedData = JSON.parse(responseText)
          } catch (e) {
            // Ignore parse errors
          }
        }

        results.push({
          format: format.name,
          method: format.method,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          responseLength: responseText.length,
          isJson,
          isHtml,
          hasValidStructure: !!(parsedData?.['0']?.['TechnicalData']),
          preview: responseText.substring(0, 300),
          headers: Object.fromEntries(response.headers.entries())
        })

      } catch (error) {
        results.push({
          format: format.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Also test a simple direct curl equivalent
    try {
      console.log('🔍 Testing direct curl equivalent')
      const curlUrl = `https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php?APIKey=${apiKey}&ACTION=GET_INITIAL_SUBJECTS&VRM=${vrm}&REPID=&NODEID=&query=`
      
      const curlResponse = await fetch(curlUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'curl/7.68.0',
          'Accept': '*/*'
        }
      })

      const curlText = await curlResponse.text()
      
      results.push({
        format: 'Direct curl equivalent',
        method: 'GET',
        status: curlResponse.status,
        statusText: curlResponse.statusText,
        responseLength: curlText.length,
        isJson: curlText.trim().startsWith('{'),
        preview: curlText.substring(0, 300),
        fullUrl: curlUrl
      })
    } catch (curlError) {
      results.push({
        format: 'Direct curl equivalent',
        error: curlError instanceof Error ? curlError.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      success: true,
      vrm,
      apiKey: apiKey.substring(0, 8) + '...',
      results,
      analysis: {
        totalTests: results.length,
        successfulResponses: results.filter(r => r.status === 200).length,
        jsonResponses: results.filter(r => r.isJson).length,
        htmlResponses: results.filter(r => r.isHtml).length,
        validStructures: results.filter(r => r.hasValidStructure).length
      },
      recommendations: [
        "Check if the API key needs to be activated or registered",
        "Verify if there are IP restrictions on the API",
        "Confirm the correct API endpoint and parameters",
        "Check if additional authentication headers are required"
      ]
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
