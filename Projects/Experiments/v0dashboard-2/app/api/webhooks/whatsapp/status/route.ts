import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(request: Request) {
  try {
    console.log("[WHATSAPP-STATUS] Received status callback")
    
    const formData = await request.formData()
    
    // Extract status callback data
    const statusData = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as string,
      To: formData.get('To') as string,
      From: formData.get('From') as string,
      AccountSid: formData.get('AccountSid') as string,
      ApiVersion: formData.get('ApiVersion') as string,
      ErrorCode: formData.get('ErrorCode') as string,
      ErrorMessage: formData.get('ErrorMessage') as string
    }

    console.log("[WHATSAPP-STATUS] Status data:", {
      MessageSid: statusData.MessageSid,
      MessageStatus: statusData.MessageStatus,
      To: statusData.To,
      ErrorCode: statusData.ErrorCode,
      ErrorMessage: statusData.ErrorMessage
    })

    // Update message status in database
    if (statusData.MessageSid) {
      try {
        await sql`
          UPDATE sms_log 
          SET 
            status = ${statusData.MessageStatus},
            error_code = ${statusData.ErrorCode || null},
            error_message = ${statusData.ErrorMessage || null},
            updated_at = NOW()
          WHERE message_sid = ${statusData.MessageSid}
        `
        
        console.log(`[WHATSAPP-STATUS] Updated message ${statusData.MessageSid} status to ${statusData.MessageStatus}`)
      } catch (dbError) {
        console.error("[WHATSAPP-STATUS] Database update error:", dbError)
      }
    }

    // Update WhatsApp conversation status if needed
    if (statusData.MessageStatus === 'delivered' || statusData.MessageStatus === 'read') {
      try {
        await sql`
          UPDATE whatsapp_conversations 
          SET 
            last_message_status = ${statusData.MessageStatus},
            updated_at = NOW()
          WHERE phone_number = ${statusData.To?.replace('whatsapp:', '')}
        `
      } catch (dbError) {
        console.error("[WHATSAPP-STATUS] Conversation update error:", dbError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Status callback processed"
    })

  } catch (error) {
    console.error("[WHATSAPP-STATUS] Error processing status callback:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
