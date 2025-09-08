import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: Request) {
  try {
    const { 
      customerId, 
      phoneNumber, 
      vehicleRegistration, 
      messageType, 
      messageContent,
      scheduledSendAt,
      fallbackToSMS = true
    } = await request.json()

    console.log(`[WHATSAPP-QUEUE] Queueing message for verification: ${messageType} to ${phoneNumber}`)

    // Validate required fields
    if (!customerId || !phoneNumber || !messageType || !messageContent) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: customerId, phoneNumber, messageType, messageContent"
      }, { status: 400 })
    }

    // Queue message for verification
    const result = await WhatsAppService.queueMessageForVerification({
      customerId,
      phoneNumber,
      vehicleRegistration,
      messageType,
      messageContent,
      scheduledSendAt: scheduledSendAt ? new Date(scheduledSendAt) : undefined,
      fallbackToSMS
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        queueId: result.queueId,
        verificationStatus: result.verificationStatus,
        consentVerified: result.consentVerified,
        consentCheck: result.consentCheck,
        message: "Message queued for verification successfully"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error("[WHATSAPP-QUEUE] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to queue message for verification"
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log(`[WHATSAPP-QUEUE] Getting pending verifications (limit: ${limit})`)

    const result = await WhatsAppService.getPendingVerifications(limit)

    if (result.success) {
      return NextResponse.json({
        success: true,
        pendingMessages: result.pendingMessages,
        count: result.pendingMessages.length
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[WHATSAPP-QUEUE] Error getting pending verifications:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get pending verifications"
    }, { status: 500 })
  }
}
