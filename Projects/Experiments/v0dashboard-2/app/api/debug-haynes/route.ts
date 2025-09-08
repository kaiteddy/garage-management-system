import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to see exactly what HaynesPro returns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm')?.toUpperCase()

    if (!vrm) {
      return NextResponse.json({
        success: false,
        error: 'VRM parameter is required'
      }, { status: 400 })
    }

    console.log(`🔍 [DEBUG] Testing HaynesPro API for ${vrm}`)

    // Test the raw TechnicalData API call
    const technicalDataUrl = `https://www.haynes.com/webapp/wcs/stores/servlet/TechnicalDataAjaxCmd?storeId=10001&catalogId=10001&langId=-1&vehicleRegistration=${vrm}`
    
    console.log(`📡 [DEBUG] Calling: ${technicalDataUrl}`)

    const response = await fetch(technicalDataUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.haynes.com/',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    console.log(`📊 [DEBUG] Response status: ${response.status}`)
    console.log(`📊 [DEBUG] Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HaynesPro API returned ${response.status}: ${response.statusText}`,
        debug: {
          url: technicalDataUrl,
          status: response.status,
          statusText: response.statusText
        }
      })
    }

    const rawText = await response.text()
    console.log(`📝 [DEBUG] Raw response length: ${rawText.length}`)
    console.log(`📝 [DEBUG] Raw response preview: ${rawText.substring(0, 500)}...`)

    let jsonData
    try {
      jsonData = JSON.parse(rawText)
      console.log(`✅ [DEBUG] Successfully parsed JSON`)
    } catch (parseError) {
      console.log(`❌ [DEBUG] JSON parse error:`, parseError)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse HaynesPro response as JSON',
        debug: {
          rawResponse: rawText.substring(0, 1000),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      })
    }

    // Check the structure
    console.log(`🔍 [DEBUG] Response structure:`)
    console.log(`- Has '0' key:`, '0' in jsonData)
    console.log(`- Has TechnicalData:`, jsonData?.['0']?.['TechnicalData'] ? 'Yes' : 'No')
    console.log(`- Has modelPictureMimeDataName:`, jsonData?.['0']?.['TechnicalData']?.['modelPictureMimeDataName'] ? 'Yes' : 'No')

    // Extract the image URL using the same logic as your Python code
    let imageUrl = null
    try {
      imageUrl = jsonData?.['0']?.['TechnicalData']?.['modelPictureMimeDataName']?.replace(/\\\//g, '/')
      console.log(`🖼️ [DEBUG] Extracted image URL: ${imageUrl}`)
    } catch (extractError) {
      console.log(`❌ [DEBUG] Error extracting image URL:`, extractError)
    }

    // Test SVGZ download if we have a URL
    let svgzTest = null
    if (imageUrl && imageUrl.includes('.svgz')) {
      try {
        console.log(`📥 [DEBUG] Testing SVGZ download from: ${imageUrl}`)
        
        const svgzResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*'
          }
        })

        console.log(`📊 [DEBUG] SVGZ response status: ${svgzResponse.status}`)
        
        if (svgzResponse.ok) {
          const buffer = await svgzResponse.arrayBuffer()
          console.log(`📊 [DEBUG] SVGZ file size: ${buffer.byteLength} bytes`)
          
          // Check if it's actually gzipped
          const uint8Array = new Uint8Array(buffer)
          const isGzipped = uint8Array.length >= 2 && uint8Array[0] === 0x1f && uint8Array[1] === 0x8b
          console.log(`📊 [DEBUG] Is gzipped: ${isGzipped}`)
          
          if (isGzipped) {
            try {
              const zlib = await import('zlib')
              const compressed = Buffer.from(buffer)
              const decompressed = zlib.gunzipSync(compressed)
              const svgContent = decompressed.toString('utf-8')
              
              console.log(`✅ [DEBUG] Successfully decompressed SVG (${svgContent.length} chars)`)
              console.log(`📝 [DEBUG] SVG preview: ${svgContent.substring(0, 200)}...`)
              
              svgzTest = {
                success: true,
                originalSize: buffer.byteLength,
                decompressedSize: svgContent.length,
                svgPreview: svgContent.substring(0, 500)
              }
            } catch (decompressError) {
              console.log(`❌ [DEBUG] Decompression error:`, decompressError)
              svgzTest = {
                success: false,
                error: decompressError instanceof Error ? decompressError.message : 'Unknown decompression error'
              }
            }
          } else {
            svgzTest = {
              success: false,
              error: 'File is not gzipped'
            }
          }
        } else {
          svgzTest = {
            success: false,
            error: `Failed to download SVGZ: ${svgzResponse.status}`
          }
        }
      } catch (svgzError) {
        console.log(`❌ [DEBUG] SVGZ test error:`, svgzError)
        svgzTest = {
          success: false,
          error: svgzError instanceof Error ? svgzError.message : 'Unknown SVGZ error'
        }
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        vrm,
        apiUrl: technicalDataUrl,
        responseStatus: response.status,
        responseSize: rawText.length,
        hasJsonStructure: {
          hasZeroKey: '0' in jsonData,
          hasTechnicalData: !!jsonData?.['0']?.['TechnicalData'],
          hasImageUrl: !!jsonData?.['0']?.['TechnicalData']?.['modelPictureMimeDataName']
        },
        extractedImageUrl: imageUrl,
        svgzTest,
        fullResponse: jsonData // Include full response for analysis
      }
    })

  } catch (error) {
    console.error('❌ [DEBUG] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
