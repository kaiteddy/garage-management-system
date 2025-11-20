import { type NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email address is required",
        },
        { status: 400 },
      )
    }

    // Send test MOT reminder
    const testData = {
      customerName: "John Doe",
      registration: "AB12 CDE",
      make: "Ford",
      model: "Focus",
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      daysLeft: 7,
      garageInfo: {
        name: "Test Garage",
        phone: "020 1234 5678",
        email: "test@garage.com",
        address: "123 Test Street, London, SW1A 1AA",
      },
    }

    const result = await emailService.sendMOTReminder(email, testData)

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: "Test email sent successfully",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Test email API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
