import twilio from 'twilio'
import { sql } from '@/lib/database/neon-client'

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER // Format: whatsapp:+447xxxxxxxxx

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
}

export interface SMSMessage {
  to: string
  body: string
  customerId?: string
  vehicleRegistration?: string
  messageType?: string
  urgencyLevel?: string
  channel?: 'sms' | 'whatsapp' // New: specify communication channel
  mediaUrl?: string // New: for WhatsApp media messages
}

export interface SMSResult {
  success: boolean
  messageSid?: string
  error?: string
  cost?: number
  channel?: 'sms' | 'whatsapp' // New: track which channel was used
  conversationId?: string // New: WhatsApp conversation ID
}

export class TwilioService {
  static isConfigured(): boolean {
    return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER)
  }

  static isWhatsAppConfigured(): boolean {
    return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER)
  }

  static getConfiguration() {
    return {
      accountSid: TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'NOT_SET',
      authToken: TWILIO_AUTH_TOKEN ? 'CONFIGURED' : 'NOT_SET',
      phoneNumber: TWILIO_PHONE_NUMBER || 'NOT_SET',
      whatsappNumber: TWILIO_WHATSAPP_NUMBER || 'NOT_SET',
      smsConfigured: this.isConfigured(),
      whatsappConfigured: this.isWhatsAppConfigured(),
      fullyConfigured: this.isConfigured()
    }
  }

  static async sendMessage(message: SMSMessage): Promise<SMSResult> {
    // Determine which channel to use
    const useWhatsApp = message.channel === 'whatsapp' ||
                       (message.channel !== 'sms' && this.isWhatsAppConfigured())

    if (useWhatsApp) {
      return this.sendWhatsApp(message)
    } else {
      return this.sendSMS(message)
    }
  }

  static async sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      return {
        success: false,
        error: 'Twilio SMS not configured',
        channel: 'sms'
      }
    }

    try {
      console.log(`[TWILIO] Sending SMS to ${message.to}`)

      const twilioMessage = await twilioClient.messages.create({
        body: message.body,
        from: TWILIO_PHONE_NUMBER,
        to: message.to
      })

      // Calculate estimated cost (approximate)
      const messageLength = message.body.length
      const segments = Math.ceil(messageLength / 160)
      const estimatedCost = segments * 0.04 // Approximate cost per segment

      // Log the SMS in database
      await sql`
        INSERT INTO sms_log (
          customer_id,
          to_number,
          from_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          twilio_sid,
          sent_at,
          status
        ) VALUES (
          ${message.customerId || null},
          ${message.to},
          ${TWILIO_PHONE_NUMBER},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          ${estimatedCost},
          ${twilioMessage.sid},
          NOW(),
          'sent'
        )
      `

      console.log(`[TWILIO] SMS sent successfully: ${twilioMessage.sid}`)

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: estimatedCost,
        channel: 'sms'
      }

    } catch (error) {
      console.error('[TWILIO] Error sending SMS:', error)

      // Log failed attempt
      await sql`
        INSERT INTO sms_log (
          customer_id,
          to_number,
          from_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          sent_at,
          status,
          error_message
        ) VALUES (
          ${message.customerId || null},
          ${message.to},
          ${TWILIO_PHONE_NUMBER},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          NOW(),
          'failed',
          ${error instanceof Error ? error.message : 'Unknown error'}
        )
      `

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'sms'
      }
    }
  }

  static async sendWhatsApp(message: SMSMessage): Promise<SMSResult> {
    if (!twilioClient || !TWILIO_WHATSAPP_NUMBER) {
      return {
        success: false,
        error: 'Twilio WhatsApp not configured',
        channel: 'whatsapp'
      }
    }

    try {
      console.log(`[TWILIO] Sending WhatsApp to ${message.to}`)

      // Format phone number for WhatsApp (must include whatsapp: prefix)
      const whatsappTo = message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`

      const messageOptions: any = {
        body: message.body,
        from: TWILIO_WHATSAPP_NUMBER,
        to: whatsappTo
      }

      // Add media if provided
      if (message.mediaUrl) {
        messageOptions.mediaUrl = [message.mediaUrl]
      }

      const twilioMessage = await twilioClient.messages.create(messageOptions)

      // WhatsApp pricing is conversation-based, much cheaper than SMS
      // Service conversations: £0.005 per 24-hour conversation
      // Marketing conversations: £0.025 per 24-hour conversation
      const estimatedCost = message.messageType === 'marketing' ? 0.025 : 0.005

      // Log the WhatsApp message in database
      await sql`
        INSERT INTO sms_log (
          customer_id,
          to_number,
          from_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          twilio_sid,
          sent_at,
          status
        ) VALUES (
          ${message.customerId || null},
          ${whatsappTo},
          ${TWILIO_WHATSAPP_NUMBER},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          ${estimatedCost},
          ${twilioMessage.sid},
          NOW(),
          'sent'
        )
      `

      console.log(`[TWILIO] WhatsApp sent successfully: ${twilioMessage.sid}`)

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: estimatedCost,
        channel: 'whatsapp',
        conversationId: twilioMessage.sid
      }

    } catch (error) {
      console.error('[TWILIO] Error sending WhatsApp:', error)

      // Log failed WhatsApp attempt
      await sql`
        INSERT INTO sms_log (
          customer_id,
          to_number,
          from_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          channel,
          error_message
        ) VALUES (
          ${message.customerId || null},
          ${message.to},
          ${TWILIO_WHATSAPP_NUMBER || 'NOT_CONFIGURED'},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          0,
          NOW(),
          'failed',
          'whatsapp',
          ${error instanceof Error ? error.message : 'Unknown error'}
        )
      `

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'whatsapp'
      }
    }
  }

  static async sendBulkSMS(messages: SMSMessage[]): Promise<{
    success: boolean
    results: SMSResult[]
    summary: {
      total: number
      sent: number
      failed: number
      totalCost: number
    }
  }> {
    const results: SMSResult[] = []
    let totalCost = 0
    let sentCount = 0
    let failedCount = 0

    console.log(`[TWILIO] Starting bulk SMS send for ${messages.length} messages`)

    for (const message of messages) {
      const result = await this.sendMessage(message)
      results.push(result)

      if (result.success) {
        sentCount++
        totalCost += result.cost || 0
      } else {
        failedCount++
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`[TWILIO] Bulk SMS complete: ${sentCount} sent, ${failedCount} failed, £${totalCost.toFixed(2)} total cost`)

    return {
      success: true,
      results,
      summary: {
        total: messages.length,
        sent: sentCount,
        failed: failedCount,
        totalCost: Math.round(totalCost * 100) / 100
      }
    }
  }

  static async sendAutoReply(to: string, message: string, channel?: 'sms' | 'whatsapp'): Promise<SMSResult> {
    return this.sendMessage({
      to,
      body: message,
      messageType: 'auto_reply',
      channel: channel || (this.isWhatsAppConfigured() ? 'whatsapp' : 'sms')
    })
  }

  static generateMOTReminderMessage(customerName: string, vehicles: any[], urgency: 'expired' | 'critical' | 'due_soon'): string {
    const name = customerName || 'Customer'

    if (vehicles.length === 1) {
      const vehicle = vehicles[0]
      const reg = vehicle.registration
      const expiry = new Date(vehicle.mot_expiry_date).toLocaleDateString('en-GB')
      const make = vehicle.make || ''
      const model = vehicle.model || ''
      const vehicleDesc = make && model ? `${make} ${model} ` : ''

      if (urgency === 'expired') {
        return `🚗 MOT Reminder from ELI MOTORS LTD

Dear ${name},

🚨 URGENT: Your ${vehicleDesc}(${reg}) MOT expired on ${expiry}.

Driving without valid MOT is illegal and can result in fines and penalty points!

📞 Call us to book: ${process.env.BUSINESS_PUBLIC_NUMBER || '0208 203 6449'}
🏢 ELI MOTORS LTD - ${process.env.BUSINESS_TAGLINE || 'Serving Hendon since 1979'}

🔗 Check status: https://www.check-mot.service.gov.uk/results?registration=${reg}&checkRecalls=true

Reply STOP to opt out or SOLD if vehicle sold.`
      } else if (urgency === 'critical') {
        return `🚗 MOT Reminder from ELI MOTORS LTD

Dear ${name},

⚠️ Your ${vehicleDesc}(${reg}) MOT expires on ${expiry} (within 7 days).

Please book your MOT test soon to avoid any issues.

📞 Call us to book: ${process.env.BUSINESS_PUBLIC_NUMBER || '0208 203 6449'}
🏢 ELI MOTORS LTD - ${process.env.BUSINESS_TAGLINE || 'Serving Hendon since 1979'}

🔗 Check status: https://www.check-mot.service.gov.uk/results?registration=${reg}&checkRecalls=true

Reply STOP to opt out or SOLD if vehicle sold.`
      } else {
        return `🚗 MOT Reminder from ELI MOTORS LTD

Dear ${name},

Your ${vehicleDesc}(${reg}) MOT expires on ${expiry}.

We recommend booking your MOT test soon.

📞 Call us to book: +447488896449
🏢 ELI MOTORS LTD - Your trusted MOT centre

🔗 Check status: https://www.check-mot.service.gov.uk/results?registration=${reg}&checkRecalls=true

Reply STOP to opt out.`
      }
    } else {
      const regList = vehicles.map(v => v.registration).join(', ')

      if (urgency === 'expired') {
        return `🚗 MOT Reminder from ELI MOTORS LTD

Dear ${name},

🚨 URGENT: You have ${vehicles.length} vehicles with expired MOTs: ${regList}

Driving without valid MOT is illegal!

📞 Call us to book: +447488896449
🏢 ELI MOTORS LTD - Your trusted MOT centre

Reply STOP to opt out.`
      } else if (urgency === 'critical') {
        return `🚗 MOT Reminder from ELI MOTORS LTD

Dear ${name},

You have ${vehicles.length} vehicles with MOTs expiring soon: ${regList}

Please book your MOT tests soon.

📞 Call us to book: +447488896449
🏢 ELI MOTORS LTD - Your trusted MOT centre

Reply STOP to opt out.`
      } else {
        return `🚗 MOT Reminder from ELI MOTORS LTD

Dear ${name},

You have ${vehicles.length} vehicles with MOTs due soon: ${regList}

We recommend booking your MOT tests.

📞 Call us to book: +447488896449
🏢 ELI MOTORS LTD - Your trusted MOT centre

Reply STOP to opt out.`
      }
    }
  }
}

// Create SMS log table if it doesn't exist
export async function initializeSMSLog() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sms_log (
        id SERIAL PRIMARY KEY,
        customer_id TEXT,
        to_number TEXT NOT NULL,
        from_number TEXT,
        vehicle_registration TEXT,
        message_type TEXT DEFAULT 'general',
        message_content TEXT NOT NULL,
        urgency_level TEXT DEFAULT 'medium',
        estimated_cost DECIMAL(10,4) DEFAULT 0,
        twilio_sid TEXT,
        sent_at TIMESTAMP DEFAULT NOW(),
        delivered_at TIMESTAMP,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_log_customer_id ON sms_log(customer_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_log_to_number ON sms_log(to_number)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_log_sent_at ON sms_log(sent_at)
    `

    console.log('[TWILIO] SMS log table initialized')
  } catch (error) {
    console.error('[TWILIO] Error initializing SMS log table:', error)
  }
}
