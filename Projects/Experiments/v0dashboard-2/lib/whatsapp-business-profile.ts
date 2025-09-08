import twilio from 'twilio'

export class WhatsAppBusinessProfile {
  private static client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )

  /**
   * Update WhatsApp Business Profile
   */
  static async updateBusinessProfile(profileData: {
    displayName?: string
    about?: string
    email?: string
    address?: string
    description?: string
    industry?: string
    website?: string[]
    profilePictureUrl?: string
  }) {
    try {
      console.log('[WHATSAPP-PROFILE] Updating business profile...')

      // Note: This requires WhatsApp Business API to be approved
      // For now, we'll prepare the data structure

      const profile = {
        display_name: profileData.displayName || 'ELI MOTORS LTD',
        about: profileData.about || 'Professional MOT testing and vehicle servicing. Serving Hendon since 1979. Call 0208 203 6449 to book.',
        email: profileData.email,
        address: profileData.address,
        description: profileData.description || 'ELI MOTORS LTD - Your trusted MOT and service centre in Hendon. Established 1979. Professional vehicle testing, servicing, and maintenance.',
        industry: profileData.industry || 'Automotive Services',
        websites: profileData.website || [],
        profile_picture_url: profileData.profilePictureUrl
      }

      // When WhatsApp Business API is approved, use this:
      // const result = await this.client.conversations.v1.configuration()
      //   .webhooks.create({
      //     target: 'whatsapp',
      //     method: 'POST',
      //     filters: ['onMessageAdded'],
      //     url: process.env.TWILIO_WEBHOOK_URL
      //   })

      console.log('[WHATSAPP-PROFILE] Profile data prepared:', profile)

      return {
        success: true,
        profile,
        message: 'Profile prepared for WhatsApp Business API approval'
      }

    } catch (error) {
      console.error('[WHATSAPP-PROFILE] Error updating profile:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get current business profile configuration
   */
  static getBusinessProfileConfig() {
    return {
      businessName: 'ELI MOTORS LTD',
      displayName: 'ELI MOTORS LTD',
      about: 'Professional MOT testing and vehicle servicing. Serving Hendon since 1979. Call 0208 203 6449 to book.',
      description: 'ELI MOTORS LTD - Your trusted MOT and service centre in Hendon. Established 1979. Professional vehicle testing, servicing, and maintenance.',
      category: 'Automotive Services',
      industry: 'Automotive Services',
      phone: '0208 203 6449',
      establishedYear: 1979,
      tagline: 'Serving Hendon since 1979',
      services: [
        'MOT Testing',
        'Vehicle Servicing',
        'Automotive Maintenance',
        'Vehicle Repairs',
        'Safety Inspections'
      ],
      businessHours: {
        monday: '8:00 AM - 6:00 PM',
        tuesday: '8:00 AM - 6:00 PM',
        wednesday: '8:00 AM - 6:00 PM',
        thursday: '8:00 AM - 6:00 PM',
        friday: '8:00 AM - 6:00 PM',
        saturday: '8:00 AM - 4:00 PM',
        sunday: 'Closed'
      },
      address: {
        // Add your actual address here
        street: '[Your Street Address]',
        city: 'Hendon',
        postcode: '[Your Postcode]',
        country: 'United Kingdom'
      },
      contact: {
        phone: '0208 203 6449',
        whatsapp: '+447488896449', // Twilio WhatsApp number
        email: '[Your business email]',
        website: 'https://www.elimotors.co.uk'
      }
    }
  }

  /**
   * Generate WhatsApp Business verification documents
   */
  static generateVerificationDocuments() {
    const config = this.getBusinessProfileConfig()

    return {
      businessInfo: {
        legalName: 'ELI MOTORS LTD',
        displayName: 'ELI MOTORS LTD',
        category: 'AUTOMOTIVE',
        description: config.description,
        website: config.contact.website,
        email: config.contact.email,
        phone: config.contact.phone,
        address: `${config.address.street}, ${config.address.city}, ${config.address.postcode}, ${config.address.country}`
      },
      useCase: {
        primary: 'Customer Service',
        description: 'Send MOT expiry reminders, service confirmations, and customer support messages',
        messageTypes: [
          'MOT expiry notifications',
          'Service appointment confirmations',
          'Vehicle status updates',
          'Customer service responses'
        ],
        expectedVolume: '500-1000 messages per month',
        customerBase: 'Local UK customers requiring MOT and vehicle services'
      },
      compliance: {
        gdprCompliant: true,
        optOutHandling: true,
        consentManagement: true,
        dataRetention: true,
        auditTrail: true
      }
    }
  }

  /**
   * Create welcome message for new WhatsApp contacts
   */
  static createWelcomeMessage(customerName?: string) {
    const name = customerName || 'there'

    return `👋 Hello ${name}!

Welcome to ELI MOTORS LTD WhatsApp service.

🚗 We're your trusted MOT and service centre
📍 Serving Hendon since 1979
📞 Call us: 0208 203 6449
🌐 Visit: www.elimotors.co.uk

How can we help you today?

• MOT bookings and reminders
• Service appointments
• Vehicle status updates
• General inquiries

Reply with your question or call us directly!

Commands:
• STOP - Unsubscribe
• HELP - Show help menu
• SOLD [REG] - Mark vehicle as sold`
  }

  /**
   * Create business hours message
   */
  static createBusinessHoursMessage() {
    return `🕐 ELI MOTORS LTD Business Hours

Monday - Friday: 8:00 AM - 6:00 PM
Saturday: 8:00 AM - 4:00 PM
Sunday: Closed

📞 Call us: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Serving Hendon since 1979

For urgent matters outside business hours, please leave a message and we'll get back to you first thing!`
  }

  /**
   * Create auto-reply for outside business hours
   */
  static createOutOfHoursMessage(customerName?: string) {
    const name = customerName || 'there'
    const now = new Date()
    const hours = now.getHours()
    const day = now.getDay() // 0 = Sunday, 6 = Saturday

    let nextOpen = ''

    if (day === 0) { // Sunday
      nextOpen = 'Monday at 8:00 AM'
    } else if (day === 6 && hours >= 16) { // Saturday after 4 PM
      nextOpen = 'Monday at 8:00 AM'
    } else if (hours < 8) {
      nextOpen = 'today at 8:00 AM'
    } else if (hours >= 18) { // After 6 PM weekdays
      nextOpen = 'tomorrow at 8:00 AM'
    } else if (day === 6 && hours >= 16) { // Saturday after 4 PM
      nextOpen = 'Monday at 8:00 AM'
    }

    return `Hi ${name}!

Thanks for contacting ELI MOTORS LTD. We're currently closed but will respond ${nextOpen}.

🕐 Business Hours:
Mon-Fri: 8:00 AM - 6:00 PM
Saturday: 8:00 AM - 4:00 PM
Sunday: Closed

📞 For urgent matters: 0208 203 6449
🏢 Serving Hendon since 1979

We'll get back to you as soon as possible!`
  }
}
