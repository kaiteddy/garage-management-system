import { NextResponse } from "next/server"
import twilio from "twilio"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[WHATSAPP-HEALTH] Starting comprehensive WhatsApp health check...")

    const healthCheck = {
      timestamp: new Date().toISOString(),
      overall_status: "UNKNOWN",
      checks: {
        environment_variables: { status: "UNKNOWN", details: {} },
        twilio_connection: { status: "UNKNOWN", details: {} },
        whatsapp_sandbox: { status: "UNKNOWN", details: {} },
        database_tables: { status: "UNKNOWN", details: {} },
        webhook_config: { status: "UNKNOWN", details: {} },
        recent_activity: { status: "UNKNOWN", details: {} }
      },
      recommendations: []
    }

    // 1. Check Environment Variables
    console.log("[WHATSAPP-HEALTH] Checking environment variables...")
    const envVars = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "SET" : "MISSING",
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "SET" : "MISSING",
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER ? "SET" : "MISSING",
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? "SET" : "MISSING"
    }

    const envStatus = Object.values(envVars).every(v => v === "SET") ? "PASS" : "FAIL"
    healthCheck.checks.environment_variables = {
      status: envStatus,
      details: {
        variables: envVars,
        whatsapp_number: process.env.TWILIO_WHATSAPP_NUMBER || "NOT_SET",
        is_sandbox: process.env.TWILIO_WHATSAPP_NUMBER?.includes('+14155238886') || false
      }
    }

    if (envStatus === "FAIL") {
      healthCheck.recommendations.push("Configure missing Twilio environment variables")
    }

    // 2. Test Twilio Connection
    console.log("[WHATSAPP-HEALTH] Testing Twilio connection...")
    let twilioClient = null
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        
        // Test connection by fetching account info
        const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
        
        healthCheck.checks.twilio_connection = {
          status: "PASS",
          details: {
            account_sid: account.sid,
            account_status: account.status,
            account_type: account.type,
            friendly_name: account.friendlyName
          }
        }
      } else {
        throw new Error("Missing Twilio credentials")
      }
    } catch (error) {
      healthCheck.checks.twilio_connection = {
        status: "FAIL",
        details: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
      healthCheck.recommendations.push("Check Twilio Account SID and Auth Token")
    }

    // 3. Check WhatsApp Sandbox Status
    console.log("[WHATSAPP-HEALTH] Checking WhatsApp sandbox status...")
    try {
      if (twilioClient) {
        // Get WhatsApp senders (sandbox info)
        const senders = await twilioClient.messaging.v1.services.list({ limit: 20 })
        
        healthCheck.checks.whatsapp_sandbox = {
          status: "PASS",
          details: {
            sandbox_number: process.env.TWILIO_WHATSAPP_NUMBER,
            is_sandbox: process.env.TWILIO_WHATSAPP_NUMBER?.includes('+14155238886') || false,
            services_count: senders.length,
            setup_instructions: process.env.TWILIO_WHATSAPP_NUMBER?.includes('+14155238886') ? 
              "Send 'join art-taught' to +14155238886 from your phone" : "Production WhatsApp number configured"
          }
        }
      } else {
        throw new Error("Twilio client not available")
      }
    } catch (error) {
      healthCheck.checks.whatsapp_sandbox = {
        status: "FAIL",
        details: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
      healthCheck.recommendations.push("Verify WhatsApp sandbox setup")
    }

    // 4. Check Database Tables
    console.log("[WHATSAPP-HEALTH] Checking database tables...")
    try {
      const tableChecks = await sql`
        SELECT 
          EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_conversations') as conversations_exists,
          EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_messages') as messages_exists
      `

      const conversationCount = await sql`SELECT COUNT(*) as count FROM whatsapp_conversations`
      const messageCount = await sql`SELECT COUNT(*) as count FROM whatsapp_messages`

      healthCheck.checks.database_tables = {
        status: tableChecks[0].conversations_exists && tableChecks[0].messages_exists ? "PASS" : "FAIL",
        details: {
          conversations_table: tableChecks[0].conversations_exists,
          messages_table: tableChecks[0].messages_exists,
          total_conversations: conversationCount[0].count,
          total_messages: messageCount[0].count
        }
      }

      if (!tableChecks[0].conversations_exists || !tableChecks[0].messages_exists) {
        healthCheck.recommendations.push("Run database migration to create WhatsApp tables")
      }
    } catch (error) {
      healthCheck.checks.database_tables = {
        status: "FAIL",
        details: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
      healthCheck.recommendations.push("Check database connection and table structure")
    }

    // 5. Check Webhook Configuration
    console.log("[WHATSAPP-HEALTH] Checking webhook configuration...")
    const webhookUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/whatsapp/webhook`
    
    healthCheck.checks.webhook_config = {
      status: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? "PASS" : "WARN",
      details: {
        webhook_url: webhookUrl,
        verify_token_set: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        environment: process.env.NODE_ENV || "development",
        instructions: "Configure this URL in Twilio Console > Messaging > Settings > WhatsApp sandbox settings"
      }
    }

    if (!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      healthCheck.recommendations.push("Set WHATSAPP_WEBHOOK_VERIFY_TOKEN environment variable")
    }

    // 6. Check Recent Activity
    console.log("[WHATSAPP-HEALTH] Checking recent activity...")
    try {
      const recentMessages = await sql`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN sent_at > NOW() - INTERVAL '24 hours' THEN 1 END) as messages_24h,
          COUNT(CASE WHEN sent_at > NOW() - INTERVAL '7 days' THEN 1 END) as messages_7d,
          MAX(sent_at) as last_message_time
        FROM whatsapp_messages
      `

      const recentConversations = await sql`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN last_message_at > NOW() - INTERVAL '24 hours' THEN 1 END) as active_24h,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations
        FROM whatsapp_conversations
      `

      healthCheck.checks.recent_activity = {
        status: recentMessages[0].total_messages > 0 ? "PASS" : "WARN",
        details: {
          total_messages: recentMessages[0].total_messages,
          messages_last_24h: recentMessages[0].messages_24h,
          messages_last_7d: recentMessages[0].messages_7d,
          last_message_time: recentMessages[0].last_message_time,
          total_conversations: recentConversations[0].total_conversations,
          active_conversations_24h: recentConversations[0].active_24h,
          active_conversations: recentConversations[0].active_conversations
        }
      }

      if (recentMessages[0].total_messages === 0) {
        healthCheck.recommendations.push("Send a test message to verify WhatsApp functionality")
      }
    } catch (error) {
      healthCheck.checks.recent_activity = {
        status: "FAIL",
        details: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
    }

    // Determine Overall Status
    const statuses = Object.values(healthCheck.checks).map(check => check.status)
    if (statuses.every(status => status === "PASS")) {
      healthCheck.overall_status = "HEALTHY"
    } else if (statuses.some(status => status === "FAIL")) {
      healthCheck.overall_status = "UNHEALTHY"
    } else {
      healthCheck.overall_status = "WARNING"
    }

    console.log(`[WHATSAPP-HEALTH] Health check complete. Status: ${healthCheck.overall_status}`)

    return NextResponse.json({
      success: true,
      health_check: healthCheck
    })

  } catch (error) {
    console.error("[WHATSAPP-HEALTH] Health check failed:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
