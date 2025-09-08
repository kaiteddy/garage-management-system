import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-WHATSAPP-SIMPLE] Checking basic WhatsApp data...")

    // Simple count queries
    const conversationCount = await sql`SELECT COUNT(*) as count FROM whatsapp_conversations`
    const messageCount = await sql`SELECT COUNT(*) as count FROM whatsapp_messages`
    
    // Get the most recent conversation
    const latestConversation = await sql`
      SELECT * FROM whatsapp_conversations 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    // Get the most recent message
    const latestMessage = await sql`
      SELECT * FROM whatsapp_messages 
      ORDER BY sent_at DESC 
      LIMIT 1
    `

    // Check if tables exist
    const tablesCheck = await sql`
      SELECT
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_conversations') as conversations_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_messages') as messages_exists
    `

    console.log("[DEBUG-WHATSAPP-SIMPLE] Results:", {
      conversations: conversationCount[0]?.count || 0,
      messages: messageCount[0]?.count || 0,
      latest_conversation: latestConversation[0] || null,
      latest_message: latestMessage[0] || null
    })

    return NextResponse.json({
      success: true,
      summary: {
        total_conversations: conversationCount[0]?.count || 0,
        total_messages: messageCount[0]?.count || 0,
        tables_exist: {
          conversations: tablesCheck[0]?.conversations_exists || false,
          messages: tablesCheck[0]?.messages_exists || false
        }
      },
      latest_data: {
        conversation: latestConversation[0] || null,
        message: latestMessage[0] || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-WHATSAPP-SIMPLE] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
