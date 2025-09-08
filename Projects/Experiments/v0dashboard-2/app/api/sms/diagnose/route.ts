import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import twilio from "twilio"

export async function GET() {
  try {
    console.log("[SMS-DIAGNOSE] 🔍 Running comprehensive SMS diagnostics...")

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        app_url: process.env.NEXT_PUBLIC_APP_URL
      },
      twilio_config: {
        account_sid: process.env.TWILIO_ACCOUNT_SID ? "✅ Set" : "❌ Missing",
        auth_token: process.env.TWILIO_AUTH_TOKEN ? "✅ Set" : "❌ Missing",
        phone_number: process.env.TWILIO_PHONE_NUMBER || "❌ Missing",
        whatsapp_number: process.env.TWILIO_WHATSAPP_NUMBER || "❌ Missing",
        webhook_url: process.env.TWILIO_WEBHOOK_URL || "❌ Missing"
      },
      twilio_connection: null,
      database_connection: null,
      sms_log_table: null,
      recent_errors: [],
      phone_number_validation: null,
      webhook_status: null
    }

    // Test Twilio connection
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        
        // Test account info
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
        diagnostics.twilio_connection = {
          status: "✅ Connected",
          account_status: account.status,
          account_type: account.type,
          date_created: account.dateCreated
        }

        // Test phone number
        if (process.env.TWILIO_PHONE_NUMBER) {
          try {
            const phoneNumbers = await client.incomingPhoneNumbers.list({
              phoneNumber: process.env.TWILIO_PHONE_NUMBER
            })
            
            if (phoneNumbers.length > 0) {
              const phoneNumber = phoneNumbers[0]
              diagnostics.phone_number_validation = {
                status: "✅ Valid",
                capabilities: phoneNumber.capabilities,
                voice_url: phoneNumber.voiceUrl,
                sms_url: phoneNumber.smsUrl,
                status_callback: phoneNumber.statusCallback
              }
            } else {
              diagnostics.phone_number_validation = {
                status: "❌ Phone number not found in account",
                configured_number: process.env.TWILIO_PHONE_NUMBER
              }
            }
          } catch (phoneError) {
            diagnostics.phone_number_validation = {
              status: "❌ Error validating phone number",
              error: phoneError instanceof Error ? phoneError.message : "Unknown error"
            }
          }
        }

      } else {
        diagnostics.twilio_connection = {
          status: "❌ Missing credentials",
          missing: [
            !process.env.TWILIO_ACCOUNT_SID ? "TWILIO_ACCOUNT_SID" : null,
            !process.env.TWILIO_AUTH_TOKEN ? "TWILIO_AUTH_TOKEN" : null
          ].filter(Boolean)
        }
      }
    } catch (twilioError) {
      diagnostics.twilio_connection = {
        status: "❌ Connection failed",
        error: twilioError instanceof Error ? twilioError.message : "Unknown error"
      }
    }

    // Test database connection
    try {
      const dbTest = await sql`SELECT NOW() as current_time`
      diagnostics.database_connection = {
        status: "✅ Connected",
        current_time: dbTest[0].current_time
      }
    } catch (dbError) {
      diagnostics.database_connection = {
        status: "❌ Connection failed",
        error: dbError instanceof Error ? dbError.message : "Unknown error"
      }
    }

    // Check SMS log table
    try {
      const tableCheck = await sql`
        SELECT COUNT(*) as total_logs,
               COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_logs,
               COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_logs,
               MAX(sent_at) as last_log_time
        FROM sms_log
      `
      
      diagnostics.sms_log_table = {
        status: "✅ Table exists",
        total_logs: parseInt(tableCheck[0].total_logs),
        failed_logs: parseInt(tableCheck[0].failed_logs),
        sent_logs: parseInt(tableCheck[0].sent_logs),
        last_log_time: tableCheck[0].last_log_time
      }

      // Get recent errors
      const recentErrors = await sql`
        SELECT sent_at, to_number, error_message, message_type
        FROM sms_log 
        WHERE status = 'failed' 
        ORDER BY sent_at DESC 
        LIMIT 10
      `
      
      diagnostics.recent_errors = recentErrors.map(error => ({
        timestamp: error.sent_at,
        phone: error.to_number,
        error: error.error_message,
        type: error.message_type
      }))

    } catch (tableError) {
      diagnostics.sms_log_table = {
        status: "❌ Table missing or error",
        error: tableError instanceof Error ? tableError.message : "Unknown error"
      }
    }

    // Test webhook accessibility
    try {
      if (process.env.TWILIO_WEBHOOK_URL) {
        const webhookUrl = process.env.TWILIO_WEBHOOK_URL
        const response = await fetch(webhookUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        
        diagnostics.webhook_status = {
          status: response.ok ? "✅ Accessible" : "⚠️ HTTP Error",
          url: webhookUrl,
          response_status: response.status,
          response_text: await response.text().catch(() => "Could not read response")
        }
      } else {
        diagnostics.webhook_status = {
          status: "❌ Webhook URL not configured"
        }
      }
    } catch (webhookError) {
      diagnostics.webhook_status = {
        status: "❌ Webhook not accessible",
        error: webhookError instanceof Error ? webhookError.message : "Unknown error"
      }
    }

    // Generate recommendations
    const recommendations = []
    
    if (diagnostics.twilio_connection?.status?.includes("❌")) {
      recommendations.push("Fix Twilio credentials in environment variables")
    }
    
    if (diagnostics.phone_number_validation?.status?.includes("❌")) {
      recommendations.push("Verify Twilio phone number configuration")
    }
    
    if (diagnostics.database_connection?.status?.includes("❌")) {
      recommendations.push("Fix database connection issues")
    }
    
    if (diagnostics.sms_log_table?.status?.includes("❌")) {
      recommendations.push("Initialize SMS log table")
    }
    
    if (diagnostics.webhook_status?.status?.includes("❌")) {
      recommendations.push("Configure webhook URL and ensure ngrok tunnel is active")
    }
    
    if (diagnostics.recent_errors.length > 0) {
      recommendations.push(`Address ${diagnostics.recent_errors.length} recent SMS failures`)
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      recommendations,
      summary: {
        twilio_ok: diagnostics.twilio_connection?.status?.includes("✅") || false,
        database_ok: diagnostics.database_connection?.status?.includes("✅") || false,
        phone_ok: diagnostics.phone_number_validation?.status?.includes("✅") || false,
        webhook_ok: diagnostics.webhook_status?.status?.includes("✅") || false,
        recent_failures: diagnostics.recent_errors.length
      }
    })

  } catch (error) {
    console.error("[SMS-DIAGNOSE] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to run SMS diagnostics",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
