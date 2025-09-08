import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

interface MOTReminderRequest {
  vehicleIds?: string[]
  reminderType: 'expired' | 'expiring_soon' | 'custom'
  customDays?: number
  messageTemplate?: string
  testMode?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: MOTReminderRequest = await request.json()
    console.log('[MOT-REMINDERS] Processing reminder request:', body)

    // Validate Twilio configuration
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return NextResponse.json({
        success: false,
        error: 'Twilio configuration missing. Please configure Twilio settings first.',
        missingConfig: {
          accountSid: !TWILIO_ACCOUNT_SID,
          authToken: !TWILIO_AUTH_TOKEN,
          phoneNumber: !TWILIO_PHONE_NUMBER
        }
      }, { status: 400 })
    }

    // Get vehicles based on criteria
    let vehicles = []
    
    if (body.vehicleIds && body.vehicleIds.length > 0) {
      // Specific vehicles
      const placeholders = body.vehicleIds.map((_, i) => `$${i + 1}`).join(',')
      vehicles = await sql`
        SELECT DISTINCT
          v.id,
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          v.mot_status,
          c.first_name,
          c.last_name,
          c.phone,
          c.mobile,
          c.email
        FROM vehicles v
        LEFT JOIN customers c ON v.customer_id = c.id
        WHERE v.id = ANY(${body.vehicleIds})
          AND v.mot_expiry_date IS NOT NULL
          AND (c.phone IS NOT NULL OR c.mobile IS NOT NULL)
        ORDER BY v.mot_expiry_date ASC
      `
    } else {
      // Get vehicles based on reminder type
      let dateCondition = ''
      const today = new Date()
      
      switch (body.reminderType) {
        case 'expired':
          dateCondition = 'v.mot_expiry_date < CURRENT_DATE'
          break
        case 'expiring_soon':
          const soonDate = new Date()
          soonDate.setDate(today.getDate() + 30) // 30 days from now
          dateCondition = `v.mot_expiry_date BETWEEN CURRENT_DATE AND '${soonDate.toISOString().split('T')[0]}'`
          break
        case 'custom':
          if (body.customDays) {
            const customDate = new Date()
            customDate.setDate(today.getDate() + body.customDays)
            dateCondition = `v.mot_expiry_date BETWEEN CURRENT_DATE AND '${customDate.toISOString().split('T')[0]}'`
          }
          break
      }

      if (dateCondition) {
        vehicles = await sql`
          SELECT DISTINCT
            v.id,
            v.registration,
            v.make,
            v.model,
            v.mot_expiry_date,
            v.mot_status,
            c.first_name,
            c.last_name,
            c.phone,
            c.mobile,
            c.email
          FROM vehicles v
          LEFT JOIN customers c ON v.customer_id = c.id
          WHERE ${sql.unsafe(dateCondition)}
            AND v.mot_expiry_date IS NOT NULL
            AND (c.phone IS NOT NULL OR c.mobile IS NOT NULL)
          ORDER BY v.mot_expiry_date ASC
        `
      }
    }

    console.log(`[MOT-REMINDERS] Found ${vehicles.length} vehicles to process`)

    if (vehicles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vehicles found matching criteria or no phone numbers available',
        sent: 0,
        failed: 0,
        results: []
      })
    }

    // Initialize Twilio client
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    const results = []
    let sentCount = 0
    let failedCount = 0

    // Process each vehicle
    for (const vehicle of vehicles) {
      try {
        const customerName = `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim()
        const phoneNumber = vehicle.mobile || vehicle.phone
        
        if (!phoneNumber) {
          results.push({
            vehicleId: vehicle.id,
            registration: vehicle.registration,
            customer: customerName,
            status: 'failed',
            error: 'No phone number available'
          })
          failedCount++
          continue
        }

        // Format phone number (ensure it starts with +44 for UK)
        let formattedPhone = phoneNumber.replace(/\\s+/g, '').replace(/^0/, '+44')
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+44' + formattedPhone
        }

        // Generate message
        const motDate = new Date(vehicle.mot_expiry_date).toLocaleDateString('en-GB')
        const isExpired = new Date(vehicle.mot_expiry_date) < new Date()
        
        let message = body.messageTemplate || (isExpired 
          ? `Hi ${customerName}, your ${vehicle.make} ${vehicle.model} (${vehicle.registration}) MOT expired on ${motDate}. Please book your MOT test urgently. Contact us to arrange. Reply STOP to opt out.`
          : `Hi ${customerName}, your ${vehicle.make} ${vehicle.model} (${vehicle.registration}) MOT expires on ${motDate}. Book your MOT test now to avoid any issues. Contact us to arrange. Reply STOP to opt out.`
        )

        // Replace placeholders in custom message
        message = message
          .replace(/\\{customerName\\}/g, customerName)
          .replace(/\\{registration\\}/g, vehicle.registration)
          .replace(/\\{make\\}/g, vehicle.make || '')
          .replace(/\\{model\\}/g, vehicle.model || '')
          .replace(/\\{motDate\\}/g, motDate)
          .replace(/\\{status\\}/g, isExpired ? 'EXPIRED' : 'EXPIRING')

        if (body.testMode) {
          // Test mode - don't actually send
          results.push({
            vehicleId: vehicle.id,
            registration: vehicle.registration,
            customer: customerName,
            phone: formattedPhone,
            message: message,
            status: 'test_mode',
            motDate: motDate
          })
          sentCount++
        } else {
          // Send actual SMS
          const smsResult = await twilio.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: formattedPhone
          })

          // Log the reminder in database
          await sql`
            INSERT INTO mot_reminders (
              vehicle_id,
              customer_id,
              phone_number,
              message_content,
              twilio_sid,
              status,
              sent_at,
              reminder_type
            ) VALUES (
              ${vehicle.id},
              ${vehicle.customer_id || null},
              ${formattedPhone},
              ${message},
              ${smsResult.sid},
              'sent',
              NOW(),
              ${body.reminderType}
            )
          `

          results.push({
            vehicleId: vehicle.id,
            registration: vehicle.registration,
            customer: customerName,
            phone: formattedPhone,
            status: 'sent',
            twilioSid: smsResult.sid,
            motDate: motDate
          })
          sentCount++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`[MOT-REMINDERS] Error sending to ${vehicle.registration}:`, error)
        results.push({
          vehicleId: vehicle.id,
          registration: vehicle.registration,
          customer: `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim(),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failedCount++
      }
    }

    console.log(`[MOT-REMINDERS] Completed: ${sentCount} sent, ${failedCount} failed`)

    return NextResponse.json({
      success: true,
      message: `MOT reminders processed: ${sentCount} sent, ${failedCount} failed`,
      sent: sentCount,
      failed: failedCount,
      testMode: body.testMode || false,
      results: results
    })

  } catch (error) {
    console.error('[MOT-REMINDERS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
