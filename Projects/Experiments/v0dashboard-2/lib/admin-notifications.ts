import { TwilioService } from './twilio-service'

export class AdminNotificationService {
  private static adminMobile = process.env.BUSINESS_OWNER_MOBILE || '+447950250970'
  private static businessName = process.env.BUSINESS_NAME || 'ELI MOTORS LTD'
  private static publicNumber = process.env.BUSINESS_PUBLIC_NUMBER || '+447488896449'

  /**
   * Send notification to admin mobile (Eli's personal number)
   * Only for important business notifications, not customer spam
   */
  static async notifyAdmin(type: string, message: string, data?: any) {
    try {
      console.log(`[ADMIN-NOTIFY] Sending ${type} notification to admin`)
      
      const notification = this.formatNotification(type, message, data)
      
      // Send SMS to admin's personal number
      const result = await TwilioService.sendSMS(
        this.adminMobile,
        notification,
        'admin_notification'
      )
      
      console.log(`[ADMIN-NOTIFY] Admin notification sent: ${result.success}`)
      return result
      
    } catch (error) {
      console.error('[ADMIN-NOTIFY] Error sending admin notification:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Format notification message for admin
   */
  private static formatNotification(type: string, message: string, data?: any): string {
    const timestamp = new Date().toLocaleString('en-GB')
    
    switch (type) {
      case 'whatsapp_verification':
        return `🔐 ${this.businessName} WhatsApp Verification\n\n${message}\n\nTime: ${timestamp}`
        
      case 'system_error':
        return `⚠️ ${this.businessName} System Alert\n\n${message}\n\nTime: ${timestamp}\n\nPlease check the dashboard.`
        
      case 'high_volume_calls':
        return `📞 ${this.businessName} Call Volume Alert\n\n${message}\n\nPublic Number: ${this.publicNumber}\nTime: ${timestamp}`
        
      case 'whatsapp_approved':
        return `🎉 ${this.businessName} WhatsApp Approved!\n\n${message}\n\nYou can now send WhatsApp messages to customers with 87.5% cost savings!\n\nTime: ${timestamp}`
        
      case 'customer_complaint':
        return `📢 ${this.businessName} Customer Feedback\n\n${message}\n\nTime: ${timestamp}\n\nPlease review and respond.`
        
      case 'mot_reminder_summary':
        return `📊 ${this.businessName} Daily MOT Summary\n\n${message}\n\nTime: ${timestamp}`
        
      default:
        return `📱 ${this.businessName} Notification\n\n${message}\n\nTime: ${timestamp}`
    }
  }

  /**
   * Send WhatsApp verification code to admin if needed
   */
  static async notifyWhatsAppVerification(code: string) {
    const message = `Your WhatsApp Business verification code is: ${code}\n\nThis is for the business number ${this.publicNumber}, not your personal number.`
    return this.notifyAdmin('whatsapp_verification', message)
  }

  /**
   * Notify admin of system errors
   */
  static async notifySystemError(error: string, context?: string) {
    const message = `System error detected${context ? ` in ${context}` : ''}:\n\n${error}`
    return this.notifyAdmin('system_error', message)
  }

  /**
   * Notify admin when WhatsApp Business is approved
   */
  static async notifyWhatsAppApproved() {
    const message = `WhatsApp Business API has been approved for ${this.publicNumber}!\n\nYou can now:\n• Send WhatsApp messages to customers\n• Save 87.5% on messaging costs\n• Track all conversations in the dashboard`
    return this.notifyAdmin('whatsapp_approved', message)
  }

  /**
   * Send daily MOT reminder summary to admin
   */
  static async sendDailyMOTSummary(stats: {
    remindersSent: number
    whatsappSent: number
    smsSent: number
    costSavings: number
    responses: number
  }) {
    const message = `Daily MOT Reminder Summary:

📤 Total Reminders: ${stats.remindersSent}
📱 WhatsApp: ${stats.whatsappSent}
💬 SMS: ${stats.smsSent}
💰 Cost Savings: £${stats.costSavings.toFixed(2)}
📞 Customer Responses: ${stats.responses}

Dashboard: https://your-domain.com/dashboard`

    return this.notifyAdmin('mot_reminder_summary', message, stats)
  }

  /**
   * Check if a phone number is the admin number
   */
  static isAdminNumber(phoneNumber: string): boolean {
    const cleanAdmin = this.adminMobile.replace(/\D/g, '')
    const cleanInput = phoneNumber.replace(/\D/g, '')
    return cleanAdmin === cleanInput || cleanInput.endsWith(cleanAdmin.slice(-10))
  }

  /**
   * Get admin contact info (for internal use only)
   */
  static getAdminContact() {
    return {
      mobile: this.adminMobile,
      businessName: this.businessName,
      publicNumber: this.publicNumber
    }
  }
}
