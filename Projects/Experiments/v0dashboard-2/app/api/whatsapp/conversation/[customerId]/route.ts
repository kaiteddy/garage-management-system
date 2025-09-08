import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function GET(
  request: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phone')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Phone number is required"
      }, { status: 400 })
    }

    console.log(`[WHATSAPP-CONVERSATION] Getting conversation history for customer ${params.customerId}, phone ${phoneNumber}`)

    const result = await WhatsAppService.getConversationHistory(
      params.customerId,
      phoneNumber,
      limit
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        messages: result.messages,
        count: result.messages.length
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[WHATSAPP-CONVERSATION] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get conversation history"
    }, { status: 500 })
  }
}
