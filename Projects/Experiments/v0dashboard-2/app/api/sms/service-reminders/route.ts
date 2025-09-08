import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    // Get customers who haven't had service in the last 6 months
    const serviceReminders = await sql`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        v.registration,
        v.make,
        v.model,
        MAX(cd.document_date) as last_service_date
      FROM customers c
      JOIN vehicles v ON c.id = v.owner_id
      LEFT JOIN customer_documents cd ON c.id = cd.customer_id
      WHERE c.phone IS NOT NULL 
      AND c.phone != ''
      AND (cd.document_date IS NULL OR cd.document_date < CURRENT_DATE - INTERVAL '6 months')
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email, v.registration, v.make, v.model
      ORDER BY last_service_date ASC NULLS FIRST
      LIMIT 100
    `;

    // Prepare SMS messages
    const smsMessages = serviceReminders.map(customer => {
      const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      const vehicleInfo = `${customer.make} ${customer.model} (${customer.registration})`;
      
      let message = `Hi ${customerName}, `;
      
      if (customer.last_service_date) {
        const monthsSinceService = Math.floor(
          (new Date().getTime() - new Date(customer.last_service_date).getTime()) / 
          (1000 * 60 * 60 * 24 * 30)
        );
        message += `it's been ${monthsSinceService} months since your ${vehicleInfo} was last serviced. `;
      } else {
        message += `we'd like to remind you about servicing your ${vehicleInfo}. `;
      }
      
      message += `Book your service today for optimal performance and safety. Call us to schedule!`;
      
      return {
        customerId: customer.id,
        customerName,
        phone: customer.phone,
        vehicleInfo,
        message,
        messageLength: message.length,
        lastServiceDate: customer.last_service_date
      };
    });

    const totalMessages = smsMessages.length;
    const estimatedCost = totalMessages * 0.05; // Approximate SMS cost

    return NextResponse.json({
      success: true,
      message: 'Service reminders prepared successfully',
      data: {
        totalCustomers: totalMessages,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        sampleMessages: smsMessages.slice(0, 5),
        summary: {
          customersWithoutRecentService: totalMessages,
          averageMessageLength: Math.round(
            smsMessages.reduce((sum, msg) => sum + msg.messageLength, 0) / totalMessages
          )
        }
      },
      note: 'This is a preparation endpoint. Actual SMS sending requires Twilio configuration.',
      nextSteps: [
        'Configure Twilio credentials',
        'Set up SMS sending endpoint',
        'Test with small batch',
        'Monitor delivery rates'
      ]
    });

  } catch (error) {
    console.error('Error preparing service reminders:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to prepare service reminders',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
