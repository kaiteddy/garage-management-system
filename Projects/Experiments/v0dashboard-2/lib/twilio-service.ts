import twilio from 'twilio'
import { sql } from '@/lib/database/neon-client'

// Twilio configuration - read dynamically to work with serverless
function getTwilioConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
  }
}

// Initialize Twilio client dynamically
function getTwilioClient(): twilio.Twilio | null {
  const config = getTwilioConfig()
  if (config.accountSid && config.authToken) {
    return twilio(config.accountSid, config.authToken)
  }
  return null
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
  templateSid?: string // New: Twilio Content Template SID
  templateVariables?: Record<string, string> // New: Template variables
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
  // WhatsApp Template SIDs - Approved Templates
  static readonly WHATSAPP_TEMPLATES = {
    MOT_REMINDER: 'HX7989152000fc9771c99762c03f72785d', // mot_reminder_eli_motors
    MOT_SERVICE_COMBO: 'HX_PLACEHOLDER_MOT_SERVICE', // mot_service_combo_eli_motors (to be created)
    SMALL_SERVICE: 'HX_PLACEHOLDER_SMALL_SERVICE', // small_service_eli_motors (to be created)
    FULL_SERVICE: 'HX_PLACEHOLDER_FULL_SERVICE', // full_service_eli_motors (to be created)
    AIRCON_SERVICE: 'HX_PLACEHOLDER_AIRCON_SERVICE', // aircon_service_eli_motors (to be created)
  }

  static isConfigured(): boolean {
    const config = getTwilioConfig()
    return !!(config.accountSid && config.authToken && config.phoneNumber)
  }

  static isWhatsAppConfigured(): boolean {
    const config = getTwilioConfig()
    return !!(config.accountSid && config.authToken && config.whatsappNumber)
  }

  static getConfiguration() {
    const config = getTwilioConfig()
    return {
      accountSid: config.accountSid ? `${config.accountSid.substring(0, 8)}...` : 'NOT_SET',
      authToken: config.authToken ? 'CONFIGURED' : 'NOT_SET',
      phoneNumber: config.phoneNumber || 'NOT_SET',
      whatsappNumber: config.whatsappNumber || 'NOT_SET',
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
    const twilioClient = getTwilioClient()
    const config = getTwilioConfig()

    if (!twilioClient || !config.phoneNumber) {
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
        from: config.phoneNumber,
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
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status
        ) VALUES (
          ${message.customerId || null},
          ${message.to},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          ${estimatedCost},
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
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          sent_at,
          status
        ) VALUES (
          ${message.customerId || null},
          ${message.to},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          NOW(),
          'failed'
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
    const twilioClient = getTwilioClient()
    const config = getTwilioConfig()

    if (!twilioClient || !config.whatsappNumber) {
      console.log(`[TWILIO] WhatsApp not configured, falling back to SMS`)
      return this.sendSMS(message)
    }

    try {
      console.log(`[TWILIO] Attempting WhatsApp to ${message.to}`)

      // Normalize phone number format
      let normalizedTo = message.to.replace(/\s+/g, '').replace(/^\+/, '')
      if (!normalizedTo.startsWith('44') && normalizedTo.startsWith('7')) {
        normalizedTo = '44' + normalizedTo // Add UK country code
      }
      const whatsappTo = `whatsapp:+${normalizedTo}`

      // Ensure WhatsApp number has correct format
      let whatsappFrom = config.whatsappNumber
      if (!whatsappFrom.startsWith('whatsapp:')) {
        whatsappFrom = `whatsapp:${whatsappFrom}`
      }

      console.log(`[TWILIO] WhatsApp formatted - From: ${whatsappFrom}, To: ${whatsappTo}`)

      const messageOptions: any = {
        from: whatsappFrom,
        to: whatsappTo
      }

      // Check if this is a template message
      if (message.templateSid && message.templateVariables) {
        console.log(`[TWILIO] Using WhatsApp template: ${message.templateSid}`)
        messageOptions.contentSid = message.templateSid
        messageOptions.contentVariables = JSON.stringify(message.templateVariables)
      } else {
        // Regular text message
        messageOptions.body = message.body

        // Add media if provided
        if (message.mediaUrl) {
          messageOptions.mediaUrl = [message.mediaUrl]
        }
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
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status
        ) VALUES (
          ${message.customerId || null},
          ${whatsappTo},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          ${estimatedCost},
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
      console.error('[TWILIO] WhatsApp failed, attempting SMS fallback:', error)

      // Log failed WhatsApp attempt
      await sql`
        INSERT INTO sms_log (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          notes
        ) VALUES (
          ${message.customerId || null},
          ${message.to},
          ${message.vehicleRegistration || null},
          ${message.messageType || 'general'},
          ${message.body},
          ${message.urgencyLevel || 'medium'},
          0,
          NOW(),
          'whatsapp_failed',
          ${`WhatsApp failed: ${error instanceof Error ? error.message : 'Unknown error'} - Attempting SMS fallback`}
        )
      `

      // Automatic fallback to SMS if WhatsApp fails
      console.log('[TWILIO] Falling back to SMS after WhatsApp failure')
      const smsResult = await this.sendSMS({
        ...message,
        channel: 'sms' // Force SMS channel
      })

      if (smsResult.success) {
        return {
          success: true,
          messageSid: smsResult.messageSid,
          cost: smsResult.cost,
          channel: 'sms_fallback',
          fallbackReason: error instanceof Error ? error.message : 'WhatsApp delivery failed'
        }
      }

      return {
        success: false,
        error: `WhatsApp failed: ${error instanceof Error ? error.message : 'Unknown error'}. SMS fallback also failed: ${smsResult.error}`,
        channel: 'whatsapp'
      }
    }
  }

  /**
   * Send WhatsApp message using approved template
   * Uses the approved mot_reminder_eli_motors template
   */
  static async sendWhatsAppTemplate({
    to,
    customerName,
    vehicleRegistration,
    motExpiryDate,
    daysRemaining,
    customerId,
    messageType = 'mot_reminder',
    urgencyLevel = 'critical'
  }: {
    to: string
    customerName: string
    vehicleRegistration: string
    motExpiryDate: string
    daysRemaining: string
    customerId?: string
    messageType?: string
    urgencyLevel?: string
  }): Promise<SMSResult> {
    const twilioClient = getTwilioClient()
    const config = getTwilioConfig()

    if (!twilioClient || !config.whatsappNumber) {
      console.log(`[TWILIO] WhatsApp not configured`)
      return {
        success: false,
        error: 'WhatsApp not configured',
        channel: 'whatsapp'
      }
    }

    try {
      console.log(`[TWILIO] Sending WhatsApp template to ${to}`);
      console.log(`[TWILIO] Template: ${this.WHATSAPP_TEMPLATES.MOT_REMINDER}`);

      // Normalize phone number format
      let normalizedTo = to.replace(/\s+/g, '').replace(/^\+/, '')
      if (!normalizedTo.startsWith('44') && normalizedTo.startsWith('7')) {
        normalizedTo = '44' + normalizedTo // Add UK country code
      }
      const whatsappTo = `whatsapp:+${normalizedTo}`

      // Ensure WhatsApp number has correct format
      let whatsappFrom = config.whatsappNumber
      if (!whatsappFrom.startsWith('whatsapp:')) {
        whatsappFrom = whatsappFrom.startsWith('+') ? `whatsapp:${whatsappFrom}` : `whatsapp:+${whatsappFrom}`
      }

      console.log(`[TWILIO] From: ${whatsappFrom}, To: ${whatsappTo}`);

      // Send using approved template
      const twilioMessage = await twilioClient.messages.create({
        from: whatsappFrom,
        to: whatsappTo,
        contentSid: this.WHATSAPP_TEMPLATES.MOT_REMINDER,
        contentVariables: JSON.stringify({
          "1": customerName,           // Customer name
          "2": vehicleRegistration,    // Vehicle registration
          "3": motExpiryDate,         // MOT expiry date
          "4": daysRemaining          // Days remaining
        })
      })

      // WhatsApp template messages cost ~£0.005
      const estimatedCost = 0.005

      // Log the WhatsApp template message in database
      await sql`
        INSERT INTO sms_log (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          notes
        ) VALUES (
          ${customerId || null},
          ${to},
          ${vehicleRegistration},
          ${messageType},
          ${'WhatsApp Template: MOT Reminder from Eli Motors Ltd'},
          ${urgencyLevel},
          ${estimatedCost},
          NOW(),
          'sent',
          ${'Template SID: ' + this.WHATSAPP_TEMPLATES.MOT_REMINDER}
        )
      `

      console.log(`[TWILIO] WhatsApp template sent successfully: ${twilioMessage.sid}`);

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: estimatedCost,
        channel: 'whatsapp',
        conversationId: twilioMessage.sid
      }

    } catch (error) {
      console.error('[TWILIO] WhatsApp template failed:', error);

      // Log failed WhatsApp template attempt
      await sql`
        INSERT INTO sms_log (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          notes
        ) VALUES (
          ${customerId || null},
          ${to},
          ${vehicleRegistration},
          ${messageType},
          ${'WhatsApp Template: MOT Reminder (FAILED)'},
          ${urgencyLevel},
          0,
          NOW(),
          'template_failed',
          ${`Template failed: ${error instanceof Error ? error.message : 'Unknown error'}`}
        )
      `

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'whatsapp'
      }
    }
  }

  /**
   * Send WhatsApp MOT & Service Combo Reminder
   */
  static async sendWhatsAppMOTServiceCombo({
    to,
    customerName,
    vehicleRegistration,
    motExpiryDate,
    lastServiceDate,
    customerId,
    messageType = 'mot_service_combo',
    urgencyLevel = 'medium'
  }: {
    to: string
    customerName: string
    vehicleRegistration: string
    motExpiryDate: string
    lastServiceDate: string
    customerId?: string
    messageType?: string
    urgencyLevel?: string
  }): Promise<SMSResult> {
    try {
      const client = getTwilioClient()
      if (!client) {
        throw new Error('Twilio client not configured')
      }

      const config = getTwilioConfig()
      const whatsappFrom = `whatsapp:${config.whatsappNumber}`
      const whatsappTo = `whatsapp:${to}`

      console.log(`[TWILIO] Sending WhatsApp MOT & Service combo reminder to ${to}`);

      const twilioMessage = await client.messages.create({
        from: whatsappFrom,
        to: whatsappTo,
        contentSid: this.WHATSAPP_TEMPLATES.MOT_SERVICE_COMBO,
        contentVariables: JSON.stringify({
          "1": customerName,           // Customer name
          "2": vehicleRegistration,    // Vehicle registration
          "3": motExpiryDate,         // MOT expiry date
          "4": lastServiceDate        // Last service date
        })
      })

      const estimatedCost = 0.005

      await sql`
        INSERT INTO sms_log (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          notes
        ) VALUES (
          ${customerId || null},
          ${to},
          ${vehicleRegistration},
          ${messageType},
          ${'WhatsApp Template: MOT & Service Combo Reminder from Eli Motors Ltd'},
          ${urgencyLevel},
          ${estimatedCost},
          NOW(),
          'sent',
          ${'Template SID: ' + this.WHATSAPP_TEMPLATES.MOT_SERVICE_COMBO}
        )
      `

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: estimatedCost,
        channel: 'whatsapp',
        conversationId: twilioMessage.sid
      }

    } catch (error) {
      console.error('[TWILIO] WhatsApp MOT & Service combo failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'whatsapp'
      }
    }
  }

  /**
   * Send WhatsApp Small Service Reminder
   */
  static async sendWhatsAppSmallServiceReminder({
    to,
    customerName,
    vehicleRegistration,
    lastServiceDate,
    monthsOverdue,
    customerId,
    messageType = 'small_service',
    urgencyLevel = 'medium'
  }: {
    to: string
    customerName: string
    vehicleRegistration: string
    lastServiceDate: string
    monthsOverdue: string
    customerId?: string
    messageType?: string
    urgencyLevel?: string
  }): Promise<SMSResult> {
    try {
      const client = getTwilioClient()
      if (!client) {
        throw new Error('Twilio client not configured')
      }

      const config = getTwilioConfig()
      const whatsappFrom = `whatsapp:${config.whatsappNumber}`
      const whatsappTo = `whatsapp:${to}`

      console.log(`[TWILIO] Sending WhatsApp small service reminder to ${to}`);

      const twilioMessage = await client.messages.create({
        from: whatsappFrom,
        to: whatsappTo,
        contentSid: this.WHATSAPP_TEMPLATES.SMALL_SERVICE,
        contentVariables: JSON.stringify({
          "1": customerName,           // Customer name
          "2": vehicleRegistration,    // Vehicle registration
          "3": lastServiceDate,       // Last service date
          "4": monthsOverdue          // Months overdue
        })
      })

      const estimatedCost = 0.005

      await sql`
        INSERT INTO sms_log (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          notes
        ) VALUES (
          ${customerId || null},
          ${to},
          ${vehicleRegistration},
          ${messageType},
          ${'WhatsApp Template: Small Service Reminder from Eli Motors Ltd'},
          ${urgencyLevel},
          ${estimatedCost},
          NOW(),
          'sent',
          ${'Template SID: ' + this.WHATSAPP_TEMPLATES.SMALL_SERVICE}
        )
      `

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: estimatedCost,
        channel: 'whatsapp',
        conversationId: twilioMessage.sid
      }

    } catch (error) {
      console.error('[TWILIO] WhatsApp small service reminder failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'whatsapp'
      }
    }
  }

  /**
   * Send WhatsApp Full Service Reminder
   */
  static async sendWhatsAppFullServiceReminder({
    to,
    customerName,
    vehicleRegistration,
    lastServiceDate,
    monthsOverdue,
    customerId,
    messageType = 'full_service',
    urgencyLevel = 'medium'
  }: {
    to: string
    customerName: string
    vehicleRegistration: string
    lastServiceDate: string
    monthsOverdue: string
    customerId?: string
    messageType?: string
    urgencyLevel?: string
  }): Promise<SMSResult> {
    try {
      const client = getTwilioClient()
      if (!client) {
        throw new Error('Twilio client not configured')
      }

      const config = getTwilioConfig()
      const whatsappFrom = `whatsapp:${config.whatsappNumber}`
      const whatsappTo = `whatsapp:${to}`

      console.log(`[TWILIO] Sending WhatsApp full service reminder to ${to}`);

      const twilioMessage = await client.messages.create({
        from: whatsappFrom,
        to: whatsappTo,
        contentSid: this.WHATSAPP_TEMPLATES.FULL_SERVICE,
        contentVariables: JSON.stringify({
          "1": customerName,           // Customer name
          "2": vehicleRegistration,    // Vehicle registration
          "3": lastServiceDate,       // Last service date
          "4": monthsOverdue          // Months overdue
        })
      })

      const estimatedCost = 0.005

      await sql`
        INSERT INTO sms_log (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          notes
        ) VALUES (
          ${customerId || null},
          ${to},
          ${vehicleRegistration},
          ${messageType},
          ${'WhatsApp Template: Full Service Reminder from Eli Motors Ltd'},
          ${urgencyLevel},
          ${estimatedCost},
          NOW(),
          'sent',
          ${'Template SID: ' + this.WHATSAPP_TEMPLATES.FULL_SERVICE}
        )
      `

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: estimatedCost,
        channel: 'whatsapp',
        conversationId: twilioMessage.sid
      }

    } catch (error) {
      console.error('[TWILIO] WhatsApp full service reminder failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'whatsapp'
      }
    }
  }

  /**
   * Send WhatsApp Air-Con Service Reminder
   */
  static async sendWhatsAppAirConReminder({
    to,
    customerName,
    vehicleRegistration,
    lastAirConService,
    seasonalMessage,
    customerId,
    messageType = 'aircon_service',
    urgencyLevel = 'low'
  }: {
    to: string
    customerName: string
    vehicleRegistration: string
    lastAirConService: string
    seasonalMessage: string
    customerId?: string
    messageType?: string
    urgencyLevel?: string
  }): Promise<SMSResult> {
    try {
      const client = getTwilioClient()
      if (!client) {
        throw new Error('Twilio client not configured')
      }

      const config = getTwilioConfig()
      const whatsappFrom = `whatsapp:${config.whatsappNumber}`
      const whatsappTo = `whatsapp:${to}`

      console.log(`[TWILIO] Sending WhatsApp air-con service reminder to ${to}`);

      const twilioMessage = await client.messages.create({
        from: whatsappFrom,
        to: whatsappTo,
        contentSid: this.WHATSAPP_TEMPLATES.AIRCON_SERVICE,
        contentVariables: JSON.stringify({
          "1": customerName,           // Customer name
          "2": vehicleRegistration,    // Vehicle registration
          "3": lastAirConService,     // Last air-con service
          "4": seasonalMessage        // Seasonal message (e.g., "before summer")
        })
      })

      const estimatedCost = 0.005

      await sql`
        INSERT INTO sms_log (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          urgency_level,
          estimated_cost,
          sent_at,
          status,
          notes
        ) VALUES (
          ${customerId || null},
          ${to},
          ${vehicleRegistration},
          ${messageType},
          ${'WhatsApp Template: Air-Con Service Reminder from Eli Motors Ltd'},
          ${urgencyLevel},
          ${estimatedCost},
          NOW(),
          'sent',
          ${'Template SID: ' + this.WHATSAPP_TEMPLATES.AIRCON_SERVICE}
        )
      `

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: estimatedCost,
        channel: 'whatsapp',
        conversationId: twilioMessage.sid
      }

    } catch (error) {
      console.error('[TWILIO] WhatsApp air-con service reminder failed:', error);
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
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Add missing columns if they don't exist
    await sql`
      ALTER TABLE sms_log
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS phone_number TEXT
    `

    // Update phone_number from to_number if empty
    await sql`
      UPDATE sms_log
      SET phone_number = to_number
      WHERE phone_number IS NULL
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
