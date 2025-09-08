import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

/**
 * Unified Customer Correspondence History
 * GET /api/correspondence/history
 * 
 * Retrieves complete communication history across all channels
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const vehicleRegistration = searchParams.get('vehicleRegistration')
    const communicationType = searchParams.get('communicationType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log(`[CORRESPONDENCE-HISTORY] 📋 Fetching correspondence history...`)

    // Build WHERE clause based on filters
    let whereConditions = []
    let queryParams = []

    if (customerId) {
      whereConditions.push(`cc.customer_id = $${queryParams.length + 1}`)
      queryParams.push(customerId)
    }

    if (vehicleRegistration) {
      whereConditions.push(`cc.vehicle_registration = $${queryParams.length + 1}`)
      queryParams.push(vehicleRegistration)
    }

    if (communicationType) {
      whereConditions.push(`cc.communication_type = $${queryParams.length + 1}`)
      queryParams.push(communicationType)
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Get correspondence history with customer details
    const correspondence = await sql.unsafe(`
      SELECT 
        cc.id,
        cc.customer_id,
        cc.vehicle_registration,
        cc.communication_type,
        cc.direction,
        cc.subject,
        cc.content,
        cc.contact_method,
        cc.contact_value,
        cc.message_category,
        cc.urgency_level,
        cc.status,
        cc.delivery_status,
        cc.requires_response,
        cc.response_deadline,
        cc.assigned_to,
        cc.auto_response_sent,
        cc.auto_response_type,
        cc.cost,
        cc.currency,
        cc.created_at,
        cc.sent_at,
        cc.read_at,
        cc.responded_at,
        
        -- Customer details
        c.first_name,
        c.last_name,
        c.email as customer_email,
        c.phone as customer_phone,
        
        -- Vehicle details
        v.make,
        v.model,
        v.year,
        v.mot_expiry,
        
        -- Response tracking
        response_cc.id as response_id,
        response_cc.content as response_content,
        response_cc.sent_at as response_sent_at
        
      FROM customer_correspondence cc
      LEFT JOIN customers c ON cc.customer_id = c.id::text
      LEFT JOIN vehicles v ON cc.vehicle_registration = v.registration
      LEFT JOIN customer_correspondence response_cc ON (
        response_cc.customer_id = cc.customer_id 
        AND response_cc.direction = 'inbound'
        AND response_cc.created_at > cc.sent_at
        AND response_cc.created_at < cc.sent_at + INTERVAL '24 hours'
      )
      ${whereClause}
      ORDER BY cc.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset])

    // Get summary statistics
    const summaryStats = await sql.unsafe(`
      SELECT 
        COUNT(*) as total_communications,
        COUNT(CASE WHEN cc.direction = 'outbound' THEN 1 END) as outbound_count,
        COUNT(CASE WHEN cc.direction = 'inbound' THEN 1 END) as inbound_count,
        COUNT(CASE WHEN cc.communication_type = 'whatsapp' THEN 1 END) as whatsapp_count,
        COUNT(CASE WHEN cc.communication_type = 'sms' THEN 1 END) as sms_count,
        COUNT(CASE WHEN cc.communication_type = 'email' THEN 1 END) as email_count,
        COUNT(CASE WHEN cc.communication_type = 'phone_call' THEN 1 END) as call_count,
        COUNT(CASE WHEN cc.requires_response = true AND cc.responded_at IS NULL THEN 1 END) as pending_responses,
        COUNT(CASE WHEN cc.auto_response_sent = true THEN 1 END) as automated_responses,
        SUM(cc.cost) as total_cost,
        MAX(cc.created_at) as last_communication
      FROM customer_correspondence cc
      ${whereClause}
    `, queryParams)

    // Group by communication type for better organization
    const groupedCorrespondence = correspondence.reduce((acc: any, item: any) => {
      const type = item.communication_type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(item)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        correspondence,
        groupedByType: groupedCorrespondence,
        summary: summaryStats[0],
        pagination: {
          limit,
          offset,
          hasMore: correspondence.length === limit
        }
      }
    })

  } catch (error) {
    console.error('[CORRESPONDENCE-HISTORY] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch correspondence history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * Create new correspondence entry
 * POST /api/correspondence/history
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customerId,
      vehicleRegistration,
      communicationType,
      direction,
      subject,
      content,
      contactMethod,
      contactValue,
      messageCategory,
      urgencyLevel = 'normal',
      requiresResponse = false,
      cost = 0,
      whatsappMessageId,
      smsLogId,
      emailId,
      callLogId
    } = body

    // Validate required fields
    if (!customerId || !communicationType || !direction || !content) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: customerId, communicationType, direction, content"
      }, { status: 400 })
    }

    // Insert correspondence record
    const result = await sql`
      INSERT INTO customer_correspondence (
        customer_id,
        vehicle_registration,
        communication_type,
        direction,
        subject,
        content,
        contact_method,
        contact_value,
        message_category,
        urgency_level,
        requires_response,
        cost,
        whatsapp_message_id,
        sms_log_id,
        email_id,
        call_log_id,
        status
      ) VALUES (
        ${customerId},
        ${vehicleRegistration || null},
        ${communicationType},
        ${direction},
        ${subject || null},
        ${content},
        ${contactMethod || null},
        ${contactValue || null},
        ${messageCategory || 'general'},
        ${urgencyLevel},
        ${requiresResponse},
        ${cost},
        ${whatsappMessageId || null},
        ${smsLogId || null},
        ${emailId || null},
        ${callLogId || null},
        ${direction === 'outbound' ? 'sent' : 'received'}
      )
      RETURNING id, created_at
    `

    console.log(`[CORRESPONDENCE-HISTORY] ✅ Created correspondence record ${result[0].id}`)

    return NextResponse.json({
      success: true,
      data: {
        correspondenceId: result[0].id,
        createdAt: result[0].created_at
      }
    })

  } catch (error) {
    console.error('[CORRESPONDENCE-HISTORY] ❌ Error creating record:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to create correspondence record",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * Update correspondence status
 * PATCH /api/correspondence/history
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const {
      correspondenceId,
      status,
      deliveryStatus,
      readAt,
      respondedAt,
      assignedTo,
      responseDeadline
    } = body

    if (!correspondenceId) {
      return NextResponse.json({
        success: false,
        error: "correspondenceId is required"
      }, { status: 400 })
    }

    // Build update query dynamically
    const updates = []
    const values = []

    if (status) {
      updates.push(`status = $${values.length + 1}`)
      values.push(status)
    }

    if (deliveryStatus) {
      updates.push(`delivery_status = $${values.length + 1}`)
      values.push(deliveryStatus)
    }

    if (readAt) {
      updates.push(`read_at = $${values.length + 1}`)
      values.push(readAt)
    }

    if (respondedAt) {
      updates.push(`responded_at = $${values.length + 1}`)
      values.push(respondedAt)
    }

    if (assignedTo) {
      updates.push(`assigned_to = $${values.length + 1}`)
      values.push(assignedTo)
    }

    if (responseDeadline) {
      updates.push(`response_deadline = $${values.length + 1}`)
      values.push(responseDeadline)
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No updates provided"
      }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(correspondenceId)

    await sql.unsafe(`
      UPDATE customer_correspondence 
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
    `, values)

    console.log(`[CORRESPONDENCE-HISTORY] ✅ Updated correspondence ${correspondenceId}`)

    return NextResponse.json({
      success: true,
      message: "Correspondence updated successfully"
    })

  } catch (error) {
    console.error('[CORRESPONDENCE-HISTORY] ❌ Error updating record:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to update correspondence record",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
