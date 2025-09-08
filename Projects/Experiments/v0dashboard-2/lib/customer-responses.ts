import { sql } from "@/lib/database/neon-client"
import { AdminNotificationService } from "./admin-notifications"

export class CustomerResponseService {
  
  /**
   * Process incoming customer responses (STOP, START, SOLD, etc.)
   */
  static async processCustomerResponse(phoneNumber: string, message: string, channel: 'sms' | 'whatsapp' = 'sms') {
    try {
      const cleanMessage = message.trim().toLowerCase()
      const response = this.parseResponse(cleanMessage)
      
      console.log(`[CUSTOMER-RESPONSE] Processing ${response.type} from ${phoneNumber}`)
      
      switch (response.type) {
        case 'stop':
          return await this.handleOptOut(phoneNumber, channel)
          
        case 'start':
          return await this.handleOptIn(phoneNumber, channel)
          
        case 'sold':
          return await this.handleVehicleSold(phoneNumber, response.registration, channel)
          
        case 'help':
          return await this.handleHelpRequest(phoneNumber, channel)
          
        default:
          return await this.handleGeneralInquiry(phoneNumber, message, channel)
      }
      
    } catch (error) {
      console.error('[CUSTOMER-RESPONSE] Error processing response:', error)
      return {
        success: false,
        error: error.message,
        action: 'error'
      }
    }
  }

  /**
   * Parse customer response to determine intent
   */
  private static parseResponse(message: string) {
    const msg = message.toLowerCase().trim()
    
    // Check for STOP commands
    if (['stop', 'unsubscribe', 'opt out', 'optout', 'cancel'].includes(msg)) {
      return { type: 'stop' }
    }
    
    // Check for START commands
    if (['start', 'subscribe', 'opt in', 'optin', 'yes'].includes(msg)) {
      return { type: 'start' }
    }
    
    // Check for SOLD commands with optional registration
    if (msg.startsWith('sold')) {
      const parts = msg.split(' ')
      const registration = parts.length > 1 ? parts[1].toUpperCase() : null
      return { type: 'sold', registration }
    }
    
    // Check for HELP commands
    if (['help', 'info', 'information', '?'].includes(msg)) {
      return { type: 'help' }
    }
    
    return { type: 'general', message }
  }

  /**
   * Handle customer opt-out (STOP)
   */
  private static async handleOptOut(phoneNumber: string, channel: string) {
    try {
      // Update customer consent
      await sql`
        INSERT INTO customer_consent (customer_id, phone_number, whatsapp_consent, sms_consent, opted_out_at)
        SELECT c.id, ${phoneNumber}, false, false, NOW()
        FROM customers c 
        WHERE c.phone = ${phoneNumber}
        ON CONFLICT (customer_id, phone_number) 
        DO UPDATE SET 
          whatsapp_consent = false,
          sms_consent = false,
          opted_out_at = NOW()
      `
      
      // Log the opt-out
      await sql`
        INSERT INTO customer_responses (
          phone_number, response_type, response_content, channel, processed_at
        ) VALUES (
          ${phoneNumber}, 'opt_out', 'STOP', ${channel}, NOW()
        )
      `
      
      // Find customer name for response
      const customer = await sql`
        SELECT first_name, last_name FROM customers WHERE phone = ${phoneNumber} LIMIT 1
      `
      
      const customerName = customer.length > 0 ? 
        `${customer[0].first_name} ${customer[0].last_name}`.trim() : 'Customer'
      
      // Send confirmation
      const confirmationMessage = `Hi ${customerName}, you have been unsubscribed from ELI MOTORS LTD messages. Reply START to re-subscribe. Call 0208 203 6449 for service.`
      
      // Notify admin
      await AdminNotificationService.notifyAdmin(
        'customer_opt_out',
        `Customer ${customerName} (${phoneNumber}) has opted out of messages via ${channel.toUpperCase()}`
      )
      
      return {
        success: true,
        action: 'opt_out',
        response: confirmationMessage,
        customerName
      }
      
    } catch (error) {
      console.error('[CUSTOMER-RESPONSE] Error handling opt-out:', error)
      throw error
    }
  }

