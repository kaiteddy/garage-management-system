import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { formData, actionUrl } = await request.json()
    
    console.log('🔄 [HAYNESPRO-PROXY] Submitting form to:', actionUrl)
    
    // Create form data for the POST request
    const form = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value as string)
    })
    
    // Submit the form to HaynesPro
    const response = await fetch(actionUrl, {
      method: 'POST',
      body: form,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow'
    })
    
    if (!response.ok) {
      throw new Error(`HaynesPro request failed: ${response.status}`)
    }
    
    const html = await response.text()
    
    console.log('✅ [HAYNESPRO-PROXY] Successfully retrieved data from HaynesPro')
    
    return NextResponse.json({
      success: true,
      html,
      contentType: response.headers.get('content-type') || 'text/html'
    })
    
  } catch (error) {
    console.error('❌ [HAYNESPRO-PROXY] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint only accepts POST requests'
  }, { status: 405 })
}
