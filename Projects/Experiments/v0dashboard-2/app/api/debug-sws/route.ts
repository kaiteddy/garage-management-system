import { NextRequest, NextResponse } from 'next/server'

const SWS_CONFIG = {
  apiKey: process.env.SWS_API_KEY || "C94A0F3F12E88DB916C008B069E34F65",
  username: process.env.SWS_USERNAME || "GarageAssistantGA4", 
  password: process.env.SWS_PASSWORD || "HGu76XT5sI1L0XgH816X72F34R991Zd_4g",
  baseUrl: "https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = (searchParams.get('vrm') || 'NH19VPP').toUpperCase().replace(/\s+/g, '')

    console.log('🔍 [DEBUG-SWS] Testing direct SWS API calls...')
    console.log('🔍 [DEBUG-SWS] Config:', { 
      apiKey: SWS_CONFIG.apiKey.substring(0, 8) + '...', 
      username: SWS_CONFIG.username,
      baseUrl: SWS_CONFIG.baseUrl 
    })

    const results: any = {}

    // Test 1: Direct login attempt
    try {
      console.log('🔐 [DEBUG-SWS] Attempting login...')
      const loginData = new FormData()
      loginData.append('apikey', SWS_CONFIG.apiKey)
      loginData.append('action', 'login')
      loginData.append('username', SWS_CONFIG.username)
      loginData.append('password', SWS_CONFIG.password)

      const loginResponse = await fetch(SWS_CONFIG.baseUrl, {
        method: 'POST',
        body: loginData,
        headers: { 'User-Agent': 'GarageManager/1.0' }
      })

      const loginText = await loginResponse.text()
      let loginJson = null
      try {
        loginJson = JSON.parse(loginText)
      } catch (e) {
        // Not JSON
      }

      results.login_attempt = {
        status: loginResponse.status,
        ok: loginResponse.ok,
        contentType: loginResponse.headers.get('content-type'),
        responseText: loginText.substring(0, 500),
        parsedJson: loginJson,
        isJsonArray: Array.isArray(loginJson),
        firstElement: Array.isArray(loginJson) ? loginJson[0] : null
      }

      console.log('🔐 [DEBUG-SWS] Login response:', results.login_attempt)
    } catch (error) {
      results.login_attempt = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Test 2: Direct summary call (no session)
    try {
      console.log('📋 [DEBUG-SWS] Attempting direct summary call...')
      const summaryData = new FormData()
      summaryData.append('apikey', SWS_CONFIG.apiKey)
      summaryData.append('action', 'summary')
      summaryData.append('vrm', vrm)

      const summaryResponse = await fetch(SWS_CONFIG.baseUrl, {
        method: 'POST',
        body: summaryData,
        headers: { 'User-Agent': 'GarageManager/1.0' }
      })

      const summaryText = await summaryResponse.text()
      let summaryJson = null
      try {
        summaryJson = JSON.parse(summaryText)
      } catch (e) {
        // Not JSON
      }

      results.summary_attempt = {
        status: summaryResponse.status,
        ok: summaryResponse.ok,
        contentType: summaryResponse.headers.get('content-type'),
        responseText: summaryText.substring(0, 500),
        parsedJson: summaryJson,
        isJsonArray: Array.isArray(summaryJson),
        firstElement: Array.isArray(summaryJson) ? summaryJson[0] : null,
        hasError: Array.isArray(summaryJson) && summaryJson[0]?.reply === 'Error',
        errorMessage: Array.isArray(summaryJson) && summaryJson[0]?.reply === 'Error' ? summaryJson[0]?.code : null
      }

      console.log('📋 [DEBUG-SWS] Summary response:', results.summary_attempt)
    } catch (error) {
      results.summary_attempt = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Test 3: Basic Auth GET attempt
    try {
      console.log('🔑 [DEBUG-SWS] Attempting Basic Auth GET...')
      const authHeader = `Basic ${Buffer.from(`${SWS_CONFIG.username}:${SWS_CONFIG.password}`).toString('base64')}`
      
      const getResponse = await fetch(`${SWS_CONFIG.baseUrl}?action=summary&apikey=${SWS_CONFIG.apiKey}&vrm=${vrm}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'User-Agent': 'GarageManager/1.0'
        }
      })

      const getText = await getResponse.text()
      let getJson = null
      try {
        getJson = JSON.parse(getText)
      } catch (e) {
        // Not JSON
      }

      results.basic_auth_get = {
        status: getResponse.status,
        ok: getResponse.ok,
        contentType: getResponse.headers.get('content-type'),
        responseText: getText.substring(0, 500),
        parsedJson: getJson,
        isJsonArray: Array.isArray(getJson),
        firstElement: Array.isArray(getJson) ? getJson[0] : null,
        hasError: Array.isArray(getJson) && getJson[0]?.reply === 'Error',
        errorMessage: Array.isArray(getJson) && getJson[0]?.reply === 'Error' ? getJson[0]?.code : null
      }

      console.log('🔑 [DEBUG-SWS] Basic Auth GET response:', results.basic_auth_get)
    } catch (error) {
      results.basic_auth_get = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Analysis
    const analysis = {
      anySuccessfulCall: Object.values(results).some((r: any) => r.ok),
      allCallsFailed: Object.values(results).every((r: any) => !r.ok || r.error),
      sessionExpiredErrors: Object.values(results).filter((r: any) => 
        r.errorMessage?.includes('Session Expired')).length,
      authenticationErrors: Object.values(results).filter((r: any) => 
        r.status === 401 || r.status === 403).length,
      recommendations: []
    }

    if (analysis.sessionExpiredErrors > 0) {
      analysis.recommendations.push("All calls return 'Session Expired' - SWS requires active session management")
    }
    if (analysis.authenticationErrors > 0) {
      analysis.recommendations.push("Authentication errors - check API key, username, password")
    }
    if (analysis.allCallsFailed) {
      analysis.recommendations.push("All calls failed - check SWS account status and credentials")
    }

    return NextResponse.json({
      success: true,
      vrm,
      config: {
        apiKey: SWS_CONFIG.apiKey.substring(0, 8) + '...',
        username: SWS_CONFIG.username,
        baseUrl: SWS_CONFIG.baseUrl
      },
      results,
      analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [DEBUG-SWS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
