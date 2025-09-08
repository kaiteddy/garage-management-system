import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: Request) {
  try {
    const { queueId, verifiedBy, notes, action = 'approve' } = await request.json()

    console.log(`[WHATSAPP-APPROVE] ${action} message ${queueId} by ${verifiedBy}`)

    // Validate required fields
    if (!queueId || !verifiedBy) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: queueId, verifiedBy"
      }, { status: 400 })
    }

    if (action === 'approve') {
      const result = await WhatsAppService.approveMessage(queueId, verifiedBy, notes)

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "Message approved and sent successfully",
          messageData: result.message,
          sendResult: result.sendResult
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }
    } else if (action === 'reject') {
      // Reject the message
      const result = await this.rejectMessage(queueId, verifiedBy, notes)
      
      return NextResponse.json({
        success: true,
        message: "Message rejected successfully"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid action. Use 'approve' or 'reject'"
      }, { status: 400 })
    }

  } catch (error) {
    console.error("[WHATSAPP-APPROVE] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to process message approval"
    }, { status: 500 })
  }
}

// Helper function to reject message
async function rejectMessage(queueId: string, verifiedBy: string, notes?: string) {
  const { sql } = require('@/lib/database/neon-client')
  
  await sql`
    UPDATE message_verification_queue 
    SET 
      verification_status = 'rejected',
      verified_by = ${verifiedBy},
      verified_at = NOW(),
      rejection_reason = ${notes || 'No reason provided'}
    WHERE id = ${queueId}
    AND verification_status = 'pending'
  `
  
  return { success: true }
}
