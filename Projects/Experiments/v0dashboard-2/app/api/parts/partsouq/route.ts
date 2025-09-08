import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';
import { PartSouqSearchRequest, PartSouqResponse, PartApiResponse } from '@/types/parts';

// PartSouq integration endpoint
export async function POST(request: NextRequest) {
  try {
    const searchData: PartSouqSearchRequest = await request.json();
    
    console.log(`🔧 [PARTSOUQ-API] Searching PartSouq:`, searchData);

    // Track API usage
    const startTime = Date.now();
    
    // For now, we'll simulate PartSouq search since we don't have actual API access
    // In a real implementation, you would make actual API calls to PartSouq here
    const mockResults = await simulatePartSouqSearch(searchData);
    
    const responseTime = Date.now() - startTime;
    const apiCost = 0.05; // Mock cost per search

    // Store the search in our database for future reference
    if (mockResults.results.length > 0) {
      await storePartSouqResults(searchData, mockResults.results);
    }

    // Track API usage
    await trackPartSouqUsage({
      request_type: 'search',
      search_query: searchData.query,
      part_number: searchData.part_number,
      vehicle_registration: searchData.vehicle_registration,
      results_count: mockResults.results.length,
      api_cost: apiCost,
      response_time_ms: responseTime,
      success: true
    });

    const response: PartApiResponse<PartSouqResponse> = {
      success: true,
      data: {
        success: true,
        results: mockResults.results,
        total_count: mockResults.results.length,
        api_cost: apiCost,
        response_time_ms: responseTime
      }
    };

    console.log(`✅ [PARTSOUQ-API] Found ${mockResults.results.length} results`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [PARTSOUQ-API] Error searching PartSouq:', error);
    
    // Track failed API usage
    await trackPartSouqUsage({
      request_type: 'search',
      search_query: '',
      results_count: 0,
      api_cost: 0,
      response_time_ms: 0,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: PartApiResponse = {
      success: false,
      error: 'Failed to search PartSouq'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Simulate PartSouq search (replace with actual API integration)
async function simulatePartSouqSearch(searchData: PartSouqSearchRequest) {
  // This is a mock implementation
  // In reality, you would integrate with the actual PartSouq API
  
  const mockResults = [
    {
      id: 'ps-001',
      part_number: 'BP001',
      description: 'Brake Pads Front Set',
      manufacturer: 'Brembo',
      price: 45.99,
      availability: 'In Stock',
      image_url: 'https://example.com/brake-pads.jpg',
      details_url: 'https://partsouq.com/brake-pads-bp001',
      vehicle_compatibility: [
        {
          make: 'BMW',
          model: '3 Series',
          year_from: 2010,
          year_to: 2018,
          engine_codes: ['N20', 'N26']
        }
      ]
    },
    {
      id: 'ps-002',
      part_number: 'OF002',
      description: 'Oil Filter',
      manufacturer: 'Mann',
      price: 12.50,
      availability: 'In Stock',
      image_url: 'https://example.com/oil-filter.jpg',
      details_url: 'https://partsouq.com/oil-filter-of002',
      vehicle_compatibility: [
        {
          make: 'BMW',
          model: '3 Series',
          year_from: 2012,
          year_to: 2020,
          engine_codes: ['N20', 'B48']
        }
      ]
    }
  ];

  // Filter results based on search criteria
  let filteredResults = mockResults;

  if (searchData.query) {
    const query = searchData.query.toLowerCase();
    filteredResults = filteredResults.filter(result =>
      result.description.toLowerCase().includes(query) ||
      result.part_number.toLowerCase().includes(query) ||
      result.manufacturer.toLowerCase().includes(query)
    );
  }

  if (searchData.part_number) {
    const partNumber = searchData.part_number.toLowerCase();
    filteredResults = filteredResults.filter(result =>
      result.part_number.toLowerCase().includes(partNumber)
    );
  }

  if (searchData.make) {
    const make = searchData.make.toLowerCase();
    filteredResults = filteredResults.filter(result =>
      result.vehicle_compatibility.some(compat =>
        compat.make.toLowerCase().includes(make)
      )
    );
  }

  if (searchData.model) {
    const model = searchData.model.toLowerCase();
    filteredResults = filteredResults.filter(result =>
      result.vehicle_compatibility.some(compat =>
        compat.model.toLowerCase().includes(model)
      )
    );
  }

  return { results: filteredResults };
}

// Store PartSouq results in our database
async function storePartSouqResults(searchData: PartSouqSearchRequest, results: any[]) {
  try {
    for (const result of results) {
      // Check if part already exists
      const existingQuery = `
        SELECT id FROM parts WHERE partsouq_id = $1 OR part_number = $2
      `;
      const existing = await sql.query(existingQuery, [result.id, result.part_number]);

      if (existing.rows.length === 0) {
        // Create new part from PartSouq data
        const insertQuery = `
          INSERT INTO parts (
            part_number, description, manufacturer, price_retail_net,
            partsouq_id, partsouq_url, partsouq_price, partsouq_availability,
            partsouq_last_updated, category, is_active, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, true, 'partsouq'
          )
          ON CONFLICT (part_number) DO UPDATE SET
            partsouq_price = EXCLUDED.partsouq_price,
            partsouq_availability = EXCLUDED.partsouq_availability,
            partsouq_last_updated = CURRENT_TIMESTAMP
        `;

        await sql.query(insertQuery, [
          result.part_number,
          result.description,
          result.manufacturer,
          result.price,
          result.id,
          result.details_url,
          result.price,
          result.availability,
          'PartSouq Import'
        ]);

        console.log(`📦 [PARTSOUQ-API] Stored part: ${result.part_number}`);
      } else {
        // Update existing part with PartSouq data
        const updateQuery = `
          UPDATE parts SET
            partsouq_id = $1,
            partsouq_url = $2,
            partsouq_price = $3,
            partsouq_availability = $4,
            partsouq_last_updated = CURRENT_TIMESTAMP
          WHERE id = $5
        `;

        await sql.query(updateQuery, [
          result.id,
          result.details_url,
          result.price,
          result.availability,
          existing.rows[0].id
        ]);

        console.log(`🔄 [PARTSOUQ-API] Updated part: ${result.part_number}`);
      }
    }
  } catch (error) {
    console.error('❌ [PARTSOUQ-API] Error storing results:', error);
  }
}

// Track PartSouq API usage
async function trackPartSouqUsage(usage: any) {
  try {
    const insertQuery = `
      INSERT INTO partsouq_api_usage (
        request_type, search_query, part_number, vehicle_registration,
        results_count, api_cost, response_time_ms, success, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await sql.query(insertQuery, [
      usage.request_type,
      usage.search_query,
      usage.part_number,
      usage.vehicle_registration,
      usage.results_count,
      usage.api_cost,
      usage.response_time_ms,
      usage.success,
      usage.error_message
    ]);
  } catch (error) {
    console.error('❌ [PARTSOUQ-API] Error tracking usage:', error);
  }
}

// Get PartSouq usage statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const statsQuery = `
      SELECT 
        COUNT(*) as total_requests,
        SUM(api_cost) as total_cost,
        AVG(response_time_ms) as avg_response_time,
        SUM(results_count) as total_results,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_requests,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_requests
      FROM partsouq_api_usage 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `;

    const result = await sql.query(statsQuery);
    const stats = result.rows[0];

    const response: PartApiResponse = {
      success: true,
      data: {
        period_days: days,
        total_requests: parseInt(stats.total_requests),
        total_cost: parseFloat(stats.total_cost || 0),
        average_response_time_ms: parseFloat(stats.avg_response_time || 0),
        total_results: parseInt(stats.total_results || 0),
        successful_requests: parseInt(stats.successful_requests || 0),
        failed_requests: parseInt(stats.failed_requests || 0),
        success_rate: stats.total_requests > 0 ? 
          (stats.successful_requests / stats.total_requests * 100).toFixed(2) + '%' : '0%'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [PARTSOUQ-API] Error getting stats:', error);
    const response: PartApiResponse = {
      success: false,
      error: 'Failed to get PartSouq statistics'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
