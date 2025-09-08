import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[PREPARE-TWILIO-MESSAGES] Preparing SMS messages for Twilio...")

    // Get customers with critical MOTs ready for SMS
    const smsReadyCustomers = await sql`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.twilio_phone,
        c.email,
        COUNT(DISTINCT v.registration) as total_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date < CURRENT_DATE
                              AND v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                              THEN v.registration END) as expired_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
                              THEN v.registration END) as expiring_vehicles,
        MIN(v.mot_expiry_date) as earliest_expiry,
        ARRAY_AGG(DISTINCT
          CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                    AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
               THEN v.registration || '|' || COALESCE(v.make, '') || '|' || COALESCE(v.model, '') || '|' ||
                    COALESCE(v.vehicle_age::text, 'Unknown') || '|' || v.mot_expiry_date::text
          END
        ) FILTER (WHERE v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                         AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days') as critical_vehicles_info
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      WHERE c.twilio_phone IS NOT NULL
      AND c.phone_verified = TRUE
      AND (c.opt_out = FALSE OR c.opt_out IS NULL)
      AND v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      GROUP BY c.id, c.first_name, c.last_name, c.twilio_phone, c.email
      ORDER BY MIN(v.mot_expiry_date) ASC
      LIMIT 50
    `

    // Generate SMS messages for each customer
    const smsMessages = smsReadyCustomers.map(customer => {
      const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'
      const vehicles = customer.critical_vehicles_info.filter(v => v !== null)

      let message = ''
      let urgencyLevel = 'medium'

      if (customer.expired_vehicles > 0 && customer.expiring_vehicles > 0) {
        // Both expired and expiring
        urgencyLevel = 'high'
        message = `Hi ${customerName}, you have ${customer.expired_vehicles} vehicle(s) with EXPIRED MOTs and ${customer.expiring_vehicles} expiring soon. `
      } else if (customer.expired_vehicles > 0) {
        // Only expired
        urgencyLevel = 'high'
        message = `Hi ${customerName}, you have ${customer.expired_vehicles} vehicle(s) with EXPIRED MOTs. `
      } else {
        // Only expiring
        urgencyLevel = 'medium'
        message = `Hi ${customerName}, you have ${customer.expiring_vehicles} vehicle(s) with MOTs expiring soon. `
      }

      // Add vehicle details (limit to 2 vehicles to keep SMS short)
      const vehicleDetails = vehicles.slice(0, 2).map(vehicleInfo => {
        const [reg, make, model, age, expiry] = vehicleInfo.split('|')
        const expiryDate = new Date(expiry)
        const isExpired = expiryDate < new Date()
        const ageText = age !== 'Unknown' ? ` (${age} years old)` : ''

        if (isExpired) {
          const daysExpired = Math.floor((new Date().getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24))
          return `${reg} ${make} ${model}${ageText} - EXPIRED ${daysExpired} days ago`
        } else {
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          return `${reg} ${make} ${model}${ageText} - expires in ${daysUntilExpiry} days`
        }
      })

      message += vehicleDetails.join('. ')

      if (vehicles.length > 2) {
        message += ` and ${vehicles.length - 2} more vehicle(s)`
      }

      message += '. Please contact us to book your MOT. Reply: SOLD (if no longer yours), EMAIL yourname@email.com (to add email), or STOP to opt out.'

      // Ensure message is under 160 characters for single SMS
      if (message.length > 160) {
        // Create shorter version
        const shortVehicle = vehicles[0].split('|')
        const [reg, make, model] = shortVehicle
        message = `Hi ${customerName}, your ${reg} ${make} ${model} MOT needs attention. `

        if (customer.expired_vehicles > 0) {
          message += 'EXPIRED - please book immediately. '
        } else {
          message += 'Expires soon - please book MOT. '
        }

        if (vehicles.length > 1) {
          message += `+${vehicles.length - 1} more vehicles. `
        }

        message += 'Call us today. Reply SOLD/EMAIL address/STOP to opt out.'
      }

      return {
        customerId: customer.id,
        customerName,
        phone: customer.twilio_phone,
        email: customer.email,
        message,
        messageLength: message.length,
        urgencyLevel,
        vehicleCount: vehicles.length,
        expiredVehicles: customer.expired_vehicles,
        expiringVehicles: customer.expiring_vehicles,
        earliestExpiry: customer.earliest_expiry,
        estimatedCost: message.length <= 160 ? 0.04 : Math.ceil(message.length / 160) * 0.04 // Approximate Twilio cost
      }
    })

    // Calculate summary statistics
    const totalMessages = smsMessages.length
    const totalCost = smsMessages.reduce((sum, msg) => sum + msg.estimatedCost, 0)
    const urgencyBreakdown = {
      high: smsMessages.filter(msg => msg.urgencyLevel === 'high').length,
      medium: smsMessages.filter(msg => msg.urgencyLevel === 'medium').length,
      low: smsMessages.filter(msg => msg.urgencyLevel === 'low').length
    }

    // Sample messages for review
    const sampleMessages = smsMessages.slice(0, 10)

    return NextResponse.json({
      success: true,
      smsPreparation: {
        totalMessages,
        estimatedCost: Math.round(totalCost * 100) / 100,
        urgencyBreakdown,
        averageMessageLength: Math.round(smsMessages.reduce((sum, msg) => sum + msg.messageLength, 0) / totalMessages),
        singleSmsCount: smsMessages.filter(msg => msg.messageLength <= 160).length,
        multiSmsCount: smsMessages.filter(msg => msg.messageLength > 160).length
      },
      sampleMessages,
      twilioConfiguration: {
        accountSid: "YOUR_TWILIO_ACCOUNT_SID", // To be configured
        authToken: "YOUR_TWILIO_AUTH_TOKEN", // To be configured
        fromNumber: "YOUR_TWILIO_PHONE_NUMBER", // To be configured
        webhookUrl: "https://yourdomain.com/api/sms/webhook", // For delivery status
        messagingServiceSid: "YOUR_MESSAGING_SERVICE_SID" // Optional
      },
      recommendations: {
        beforeSending: [
          "Test with a small batch of 5-10 customers first",
          "Verify Twilio account has sufficient credits",
          "Set up delivery status webhooks",
          "Prepare customer service for increased calls",
          "Have booking system ready for increased demand"
        ],
        messageOptimization: [
          "Keep messages under 160 characters when possible",
          "Include clear call-to-action",
          "Provide opt-out mechanism (Reply STOP)",
          "Use customer's name for personalization",
          "Include vehicle registration for clarity"
        ],
        timing: [
          "Send during business hours (9 AM - 6 PM)",
          "Avoid weekends and holidays",
          "Consider sending in batches to manage response volume",
          "Allow 24-48 hours between reminder messages"
        ]
      },
      nextSteps: [
        "Configure Twilio credentials",
        "Set up SMS webhook endpoints",
        "Test with small customer batch",
        "Monitor delivery rates and responses",
        "Scale up based on results"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[PREPARE-TWILIO-MESSAGES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to prepare Twilio messages",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
