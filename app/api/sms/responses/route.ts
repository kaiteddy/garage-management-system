import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const responseType = searchParams.get('type') || ''
    const processed = searchParams.get('processed') || ''

    console.log("[SMS-RESPONSES] 🔍 Getting customer SMS responses")

    // Create customer_responses table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS customer_responses (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        response_type TEXT,
        vehicle_registration TEXT,
        source TEXT DEFAULT 'sms',
        processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMP,
        extracted_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Build where conditions
    let whereConditions = []
    if (responseType) {
      whereConditions.push(`cr.response_type = '${responseType}'`)
    }
    if (processed === 'true') {
      whereConditions.push(`cr.processed = TRUE`)
    } else if (processed === 'false') {
      whereConditions.push(`cr.processed = FALSE`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get customer responses with customer and vehicle details
    const responses = await sql.unsafe(`
      SELECT 
        cr.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone as customer_phone,
        v.make,
        v.model,
        v.mot_expiry_date,
        -- Get original SMS that triggered this response
        (SELECT sl.message_content FROM sms_log sl 
         WHERE sl.phone_number = cr.phone 
         AND sl.sent_at < cr.created_at
         ORDER BY sl.sent_at DESC LIMIT 1) as original_message
      FROM customer_responses cr
      LEFT JOIN customers c ON cr.customer_id = c.id
      LEFT JOIN vehicles v ON cr.vehicle_registration = v.registration
      ${whereClause}
      ORDER BY cr.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `)

    // Get total count
    const totalCount = await sql.unsafe(`
      SELECT COUNT(*) as count
      FROM customer_responses cr
      ${whereClause}
    `)

    // Get response type breakdown
    const responseBreakdown = await sql`
      SELECT 
        response_type,
        COUNT(*) as count,
        COUNT(CASE WHEN processed = TRUE THEN 1 END) as processed_count
      FROM customer_responses
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY response_type
      ORDER BY count DESC
    `

    // Get recent webhook activity
    const recentWebhooks = await sql`
      SELECT 
        message_sid,
        from_number,
        body,
        status,
        created_at,
        processed
      FROM sms_webhooks
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      responses: responses.map(response => ({
        id: response.id,
        customerId: response.customer_id,
        customerName: `${response.first_name || ''} ${response.last_name || ''}`.trim(),
        customerEmail: response.email,
        phone: response.phone,
        message: response.message,
        responseType: response.response_type,
        vehicleRegistration: response.vehicle_registration,
        vehicle: response.make && response.model ? `${response.make} ${response.model}` : null,
        motExpiryDate: response.mot_expiry_date,
        source: response.source,
        processed: response.processed,
        processedAt: response.processed_at,
        extractedData: response.extracted_data,
        createdAt: response.created_at,
        originalMessage: response.original_message ? response.original_message.substring(0, 100) + '...' : null
      })),
      pagination: {
        total: parseInt(totalCount[0].count),
        limit: limit,
        offset: offset,
        hasMore: offset + limit < parseInt(totalCount[0].count)
      },
      responseBreakdown: responseBreakdown.map(breakdown => ({
        responseType: breakdown.response_type,
        count: parseInt(breakdown.count),
        processedCount: parseInt(breakdown.processed_count),
        pendingCount: parseInt(breakdown.count) - parseInt(breakdown.processed_count)
      })),
      recentWebhooks: recentWebhooks.map(webhook => ({
        messageSid: webhook.message_sid,
        fromNumber: webhook.from_number,
        body: webhook.body,
        status: webhook.status,
        createdAt: webhook.created_at,
        processed: webhook.processed
      })),
      responseTypes: {
        'opt_out': 'Customer opted out (STOP)',
        'sold': 'Vehicle sold/no longer owned',
        'add_email': 'Email address provided',
        'update_phone': 'Phone number update',
        'update_contact': 'Contact details update',
        'no_longer_own': 'Wrong number/not their car',
        'email_request': 'Requested email option',
        'general': 'General response/question'
      }
    })

  } catch (error) {
    console.error("[SMS-RESPONSES] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get SMS responses",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { responseId, action } = await request.json()

    console.log(`[SMS-RESPONSES] 🔄 Processing response ${responseId} with action: ${action}`)

    if (action === 'mark_processed') {
      await sql`
        UPDATE customer_responses
        SET processed = TRUE, processed_at = NOW()
        WHERE id = ${responseId}
      `

      return NextResponse.json({
        success: true,
        message: "Response marked as processed"
      })
    }

    if (action === 'reprocess') {
      // Get the response details
      const response = await sql`
        SELECT * FROM customer_responses WHERE id = ${responseId}
      `

      if (response.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Response not found"
        }, { status: 404 })
      }

      // Reprocess the response
      const reprocessResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/customer-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: response[0].phone,
          message: response[0].message,
          source: response[0].source,
          vehicleRegistration: response[0].vehicle_registration,
          reprocess: true
        })
      })

      const result = await reprocessResult.json()

      return NextResponse.json({
        success: true,
        message: "Response reprocessed",
        result: result
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action"
    }, { status: 400 })

  } catch (error) {
    console.error("[SMS-RESPONSES] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to process SMS response action",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
