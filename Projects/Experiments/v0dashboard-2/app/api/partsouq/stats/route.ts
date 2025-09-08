import { NextRequest, NextResponse } from 'next/server';
import { getPartSouqStats, resetPartSouqStats, updatePartSouqConfig } from '@/lib/services/partsouq-browser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const method = searchParams.get('method');

    console.log(`📊 [STATS] Getting PartSouq statistics for ${days} days`);

    const stats = await getPartSouqStats(days);

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [STATS] Failed to get statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method');

    console.log(`🔄 [STATS] Resetting statistics${method ? ` for ${method}` : ' for all methods'}`);

    resetPartSouqStats(method || undefined);

    return NextResponse.json({
      success: true,
      message: `Statistics reset${method ? ` for ${method}` : ' for all methods'}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [STATS] Failed to reset statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset statistics'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const config = await request.json();

    console.log('⚙️ [STATS] Updating PartSouq configuration:', config);

    updatePartSouqConfig(config);

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [STATS] Failed to update configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update configuration'
    }, { status: 500 });
  }
}
