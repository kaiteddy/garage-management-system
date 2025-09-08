import { NextRequest, NextResponse } from 'next/server'

// SWS API configuration (same as working API)
const SWS_API_CONFIG = {
  apiKey: process.env.SWS_API_KEY || "C94A0F3F12E88DB916C008B069E34F65",
  username: process.env.SWS_USERNAME!,
  password: process.env.SWS_PASSWORD!,
  technicalDataUrl: "https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'LN64XFG'
    
    console.log(`🔍 [DEBUG-RAW] Testing raw TechnicalData API for ${vrm}`)
    
    // Try working action types first, then experimental ones
    const actionsToTry = [
      // Known working actions from our existing API
      'LUF',           // Lubricants (working)
      'TSB',           // Technical Service Bulletins (working)
      'ACG',           // Air conditioning (working)
      'GENARTS',       // Parts (working)
      'REPTIMES',      // Repair times (working)
      // Experimental actions that might have TechnicalData structure
      'TECHNICALDATA',
      'VEHICLE',
      'VEHICLEDATA',
      'SPECS',
      'BASIC',
      'INFO',
      'DATA',
      'IMAGES',
      'PICTURE',
      'MODEL'
    ]
    
    const results: any = {}
    
    for (const action of actionsToTry) {
      try {
        console.log(`📡 [DEBUG-RAW] Trying action: ${action}`)
        
        const formData = new URLSearchParams({
          'CallRequestKey': SWS_API_CONFIG.apiKey,
          'Username': SWS_API_CONFIG.username,
          'Password': SWS_API_CONFIG.password,
          'VRM': vrm,
          'Action': action
        })
        
        const response = await fetch(SWS_API_CONFIG.technicalDataUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'GarageAssistant/1.0'
          },
          body: formData.toString(),
          cache: 'no-store'
        })
        
        const responseText = await response.text()
        
        if (response.ok) {
          try {
            const data = JSON.parse(responseText)
            
            // Check for the specific TechnicalData structure
            const hasZeroKey = '0' in data
            const hasTechnicalData = data?.['0']?.['TechnicalData']
            const hasModelPicture = data?.['0']?.['TechnicalData']?.['modelPictureMimeDataName']
            
            results[action] = {
              success: true,
              isJson: true,
              hasZeroKey,
              hasTechnicalData,
              hasModelPicture,
              modelPictureValue: hasModelPicture ? data['0']['TechnicalData']['modelPictureMimeDataName'] : null,
              dataKeys: Object.keys(data),
              firstLevelStructure: hasZeroKey ? Object.keys(data['0']) : null,
              technicalDataKeys: hasTechnicalData ? Object.keys(data['0']['TechnicalData']) : null,
              responseLength: responseText.length
            }
            
            console.log(`✅ [DEBUG-RAW] ${action}: JSON response, hasModelPicture: ${hasModelPicture}`)
            
          } catch (parseError) {
            // Not JSON, check if it's HTML with useful content
            const containsHaynesPro = responseText.includes('haynespro')
            const containsWorkshop = responseText.includes('workshop')
            const containsSvgz = responseText.includes('.svgz')
            
            results[action] = {
              success: true,
              isJson: false,
              isHtml: responseText.includes('<html') || responseText.includes('<form'),
              containsHaynesPro,
              containsWorkshop,
              containsSvgz,
              responseLength: responseText.length,
              preview: responseText.substring(0, 200)
            }
            
            console.log(`📄 [DEBUG-RAW] ${action}: HTML/text response, length: ${responseText.length}`)
          }
        } else {
          results[action] = {
            success: false,
            status: response.status,
            error: responseText.substring(0, 200)
          }
          console.log(`❌ [DEBUG-RAW] ${action}: Failed with status ${response.status}`)
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        results[action] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        console.error(`❌ [DEBUG-RAW] ${action}: Error -`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      vrm,
      actionsTestedCount: actionsToTry.length,
      results,
      summary: {
        jsonResponses: Object.values(results).filter((r: any) => r.isJson).length,
        htmlResponses: Object.values(results).filter((r: any) => !r.isJson && r.success).length,
        errors: Object.values(results).filter((r: any) => !r.success).length,
        foundModelPicture: Object.values(results).some((r: any) => r.hasModelPicture)
      }
    })
    
  } catch (error) {
    console.error('❌ [DEBUG-RAW] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
