import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { phoneNumber, message, vehicleRegistration } = await request.json()

    if (!phoneNumber || !message) {
      return NextResponse.json({
        success: false,
        error: "Phone number and message are required"
      }, { status: 400 })
    }

    console.log(`[SMS-SIMULATE] Simulating response from ${phoneNumber}: "${message}"`)

    // Create SMS responses table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS sms_responses (
        id SERIAL PRIMARY KEY,
        from_number TEXT NOT NULL,
        to_number TEXT,
        message_content TEXT NOT NULL,
        message_sid TEXT,
        vehicle_registration TEXT,
        received_at TIMESTAMP DEFAULT NOW(),
        processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMP,
        action_taken TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Insert the simulated response
    const result = await sql`
      INSERT INTO sms_responses (
        from_number,
        to_number,
        message_content,
        message_sid,
        vehicle_registration,
        received_at
      ) VALUES (
        ${phoneNumber},
        '+441234567890',
        ${message},
        ${'SIM' + Date.now()},
        ${vehicleRegistration || null},
        NOW()
      )
      RETURNING id
    `

    const responseId = result[0].id

    // Process the response automatically based on content
    const messageText = message.toLowerCase().trim()
    let actionTaken = ""
    let processed = false

    console.log(`[SMS-SIMULATE] Processing message: "${messageText}"`)

    try {
      if (messageText === 'stop') {
        // Opt out customer
        const updateResult = await sql`
          UPDATE customers
          SET opt_out = TRUE,
              opt_out_date = CURRENT_DATE,
              updated_at = NOW()
          WHERE twilio_phone = ${phoneNumber}
        `
        console.log(`[SMS-SIMULATE] Opt-out update result:`, updateResult)
        actionTaken = "Customer opted out of SMS communications"
        processed = true
      } else if (messageText === 'sold') {
        // Mark vehicle as sold if specified
        if (vehicleRegistration) {
          const updateResult = await sql`
            UPDATE vehicles
            SET status = 'SOLD',
                sold_date = CURRENT_DATE,
                updated_at = NOW()
            WHERE registration = ${vehicleRegistration}
          `
          console.log(`[SMS-SIMULATE] Vehicle sold update result:`, updateResult)
          actionTaken = `Marked vehicle ${vehicleRegistration} as sold`
          processed = true
        } else {
          actionTaken = "Customer indicated vehicle sold - needs manual review"
        }
      } else if (messageText.includes('@')) {
        // Update email
        const emailMatch = messageText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
        if (emailMatch) {
          const email = emailMatch[0]
          const updateResult = await sql`
            UPDATE customers
            SET email = ${email},
                updated_at = NOW()
            WHERE twilio_phone = ${phoneNumber}
          `
          console.log(`[SMS-SIMULATE] Email update result:`, updateResult)
          actionTaken = `Updated customer email to ${email}`
          processed = true
        }
      } else {
        actionTaken = "Response logged for manual review"
      }
    } catch (error) {
      console.error(`[SMS-SIMULATE] Error processing response:`, error)
      actionTaken = `Error processing response: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    console.log(`[SMS-SIMULATE] Action taken: ${actionTaken}, Processed: ${processed}`)

    // Update the response record
    try {
      if (processed) {
        await sql`
          UPDATE sms_responses
          SET
            processed = ${processed},
            processed_at = NOW(),
            action_taken = ${actionTaken}
          WHERE id = ${responseId}
        `
      } else {
        await sql`
          UPDATE sms_responses
          SET
            processed = ${processed},
            action_taken = ${actionTaken}
          WHERE id = ${responseId}
        `
      }
    } catch (error) {
      console.error(`[SMS-SIMULATE] Error updating response record:`, error)
    }

    return NextResponse.json({
      success: true,
      responseId,
      phoneNumber,
      message,
      actionTaken,
      processed,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SMS-SIMULATE] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to simulate SMS response"
    }, { status: 500 })
  }
}