  /**
   * Handle customer opt-in (START)
   */
  private static async handleOptIn(phoneNumber: string, channel: string) {
    try {
      // Update customer consent
      await sql`
        INSERT INTO customer_consent (customer_id, phone_number, whatsapp_consent, sms_consent, consent_given_at, consent_method)
        SELECT c.id, ${phoneNumber}, 
          ${channel === 'whatsapp'}, 
          ${channel === 'sms'}, 
          NOW(), 
          ${channel}
        FROM customers c 
        WHERE c.phone = ${phoneNumber}
        ON CONFLICT (customer_id, phone_number) 
        DO UPDATE SET 
          whatsapp_consent = ${channel === 'whatsapp'},
          sms_consent = ${channel === 'sms'},
          consent_given_at = NOW(),
          consent_method = ${channel},
          opted_out_at = NULL
      `
      
      // Log the opt-in
      await sql`
        INSERT INTO customer_responses (
          phone_number, response_type, response_content, channel, processed_at
        ) VALUES (
          ${phoneNumber}, 'opt_in', 'START', ${channel}, NOW()
        )
      `
      
      // Find customer name
      const customer = await sql`
        SELECT first_name, last_name FROM customers WHERE phone = ${phoneNumber} LIMIT 1
      `
      
      const customerName = customer.length > 0 ? 
        `${customer[0].first_name} ${customer[0].last_name}`.trim() : 'Customer'
      
      // Send confirmation
      const confirmationMessage = `Welcome back ${customerName}! You're now subscribed to ELI MOTORS LTD service reminders. Serving Hendon since 1979. Call 0208 203 6449 for bookings.`
      
      // Notify admin
      await AdminNotificationService.notifyAdmin(
        'customer_opt_in',
        `Customer ${customerName} (${phoneNumber}) has opted back in via ${channel.toUpperCase()}`
      )
      
      return {
        success: true,
        action: 'opt_in',
        response: confirmationMessage,
        customerName
      }
      
    } catch (error) {
      console.error('[CUSTOMER-RESPONSE] Error handling opt-in:', error)
      throw error
    }
  }

  /**
   * Handle vehicle sold notification
   */
  private static async handleVehicleSold(phoneNumber: string, registration: string | null, channel: string) {
    try {
      // Find customer
      const customer = await sql`
        SELECT id, first_name, last_name FROM customers WHERE phone = ${phoneNumber} LIMIT 1
      `
      
      if (customer.length === 0) {
        return {
          success: false,
          action: 'vehicle_sold',
          response: "We couldn't find your customer record. Please call 0208 203 6449 for assistance."
        }
      }
      
      const customerId = customer[0].id
      const customerName = `${customer[0].first_name} ${customer[0].last_name}`.trim()
      
      let vehiclesUpdated = 0
      let responseMessage = ""
      
      if (registration) {
        // Mark specific vehicle as sold
        const result = await sql`
          UPDATE vehicles 
          SET status = 'sold', 
              sold_date = NOW(),
              notes = COALESCE(notes, '') || ' - Customer reported sold via ' || ${channel} || ' on ' || NOW()::date
          WHERE customer_id = ${customerId} 
            AND UPPER(registration) = UPPER(${registration})
            AND status != 'sold'
          RETURNING registration, make, model
        `
        
        vehiclesUpdated = result.length
        
        if (vehiclesUpdated > 0) {
          const vehicle = result[0]
          responseMessage = `Thank you ${customerName}. We've marked your ${vehicle.make} ${vehicle.model} (${vehicle.registration}) as sold. You won't receive MOT reminders for this vehicle. Call 0208 203 6449 if you need anything else.`
          
          // Notify admin
          await AdminNotificationService.notifyAdmin(
            'vehicle_sold',
            `Customer ${customerName} (${phoneNumber}) reported ${vehicle.make} ${vehicle.model} (${vehicle.registration}) as SOLD via ${channel.toUpperCase()}`
          )
        } else {
          responseMessage = `Hi ${customerName}, we couldn't find vehicle ${registration} in your records. Please call 0208 203 6449 to update your vehicle information.`
        }
        
      } else {
        // No specific registration provided - ask for clarification
        const vehicles = await sql`
          SELECT registration, make, model 
          FROM vehicles 
          WHERE customer_id = ${customerId} 
            AND status != 'sold'
          ORDER BY registration
        `
        
        if (vehicles.length === 0) {
          responseMessage = `Hi ${customerName}, you don't have any active vehicles in our system. Call 0208 203 6449 if you need assistance.`
        } else if (vehicles.length === 1) {
          // Only one vehicle - mark it as sold
          const vehicle = vehicles[0]
          await sql`
            UPDATE vehicles 
            SET status = 'sold', 
                sold_date = NOW(),
                notes = COALESCE(notes, '') || ' - Customer reported sold via ' || ${channel} || ' on ' || NOW()::date
            WHERE customer_id = ${customerId} 
              AND registration = ${vehicle.registration}
          `
          
          responseMessage = `Thank you ${customerName}. We've marked your ${vehicle.make} ${vehicle.model} (${vehicle.registration}) as sold. You won't receive MOT reminders for this vehicle.`
          vehiclesUpdated = 1
          
          // Notify admin
          await AdminNotificationService.notifyAdmin(
            'vehicle_sold',
            `Customer ${customerName} (${phoneNumber}) reported ${vehicle.make} ${vehicle.model} (${vehicle.registration}) as SOLD via ${channel.toUpperCase()}`
          )
        } else {
          // Multiple vehicles - ask which one
          const vehicleList = vehicles.map(v => `${v.registration} (${v.make} ${v.model})`).join(', ')
          responseMessage = `Hi ${customerName}, which vehicle have you sold? Please reply "SOLD [REGISTRATION]". Your vehicles: ${vehicleList}. Call 0208 203 6449 for help.`
        }
      }
      
      // Log the response
      await sql`
        INSERT INTO customer_responses (
          phone_number, response_type, response_content, channel, processed_at, metadata
        ) VALUES (
          ${phoneNumber}, 'vehicle_sold', 
          ${registration ? `SOLD ${registration}` : 'SOLD'}, 
          ${channel}, NOW(),
          ${JSON.stringify({ registration, vehiclesUpdated, customerName })}
        )
      `
      
      return {
        success: true,
        action: 'vehicle_sold',
        response: responseMessage,
        customerName,
        vehiclesUpdated,
        registration
      }
      
    } catch (error) {
      console.error('[CUSTOMER-RESPONSE] Error handling vehicle sold:', error)
      throw error
    }
  }

