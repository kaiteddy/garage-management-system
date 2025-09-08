import { NextResponse } from 'next/server'

const SWS_API_CONFIG = {
  apiKey: process.env.SWS_API_KEY || "C94A0F3F12E88DB916C008B069E34F65",
  username: process.env.SWS_USERNAME || "your_sws_username",
  password: process.env.SWS_PASSWORD || "your_sws_password",
  technicalDataUrl: "https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php"
}

export async function GET() {
  try {
    console.log('🔍 [SWS-STATUS] Testing SWS API connection...')

    // Test with a simple LUF (Lubricants) request
    const testVRM = "LN64XFG"

    // Create Basic Auth header with username:password
    const authHeader = `Basic ${Buffer.from(`${SWS_API_CONFIG.username}:${SWS_API_CONFIG.password}`).toString('base64')}`
    const url = `${SWS_API_CONFIG.technicalDataUrl}?APIKey=${SWS_API_CONFIG.apiKey}&VRM=${testVRM}&ACTION=LUF`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'GarageManager/1.0',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      cache: 'no-store'
    })

    const responseText = await response.text()
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      apiKey: SWS_API_CONFIG.apiKey.substring(0, 8) + '...',
      username: SWS_API_CONFIG.username,
      testVRM,
      endpoint: url,
      responsePreview: responseText.substring(0, 500),
      headers: Object.fromEntries(response.headers.entries()),
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
