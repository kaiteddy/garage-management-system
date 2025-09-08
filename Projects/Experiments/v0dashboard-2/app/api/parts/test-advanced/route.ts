import { NextRequest, NextResponse } from 'next/server';
import { searchPartSouqByVin, getPartSouqStats } from '@/lib/services/partsouq-browser';

export async function POST(request: NextRequest) {
  try {
    const { 
      vin = 'WBA2D520X05E20424',
      testAllMethods = false,
      includeStats = true 
    } = await request.json();

    console.log(`🧪 [ADVANCED-TEST] Starting comprehensive PartSouq test`);
    console.log(`📋 [ADVANCED-TEST] VIN: ${vin}`);
    console.log(`🔄 [ADVANCED-TEST] Test all methods: ${testAllMethods}`);

    const results: any = {
      vin,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    if (testAllMethods) {
      // Test each method individually
      console.log('🔄 [ADVANCED-TEST] Testing all methods individually...');
      
      const { partSouqBrowserService, partSouqProxyService, partSouqManualService } = 
        await import('@/lib/services/partsouq-browser');

      const methods = [
        { name: 'browser', service: partSouqBrowserService },
        { name: 'scrapingbee', service: partSouqProxyService },
        { name: 'manual', service: partSouqManualService }
      ];

      for (const method of methods) {
        console.log(`🧪 [ADVANCED-TEST] Testing ${method.name} method...`);
        const startTime = Date.now();
        
        try {
          const result = await method.service.searchByVin(vin);
          const responseTime = Date.now() - startTime;
          
          results.tests[method.name] = {
            success: result.success,
            partsFound: result.parts.length,
            responseTime,
            error: result.error || null,
            vehicle: result.vehicle || null,
            samplePart: result.parts[0] || null
          };
          
          console.log(`✅ [ADVANCED-TEST] ${method.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${responseTime}ms)`);
          
        } catch (error) {
          const responseTime = Date.now() - startTime;
          results.tests[method.name] = {
            success: false,
            partsFound: 0,
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            vehicle: null,
            samplePart: null
          };
          
          console.log(`❌ [ADVANCED-TEST] ${method.name}: FAILED (${responseTime}ms) - ${error}`);
        }
      }
    }

    // Test intelligent method selection
    console.log('🧠 [ADVANCED-TEST] Testing intelligent method selection...');
    const smartStartTime = Date.now();
    
    try {
      const smartResult = await searchPartSouqByVin(vin);
      const smartResponseTime = Date.now() - smartStartTime;
      
      results.intelligentSearch = {
        success: smartResult.success,
        partsFound: smartResult.parts.length,
        responseTime: smartResponseTime,
        error: smartResult.error || null,
        vehicle: smartResult.vehicle || null,
        sampleParts: smartResult.parts.slice(0, 3) || []
      };
      
      console.log(`🧠 [ADVANCED-TEST] Intelligent search: ${smartResult.success ? 'SUCCESS' : 'FAILED'} (${smartResponseTime}ms)`);
      
    } catch (error) {
      const smartResponseTime = Date.now() - smartStartTime;
      results.intelligentSearch = {
        success: false,
        partsFound: 0,
        responseTime: smartResponseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        vehicle: null,
        sampleParts: []
      };
      
      console.log(`❌ [ADVANCED-TEST] Intelligent search: FAILED (${smartResponseTime}ms) - ${error}`);
    }

    // Include statistics if requested
    if (includeStats) {
      console.log('📊 [ADVANCED-TEST] Gathering statistics...');
      try {
        const stats = await getPartSouqStats(7);
        results.statistics = stats;
      } catch (error) {
        console.log('⚠️ [ADVANCED-TEST] Failed to get statistics:', error);
        results.statistics = { error: 'Failed to retrieve statistics' };
      }
    }

    // Calculate overall test results
    const totalTests = Object.keys(results.tests || {}).length + 1; // +1 for intelligent search
    const successfulTests = Object.values(results.tests || {}).filter((test: any) => test.success).length + 
                           (results.intelligentSearch?.success ? 1 : 0);
    
    results.summary = {
      totalTests,
      successfulTests,
      successRate: totalTests > 0 ? (successfulTests / totalTests) : 0,
      overallSuccess: results.intelligentSearch?.success || false,
      recommendedMethod: results.statistics?.methods?.[0]?.method || 'browser'
    };

    console.log(`📊 [ADVANCED-TEST] Test completed: ${successfulTests}/${totalTests} methods successful`);

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ [ADVANCED-TEST] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Advanced test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin') || 'WBA2D520X05E20424';
    const testAllMethods = searchParams.get('testAll') === 'true';
    const includeStats = searchParams.get('stats') !== 'false';

    // Reuse POST logic
    const mockRequest = new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({ vin, testAllMethods, includeStats })
    });

    return POST(mockRequest as NextRequest);

  } catch (error) {
    console.error('❌ [ADVANCED-TEST-GET] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Advanced test failed'
    }, { status: 500 });
  }
}
