import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, message, source, vehicleRegistration } = body

    console.log("[CUSTOMER-RESPONSE] Processing customer response:", { phone, message, source })

    // Create customer_responses table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS customer_responses (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        phone TEXT,
        email TEXT,
        message TEXT,
        response_type TEXT, -- 'sold', 'no_longer_own', 'opt_out', 'update_contact', 'add_email', 'update_phone', 'other'
        vehicle_registration TEXT,
        source TEXT, -- 'sms', 'email', 'phone', 'web'
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        notes TEXT,
        extracted_data JSONB -- Store extracted email/phone data
      )
    `

    // Create vehicle_ownership_changes table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS vehicle_ownership_changes (
        id SERIAL PRIMARY KEY,
        vehicle_registration TEXT,
        previous_owner_id INTEGER,
        change_type TEXT, -- 'sold', 'scrapped', 'exported', 'unknown'
        change_date DATE DEFAULT CURRENT_DATE,
        reported_by TEXT, -- 'customer', 'dvla', 'manual'
        new_contact_info JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        verified BOOLEAN DEFAULT FALSE
      )
    `

    // Analyze the message to determine response type
    const messageText = message.toLowerCase()
    let responseType = 'other'
    let shouldProcessImmediately = false
    let extractedData = null

    // Check for email addresses in the message
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emailMatches = message.match(emailRegex)

    // Check for phone numbers in the message
    const phoneRegex = /\b(?:0[1-9]\d{8,9}|\+44[1-9]\d{8,9})\b/g
    const phoneMatches = message.match(phoneRegex)

    if (messageText.includes('sold') || messageText.includes('no longer own') || messageText.includes('not mine')) {
      responseType = 'sold'
      shouldProcessImmediately = true
    } else if (messageText.includes('stop') || messageText.includes('unsubscribe') || messageText.includes('opt out')) {
      responseType = 'opt_out'
      shouldProcessImmediately = true
    } else if (emailMatches && emailMatches.length > 0) {
      responseType = 'add_email'
      shouldProcessImmediately = true
      extractedData = { email: emailMatches[0] }
    } else if (phoneMatches && phoneMatches.length > 0) {
      responseType = 'update_phone'
      shouldProcessImmediately = true
      extractedData = { phone: phoneMatches[0] }
    } else if (messageText.includes('new number') || messageText.includes('changed number') || messageText.includes('update')) {
      responseType = 'update_contact'
    } else if (messageText.includes('wrong number') || messageText.includes('not my car')) {
      responseType = 'no_longer_own'
      shouldProcessImmediately = true
    } else if (messageText.includes('email') && !emailMatches) {
      responseType = 'email_request'
      shouldProcessImmediately = true
    }

    // Find customer by phone number
    const customer = await sql`
      SELECT id, first_name, last_name, email
      FROM customers
      WHERE twilio_phone = ${phone} OR phone = ${phone}
      LIMIT 1
    `

    const customerId = customer.length > 0 ? customer[0].id : null

    // Insert the response
    const response = await sql`
      INSERT INTO customer_responses (
        customer_id, phone, message, response_type, vehicle_registration,
        source, processed, extracted_data
      ) VALUES (
        ${customerId}, ${phone}, ${message}, ${responseType}, ${vehicleRegistration},
        ${source}, ${shouldProcessImmediately}, ${extractedData ? JSON.stringify(extractedData) : null}
      )
      RETURNING id, response_type
    `

    // Process immediately if it's a critical response
    if (shouldProcessImmediately) {
      await processCustomerResponse(response[0].id, responseType, customerId, phone, vehicleRegistration, extractedData)
    }

    return NextResponse.json({
      success: true,
      responseId: response[0].id,
      responseType,
      processed: shouldProcessImmediately,
      message: shouldProcessImmediately
        ? "Response processed immediately"
        : "Response logged for manual review"
    })

  } catch (error) {
    console.error("[CUSTOMER-RESPONSE] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process customer response" },
      { status: 500 }
    )
  }
}

