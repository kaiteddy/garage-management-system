import { NextRequest, NextResponse } from 'next/server';
import { cloudflareSolver } from '@/lib/services/cloudflare-solver';

export async function POST(request: NextRequest) {
  try {
    const { rayId, challengeHash } = await request.json();

    console.log('🧪 [CF-TOKEN-TEST] Testing token generation...');

    // Test our token generation against known successful patterns
    const knownSuccessfulTokens = [
      'up5xOb9TrmfFaCBi9pm4rwbLf87h6fmKLjPdCk_VVFs-1754368307-1.0.1.1-bgGbnz1ldtc9OS0OYvnuwNIr6pW_67eS33mjpeQ1hoE',
      'swJKAnYn_5snTcmrghwVIi3LbiQKAlQA98sjMYC7lAI-1754384492-1.0.1.1-n3HK.YLwWa3dKs4LASAVujsKlBiEqiovjYKWfNG6QYU',
      'ZU5SKNLGHm7mj2PxKhhn_q6twWOH6GA0yWhZWsof.l8-1754384315-1.0.1.1-wGZMzOq4bK53jPT5w1HTLd4Nb5Ip4H.PZ_vJ0xVMWJk'
    ];

    // Create a mock challenge for testing
    const mockChallenge = {
      cvId: '3',
      cZone: 'partsouq.com',
      cType: 'managed',
      cRay: rayId || '96a517f61ef7de62',
      cH: challengeHash || 'Sv4GvAj4PMrXMsDTwOC_gqwGqrzvuVgIuKrzhXtdP98-1754384315-1.2.1.1-BFc9192achFKnM8eQ0ztQCxi1z3KcnENOB1O7d4TvyfK61kY64fQ7hOsD2bgYH20',
      cUPMDTk: '/en/catalog/genuine/vehicle?q=WBA2D520X05E20424&__cf_chl_tk=test',
      md: 'test_md_value',
      mdrd: 'test_mdrd_value'
    };

    // Test token generation
    const generatedToken = (cloudflareSolver as any).calculateChallengeAnswer(mockChallenge);

    // Analyze token structure
    const tokenParts = generatedToken.split('-');
    const analysis = {
      fullToken: generatedToken,
      structure: {
        baseToken: tokenParts[0] || '',
        timestamp: tokenParts[1] || '',
        version: tokenParts[2] || '',
        hashSuffix: tokenParts[3] || ''
      },
      validation: {
        baseTokenLength: (tokenParts[0] || '').length,
        timestampValid: !isNaN(parseInt(tokenParts[1] || '')),
        versionCorrect: tokenParts[2] === '1.0.1.1',
        hashSuffixLength: (tokenParts[3] || '').length,
        totalParts: tokenParts.length
      },
      comparison: {
        knownPatterns: knownSuccessfulTokens.map(token => {
          const parts = token.split('-');
          return {
            token: token.substring(0, 50) + '...',
            baseLength: parts[0]?.length || 0,
            timestamp: parts[1] || '',
            version: parts[2] || '',
            hashLength: parts[3]?.length || 0
          };
        })
      }
    };

    // Test the complete challenge solving process
    console.log('🔄 [CF-TOKEN-TEST] Testing complete challenge solving...');
    
    const solutionResult = await cloudflareSolver.solveChallenge(
      mockChallenge, 
      'https://partsouq.com/en/catalog/genuine/vehicle?q=WBA2D520X05E20424'
    );

    return NextResponse.json({
      success: true,
      data: {
        tokenGeneration: analysis,
        challengeSolution: {
          success: solutionResult.success,
          error: solutionResult.error,
          hasCookies: !!solutionResult.cookies?.length,
          cookieCount: solutionResult.cookies?.length || 0
        },
        recommendations: generateTokenRecommendations(analysis)
      }
    });

  } catch (error) {
    console.error('❌ [CF-TOKEN-TEST] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Token generation test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateTokenRecommendations(analysis: any): string[] {
  const recommendations: string[] = [];
  
  const { validation, structure } = analysis;
  
  if (validation.baseTokenLength === 43) {
    recommendations.push('✅ Base token length matches successful pattern (43 chars)');
  } else {
    recommendations.push(`❌ Base token length incorrect: ${validation.baseTokenLength} (should be 43)`);
  }
  
  if (validation.timestampValid) {
    recommendations.push('✅ Timestamp format is valid');
  } else {
    recommendations.push('❌ Timestamp format is invalid');
  }
  
  if (validation.versionCorrect) {
    recommendations.push('✅ Version matches successful pattern (1.0.1.1)');
  } else {
    recommendations.push(`❌ Version incorrect: ${structure.version} (should be 1.0.1.1)`);
  }
  
  if (validation.hashSuffixLength === 43) {
    recommendations.push('✅ Hash suffix length matches successful pattern (43 chars)');
  } else {
    recommendations.push(`❌ Hash suffix length incorrect: ${validation.hashSuffixLength} (should be 43)`);
  }
  
  if (validation.totalParts === 4) {
    recommendations.push('✅ Token structure matches successful pattern (4 parts)');
  } else {
    recommendations.push(`❌ Token structure incorrect: ${validation.totalParts} parts (should be 4)`);
  }
  
  // Overall assessment
  const correctCount = recommendations.filter(r => r.startsWith('✅')).length;
  if (correctCount === 5) {
    recommendations.push('🎉 Token generation appears to match successful patterns!');
  } else {
    recommendations.push(`⚠️ Token generation needs adjustment: ${correctCount}/5 criteria met`);
  }
  
  return recommendations;
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rayId = searchParams.get('rayId');
  const challengeHash = searchParams.get('challengeHash');

  const mockRequest = new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ rayId, challengeHash })
  });

  return POST(mockRequest as NextRequest);
}
