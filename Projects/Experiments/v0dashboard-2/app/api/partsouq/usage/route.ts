import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';

export async function POST(request: NextRequest) {
  try {
    const usage = await request.json();

    const {
      requestType,
      searchQuery,
      resultsCount,
      responseTime,
      success,
      cost,
      timestamp
    } = usage;

    // Insert usage record
    await sql.query(`
      INSERT INTO partsouq_api_usage (
        request_type,
        search_query,
        results_count,
        response_time_ms,
        success,
        api_cost,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      requestType,
      searchQuery,
      resultsCount || 0,
      responseTime || 0,
      success || false,
      cost || 0,
      timestamp || new Date()
    ]);

    return NextResponse.json({
      success: true,
      message: 'Usage logged successfully'
    });

  } catch (error) {
    console.error('❌ Failed to log PartSouq usage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to log usage'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const requestType = searchParams.get('type');

    let query = `
      SELECT 
        request_type,
        COUNT(*) as total_requests,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
        AVG(response_time_ms) as avg_response_time,
        SUM(api_cost) as total_cost,
        AVG(results_count) as avg_results,
        DATE(created_at) as date
      FROM partsouq_api_usage 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (requestType) {
      query += ` AND request_type = $${paramIndex}`;
      queryParams.push(requestType);
      paramIndex++;
    }

    query += `
      GROUP BY request_type, DATE(created_at)
      ORDER BY date DESC, request_type
    `;

    const result = await sql.query(query, queryParams);

    // Also get summary stats
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
        SUM(api_cost) as total_cost,
        AVG(response_time_ms) as avg_response_time,
        MIN(created_at) as first_request,
        MAX(created_at) as last_request
      FROM partsouq_api_usage 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ${requestType ? `AND request_type = $1` : ''}
    `;

    const summaryResult = await sql.query(
      summaryQuery, 
      requestType ? [requestType] : []
    );

    return NextResponse.json({
      success: true,
      data: {
        usage: result.rows || [],
        summary: summaryResult.rows?.[0] || {},
        period: `${days} days`,
        requestType: requestType || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Failed to get PartSouq usage stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get usage statistics'
    }, { status: 500 });
  }
}