async function processCustomerResponse(responseId: number, responseType: string, customerId: number | null, phone: string, vehicleRegistration?: string, extractedData?: any) {
  try {
    if (responseType === 'opt_out') {
      // Mark customer as opted out
      if (customerId) {
        await sql`
          UPDATE customers
          SET opt_out = TRUE, opt_out_date = NOW(), updated_at = NOW()
          WHERE id = ${customerId}
        `
      }
    } else if (responseType === 'sold' || responseType === 'no_longer_own') {
      // Record vehicle ownership change
      if (vehicleRegistration && customerId) {
        await sql`
          INSERT INTO vehicle_ownership_changes (
            vehicle_registration, previous_owner_id, change_type, reported_by
          ) VALUES (
            ${vehicleRegistration}, ${customerId}, ${responseType}, 'customer'
          )
        `

        // Remove vehicle from customer's active vehicles (don't delete, just mark)
        await sql`
          UPDATE vehicles
          SET active = FALSE, ownership_status = 'sold', updated_at = NOW()
          WHERE registration = ${vehicleRegistration} AND owner_id = ${customerId}
        `
      }
    } else if (responseType === 'add_email' && extractedData?.email && customerId) {
      // Add email address to customer record
      await sql`
        UPDATE customers
        SET email = ${extractedData.email}, email_verified = TRUE, updated_at = NOW()
        WHERE id = ${customerId}
      `

      // Log the contact update
      await sql`
        INSERT INTO contact_updates (customer_id, update_type, old_value, new_value, source)
        VALUES (${customerId}, 'email_added', NULL, ${extractedData.email}, 'sms_response')
      `
    } else if (responseType === 'update_phone' && extractedData?.phone && customerId) {
      // Update phone number
      const oldPhone = await sql`SELECT phone FROM customers WHERE id = ${customerId}`

      await sql`
        UPDATE customers
        SET phone = ${extractedData.phone}, phone_verified = TRUE, updated_at = NOW()
        WHERE id = ${customerId}
      `

      // Log the contact update
      await sql`
        INSERT INTO contact_updates (customer_id, update_type, old_value, new_value, source)
        VALUES (${customerId}, 'phone_updated', ${oldPhone[0]?.phone}, ${extractedData.phone}, 'sms_response')
      `
    }

    // Mark response as processed
    await sql`
      UPDATE customer_responses
      SET processed = TRUE, processed_at = NOW()
      WHERE id = ${responseId}
    `

  } catch (error) {
    console.error("[PROCESS-CUSTOMER-RESPONSE] Error:", error)
  }
}

export async function GET() {
  try {
    // Get recent customer responses
    const responses = await sql`
      SELECT
        cr.*,
        c.first_name,
        c.last_name,
        c.email,
        v.make,
        v.model
      FROM customer_responses cr
      LEFT JOIN customers c ON cr.customer_id = c.id
      LEFT JOIN vehicles v ON cr.vehicle_registration = v.registration
      ORDER BY cr.created_at DESC
      LIMIT 100
    `

    // Get response statistics
    const stats = await sql`
      SELECT
        COUNT(*) as total_responses,
        COUNT(CASE WHEN response_type = 'sold' THEN 1 END) as sold_responses,
        COUNT(CASE WHEN response_type = 'opt_out' THEN 1 END) as opt_out_responses,
        COUNT(CASE WHEN response_type = 'update_contact' THEN 1 END) as update_requests,
        COUNT(CASE WHEN processed = TRUE THEN 1 END) as processed_responses,
        COUNT(CASE WHEN processed = FALSE THEN 1 END) as pending_responses
      FROM customer_responses
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `

    return NextResponse.json({
      success: true,
      responses,
      statistics: stats[0],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[GET-CUSTOMER-RESPONSES] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get customer responses" },
      { status: 500 }
    )
  }
}
