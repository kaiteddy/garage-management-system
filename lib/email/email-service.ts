import { Resend } from "resend"

let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend!
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
}

export interface MOTReminderData {
  customerName: string
  registration: string
  make?: string
  model?: string
  expiryDate: string
  daysLeft: number
  garageInfo?: {
    name: string
    phone: string
    email: string
    address?: string
  }
}

export class EmailService {
  private static instance: EmailService
  private fromAddress: string

  private constructor() {
    this.fromAddress = process.env.EMAIL_FROM || "noreply@yourdomain.com"
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not configured, email not sent")
        return { success: false, error: "Email service not configured" }
      }

      const resendClient = getResendClient()
      const result = await resendClient.emails.send({
        from: options.from || this.fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      if (result.error) {
        console.error("Email sending failed:", result.error)
        return { success: false, error: result.error.message }
      }

      console.log("Email sent successfully:", result.data?.id)
      return { success: true, messageId: result.data?.id }
    } catch (error) {
      console.error("Email service error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      }
    }
  }

  async sendMOTReminder(
    to: string,
    data: MOTReminderData,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = `MOT Reminder - ${data.registration} expires in ${data.daysLeft} days`

    const html = this.generateMOTReminderHTML(data)
    const text = this.generateMOTReminderText(data)

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    })
  }

  async sendBulkMOTReminders(reminders: Array<{ email: string; data: MOTReminderData }>): Promise<{
    sent: number
    failed: number
    errors: string[]
  }> {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const reminder of reminders) {
      try {
        const result = await this.sendMOTReminder(reminder.email, reminder.data)

        if (result.success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push(`Failed to send to ${reminder.email}: ${result.error}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Error sending to ${reminder.email}: ${error}`)
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    return results
  }

  private generateMOTReminderHTML(data: MOTReminderData): string {
    const { customerName, registration, make, model, expiryDate, daysLeft, garageInfo } = data

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MOT Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .vehicle-info { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .urgent { color: #dc3545; font-weight: bold; }
            .warning { color: #fd7e14; font-weight: bold; }
            .info { color: #0d6efd; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>MOT Reminder</h1>
              <p>Hello ${customerName},</p>
              <p>This is a friendly reminder that your vehicle's MOT is ${daysLeft <= 7 ? "due very soon" : "approaching expiry"}.</p>
            </div>

            <div class="vehicle-info">
              <h3>Vehicle Details</h3>
              <p><strong>Registration:</strong> ${registration}</p>
              ${make ? `<p><strong>Make:</strong> ${make}</p>` : ""}
              ${model ? `<p><strong>Model:</strong> ${model}</p>` : ""}
              <p><strong>MOT Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString("en-GB")}</p>
              <p class="${daysLeft <= 7 ? "urgent" : daysLeft <= 14 ? "warning" : "info"}">
                <strong>Days Remaining:</strong> ${daysLeft} days
              </p>
            </div>

            <div>
              <h3>What you need to do:</h3>
              <ul>
                <li>Book your MOT test as soon as possible</li>
                <li>You can drive your vehicle to the test centre even if the MOT has expired</li>
                <li>Make sure your vehicle is roadworthy before the test</li>
                ${daysLeft <= 7 ? '<li class="urgent">⚠️ Your MOT expires very soon - book immediately!</li>' : ""}
              </ul>
            </div>

            ${
              garageInfo
                ? `
              <div class="vehicle-info">
                <h3>Contact Us</h3>
                <p><strong>${garageInfo.name}</strong></p>
                ${garageInfo.phone ? `<p>📞 ${garageInfo.phone}</p>` : ""}
                ${garageInfo.email ? `<p>✉️ ${garageInfo.email}</p>` : ""}
                ${garageInfo.address ? `<p>📍 ${garageInfo.address}</p>` : ""}
              </div>
            `
                : ""
            }

            <div class="footer">
              <p>This is an automated reminder. Please contact us if you have any questions.</p>
              <p><small>You are receiving this email because you are a customer of our garage services.</small></p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateMOTReminderText(data: MOTReminderData): string {
    const { customerName, registration, make, model, expiryDate, daysLeft, garageInfo } = data

    return `
MOT Reminder

Hello ${customerName},

This is a friendly reminder that your vehicle's MOT is ${daysLeft <= 7 ? "due very soon" : "approaching expiry"}.

Vehicle Details:
- Registration: ${registration}
${make ? `- Make: ${make}` : ""}
${model ? `- Model: ${model}` : ""}
- MOT Expiry Date: ${new Date(expiryDate).toLocaleDateString("en-GB")}
- Days Remaining: ${daysLeft} days

What you need to do:
- Book your MOT test as soon as possible
- You can drive your vehicle to the test centre even if the MOT has expired
- Make sure your vehicle is roadworthy before the test
${daysLeft <= 7 ? "- ⚠️ Your MOT expires very soon - book immediately!" : ""}

${
  garageInfo
    ? `
Contact Us:
${garageInfo.name}
${garageInfo.phone ? `Phone: ${garageInfo.phone}` : ""}
${garageInfo.email ? `Email: ${garageInfo.email}` : ""}
${garageInfo.address ? `Address: ${garageInfo.address}` : ""}
`
    : ""
}

This is an automated reminder. Please contact us if you have any questions.
    `.trim()
  }
}

export const emailService = EmailService.getInstance()
