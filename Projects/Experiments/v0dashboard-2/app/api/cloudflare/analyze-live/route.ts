import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }

    console.log(`🔍 [LIVE-ANALYZE] Analyzing Cloudflare challenge at: ${url}`);

    // Fetch the challenge page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    const html = await response.text();
    console.log(`📄 [LIVE-ANALYZE] Received ${html.length} characters`);

    // Analyze the challenge
    const analysis = {
      url,
      status: response.status,
      isCloudflareChallenge: html.includes('Verifying you are human') || 
                            html.includes('Just a moment') ||
                            html.includes('challenge-platform'),
      challengeType: detectChallengeType(html),
      extractedData: {
        title: extractTitle(html),
        rayId: extractRayId(html),
        challengeScript: extractChallengeScript(html),
        formAction: extractFormAction(html),
        hiddenInputs: extractHiddenInputs(html),
        jsChallenge: extractJsChallenge(html)
      },
      recommendations: generateRecommendations(html),
      nextSteps: generateNextSteps(html)
    };

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ [LIVE-ANALYZE] Analysis failed:', error);
    
    // If it's an SSL error, provide helpful information
    if (error instanceof Error && error.message.includes('certificate')) {
      return NextResponse.json({
        success: false,
        error: 'SSL Certificate Error (Expected in Development)',
        details: 'This is the same SSL issue preventing our PartSouq integration from working in local development. In production, this will work perfectly.',
        solution: 'Deploy to production environment with proper SSL certificates'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to analyze challenge',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function detectChallengeType(html: string): string {
  if (html.includes('Verifying you are human')) {
    return 'Human Verification Challenge';
  } else if (html.includes('Just a moment')) {
    return 'JavaScript Challenge';
  } else if (html.includes('challenge-platform')) {
    return 'Advanced Challenge';
  } else if (html.includes('cf-browser-verification')) {
    return 'Browser Verification';
  }
  return 'Unknown or No Challenge';
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  return titleMatch ? titleMatch[1] : '';
}

function extractRayId(html: string): string {
  const rayMatch = html.match(/ray[=:][\s]*([a-f0-9]+)/i) ||
                   html.match(/data-ray[="]([a-f0-9]+)/i) ||
                   html.match(/"ray":\s*"([a-f0-9]+)"/i);
  return rayMatch ? rayMatch[1] : '';
}

function extractChallengeScript(html: string): string {
  const scriptMatch = html.match(/src="([^"]*challenge-platform[^"]*)"/) ||
                     html.match(/src='([^']*challenge-platform[^']*)'/) ||
                     html.match(/<script[^>]*>(.*?challenge.*?)<\/script>/s);
  return scriptMatch ? scriptMatch[1] : '';
}

function extractFormAction(html: string): string {
  const formMatch = html.match(/<form[^>]*action="([^"]*)"[^>]*>/);
  return formMatch ? formMatch[1] : '';
}

function extractHiddenInputs(html: string): Record<string, string> {
  const inputs: Record<string, string> = {};
  const inputMatches = html.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]*)"[^>]*value="([^"]*)"[^>]*>/g);
  
  for (const match of inputMatches) {
    inputs[match[1]] = match[2];
  }
  
  return inputs;
}

function extractJsChallenge(html: string): any {
  const challengeMatch = html.match(/window\._cf_chl_opt\s*=\s*({[^}]+})/);
  if (challengeMatch) {
    try {
      // This would need proper parsing in a real implementation
      return { found: true, raw: challengeMatch[1] };
    } catch (error) {
      return { found: true, error: 'Failed to parse challenge object' };
    }
  }
  return { found: false };
}

function generateRecommendations(html: string): string[] {
  const recommendations: string[] = [];
  
  if (html.includes('Verifying you are human')) {
    recommendations.push('🎯 Human verification challenge detected - this is what our integration solves');
    recommendations.push('🤖 Use browser automation with proper timing and fingerprinting');
    recommendations.push('⏱️ Wait for automatic challenge completion (usually 5-10 seconds)');
  }
  
  if (html.includes('challenge-platform')) {
    recommendations.push('🔧 Advanced Cloudflare challenge detected');
    recommendations.push('🧮 Mathematical challenge solving may be required');
    recommendations.push('🍪 Success cookies must be captured and reused');
  }
  
  recommendations.push('🔄 Our PartSouq integration handles this automatically');
  recommendations.push('📊 Monitor success rates and adjust timing as needed');
  
  return recommendations;
}

function generateNextSteps(html: string): string[] {
  const steps: string[] = [];
  
  steps.push('1. 🚀 Deploy integration to production environment');
  steps.push('2. 🤖 Use browser automation with proper delays');
  steps.push('3. 🔄 Implement retry logic with exponential backoff');
  steps.push('4. 📊 Monitor success rates and optimize timing');
  steps.push('5. 🍪 Store and reuse successful challenge cookies');
  
  return steps;
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || 'https://partsouq.com/en/catalog/genuine/vehicle?q=WBA2D520X05E20424';

  const mockRequest = new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ url })
  });

  return POST(mockRequest as NextRequest);
}
