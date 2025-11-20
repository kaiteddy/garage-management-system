import twilio from 'twilio'
import { sql } from '@/lib/database/neon-client'

// WhatsApp Service with comprehensive database management
export class WhatsAppService {
  private static twilioClient: twilio.Twilio | null = null

  static {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken)
    }
  }

  // Initialize WhatsApp database tables
  static async initializeDatabase() {
    try {
      console.log('[WHATSAPP-DB] Initializing WhatsApp database tables...')

      // Always create tables manually for now
      await this.createTablesManually()

      return { success: true }
    } catch (error) {
      console.error('[WHATSAPP-DB] Error initializing database:', error)
      return { success: false, error: error.message }
    }
  }

  // Create tables manually if schema file not available
  private static async createTablesManually() {
    console.log('[WHATSAPP-DB] Creating tables manually...')

    // Create conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id TEXT,
        phone_number TEXT NOT NULL,
        conversation_sid TEXT UNIQUE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        last_message_at TIMESTAMP DEFAULT NOW(),
        message_count INTEGER DEFAULT 0,
        consent_given BOOLEAN DEFAULT FALSE,
        consent_date TIMESTAMP,
        conversation_type TEXT DEFAULT 'customer_service',
        vehicle_registration TEXT,
        metadata JSONB DEFAULT '{}'
      )
    `
    console.log('[WHATSAPP-DB] Created whatsapp_conversations table')

    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID,
        message_sid TEXT UNIQUE NOT NULL,
        direction TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        content TEXT NOT NULL,
        from_number TEXT NOT NULL,
        to_number TEXT NOT NULL,
        status TEXT DEFAULT 'queued',
        sent_at TIMESTAMP DEFAULT NOW(),
        delivered_at TIMESTAMP,
        cost DECIMAL(10,4) DEFAULT 0,
        vehicle_registration TEXT,
        reminder_type TEXT,
        metadata JSONB DEFAULT '{}'
      )
    `
    console.log('[WHATSAPP-DB] Created whatsapp_messages table')

    // Create verification queue table
    await sql`
      CREATE TABLE IF NOT EXISTS message_verification_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        vehicle_registration TEXT,
        message_type TEXT NOT NULL,
        message_content TEXT NOT NULL,
        verification_status TEXT DEFAULT 'pending',
        verified_by TEXT,
        verified_at TIMESTAMP,
        scheduled_send_at TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
        fallback_to_sms BOOLEAN DEFAULT TRUE,
        consent_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('[WHATSAPP-DB] Created message_verification_queue table')

    // Create customer consent table
    await sql`
      CREATE TABLE IF NOT EXISTS customer_consent (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        whatsapp_consent BOOLEAN DEFAULT FALSE,
        sms_consent BOOLEAN DEFAULT FALSE,
        marketing_consent BOOLEAN DEFAULT FALSE,
        consent_given_at TIMESTAMP,
        consent_method TEXT,
        opted_out_at TIMESTAMP,
        phone_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id, phone_number)
      )
    `
    console.log('[WHATSAPP-DB] Created customer_consent table')

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_id ON whatsapp_conversations(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number)`
    await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_verification_queue_status ON message_verification_queue(verification_status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_consent_customer_id ON customer_consent(customer_id)`

    console.log('[WHATSAPP-DB] Created indexes')
  }

  // Check and verify customer consent
  static async verifyCustomerConsent(customerId: string, phoneNumber: string, messageType: string) {
    try {
      console.log(`[WHATSAPP-CONSENT] Verifying consent for customer ${customerId}, phone ${phoneNumber}`)

      const consent = await sql`
        SELECT
          whatsapp_consent,
          sms_consent,
          marketing_consent,
          opted_out_at,
          phone_verified,
          consent_given_at,
          data_retention_period_months,
          delete_after_date
        FROM customer_consent
        WHERE customer_id = ${customerId}
        AND phone_number = ${phoneNumber}
        AND (delete_after_date IS NULL OR delete_after_date > CURRENT_DATE)
      `

      if (consent.length === 0) {
        // No consent record found - create implied consent for service messages
        if (messageType === 'mot_reminder' || messageType === 'service_reminder') {
          await this.createImpliedConsent(customerId, phoneNumber)
          return {
            canSendWhatsApp: true,
            canSendSMS: true,
            consentType: 'implied',
            reason: 'Service-related communication under legitimate interest'
          }
        }
        return {
          canSendWhatsApp: false,
          canSendSMS: false,
          consentType: 'none',
          reason: 'No consent record found and not service-related'
        }
      }

      const consentRecord = consent[0]

      // Check if customer has opted out
      if (consentRecord.opted_out_at) {
        return {
          canSendWhatsApp: false,
          canSendSMS: false,
          consentType: 'opted_out',
          reason: `Customer opted out on ${consentRecord.opted_out_at}`
        }
      }

      // Check data retention
      if (consentRecord.delete_after_date && new Date(consentRecord.delete_after_date) < new Date()) {
        return {
          canSendWhatsApp: false,
          canSendSMS: false,
          consentType: 'expired',
          reason: 'Data retention period expired'
        }
      }

      // Check specific consent based on message type
      const isMarketingMessage = messageType === 'marketing'
      const canSendWhatsApp = isMarketingMessage ?
        consentRecord.marketing_consent && consentRecord.whatsapp_consent :
        consentRecord.whatsapp_consent

      const canSendSMS = isMarketingMessage ?
        consentRecord.marketing_consent && consentRecord.sms_consent :
        consentRecord.sms_consent

      return {
        canSendWhatsApp,
        canSendSMS,
        consentType: consentRecord.consent_given_at ? 'explicit' : 'implied',
        phoneVerified: consentRecord.phone_verified,
        consentDate: consentRecord.consent_given_at
      }

    } catch (error) {
      console.error('[WHATSAPP-CONSENT] Error verifying consent:', error)
      return {
        canSendWhatsApp: false,
        canSendSMS: false,
        consentType: 'error',
        reason: 'Error checking consent'
      }
    }
  }

  // Create implied consent for service messages
  private static async createImpliedConsent(customerId: string, phoneNumber: string) {
    try {
      await sql`
        INSERT INTO customer_consent (
          customer_id,
          phone_number,
          whatsapp_consent,
          sms_consent,
          marketing_consent,
          consent_given_at,
          consent_method,
          phone_verified
        ) VALUES (
          ${customerId},
          ${phoneNumber},
          TRUE,
          TRUE,
          FALSE,
          NOW(),
          'implied',
          FALSE
        )
        ON CONFLICT (customer_id, phone_number)
        DO UPDATE SET
          whatsapp_consent = TRUE,
          sms_consent = TRUE,
          consent_given_at = COALESCE(customer_consent.consent_given_at, NOW()),
          consent_method = COALESCE(customer_consent.consent_method, 'implied')
      `
      console.log(`[WHATSAPP-CONSENT] Created implied consent for customer ${customerId}`)
    } catch (error) {
      console.error('[WHATSAPP-CONSENT] Error creating implied consent:', error)
    }
  }

  // Queue message for verification
  static async queueMessageForVerification(messageData: {
    customerId: string
    phoneNumber: string
    vehicleRegistration?: string
    messageType: string
    messageContent: string
    scheduledSendAt?: Date
    fallbackToSMS?: boolean
  }) {
    try {
      console.log(`[WHATSAPP-VERIFY] Queueing message for verification: ${messageData.messageType}`)

      // Verify consent first
      const consentCheck = await this.verifyCustomerConsent(
        messageData.customerId,
        messageData.phoneNumber,
        messageData.messageType
      )

      const queueEntry = await sql`
        INSERT INTO message_verification_queue (
          customer_id,
          phone_number,
          vehicle_registration,
          message_type,
          message_content,
          scheduled_send_at,
          fallback_to_sms,
          consent_verified,
          expires_at
        ) VALUES (
          ${messageData.customerId},
          ${messageData.phoneNumber},
          ${messageData.vehicleRegistration || null},
          ${messageData.messageType},
          ${messageData.messageContent},
          ${messageData.scheduledSendAt || new Date()},
          ${messageData.fallbackToSMS !== false},
          ${consentCheck.canSendWhatsApp || consentCheck.canSendSMS},
          ${new Date(Date.now() + 24 * 60 * 60 * 1000)} -- 24 hours from now
        )
        RETURNING id, verification_status, consent_verified
      `

      return {
        success: true,
        queueId: queueEntry[0].id,
        verificationStatus: queueEntry[0].verification_status,
        consentVerified: queueEntry[0].consent_verified,
        consentCheck
      }

    } catch (error) {
      console.error('[WHATSAPP-VERIFY] Error queueing message:', error)
      return { success: false, error: error.message }
    }
  }

  // Get pending verification queue
  static async getPendingVerifications(limit: number = 50) {
    try {
      const pending = await sql`
        SELECT
          vq.*,
          c.first_name,
          c.last_name,
          c.email,
          v.make,
          v.model,
          v.mot_expiry_date
        FROM message_verification_queue vq
        LEFT JOIN customers c ON vq.customer_id = c.id
        LEFT JOIN vehicles v ON vq.vehicle_registration = v.registration
        WHERE vq.verification_status = 'pending'
        AND vq.expires_at > NOW()
        ORDER BY vq.created_at ASC
        LIMIT ${limit}
      `

      return { success: true, pendingMessages: pending }
    } catch (error) {
      console.error('[WHATSAPP-VERIFY] Error getting pending verifications:', error)
      return { success: false, error: error.message }
    }
  }

  // Approve message for sending
  static async approveMessage(queueId: string, verifiedBy: string, notes?: string) {
    try {
      console.log(`[WHATSAPP-VERIFY] Approving message ${queueId} by ${verifiedBy}`)

      const updated = await sql`
        UPDATE message_verification_queue
        SET
          verification_status = 'approved',
          verified_by = ${verifiedBy},
          verified_at = NOW()
        WHERE id = ${queueId}
        AND verification_status = 'pending'
        RETURNING *
      `

      if (updated.length === 0) {
        return { success: false, error: 'Message not found or already processed' }
      }

      // Automatically send the approved message
      const message = updated[0]
      const sendResult = await this.sendApprovedMessage(message)

      return { success: true, message: updated[0], sendResult }
    } catch (error) {
      console.error('[WHATSAPP-VERIFY] Error approving message:', error)
      return { success: false, error: error.message }
    }
  }

  // Send approved message
  private static async sendApprovedMessage(messageData: any) {
    try {
      // First try WhatsApp
      const whatsappResult = await this.sendWhatsAppMessage({
        to: messageData.phone_number,
        content: messageData.message_content,
        customerId: messageData.customer_id,
        vehicleRegistration: messageData.vehicle_registration,
        messageType: messageData.message_type
      })

      if (whatsappResult.success) {
        // Update queue status
        await sql`
          UPDATE message_verification_queue
          SET verification_status = 'sent'
          WHERE id = ${messageData.id}
        `
        return whatsappResult
      }

      // If WhatsApp fails and SMS fallback is enabled
      if (messageData.fallback_to_sms) {
        console.log(`[WHATSAPP-FALLBACK] WhatsApp failed, trying SMS fallback for ${messageData.phone_number}`)

        const smsResult = await this.sendSMSFallback({
          to: messageData.phone_number,
          content: messageData.message_content,
          customerId: messageData.customer_id,
          vehicleRegistration: messageData.vehicle_registration,
          messageType: messageData.message_type
        })

        // Update queue with SMS fallback status
        await sql`
          UPDATE message_verification_queue
          SET
            verification_status = 'sent',
            sms_sent = TRUE,
            sms_sent_at = NOW()
          WHERE id = ${messageData.id}
        `

        return { ...smsResult, fallbackUsed: true }
      }

      return whatsappResult
    } catch (error) {
      console.error('[WHATSAPP-SEND] Error sending approved message:', error)
      return { success: false, error: error.message }
    }
  }

  // Send WhatsApp message with conversation tracking
  static async sendWhatsAppMessage(messageData: {
    to: string
    content: string
    customerId?: string
    vehicleRegistration?: string
    messageType?: string
    mediaUrls?: string[]
  }) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured')
      }

      const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
      if (!whatsappNumber) {
        throw new Error('WhatsApp number not configured')
      }

      console.log(`[WHATSAPP-SEND] Sending WhatsApp to ${messageData.to}`)

      // Format phone number for WhatsApp
      const toNumber = messageData.to.startsWith('whatsapp:') ?
        messageData.to : `whatsapp:${messageData.to}`

      // Send via Twilio
      const twilioMessage = await this.twilioClient.messages.create({
        body: messageData.content,
        from: whatsappNumber,
        to: toNumber,
        ...(messageData.mediaUrls && { mediaUrl: messageData.mediaUrls })
      })

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        messageData.customerId || 'unknown',
        messageData.to,
        messageData.vehicleRegistration
      )

      // Log message in database
      await this.logMessage({
        conversationId: conversation.id,
        messageSid: twilioMessage.sid,
        direction: 'outbound',
        content: messageData.content,
        fromNumber: whatsappNumber,
        toNumber: toNumber,
        status: twilioMessage.status,
        cost: 0.005, // WhatsApp conversation cost
        vehicleRegistration: messageData.vehicleRegistration,
        reminderType: messageData.messageType
      })

      // Update conversation
      await this.updateConversation(conversation.id)

      return {
        success: true,
        messageSid: twilioMessage.sid,
        conversationId: conversation.id,
        cost: 0.005,
        channel: 'whatsapp'
      }

    } catch (error) {
      console.error('[WHATSAPP-SEND] Error sending WhatsApp:', error)
      return { success: false, error: error.message, channel: 'whatsapp' }
    }
  }

  // SMS fallback
  private static async sendSMSFallback(messageData: {
    to: string
    content: string
    customerId?: string
    vehicleRegistration?: string
    messageType?: string
  }) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured')
      }

      const smsNumber = process.env.TWILIO_PHONE_NUMBER
      if (!smsNumber) {
        throw new Error('SMS number not configured')
      }

      console.log(`[SMS-FALLBACK] Sending SMS fallback to ${messageData.to}`)

      const twilioMessage = await this.twilioClient.messages.create({
        body: messageData.content + '\n\n(Sent via SMS - WhatsApp unavailable)',
        from: smsNumber,
        to: messageData.to
      })

      // Log in SMS log table
      await sql`
        INSERT INTO sms_log (
          customer_id,
          to_number,
          from_number,
          vehicle_registration,
          message_type,
          message_content,
          estimated_cost,
          twilio_sid,
          sent_at,
          status
        ) VALUES (
          ${messageData.customerId || null},
          ${messageData.to},
          ${smsNumber},
          ${messageData.vehicleRegistration || null},
          ${messageData.messageType || 'fallback'},
          ${messageData.content},
          ${0.04},
          ${twilioMessage.sid},
          NOW(),
          'sent'
        )
      `

      return {
        success: true,
        messageSid: twilioMessage.sid,
        cost: 0.04,
        channel: 'sms'
      }

    } catch (error) {
      console.error('[SMS-FALLBACK] Error sending SMS:', error)
      return { success: false, error: error.message, channel: 'sms' }
    }
  }

  // Get or create conversation
  private static async getOrCreateConversation(customerId: string, phoneNumber: string, vehicleRegistration?: string) {
    try {
      // Try to find existing active conversation
      const existing = await sql`
        SELECT * FROM whatsapp_conversations
        WHERE customer_id = ${customerId}
        AND phone_number = ${phoneNumber}
        AND status = 'active'
        ORDER BY last_message_at DESC
        LIMIT 1
      `

      if (existing.length > 0) {
        return existing[0]
      }

      // Create new conversation
      const newConversation = await sql`
        INSERT INTO whatsapp_conversations (
          customer_id,
          phone_number,
          conversation_type,
          vehicle_registration,
          consent_given
        ) VALUES (
          ${customerId},
          ${phoneNumber},
          'customer_service',
          ${vehicleRegistration || null},
          TRUE
        )
        RETURNING *
      `

      return newConversation[0]
    } catch (error) {
      console.error('[WHATSAPP-CONV] Error managing conversation:', error)
      throw error
    }
  }

  // Log message in database
  private static async logMessage(messageData: {
    conversationId: string
    messageSid: string
    direction: 'inbound' | 'outbound'
    content: string
    fromNumber: string
    toNumber: string
    status: string
    cost?: number
    vehicleRegistration?: string
    reminderType?: string
  }) {
    try {
      await sql`
        INSERT INTO whatsapp_messages (
          conversation_id,
          message_sid,
          direction,
          content,
          from_number,
          to_number,
          status,
          cost,
          vehicle_registration,
          reminder_type
        ) VALUES (
          ${messageData.conversationId},
          ${messageData.messageSid},
          ${messageData.direction},
          ${messageData.content},
          ${messageData.fromNumber},
          ${messageData.toNumber},
          ${messageData.status},
          ${messageData.cost || 0},
          ${messageData.vehicleRegistration || null},
          ${messageData.reminderType || null}
        )
      `
    } catch (error) {
      console.error('[WHATSAPP-LOG] Error logging message:', error)
    }
  }

  // Update conversation metadata
  private static async updateConversation(conversationId: string) {
    try {
      await sql`
        UPDATE whatsapp_conversations
        SET
          last_message_at = NOW(),
          message_count = message_count + 1
        WHERE id = ${conversationId}
      `
    } catch (error) {
      console.error('[WHATSAPP-CONV] Error updating conversation:', error)
    }
  }

  // Get conversation history
  static async getConversationHistory(customerId: string, phoneNumber: string, limit: number = 50) {
    try {
      const messages = await sql`
        SELECT
          m.*,
          c.customer_id,
          c.conversation_type,
          c.vehicle_registration as conv_vehicle
        FROM whatsapp_messages m
        JOIN whatsapp_conversations c ON m.conversation_id = c.id
        WHERE c.customer_id = ${customerId}
        AND c.phone_number = ${phoneNumber}
        ORDER BY m.sent_at DESC
        LIMIT ${limit}
      `

      return { success: true, messages }
    } catch (error) {
      console.error('[WHATSAPP-HISTORY] Error getting conversation history:', error)
      return { success: false, error: error.message }
    }
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      const stats = await sql`
        SELECT
          COUNT(DISTINCT c.id) as total_conversations,
          COUNT(DISTINCT c.customer_id) as unique_customers,
          COUNT(m.id) as total_messages,
          COUNT(CASE WHEN m.direction = 'outbound' THEN 1 END) as outbound_messages,
          COUNT(CASE WHEN m.direction = 'inbound' THEN 1 END) as inbound_messages,
          SUM(m.cost) as total_cost,
          COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_conversations,
          COUNT(CASE WHEN c.consent_given = TRUE THEN 1 END) as consented_customers
        FROM whatsapp_conversations c
        LEFT JOIN whatsapp_messages m ON c.id = m.conversation_id
        WHERE c.created_at > NOW() - INTERVAL '30 days'
      `

      const pendingVerifications = await sql`
        SELECT COUNT(*) as pending_count
        FROM message_verification_queue
        WHERE verification_status = 'pending'
        AND expires_at > NOW()
      `

      return {
        success: true,
        stats: {
          ...stats[0],
          pending_verifications: pendingVerifications[0].pending_count
        }
      }
    } catch (error) {
      console.error('[WHATSAPP-STATS] Error getting dashboard stats:', error)
      return { success: false, error: error.message }
    }
  }

  // Process webhook (for incoming messages)
  static async processWebhook(webhookData: any) {
    try {
      console.log('[WHATSAPP-WEBHOOK] Processing incoming webhook:', webhookData)

      const { MessageSid, From, To, Body, MessageStatus } = webhookData

      if (Body && Body.trim()) {
        // This is an incoming message
        const conversation = await this.getOrCreateConversation(
          'unknown', // We'll need to match by phone number
          From.replace('whatsapp:', ''),
          null
        )

        await this.logMessage({
          conversationId: conversation.id,
          messageSid: MessageSid,
          direction: 'inbound',
          content: Body,
          fromNumber: From,
          toNumber: To,
          status: 'received'
        })

        // Process customer response (opt-out, etc.)
        await this.processCustomerResponse(From.replace('whatsapp:', ''), Body)
      } else if (MessageStatus) {
        // This is a status update
        await this.updateMessageStatus(MessageSid, MessageStatus)
      }

      return { success: true }
    } catch (error) {
      console.error('[WHATSAPP-WEBHOOK] Error processing webhook:', error)
      return { success: false, error: error.message }
    }
  }

  // Process customer responses
  private static async processCustomerResponse(phoneNumber: string, message: string) {
    try {
      const lowerMessage = message.toLowerCase().trim()

      // Check for opt-out keywords
      const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'remove', 'no more']
      const isOptOut = optOutKeywords.some(keyword => lowerMessage.includes(keyword))

      if (isOptOut) {
        await sql`
          UPDATE customer_consent
          SET
            whatsapp_consent = FALSE,
            opted_out_at = NOW(),
            opt_out_method = 'whatsapp_reply'
          WHERE phone_number = ${phoneNumber}
        `

        // Send confirmation
        await this.sendWhatsAppMessage({
          to: phoneNumber,
          content: "You have been unsubscribed from WhatsApp messages. Reply START to re-subscribe or call us if you need assistance.",
          messageType: 'opt_out_confirmation'
        })

        console.log(`[WHATSAPP-RESPONSE] Customer ${phoneNumber} opted out via WhatsApp`)
      }

      // Check for opt-in keywords
      const optInKeywords = ['start', 'yes', 'subscribe', 'opt in']
      const isOptIn = optInKeywords.some(keyword => lowerMessage.includes(keyword))

      if (isOptIn) {
        await sql`
          UPDATE customer_consent
          SET
            whatsapp_consent = TRUE,
            opted_out_at = NULL,
            consent_given_at = NOW(),
            consent_method = 'whatsapp_reply'
          WHERE phone_number = ${phoneNumber}
        `

        await this.sendWhatsAppMessage({
          to: phoneNumber,
          content: "Thank you! You're now subscribed to receive WhatsApp updates about your vehicle's MOT and services.",
          messageType: 'opt_in_confirmation'
        })

        console.log(`[WHATSAPP-RESPONSE] Customer ${phoneNumber} opted in via WhatsApp`)
      }

    } catch (error) {
      console.error('[WHATSAPP-RESPONSE] Error processing customer response:', error)
    }
  }

  // Update message status from webhook
  private static async updateMessageStatus(messageSid: string, status: string) {
    try {
      const updateData: any = { status }

      if (status === 'delivered') {
        updateData.delivered_at = new Date()
      } else if (status === 'read') {
        updateData.read_at = new Date()
      }

      await sql`
        UPDATE whatsapp_messages
        SET
          status = ${status},
          delivered_at = ${updateData.delivered_at || null},
          read_at = ${updateData.read_at || null}
        WHERE message_sid = ${messageSid}
      `

      console.log(`[WHATSAPP-STATUS] Updated message ${messageSid} status to ${status}`)
    } catch (error) {
      console.error('[WHATSAPP-STATUS] Error updating message status:', error)
    }
  }
}
