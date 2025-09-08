import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { TwilioService, initializeSMSLog } from "@/lib/twilio-service"

export async function POST(request: Request) {
  try {
    const { customerId, vehicleRegistration, messageType = 'individual_reminder', channel = 'sms' } = await request.json()

    console.log(`[SMS-INDIVIDUAL] Sending individual ${channel.toUpperCase()} to customer ${customerId} for vehicle ${vehicleRegistration}`)

    // Initialize SMS log table
    await initializeSMSLog()

    // Get customer and vehicle details
    const customerVehicle = await sql`
      SELECT
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.twilio_phone,
        c.email,
        c.opt_out,
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        v.vehicle_age,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          ELSE 'OK'
        END as urgency,
        CURRENT_DATE - v.mot_expiry_date as days_overdue,
        v.mot_expiry_date - CURRENT_DATE as days_until_expiry
      FROM customers c
      JOIN vehicles v ON c.id = v.owner_id
      WHERE c.id = ${customerId}
      AND v.registration = ${vehicleRegistration}
      AND c.twilio_phone IS NOT NULL
      AND c.twilio_phone != ''
      AND (c.opt_out = FALSE OR c.opt_out IS NULL)
    `

    if (customerVehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Customer not found, no valid phone number, or customer has opted out"
      }, { status: 404 })
    }

    const customer = customerVehicle[0]
    const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'

    // Check if Twilio is configured
    if (!TwilioService.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
      }, { status: 500 })
    }

    // Determine urgency for message generation
    let urgency: 'expired' | 'critical' | 'due_soon'
    if (customer.urgency === 'EXPIRED') {
      urgency = 'expired'
    } else if (customer.urgency === 'CRITICAL') {
      urgency = 'critical'
    } else {
      urgency = 'due_soon'
    }

    // Generate message
    const message = TwilioService.generateMOTReminderMessage(
      customerName,
      [customer],
      urgency
    )

    // Send message via selected channel
    const result = await TwilioService.sendMessage({
      to: customer.twilio_phone,
      body: message,
      customerId: customer.customer_id,
      vehicleRegistration: customer.registration,
      messageType,
      urgencyLevel: urgency,
      channel: channel as 'sms' | 'whatsapp'
    })

    if (result.success) {
      console.log(`[SMS-INDIVIDUAL] ${channel.toUpperCase()} sent successfully to ${customer.twilio_phone} for ${customer.registration}`)

      return NextResponse.json({
        success: true,
        messageSent: true,
        customer: {
          id: customer.customer_id,
          name: customerName,
          phone: customer.twilio_phone,
          email: customer.email
        },
        vehicle: {
          registration: customer.registration,
          make: customer.make,
          model: customer.model,
          motExpiry: customer.mot_expiry_date,
          urgency: customer.urgency
        },
        message: {
          content: message,
          length: message.length,
          segments: Math.ceil(message.length / 160),
          estimatedCost: result.cost
        },
        twilioResult: {
          messageSid: result.messageSid,
          cost: result.cost
        },
        timestamp: new Date().toISOString()
      })
    } else {
      console.error(`[SMS-INDIVIDUAL] Failed to send SMS to ${customer.twilio_phone}:`, result.error)

      return NextResponse.json({
        success: false,
        error: "Failed to send SMS",
        details: result.error,
        customer: {
          id: customer.customer_id,
          name: customerName,
          phone: customer.twilio_phone
        },
        vehicle: {
          registration: customer.registration,
          urgency: customer.urgency
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[SMS-INDIVIDUAL] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to send individual SMS",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
