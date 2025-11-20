import { NextResponse } from 'next/server';
import { getMinimaxClient } from '@/lib/minimax-client';
import { sql } from '@/lib/database/neon-client';

/**
 * Automotive Service Summary Generator
 * POST /api/minimax/automotive/service-summary
 * 
 * Generate intelligent service summaries using Minimax AI
 * Analyzes vehicle data, service history, and MOT information
 */
export async function POST(request: Request) {
  try {
    console.log('[MINIMAX-AUTOMOTIVE-SUMMARY] Processing service summary request...');
    
    const body = await request.json();
    const { vehicle_id, registration, include_recommendations = true } = body;

    // Validate input
    if (!vehicle_id && !registration) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either vehicle_id or registration is required' 
        },
        { status: 400 }
      );
    }

    // Get vehicle data
    let vehicleQuery;
    if (vehicle_id) {
      vehicleQuery = await sql`
        SELECT * FROM vehicles WHERE id = ${vehicle_id}
      `;
    } else {
      vehicleQuery = await sql`
        SELECT * FROM vehicles WHERE registration = ${registration}
      `;
    }

    if (vehicleQuery.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Vehicle not found' 
        },
        { status: 404 }
      );
    }

    const vehicle = vehicleQuery[0];

    // Get service history
    const serviceHistory = await sql`
      SELECT 
        d.date,
        d.description,
        d.total_amount,
        de.description as line_item_description,
        de.quantity,
        de.unit_price
      FROM documents d
      LEFT JOIN document_extra de ON d.id = de.document_id
      WHERE d.vehicle_id = ${vehicle.id}
      ORDER BY d.date DESC
      LIMIT 10
    `;

    // Get MOT history
    const motHistory = await sql`
      SELECT 
        expiry_date,
        test_result,
        odometer_value,
        defects,
        advisories
      FROM mot_history 
      WHERE vehicle_id = ${vehicle.id}
      ORDER BY expiry_date DESC
      LIMIT 5
    `;

    // Get customer information
    const customer = await sql`
      SELECT first_name, last_name, email, phone
      FROM customers 
      WHERE id = ${vehicle.customer_id}
    `;

    const minimaxClient = getMinimaxClient();

    // Prepare data for AI analysis
    const vehicleData = {
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      motExpiryDate: vehicle.mot_expiry_date,
      lastServiceDate: serviceHistory[0]?.date,
      mileage: vehicle.mileage
    };

    const serviceHistoryFormatted = serviceHistory.map(service => ({
      date: service.date,
      description: service.description || service.line_item_description,
      amount: service.total_amount
    }));

    // Generate AI summary
    const aiSummary = await minimaxClient.generateServiceSummary(vehicleData, serviceHistoryFormatted);

    // Generate recommendations if requested
    let recommendations = null;
    if (include_recommendations) {
      const recommendationMessages = [
        {
          role: 'system' as const,
          content: `You are an expert automotive technician at ELI MOTORS LTD. 
          Provide specific, actionable maintenance recommendations based on vehicle data and service history.
          Focus on safety, MOT compliance, and preventive maintenance.`
        },
        {
          role: 'user' as const,
          content: `Based on this vehicle data, provide maintenance recommendations:
          
          Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.registration})
          Year: ${vehicle.year}
          Mileage: ${vehicle.mileage}
          MOT Expiry: ${vehicle.mot_expiry_date}
          
          Recent Services: ${serviceHistoryFormatted.slice(0, 3).map(s => s.description).join(', ')}
          
          Provide:
          1. Immediate actions needed
          2. Upcoming maintenance schedule
          3. MOT preparation items
          4. Cost estimates where appropriate`
        }
      ];

      const recommendationResponse = await minimaxClient.generateText({ 
        messages: recommendationMessages 
      });
      recommendations = recommendationResponse.choices[0]?.message?.content;
    }

    console.log('[MINIMAX-AUTOMOTIVE-SUMMARY] Service summary generated successfully');
    
    return NextResponse.json({
      success: true,
      data: {
        vehicle: {
          id: vehicle.id,
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year
        },
        customer: customer[0] || null,
        summary: aiSummary,
        recommendations: recommendations,
        service_history_count: serviceHistory.length,
        mot_history_count: motHistory.length,
        last_service_date: serviceHistory[0]?.date || null,
        next_mot_due: vehicle.mot_expiry_date
      },
      metadata: {
        generated_at: new Date().toISOString(),
        ai_model: 'Minimax M1',
        analysis_scope: 'Vehicle data, service history, MOT records',
        recommendations_included: include_recommendations
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MINIMAX-AUTOMOTIVE-SUMMARY] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate service summary',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
