import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    // Get customers with vehicles for potential surveys (simulated recent service)
    const surveyCustomers = await sql`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.created_at,
        v.registration,
        v.make,
        v.model,
        CURRENT_DATE - INTERVAL '7 days' as last_service_date,
        150.00 as total_amount
      FROM customers c
      JOIN vehicles v ON c.id = v.owner_id
      WHERE c.phone IS NOT NULL
      AND c.phone != ''
      AND c.phone_verified = true
      ORDER BY c.created_at DESC
      LIMIT 25
    `;

    // Prepare survey SMS messages
    const smsMessages = surveyCustomers.map(customer => {
      const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      const vehicleInfo = `${customer.make} ${customer.model} (${customer.registration})`;
      const serviceDate = new Date(customer.last_service_date).toLocaleDateString();

      const message = `Hi ${customerName}, thank you for choosing us for your ${vehicleInfo} service on ${serviceDate}. ` +
        `We'd love your feedback! Please rate your experience: Excellent (5), Good (4), Average (3), Poor (2), Very Poor (1). ` +
        `Reply with your rating. Thank you!`;

      return {
        customerId: customer.id,
        customerName,
        phone: customer.phone,
        vehicleInfo,
        serviceDate,
        serviceAmount: customer.total_amount,
        message,
        messageLength: message.length
      };
    });

    const totalMessages = smsMessages.length;
    const estimatedCost = totalMessages * 0.05; // Approximate SMS cost

    // Calculate response rate expectations
    const expectedResponseRate = 0.15; // 15% typical response rate
    const expectedResponses = Math.round(totalMessages * expectedResponseRate);

    return NextResponse.json({
      success: true,
      message: 'Customer surveys prepared successfully',
      data: {
        totalCustomers: totalMessages,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        expectedResponses,
        responseRate: `${Math.round(expectedResponseRate * 100)}%`,
        sampleMessages: smsMessages.slice(0, 3),
        summary: {
          recentServiceCustomers: totalMessages,
          averageMessageLength: Math.round(
            smsMessages.reduce((sum, msg) => sum + msg.messageLength, 0) / totalMessages
          ),
          dateRange: '2-30 days after service'
        }
      },
      surveyOptions: {
        ratings: [
          { value: 5, label: 'Excellent' },
          { value: 4, label: 'Good' },
          { value: 3, label: 'Average' },
          { value: 2, label: 'Poor' },
          { value: 1, label: 'Very Poor' }
        ],
        followUpActions: [
          'Thank customers for positive feedback',
          'Follow up on negative feedback',
          'Request online reviews from satisfied customers',
          'Identify service improvement opportunities'
        ]
      },
      note: 'This is a preparation endpoint. Actual SMS sending requires Twilio configuration and response handling.',
      nextSteps: [
        'Configure Twilio credentials',
        'Set up SMS webhook for responses',
        'Create response processing system',
        'Test with small batch',
        'Monitor response rates and feedback'
      ]
    });

  } catch (error) {
    console.error('Error preparing customer surveys:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to prepare customer surveys',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
