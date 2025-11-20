import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Get recent customer responses
    const responses = await sql`
      SELECT 
        r.id,
        r.from_number,
        r.message_content,
        r.received_at,
        r.processed,
        r.action_taken,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.email
      FROM sms_responses r
      LEFT JOIN customers c ON r.from_number = c.twilio_phone
      ORDER BY r.received_at DESC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
      responses
    })
  } catch (error) {
    console.error("[SMS-RESPONSES] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch customer responses"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { responseId, action } = await request.json()

    if (!responseId || !action) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters"
      }, { status: 400 })
    }

    // Get the response details
    const responses = await sql`
      SELECT * FROM sms_responses WHERE id = ${responseId}
    `

    if (responses.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Response not found"
      }, { status: 404 })
    }

    const response = responses[0]
    const phoneNumber = response.from_number
    const message = response.message_content.trim().toLowerCase()

    // Process the action
    let result = null
    let actionTaken = ""

    switch (action) {
      case "mark_sold":
        // Mark vehicle as sold
        if (response.vehicle_registration) {
          await sql`
            UPDATE vehicles 
            SET status = 'SOLD', 
                sold_date = CURRENT_DATE,
                updated_at = NOW()
            WHERE registration = ${response.vehicle_registration}
          `
          actionTaken = `Marked vehicle ${response.vehicle_registration} as sold`
        } else {
          // Find vehicles for this customer
          const vehicles = await sql`
            SELECT v.registration 
            FROM vehicles v
            JOIN customers c ON v.owner_id = c.id
            WHERE c.twilio_phone = ${phoneNumber}
            LIMIT 5
          `
          
          if (vehicles.length > 0) {
            // Ask which vehicle was sold in a follow-up
            actionTaken = `Customer has ${vehicles.length} vehicles. Need to clarify which one was sold.`
          } else {
            actionTaken = "No vehicles found for this customer"
          }
        }
        break

      case "update_email":
        // Extract email from message
        const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
        if (emailMatch) {
          const email = emailMatch[0]
          
          // Update customer email
          await sql`
            UPDATE customers
            SET email = ${email},
                updated_at = NOW()
            WHERE twilio_phone = ${phoneNumber}
          `
          actionTaken = `Updated customer email to ${email}`
        } else {
          actionTaken = "No valid email found in message"
        }
        break

      case "opt_out":
        // Opt out customer from SMS
        await sql`
          UPDATE customers
          SET opt_out = TRUE,
              opt_out_date = CURRENT_DATE,
              updated_at = NOW()
          WHERE twilio_phone = ${phoneNumber}
        `
        actionTaken = "Customer opted out of SMS communications"
        break

      case "mark_processed":
        // Just mark as processed with no specific action
        actionTaken = "Marked as processed - no specific action taken"
        break

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action"
        }, { status: 400 })
    }

    // Update the response record
    await sql`
      UPDATE sms_responses
      SET 
        processed = TRUE,
        processed_at = NOW(),
        action_taken = ${actionTaken}
      WHERE id = ${responseId}
    `

    return NextResponse.json({
      success: true,
      action: action,
      actionTaken,
      responseId
    })
  } catch (error) {
    console.error("[SMS-RESPONSES] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to process customer response"
    }, { status: 500 })
  }
}
