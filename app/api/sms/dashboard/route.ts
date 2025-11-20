import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { TwilioService } from "@/lib/twilio-service"

export async function GET() {
  try {
    console.log("[SMS-DASHBOARD] 🔍 Generating SMS system dashboard")

    // Get customers ready for SMS
    const smsReadyCustomers = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as customers_with_phone,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as sms_eligible,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as customers_with_email
      FROM customers
    `

    // Get vehicles needing MOT reminders
    const motReminderStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_mots,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as critical_mots,
        COUNT(CASE WHEN mot_expiry_date > CURRENT_DATE + INTERVAL '7 days' AND mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as due_soon_mots,
        COUNT(CASE WHEN mot_expiry_date > CURRENT_DATE + INTERVAL '30 days' AND mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as upcoming_mots
      FROM vehicles v
      JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
      AND c.phone IS NOT NULL
      AND c.phone != ''
    `

    // Get recent SMS activity (if table exists)
    let recentSMSActivity = []
    try {
      recentSMSActivity = await sql`
        SELECT
          vehicle_registration,
          phone_number,
          message_type,
          urgency_level,
          sent_at,
          status,
          delivery_status
        FROM sms_log
        ORDER BY sent_at DESC
        LIMIT 10
      `
    } catch (error) {
      console.log("[SMS-DASHBOARD] SMS log table doesn't exist yet")
    }

    // Get SMS campaign statistics
    let campaignStats = []
    try {
      campaignStats = await sql`
        SELECT
          campaign_name,
          campaign_type,
          messages_sent,
          estimated_cost,
          status,
          created_at
        FROM sms_campaigns
        ORDER BY created_at DESC
        LIMIT 5
      `
    } catch (error) {
      console.log("[SMS-DASHBOARD] SMS campaigns table doesn't exist yet")
    }

    // Calculate potential reach and costs
    const customerStats = smsReadyCustomers[0]
    const motStats = motReminderStats[0]

    const potentialReach = {
      totalCustomers: parseInt(customerStats.total_customers),
      customersWithPhone: parseInt(customerStats.customers_with_phone),
      smsEligible: parseInt(customerStats.sms_eligible),
      customersWithEmail: parseInt(customerStats.customers_with_email),
      phoneOnlyCustomers: parseInt(customerStats.sms_eligible) - parseInt(customerStats.customers_with_email)
    }

    const motReminders = {
      totalVehicles: parseInt(motStats.total_vehicles),
      expiredMOTs: parseInt(motStats.expired_mots),
      criticalMOTs: parseInt(motStats.critical_mots),
      dueSoonMOTs: parseInt(motStats.due_soon_mots),
      upcomingMOTs: parseInt(motStats.upcoming_mots)
    }

    // Calculate estimated costs
    const estimatedCosts = {
      expiredReminders: motReminders.expiredMOTs * 0.015, // Multi-segment urgent messages
      criticalReminders: motReminders.criticalMOTs * 0.0075, // Single SMS
      dueSoonReminders: motReminders.dueSoonMOTs * 0.0075,
      totalMonthlyCost: (motReminders.expiredMOTs * 0.015) + (motReminders.criticalMOTs * 0.0075) + (motReminders.dueSoonMOTs * 0.0075)
    }

    // Twilio configuration status
    const twilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'CONFIGURED' : 'NOT_SET',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'CONFIGURED' : 'NOT_SET',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'NOT_SET',
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'NOT_SET',
      fullyConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
    }

    return NextResponse.json({
      success: true,
      smsDashboard: {
        timestamp: new Date().toISOString(),

        potentialReach,
        motReminders,
        estimatedCosts: {
          ...estimatedCosts,
          totalMonthlyCost: Math.round(estimatedCosts.totalMonthlyCost * 100) / 100
        },

        recentActivity: recentSMSActivity,
        campaignHistory: campaignStats,

        twilioConfiguration: twilioConfig,

        availableCampaigns: [
          {
            name: "Critical MOT Reminders",
            description: "Urgent reminders for expired and critical MOTs",
            targetCount: motReminders.expiredMOTs + motReminders.criticalMOTs,
            estimatedCost: Math.round((estimatedCosts.expiredReminders + estimatedCosts.criticalReminders) * 100) / 100,
            endpoint: "/api/sms/send-mot-reminders",
            priority: "HIGH"
          },
          {
            name: "MOT Due Soon Reminders",
            description: "Proactive reminders for MOTs due in 30 days",
            targetCount: motReminders.dueSoonMOTs,
            estimatedCost: Math.round(estimatedCosts.dueSoonReminders * 100) / 100,
            endpoint: "/api/sms/send-mot-reminders",
            priority: "MEDIUM"
          },
          {
            name: "Contact Update Campaign",
            description: "Collect email addresses from phone-only customers",
            targetCount: potentialReach.phoneOnlyCustomers,
            estimatedCost: Math.round(potentialReach.phoneOnlyCustomers * 0.0075 * 100) / 100,
            endpoint: "/api/sms/contact-update-campaign",
            priority: "LOW"
          }
        ],

        quickActions: [
          {
            action: "Send Critical MOT Reminders (Dry Run)",
            endpoint: "/api/sms/send-mot-reminders",
            method: "POST",
            payload: { dryRun: true, limit: 10 },
            description: "Test SMS system with 10 critical MOT reminders"
          },
          {
            action: "Prepare Customer Phone Numbers",
            endpoint: "/api/customers/prepare-for-twilio",
            method: "POST",
            description: "Format and validate phone numbers for Twilio"
          },
          {
            action: "Setup SMS Webhook",
            endpoint: "/api/sms/webhook",
            method: "GET",
            description: "Configure Twilio webhook for responses"
          }
        ],

        systemStatus: {
          smsSystemReady: twilioConfig.fullyConfigured,
          databaseReady: true,
          webhookReady: !!process.env.TWILIO_WEBHOOK_URL,
          customerDataReady: potentialReach.smsEligible > 0,
          motDataReady: motReminders.totalVehicles > 0
        },

        // Add Twilio configuration status
        twilioConfiguration: TwilioService.getConfiguration()
      }
    })

  } catch (error) {
    console.error("[SMS-DASHBOARD] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to generate SMS dashboard",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
