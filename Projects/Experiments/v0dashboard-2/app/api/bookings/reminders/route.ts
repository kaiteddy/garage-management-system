import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'
import { addHours, subHours, format } from 'date-fns'

// Mock email/SMS sending functions (replace with real services)
async function sendEmail(to: string, subject: string, message: string) {
  console.log(`📧 [EMAIL] To: ${to}, Subject: ${subject}`)
  console.log(`📧 [EMAIL] Message: ${message}`)
  // In production, integrate with services like:
  // - SendGrid, Mailgun, AWS SES for email
  // - Twilio, AWS SNS for SMS
  return { success: true, messageId: `email_${Date.now()}` }
}

async function sendSMS(to: string, message: string) {
  console.log(`📱 [SMS] To: ${to}`)
  console.log(`📱 [SMS] Message: ${message}`)
  // In production, integrate with Twilio, AWS SNS, etc.
  return { success: true, messageId: `sms_${Date.now()}` }
}

// GET /api/bookings/reminders - Get reminder status and settings
export async function GET(request: NextRequest) {
  try {
    // Get upcoming bookings that need reminders
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')

    const in2Hours = addHours(new Date(), 2)
    const in2HoursStr = format(in2Hours, 'yyyy-MM-dd HH:mm:ss')

    // Bookings needing 24-hour reminders
    const bookingsFor24hReminder = await sql`
      SELECT
        b.*,
        'Test Customer' as customer_name,
        'test@example.com' as customer_email_db,
        '07123456789' as customer_phone_db,
        st.name as service_name,
        'AB12CDE' as vehicle_registration
      FROM bookings b
      LEFT JOIN service_types st ON b.service_type_id = st.id
      WHERE b.scheduled_date = ${tomorrowStr}
      AND b.status = 'scheduled'
      AND b.reminder_sent_at IS NULL
    `

    // Bookings needing 2-hour reminders (simplified for now)
    const bookingsFor2hReminder = await sql`
      SELECT
        b.*,
        'Test Customer' as customer_name,
        'test@example.com' as customer_email_db,
        '07123456789' as customer_phone_db,
        st.name as service_name,
        'AB12CDE' as vehicle_registration
      FROM bookings b
      LEFT JOIN service_types st ON b.service_type_id = st.id
      WHERE b.scheduled_date = CURRENT_DATE
      AND b.status = 'scheduled'
      AND b.scheduled_start_time <= '11:00:00'
      AND b.scheduled_start_time >= '09:00:00'
      LIMIT 10
    `

    // Get reminder statistics
    const reminderStats = await sql`
      SELECT 
        reminder_type,
        status,
        COUNT(*) as count
      FROM booking_reminders
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY reminder_type, status
    `

    return NextResponse.json({
      success: true,
      data: {
        pending24hReminders: bookingsFor24hReminder.length,
        pending2hReminders: bookingsFor2hReminder.length,
        bookingsFor24hReminder,
        bookingsFor2hReminder,
        reminderStats
      }
    })

  } catch (error) {
    console.error('❌ [REMINDERS] Error getting reminder data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/bookings/reminders - Send reminders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type = 'all', bookingIds = [] } = body

    let sentCount = 0
    let errorCount = 0
    const results = []

    // Get bookings to send reminders for
    let bookingsToRemind = []

    if (bookingIds.length > 0) {
      // Send reminders for specific bookings
      bookingsToRemind = await sql`
        SELECT 
          b.*,
          c.name as customer_name,
          c.email as customer_email_db,
          c.phone as customer_phone_db,
          st.name as service_name,
          v.registration as vehicle_registration
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN service_types st ON b.service_type_id = st.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.id = ANY(${bookingIds})
        AND b.status = 'scheduled'
      `
    } else {
      // Send all pending reminders
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')

      const in2Hours = addHours(new Date(), 2)
      const in2HoursStr = format(in2Hours, 'yyyy-MM-dd HH:mm:ss')

      if (type === 'all' || type === '24h') {
        const bookings24h = await sql`
          SELECT 
            b.*,
            c.name as customer_name,
            c.email as customer_email_db,
            c.phone as customer_phone_db,
            st.name as service_name,
            v.registration as vehicle_registration,
            'reminder_24h' as reminder_type
          FROM bookings b
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN service_types st ON b.service_type_id = st.id
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.scheduled_date = ${tomorrowStr}
          AND b.status = 'scheduled'
          AND b.reminder_sent_at IS NULL
        `
        bookingsToRemind = [...bookingsToRemind, ...bookings24h]
      }

      if (type === 'all' || type === '2h') {
        const bookings2h = await sql`
          SELECT 
            b.*,
            c.name as customer_name,
            c.email as customer_email_db,
            c.phone as customer_phone_db,
            st.name as service_name,
            v.registration as vehicle_registration,
            'reminder_2h' as reminder_type
          FROM bookings b
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN service_types st ON b.service_type_id = st.id
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.scheduled_date = CURRENT_DATE
          AND CONCAT(b.scheduled_date, ' ', b.scheduled_start_time)::timestamp <= ${in2HoursStr}::timestamp
          AND CONCAT(b.scheduled_date, ' ', b.scheduled_start_time)::timestamp > NOW()
          AND b.status = 'scheduled'
          AND NOT EXISTS (
            SELECT 1 FROM booking_reminders br 
            WHERE br.booking_id = b.id 
            AND br.reminder_type = 'reminder_2h'
            AND br.status = 'sent'
          )
        `
        bookingsToRemind = [...bookingsToRemind, ...bookings2h]
      }
    }

    // Send reminders
    for (const booking of bookingsToRemind) {
      try {
        const reminderType = booking.reminder_type || (bookingIds.length > 0 ? 'manual' : 'reminder_24h')
        const customerEmail = booking.customer_email || booking.customer_email_db
        const customerPhone = booking.customer_phone || booking.customer_phone_db

        // Prepare message content
        const appointmentDate = format(new Date(booking.scheduled_date), 'EEEE, MMMM d, yyyy')
        const appointmentTime = booking.scheduled_start_time

        const emailSubject = `Appointment Reminder - ${booking.service_name}`
        const emailMessage = `
Dear ${booking.customer_name},

This is a reminder of your upcoming appointment:

Service: ${booking.service_name}
Date: ${appointmentDate}
Time: ${appointmentTime}
Vehicle: ${booking.vehicle_registration}
Reference: ${booking.booking_reference}

Please arrive 10 minutes early. If you need to reschedule or cancel, please contact us as soon as possible.

Thank you,
Your Garage Team
        `.trim()

        const smsMessage = `Reminder: ${booking.service_name} appointment ${appointmentDate} at ${appointmentTime} for ${booking.vehicle_registration}. Ref: ${booking.booking_reference}`

        // Send email reminder
        if (customerEmail) {
          const emailResult = await sendEmail(customerEmail, emailSubject, emailMessage)
          
          await sql`
            INSERT INTO booking_reminders (
              booking_id, reminder_type, method, recipient, message, status, sent_at
            ) VALUES (
              ${booking.id}, ${reminderType}, 'email', ${customerEmail}, ${emailMessage}, 
              ${emailResult.success ? 'sent' : 'failed'}, NOW()
            )
          `

          if (emailResult.success) sentCount++
          else errorCount++
        }

        // Send SMS reminder
        if (customerPhone) {
          const smsResult = await sendSMS(customerPhone, smsMessage)
          
          await sql`
            INSERT INTO booking_reminders (
              booking_id, reminder_type, method, recipient, message, status, sent_at
            ) VALUES (
              ${booking.id}, ${reminderType}, 'sms', ${customerPhone}, ${smsMessage}, 
              ${smsResult.success ? 'sent' : 'failed'}, NOW()
            )
          `

          if (smsResult.success) sentCount++
          else errorCount++
        }

        // Update booking reminder timestamp
        await sql`
          UPDATE bookings 
          SET reminder_sent_at = NOW()
          WHERE id = ${booking.id}
        `

        results.push({
          bookingId: booking.id,
          bookingReference: booking.booking_reference,
          customerName: booking.customer_name,
          success: true
        })

      } catch (error) {
        console.error(`❌ [REMINDERS] Error sending reminder for booking ${booking.id}:`, error)
        errorCount++
        results.push({
          bookingId: booking.id,
          bookingReference: booking.booking_reference,
          customerName: booking.customer_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ [REMINDERS] Sent ${sentCount} reminders, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      data: {
        sentCount,
        errorCount,
        totalProcessed: bookingsToRemind.length,
        results
      },
      message: `Processed ${bookingsToRemind.length} bookings: ${sentCount} reminders sent, ${errorCount} errors`
    })

  } catch (error) {
    console.error('❌ [REMINDERS] Error sending reminders:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
