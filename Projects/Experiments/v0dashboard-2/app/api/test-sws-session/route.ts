import { NextRequest, NextResponse } from 'next/server'
import { swsSessionManager } from '@/lib/sws-session-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = (searchParams.get('vrm') || 'NH19VPP').toUpperCase().replace(/\s+/g, '')

    console.log(`🧪 [TEST-SWS-SESSION] Testing SWS session management for ${vrm}`)

    // Test session creation
    const sessionId = await swsSessionManager.getValidSession()
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create SWS session',
        details: 'Session manager could not authenticate with SWS API'
      })
    }

    console.log(`✅ [TEST-SWS-SESSION] Session created: ${sessionId.substring(0, 8)}...`)

    // Test authenticated API calls
    const results: any = {}
    const actions = ['summary', 'VEHICLE', 'SPECS']

    for (const action of actions) {
      try {
        console.log(`🔍 [TEST-SWS-SESSION] Testing action: ${action}`)
        const result = await swsSessionManager.makeAuthenticatedCall(action, vrm)
        
        // Extract codes from this result
        const codes = swsSessionManager.extractCodes(result)
        
        results[action] = {
          success: true,
          hasData: Array.isArray(result) && result.length > 0,
          isError: Array.isArray(result) && result[0]?.reply === 'Error',
          errorMessage: Array.isArray(result) && result[0]?.reply === 'Error' ? result[0]?.code : null,
          extractedCodes: codes,
          sampleData: Array.isArray(result) ? result[0] : result,
          dataKeys: Array.isArray(result) && result[0] && typeof result[0] === 'object' 
            ? Object.keys(result[0]).slice(0, 10) 
            : []
        }

        // Small delay between calls
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        results[action] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Summary of findings
    const summary = {
      sessionCreated: !!sessionId,
      sessionId: sessionId ? sessionId.substring(0, 8) + '...' : null,
      totalActions: actions.length,
      successfulActions: Object.values(results).filter((r: any) => r.success).length,
      actionsWithData: Object.values(results).filter((r: any) => r.success && r.hasData && !r.isError).length,
      actionsWithErrors: Object.values(results).filter((r: any) => r.success && r.isError).length,
      engineCodeFound: Object.values(results).some((r: any) => r.extractedCodes?.engineCode),
      radioCodeFound: Object.values(results).some((r: any) => r.extractedCodes?.radioCode)
    }

    return NextResponse.json({
      success: true,
      vrm,
      summary,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [TEST-SWS-SESSION] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
