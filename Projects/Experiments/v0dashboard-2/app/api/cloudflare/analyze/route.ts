import { NextRequest, NextResponse } from 'next/server';
import { cloudflareSolver } from '@/lib/services/cloudflare-solver';

export async function POST(request: NextRequest) {
  try {
    const { html, url } = await request.json();

    if (!html) {
      return NextResponse.json({
        success: false,
        error: 'HTML content is required'
      }, { status: 400 });
    }

    console.log('🔍 [CF-ANALYZE] Analyzing Cloudflare challenge...');

    // Check if it's a Cloudflare challenge
    const isChallenge = cloudflareSolver.constructor.isCloudflareChallenge(html);
    
    if (!isChallenge) {
      return NextResponse.json({
        success: true,
        isChallenge: false,
        message: 'No Cloudflare challenge detected'
      });
    }

    // Parse the challenge
    const challenge = cloudflareSolver.parseChallenge(html);
    
    // Extract additional data for analysis
    const analysis = {
      isChallenge: true,
      challenge,
      extractedData: {
        title: extractTitle(html),
        rayId: extractRayId(html),
        challengeScript: extractChallengeScript(html),
        formData: extractFormData(html),
        cookies: extractCookieRequirements(html),
        timing: extractTimingRequirements(html)
      },
      recommendations: generateRecommendations(html, challenge)
    };

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ [CF-ANALYZE] Analysis failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze Cloudflare challenge',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions for detailed analysis
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  return titleMatch ? titleMatch[1] : '';
}

function extractRayId(html: string): string {
  const rayMatch = html.match(/ray=([a-f0-9]+)/);
  return rayMatch ? rayMatch[1] : '';
}

function extractChallengeScript(html: string): string {
  const scriptMatch = html.match(/src="([^"]*challenge-platform[^"]*)"/) ||
                     html.match(/src='([^']*challenge-platform[^']*)'/) ||
                     html.match(/<script[^>]*>(.*?window\._cf_chl_opt.*?)<\/script>/s);
  return scriptMatch ? scriptMatch[1] : '';
}

function extractFormData(html: string): any {
  const formData: any = {};
  
  // Extract form inputs
  const inputMatches = html.matchAll(/<input[^>]*name="([^"]*)"[^>]*value="([^"]*)"[^>]*>/g);
  for (const match of inputMatches) {
    formData[match[1]] = match[2];
  }
  
  // Extract challenge-specific data
  const challengeMatches = html.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g);
  for (const match of challengeMatches) {
    if (['cvId', 'cZone', 'cType', 'cRay', 'cH', 'md', 'mdrd'].includes(match[1])) {
      formData[match[1]] = match[2];
    }
  }
  
  return formData;
}

function extractCookieRequirements(html: string): string[] {
  const cookies: string[] = [];
  
  // Look for cookie-related JavaScript
  const cookieMatches = html.matchAll(/document\.cookie\s*=\s*['"]([^'"]+)['"]/g);
  for (const match of cookieMatches) {
    cookies.push(match[1]);
  }
  
  return cookies;
}

function extractTimingRequirements(html: string): any {
  const timing: any = {};
  
  // Look for timing-related code
  const timeoutMatch = html.match(/setTimeout\([^,]+,\s*(\d+)\)/);
  if (timeoutMatch) {
    timing.delay = parseInt(timeoutMatch[1]);
  }
  
  const refreshMatch = html.match(/http-equiv="refresh"\s+content="(\d+)"/);
  if (refreshMatch) {
    timing.refresh = parseInt(refreshMatch[1]);
  }
  
  return timing;
}

function generateRecommendations(html: string, challenge: any): string[] {
  const recommendations: string[] = [];
  
  if (!challenge) {
    recommendations.push('❌ Challenge parsing failed - check HTML structure');
    recommendations.push('🔍 Use Fiddler to capture the exact challenge page HTML');
    recommendations.push('📋 Look for window._cf_chl_opt object in the JavaScript');
  } else {
    recommendations.push('✅ Challenge parsed successfully');
    
    if (challenge.cRay) {
      recommendations.push(`🔑 Ray ID found: ${challenge.cRay}`);
    }
    
    if (challenge.cH) {
      recommendations.push('🔐 Challenge hash found - can attempt solution');
    }
    
    if (html.includes('jschl_answer')) {
      recommendations.push('🧮 Mathematical challenge detected - implement solver');
    }
    
    if (html.includes('cf_clearance')) {
      recommendations.push('🍪 cf_clearance cookie required for success');
    }
  }
  
  // Timing recommendations
  if (html.includes('setTimeout')) {
    recommendations.push('⏱️ Timing delay required - wait 4-5 seconds before submission');
  }
  
  // Browser fingerprint recommendations
  if (html.includes('navigator.')) {
    recommendations.push('🖥️ Browser fingerprint validation detected');
  }
  
  return recommendations;
}

// GET endpoint for testing with URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testUrl = searchParams.get('url') || 'https://partsouq.com/en/catalog/genuine/vehicle?q=WBA2D520X05E20424';

    console.log(`🧪 [CF-ANALYZE] Testing URL: ${testUrl}`);

    // Fetch the page to analyze
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15'
      }
    });

    const html = await response.text();

    // Reuse POST logic
    const mockRequest = new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({ html, url: testUrl })
    });

    return POST(mockRequest as NextRequest);

  } catch (error) {
    console.error('❌ [CF-ANALYZE-GET] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test URL'
    }, { status: 500 });
  }
}
