import { NextRequest, NextResponse } from 'next/server';
import { searchPartSouqByVin } from '@/lib/services/partsouq-browser';

export async function POST(request: NextRequest) {
  try {
    const { vin = 'WBA2D520X05E20424' } = await request.json();

    console.log(`🧪 [TEST-PARTSOUQ] Testing PartSouq integration with VIN: ${vin}`);

    const startTime = Date.now();
    const result = await searchPartSouqByVin(vin);
    const responseTime = Date.now() - startTime;

    console.log(`⏱️ [TEST-PARTSOUQ] Response time: ${responseTime}ms`);
    console.log(`📊 [TEST-PARTSOUQ] Success: ${result.success}, Parts found: ${result.parts.length}`);

    return NextResponse.json({
      success: true,
      test: {
        vin,
        responseTime,
        timestamp: new Date().toISOString()
      },
      result
    });

  } catch (error) {
    console.error('❌ [TEST-PARTSOUQ] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'PartSouq test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin') || 'WBA2D520X05E20424';

    // Reuse POST logic
    const mockRequest = new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({ vin })
    });

    return POST(mockRequest as NextRequest);

  } catch (error) {
    console.error('❌ [TEST-PARTSOUQ-GET] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'PartSouq test failed'
    }, { status: 500 });
  }
}
