import { NextRequest, NextResponse } from 'next/server'
import zlib from 'zlib'

// Mock SWS response data (simulates what a real API would return)
const mockSWSResponse = {
  "0": {
    "TechnicalData": {
      "id": 12345,
      "fullName": "Ford Focus 1.6 TDCi Titanium 5dr",
      "modelPictureMimeDataName": "https://www.haynespro-assets.com/workshop/images/319002194.svgz",
      "make": "Ford",
      "model": "Focus",
      "year": "2014",
      "engine": "1.6 TDCi"
    }
  }
}

// Utility: Decompress .svgz binary to SVG text (your exact code)
async function decompressSvgzFromUrl(url: string): Promise<string> {
  try {
    console.log(`📥 [SVGZ-TEST] Downloading and decompressing: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download SVGZ: ${response.status}`)
    }

    const compressedSvg = await response.arrayBuffer()
    const svgBuffer = zlib.gunzipSync(Buffer.from(compressedSvg))
    const svgContent = svgBuffer.toString('utf-8')
    
    console.log(`✅ [SVGZ-TEST] Successfully decompressed SVG (${svgContent.length} chars)`)
    return svgContent
  } catch (error) {
    console.error('❌ [SVGZ-TEST] Decompression failed:', error)
    return '' // Fallback if decompression fails
  }
}

// Main Function: Handle response and return SVG (your exact code)
async function getVehicleSvgFromHaynesResponse(responseData: any): Promise<{
  vehicleId: number;
  vehicleName: string;
  svg: string;
} | null> {
  try {
    const data = responseData?.["0"]?.TechnicalData

    if (!data || !data.modelPictureMimeDataName) {
      console.log(`❌ [SVGZ-TEST] Missing TechnicalData fields`)
      return null
    }

    const imageUrl = data.modelPictureMimeDataName
    const vehicleId = data.id || -1
    const vehicleName = data.fullName || 'Unknown Vehicle'

    console.log(`🔍 [SVGZ-TEST] Processing vehicle: ${vehicleName} (ID: ${vehicleId})`)
    console.log(`🖼️ [SVGZ-TEST] Image URL: ${imageUrl}`)

    let svg = ''
    if (imageUrl && imageUrl.endsWith('.svgz')) {
      svg = await decompressSvgzFromUrl(imageUrl)
    }

    if (!svg) {
      console.log(`❌ [SVGZ-TEST] No SVG content extracted`)
      return null
    }

    return {
      vehicleId,
      vehicleName,
      svg,
    }
  } catch (err) {
    console.error('❌ [SVGZ-TEST] Failed to extract or decompress SVG:', err)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('mode') || 'mock'
    const vrm = searchParams.get('vrm') || 'TEST123'

    console.log(`🧪 [SVGZ-TEST] Testing SVGZ extraction in ${testMode} mode for ${vrm}`)

    if (testMode === 'mock') {
      // Test with mock data to prove the extraction logic works
      console.log(`📋 [SVGZ-TEST] Using mock SWS response data`)
      
      const result = await getVehicleSvgFromHaynesResponse(mockSWSResponse)
      
      if (result && result.svg) {
        // Convert SVG to data URL
        const base64Svg = Buffer.from(result.svg).toString('base64')
        const dataUrl = `data:image/svg+xml;base64,${base64Svg}`
        
        return NextResponse.json({
          success: true,
          message: 'SVGZ extraction successful with mock data',
          data: {
            vrm,
            vehicleId: result.vehicleId,
            vehicleName: result.vehicleName,
            imageUrl: dataUrl,
            svgLength: result.svg.length,
            svgPreview: result.svg.substring(0, 200) + '...',
            source: 'Mock HaynesPro SVGZ'
          },
          proof: {
            message: 'This proves the SVGZ extraction code works perfectly',
            originalUrl: mockSWSResponse["0"].TechnicalData.modelPictureMimeDataName,
            extractedSvgSize: result.svg.length,
            isValidSvg: result.svg.includes('<svg'),
            compressionRatio: 'SVGZ files are typically 5-10x smaller than uncompressed SVG'
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to extract SVG from mock data',
          debug: {
            mockDataStructure: Object.keys(mockSWSResponse),
            technicalDataKeys: Object.keys(mockSWSResponse["0"].TechnicalData)
          }
        })
      }
    } else if (testMode === 'direct') {
      // Test direct SVGZ URL decompression
      const svgzUrl = searchParams.get('url') || 'https://www.haynespro-assets.com/workshop/images/319002194.svgz'
      
      console.log(`🔗 [SVGZ-TEST] Testing direct SVGZ decompression from: ${svgzUrl}`)
      
      const svg = await decompressSvgzFromUrl(svgzUrl)
      
      if (svg) {
        const base64Svg = Buffer.from(svg).toString('base64')
        const dataUrl = `data:image/svg+xml;base64,${base64Svg}`
        
        return NextResponse.json({
          success: true,
          message: 'Direct SVGZ decompression successful',
          data: {
            originalUrl: svgzUrl,
            imageUrl: dataUrl,
            svgLength: svg.length,
            svgPreview: svg.substring(0, 200) + '...',
            isValidSvg: svg.includes('<svg'),
            source: 'Direct SVGZ Decompression'
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to decompress SVGZ from URL',
          url: svgzUrl
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid test mode. Use ?mode=mock or ?mode=direct'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ [SVGZ-TEST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, { status: 500 })
  }
}
