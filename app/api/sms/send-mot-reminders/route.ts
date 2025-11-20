import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { TwilioService, initializeSMSLog } from "@/lib/twilio-service"

export async function POST(request: Request) {
  try {
    const { dryRun = true, limit = 10, customerIds = [], urgencyFilter = 'all', channel = 'sms' } = await request.json().catch(() => ({}))

    console.log(`[SMS-MOT-REMINDERS] ${dryRun ? 'DRY RUN' : 'LIVE'} - Sending MOT reminders via ${channel.toUpperCase()}`)
    console.log(`[SMS-MOT-REMINDERS] Channel: ${channel}, Cost per message: ${channel === 'whatsapp' ? '£0.005' : '£0.04'}`)

    // Initialize SMS log table
    await initializeSMSLog()

    // Get customers with critical MOTs and valid phone numbers
    let criticalMOTs

    if (urgencyFilter === 'expired') {
      criticalMOTs = await sql`
        SELECT
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          v.vehicle_age,
          v.owner_id,
          c.id as customer_id,
          c.first_name,
          c.last_name,
          c.phone,
          c.twilio_phone,
          c.email,
          'EXPIRED' as urgency,
          CURRENT_DATE - v.mot_expiry_date as days_overdue,
          v.mot_expiry_date - CURRENT_DATE as days_until_expiry
        FROM vehicles v
        JOIN customers c ON v.owner_id = c.id
        WHERE v.mot_expiry_date IS NOT NULL
        AND c.twilio_phone IS NOT NULL
        AND c.twilio_phone != ''
        AND (c.opt_out = FALSE OR c.opt_out IS NULL)
        AND v.mot_expiry_date < CURRENT_DATE
        ORDER BY v.mot_expiry_date ASC
        LIMIT ${limit}
      `
    } else if (urgencyFilter === 'critical') {
      criticalMOTs = await sql`
        SELECT
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          v.vehicle_age,
          v.owner_id,
          c.id as customer_id,
          c.first_name,
          c.last_name,
          c.phone,
          c.twilio_phone,
          c.email,
          'CRITICAL' as urgency,
          CURRENT_DATE - v.mot_expiry_date as days_overdue,
          v.mot_expiry_date - CURRENT_DATE as days_until_expiry
        FROM vehicles v
        JOIN customers c ON v.owner_id = c.id
        WHERE v.mot_expiry_date IS NOT NULL
        AND c.twilio_phone IS NOT NULL
        AND c.twilio_phone != ''
        AND (c.opt_out = FALSE OR c.opt_out IS NULL)
        AND v.mot_expiry_date >= CURRENT_DATE
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY v.mot_expiry_date ASC
        LIMIT ${limit}
      `
    } else {
      // Default to all critical MOTs (expired + critical + due soon)
      criticalMOTs = await sql`
        SELECT
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          v.vehicle_age,
          v.owner_id,
          c.id as customer_id,
          c.first_name,
          c.last_name,
          c.phone,
          c.twilio_phone,
          c.email,
          CASE
            WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
            ELSE 'OK'
          END as urgency,
          CURRENT_DATE - v.mot_expiry_date as days_overdue,
          v.mot_expiry_date - CURRENT_DATE as days_until_expiry
        FROM vehicles v
        JOIN customers c ON v.owner_id = c.id
        WHERE v.mot_expiry_date IS NOT NULL
        AND c.twilio_phone IS NOT NULL
        AND c.twilio_phone != ''
        AND (c.opt_out = FALSE OR c.opt_out IS NULL)
        AND v.mot_expiry_date < CURRENT_DATE + INTERVAL '30 days'
        ORDER BY v.mot_expiry_date ASC
        LIMIT ${limit}
      `
    }

    console.log(`[SMS-MOT-REMINDERS] Found ${criticalMOTs.length} vehicles needing MOT reminders`)

    // Group vehicles by customer to send combined messages
    const customerVehicles = new Map()

    criticalMOTs.forEach(vehicle => {
      const customerId = vehicle.customer_id
      if (!customerVehicles.has(customerId)) {
        customerVehicles.set(customerId, {
          customer: {
            id: customerId,
            name: `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim() || 'Customer',
            phone: vehicle.twilio_phone,
            email: vehicle.email
          },
          vehicles: []
        })
      }
      customerVehicles.get(customerId).vehicles.push(vehicle)
    })

    const smsMessages = []
    const results = []
    let totalCost = 0

    // Generate messages for each customer (grouped by customer)
    for (const [customerId, customerData] of customerVehicles) {
      const { customer, vehicles } = customerData

      // Determine overall urgency for this customer
      const hasExpired = vehicles.some(v => v.urgency === 'EXPIRED')
      const hasCritical = vehicles.some(v => v.urgency === 'CRITICAL')

      let urgency: 'expired' | 'critical' | 'due_soon'
      if (hasExpired) {
        urgency = 'expired'
      } else if (hasCritical) {
        urgency = 'critical'
      } else {
        urgency = 'due_soon'
      }

      // Generate message using TwilioService
      const message = TwilioService.generateMOTReminderMessage(
        customer.name,
        vehicles,
        urgency
      )

      const smsMessage = {
        to: customer.phone,
        body: message,
        customerId: customer.id,
        vehicleRegistration: vehicles[0].registration, // Primary vehicle
        messageType: 'mot_reminder',
        urgencyLevel: urgency
      }

      smsMessages.push({
        customer,
        vehicles,
        message,
        urgency,
        phone: customer.phone,
        estimatedCost: Math.ceil(message.length / 160) * 0.04
      })

      // Send SMS if not dry run
      if (!dryRun && TwilioService.isConfigured()) {
        // Add channel to message
        smsMessage.channel = channel as 'sms' | 'whatsapp'
        const result = await TwilioService.sendMessage(smsMessage)
        results.push({
          customer: customer.name,
          phone: customer.phone,
          vehicles: vehicles.length,
          success: result.success,
          messageSid: result.messageSid,
          error: result.error,
          cost: result.cost || 0
        })

        if (result.success) {
          totalCost += result.cost || 0
        }
      }
    }

    // Generate summary
    const summary = {
      totalCustomers: customerVehicles.size,
      totalVehicles: criticalMOTs.length,
      messagesSent: dryRun ? 0 : results.filter(r => r.success).length,
      messagesFailed: dryRun ? 0 : results.filter(r => !r.success).length,
      totalCost: Math.round(totalCost * 100) / 100,
      estimatedCost: Math.round(smsMessages.reduce((sum, msg) => sum + msg.estimatedCost, 0) * 100) / 100,
      urgencyBreakdown: {
        expired: smsMessages.filter(msg => msg.urgency === 'expired').length,
        critical: smsMessages.filter(msg => msg.urgency === 'critical').length,
        due_soon: smsMessages.filter(msg => msg.urgency === 'due_soon').length
      }
    }

    return NextResponse.json({
      success: true,
      mode: dryRun ? 'DRY_RUN' : 'LIVE_SEND',
      summary,
      sampleMessages: smsMessages.slice(0, 5),
      results: dryRun ? [] : results,
      twilioConfig: TwilioService.getConfiguration(),
      recommendations: [
        dryRun ? "Review messages and run with dryRun=false to send" : "Messages sent successfully",
        "Monitor delivery status via webhook",
        "Process customer responses for database cleanup",
        "Schedule follow-up reminders for non-responders"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SMS-MOT-REMINDERS] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to send MOT reminders",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
