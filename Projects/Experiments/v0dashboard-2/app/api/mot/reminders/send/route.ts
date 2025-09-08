import { type NextRequest, NextResponse } from "next/server"
import { getRemindersToSendToday, markReminderSent } from "@/lib/db/queries"
import { emailService, type MOTReminderData } from "@/lib/email/email-service"

// Garage information - you can move this to environment variables
const GARAGE_INFO = {
  name: process.env.GARAGE_NAME || "Your Garage Name",
  phone: process.env.GARAGE_PHONE || "",
  email: process.env.GARAGE_EMAIL || "",
  address: process.env.GARAGE_ADDRESS || "",
}

async function sendReminderNotification(reminder: any): Promise<boolean> {
  console.log(`Sending reminder for ${reminder.registration} to ${reminder.customerName}`)

  // Check if customer has email
  if (!reminder.email) {
    console.log(`No email address for customer ${reminder.customerName}`)
    return false
  }

  try {
    // Calculate days left
    const expiryDate = new Date(reminder.mot_expiry_date)
    const today = new Date()
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Prepare email data
    const emailData: MOTReminderData = {
      customerName: `${reminder.forename || ""} ${reminder.surname || ""}`.trim() || reminder.customerName,
      registration: reminder.registration,
      make: reminder.make,
      model: reminder.model,
      expiryDate: reminder.mot_expiry_date,
      daysLeft,
      garageInfo: GARAGE_INFO,
    }

    // Send email
    const result = await emailService.sendMOTReminder(reminder.email, emailData)

    if (result.success) {
      console.log(`Email sent successfully to ${reminder.email} for ${reminder.registration}`)
      return true
    } else {
      console.error(`Failed to send email to ${reminder.email}:`, result.error)
      return false
    }
  } catch (error) {
    console.error(`Error sending email reminder for ${reminder.registration}:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get reminders that should be sent today
    const reminders = await getRemindersToSendToday()

    console.log(`Found ${reminders.length} reminders to send today`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Send each reminder
    for (const reminder of reminders) {
      try {
        // Send the notification
        const success = await sendReminderNotification(reminder)

        if (success) {
          // Mark as sent in database
          await markReminderSent(reminder.id, "email")
          results.sent++
        } else {
          results.failed++
          results.errors.push(`Failed to send reminder for ${reminder.registration}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Error sending reminder for ${reminder.registration}: ${error}`)
        console.error(`Failed to send reminder for ${reminder.registration}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReminders: reminders.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors,
      },
      message: `Sent ${results.sent} reminders, ${results.failed} failed`,
    })
  } catch (error) {
    console.error("Failed to send MOT reminders:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send MOT reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
