import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// SWS Solutions API Configuration
const SWS_API_CONFIG = {
  apiKey: process.env.SWS_API_KEY || "C94A0F3F12E88DB916C008B069E34F65",
  username: process.env.SWS_USERNAME!,
  password: process.env.SWS_PASSWORD!,
  technicalDataUrl: "https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php"
}

interface SWSTechnicalResponse {
  [key: string]: any
}

interface ComprehensiveVehicleData {
  vrm: string
  tsb?: any           // Technical Service Bulletins
  lubricants?: any    // Lubricants (LUF)
  aircon?: any        // Air conditioning (AIRCON)
  repairTimes?: any   // Repair Times (RPT)
  drawings?: any      // Technical drawings (DRAWINGS)
  torque?: any        // Torque values (TORQUE)
  parts?: any         // Generic article codes (GENART)
  procedures?: any    // Service procedures (PROCEDURE)
  maintenance?: any   // Maintenance schedule (MAINTENANCE)
  images?: any        // Visual references (IMAGES)
}

// Function to extract SVG references from HTML content
function extractSvgReferences(htmlContent: string): string[] {
  const svgRefs: string[] = []

  // Patterns to find SVG references
  const patterns = [
    /\.svgz?["'\s]/g,
    /images?\/[^"'\s]+\.svgz?/g,
    /haynespro-assets\.com[^"'\s]*\.svgz?/g,
    /workshop\/images\/[^"'\s]*\.svgz?/g,
    /src=["']([^"']*\.svgz?)["']/g,
    /href=["']([^"']*\.svgz?)["']/g,
    /url\(["']?([^"'\)]*\.svgz?)["']?\)/g,
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(htmlContent)) !== null) {
      const ref = match[1] || match[0]
      if (ref && ref.includes('.svg')) {
        svgRefs.push(ref.trim().replace(/["'\s]/g, ''))
      }
    }
  })

  return [...new Set(svgRefs)] // Remove duplicates
}

// Get comprehensive technical data for a VRM using all available actions
async function getComprehensiveTechnicalData(vrm: string): Promise<ComprehensiveVehicleData> {
  // Try different API approaches to get structured data
  const actions = [
    { key: 'lubricants', action: 'LUF' },            // Lubricants (engine, transmission, etc.)
    { key: 'lubricantSpecs', action: 'LUQ' },        // Lubricant specifications
    { key: 'tsb', action: 'TSB' },                   // Technical Service Bulletins
    { key: 'aircon', action: 'ACG' },                // Air conditioning gas info
    { key: 'lubricantsAlt', action: 'LUB' },         // Alternative lubricants
    { key: 'parts', action: 'GENARTS' },             // Generic article codes (parts info)
    { key: 'repairTimes', action: 'REPTIMES' }       // Repair Times
  ]

  // Also try alternative endpoints that might return JSON
  const jsonActions = [
    { key: 'vehicleData', action: 'VEHICLE' },       // Basic vehicle data
    { key: 'specifications', action: 'SPECS' },      // Vehicle specifications
    { key: 'maintenance', action: 'MAINT' },         // Maintenance data
    { key: 'diagnostics', action: 'DIAG' }           // Diagnostic information
  ]

  const result: ComprehensiveVehicleData = { vrm }
  const allSvgRefs: string[] = []

  // Try all actions (both HTML forms and potential JSON endpoints)
  const allActions = [...actions, ...jsonActions]

  for (const { key, action } of allActions) {
    try {
      console.log(`📡 [SWS-API] Fetching ${action} data for ${vrm} using working format`)

      // Use the working SWS API format from test-working-sws-final
      const endpoint = 'https://www.sws-solutions.co.uk/API-V4/VRM_Lookup.php'
      const authHeader = 'Basic R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc='

      const body = new URLSearchParams({
        ACTION: action,
        VRM: vrm,
        APIKEY: "C94A0F3F12E88DB916C008B069E34F65"
      })

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
          'User-Agent': 'GarageManagerPro/1.0'
        },
        body: body,
        cache: 'no-store'
      })

      const responseText = await response.text()

      if (response.ok) {
        try {
          const data = JSON.parse(responseText)
          if (data && Object.keys(data).length > 0) {
            result[key as keyof ComprehensiveVehicleData] = data
            console.log(`✅ [SWS-API] Got ${action} data for ${vrm}`)
          } else {
            console.log(`📭 [SWS-API] Empty ${action} data for ${vrm}`)
          }
        } catch (parseError) {
          // If JSON parsing fails, store raw text
          if (responseText.trim()) {
            // Extract SVG references from this response
            const svgRefs = extractSvgReferences(responseText)
            allSvgRefs.push(...svgRefs)

            result[key as keyof ComprehensiveVehicleData] = {
              raw: responseText,
              svgReferences: svgRefs
            }
            console.log(`✅ [SWS-API] Got ${action} raw data for ${vrm} (${svgRefs.length} SVG refs)`)
          } else {
            console.log(`📭 [SWS-API] Empty ${action} response for ${vrm}`)
          }
        }
      } else {
        console.warn(`⚠️ [SWS-API] Failed to get ${action} data: ${response.status} - ${responseText.substring(0, 200)}`)

        // Store error info for debugging
        result[key as keyof ComprehensiveVehicleData] = {
          error: true,
          status: response.status,
          message: responseText.substring(0, 500)
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`❌ [SWS-API] Error fetching ${action}:`, error)
    }
  }

  // Add all found SVG references to the result
  if (allSvgRefs.length > 0) {
    result.svgDiagrams = [...new Set(allSvgRefs)] // Remove duplicates
    console.log(`🎨 [SWS-API] Found ${result.svgDiagrams.length} unique SVG references`)
  }

  return result
}

// Save comprehensive technical data to database
async function saveComprehensiveTechnicalDataToDB(
  vrm: string,
  comprehensiveData: ComprehensiveVehicleData
) {
  try {
    // First, ensure the vehicles table has the necessary columns
    await sql`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS comprehensive_technical_data JSONB,
      ADD COLUMN IF NOT EXISTS sws_last_updated TIMESTAMP DEFAULT NOW()
    `

    // Insert or update the comprehensive technical data
    await sql`
      INSERT INTO vehicles (
        registration, comprehensive_technical_data, sws_last_updated, updated_at
      ) VALUES (
        ${vrm}, ${JSON.stringify(comprehensiveData)}, NOW(), NOW()
      )
      ON CONFLICT (registration)
      DO UPDATE SET
        comprehensive_technical_data = EXCLUDED.comprehensive_technical_data,
        sws_last_updated = NOW(),
        updated_at = NOW()
    `

    console.log(`✅ [SWS-API] Comprehensive technical data saved for ${vrm}`)
  } catch (error) {
    console.error(`❌ [SWS-API] Database save error for ${vrm}:`, error)
    throw error
  }
}

// GET endpoint - retrieve cached technical data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm')?.toUpperCase().replace(/\s/g, '')

    if (!vrm) {
      return NextResponse.json(
        { success: false, error: "VRM parameter is required" },
        { status: 400 }
      )
    }

    console.log(`🔍 [SWS-API] Retrieving cached technical data for ${vrm}`)

    // Check for cached data (permanent storage - technical specs don't change)
    const cachedData = await sql`
      SELECT
        registration, comprehensive_technical_data, sws_last_updated
      FROM vehicles
      WHERE registration = ${vrm}
      AND comprehensive_technical_data IS NOT NULL
    `

    if (cachedData.length > 0) {
      const vehicle = cachedData[0]
      console.log(`💾 [SWS-API] Using cached data for ${vrm}`)

      return NextResponse.json({
        success: true,
        data: vehicle.comprehensive_technical_data,
        cached: true,
        lastUpdated: vehicle.sws_last_updated
      })
    }

    return NextResponse.json(
      { success: false, error: "No technical data found. Use POST to fetch and permanently store data." },
      { status: 404 }
    )

  } catch (error) {
    console.error('❌ [SWS-API] GET Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve technical data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - fetch fresh technical data from SWS API
export async function POST(request: NextRequest) {
  try {
    const { vrm } = await request.json()

    if (!vrm) {
      return NextResponse.json(
        { success: false, error: "VRM is required" },
        { status: 400 }
      )
    }

    const cleanVRM = vrm.toUpperCase().replace(/\s/g, '')
    console.log(`🔍 [SWS-API] Fetching fresh technical data for ${cleanVRM}`)

    // Try to get comprehensive technical data from SWS API
    console.log(`📡 [SWS-API] Fetching comprehensive technical data for ${cleanVRM}`)
    const comprehensiveData = await getComprehensiveTechnicalData(cleanVRM)

    // Check if we got any data
    const hasData = Object.keys(comprehensiveData).some(key =>
      key !== 'vrm' && comprehensiveData[key as keyof ComprehensiveVehicleData] &&
      Object.keys(comprehensiveData[key as keyof ComprehensiveVehicleData] || {}).length > 0
    )

    if (!hasData) {
      return NextResponse.json({
        success: false,
        error: "No technical data available",
        details: "SWS API returned no data for this VRM. This could be due to: invalid API key, VRM not found in database, or API access restrictions.",
        vrm: cleanVRM
      }, { status: 404 })
    }

    // Save to database
    console.log(`💾 [SWS-API] Saving comprehensive data to database...`)
    await saveComprehensiveTechnicalDataToDB(cleanVRM, comprehensiveData)

    return NextResponse.json({
      success: true,
      data: comprehensiveData,
      cached: false,
      message: "Comprehensive technical data retrieved and permanently stored"
    })

  } catch (error) {
    console.error('❌ [SWS-API] POST Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch technical data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
