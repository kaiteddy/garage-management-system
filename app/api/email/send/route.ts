import { type NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, html, text, from } = body

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: to, subject, and either html or text",
        },
        { status: 400 },
      )
    }

    // Send email
    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text,
      from,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: "Email sent successfully",
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
    console.error("Email API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