  /**
   * Handle help requests
   */
  private static async handleHelpRequest(phoneNumber: string, channel: string) {
    try {
      const customer = await sql`
        SELECT first_name, last_name FROM customers WHERE phone = ${phoneNumber} LIMIT 1
      `
      
      const customerName = customer.length > 0 ? 
        `${customer[0].first_name} ${customer[0].last_name}`.trim() : 'Customer'
      
      const helpMessage = `Hi ${customerName}! ELI MOTORS LTD - Serving Hendon since 1979

Commands:
• STOP - Unsubscribe from messages
• START - Re-subscribe to messages  
• SOLD [REG] - Mark vehicle as sold
• HELP - Show this message

📞 Call us: 0208 203 6449
🏢 Trusted MOT & service centre

Reply with any questions!`

      // Log the help request
      await sql`
        INSERT INTO customer_responses (
          phone_number, response_type, response_content, channel, processed_at
        ) VALUES (
          ${phoneNumber}, 'help_request', 'HELP', ${channel}, NOW()
        )
      `
      
      return {
        success: true,
        action: 'help',
        response: helpMessage,
        customerName
      }
      
    } catch (error) {
      console.error('[CUSTOMER-RESPONSE] Error handling help request:', error)
      throw error
    }
  }

  /**
   * Handle general inquiries
   */
  private static async handleGeneralInquiry(phoneNumber: string, message: string, channel: string) {
    try {
      const customer = await sql`
        SELECT first_name, last_name FROM customers WHERE phone = ${phoneNumber} LIMIT 1
      `
      
      const customerName = customer.length > 0 ? 
        `${customer[0].first_name} ${customer[0].last_name}`.trim() : 'Customer'
      
      // Log the inquiry
      await sql`
        INSERT INTO customer_responses (
          phone_number, response_type, response_content, channel, processed_at
        ) VALUES (
          ${phoneNumber}, 'general_inquiry', ${message}, ${channel}, NOW()
        )
      `
      
      // Notify admin of the inquiry
      await AdminNotificationService.notifyAdmin(
        'customer_inquiry',
        `Customer inquiry from ${customerName} (${phoneNumber}) via ${channel.toUpperCase()}:\n\n"${message}"\n\nPlease respond to the customer.`
      )
      
      const responseMessage = `Hi ${customerName}, thanks for your message. We'll get back to you soon. For urgent matters, call 0208 203 6449. ELI MOTORS LTD - Serving Hendon since 1979.`
      
      return {
        success: true,
        action: 'general_inquiry',
        response: responseMessage,
        customerName,
        requiresFollowUp: true
      }
      
    } catch (error) {
      console.error('[CUSTOMER-RESPONSE] Error handling general inquiry:', error)
      throw error
    }
  }

  /**
   * Initialize customer responses table
   */
  static async initializeResponsesTable() {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS customer_responses (
          id SERIAL PRIMARY KEY,
          phone_number TEXT NOT NULL,
          response_type TEXT NOT NULL,
          response_content TEXT NOT NULL,
          channel TEXT DEFAULT 'sms',
          processed_at TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}',
          follow_up_required BOOLEAN DEFAULT false,
          follow_up_completed BOOLEAN DEFAULT false
        )
      `
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_customer_responses_phone ON customer_responses(phone_number)
      `
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_customer_responses_type ON customer_responses(response_type)
      `
      
      console.log("[CUSTOMER-RESPONSES] Responses table initialized")
      return { success: true }
    } catch (error) {
      console.error("[CUSTOMER-RESPONSES] Error initializing responses table:", error)
      return { success: false, error: error.message }
    }
  }
}
