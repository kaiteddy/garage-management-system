import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      customerId, 
      phoneNumber, 
      customerName, 
      interactionType, 
      message 
    } = body

    console.log(`[WHATSAPP-LOG] Logging interaction for customer ${customerName} (${customerId})`)

    // Log the WhatsApp interaction in the database
    // This helps track when staff initiate WhatsApp conversations
    await sql`
      INSERT INTO whatsapp_interactions (
        customer_id,
        phone_number,
        customer_name,
        interaction_type,
        message,
        initiated_at,
        initiated_by
      ) VALUES (
        ${customerId},
        ${phoneNumber},
        ${customerName},
        ${interactionType},
        ${message},
        NOW(),
        'staff'
      )
      ON CONFLICT (customer_id, phone_number, DATE(initiated_at))
      DO UPDATE SET
        last_interaction_at = NOW(),
        interaction_count = whatsapp_interactions.interaction_count + 1
    `

    // Also try to get or create a conversation record for tracking
    try {
      const existingConversation = await sql`
        SELECT id FROM whatsapp_conversations 
        WHERE customer_id = ${customerId} 
        AND phone_number = ${phoneNumber}
        ORDER BY created_at DESC 
        LIMIT 1
      `

      let conversationId = null

      if (existingConversation.length > 0) {
        conversationId = existingConversation[0].id
        
        // Update existing conversation
        await sql`
          UPDATE whatsapp_conversations 
          SET 
            last_message_at = NOW(),
            message_count = message_count + 1,
            status = 'active'
          WHERE id = ${conversationId}
        `
      } else {
        // Create new conversation
        const newConversation = await sql`
          INSERT INTO whatsapp_conversations (
            customer_id,
            phone_number,
            customer_name,
            status,
            created_at,
            last_message_at,
            message_count
          ) VALUES (
            ${customerId},
            ${phoneNumber},
            ${customerName},
            'active',
            NOW(),
            NOW(),
            1
          )
          RETURNING id
        `
        conversationId = newConversation[0]?.id
      }

      console.log(`[WHATSAPP-LOG] ✅ Interaction logged successfully for ${customerName}`)

      return NextResponse.json({
        success: true,
        conversationId,
        message: 'WhatsApp interaction logged successfully'
      })

    } catch (conversationError) {
      console.warn('[WHATSAPP-LOG] Failed to update conversation, but interaction logged:', conversationError)
      
      return NextResponse.json({
        success: true,
        message: 'WhatsApp interaction logged (conversation tracking unavailable)'
      })
    }

  } catch (error) {
    console.error('[WHATSAPP-LOG] Error logging WhatsApp interaction:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to log WhatsApp interaction'
    }, { status: 500 })
  }
}
