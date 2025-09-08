import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-WHATSAPP] Checking WhatsApp data...")

    // Check if tables exist
    const tablesExist = await sql`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_conversations') as conversations_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_messages') as messages_exists
    `

    // Get all conversations
    const conversations = await sql`
      SELECT 
        id,
        customer_id,
        phone_number,
        status,
        conversation_type,
        vehicle_registration,
        message_count,
        last_message_at,
        created_at,
        consent_given
      FROM whatsapp_conversations
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Get all messages
    const messages = await sql`
      SELECT 
        id,
        conversation_id,
        message_sid,
        direction,
        content,
        from_number,
        to_number,
        status,
        cost,
        sent_at,
        vehicle_registration,
        reminder_type
      FROM whatsapp_messages
      ORDER BY sent_at DESC
      LIMIT 10
    `

    // Get conversation counts
    const conversationCounts = await sql`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_conversations
      FROM whatsapp_conversations
    `

    // Get message counts
    const messageCounts = await sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_messages,
        COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_messages,
        COUNT(CASE WHEN sent_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_messages,
        SUM(cost) as total_cost
      FROM whatsapp_messages
    `

    // Check for orphaned messages (messages without conversations)
    const orphanedMessages = await sql`
      SELECT 
        m.id,
        m.conversation_id,
        m.content,
        m.sent_at
      FROM whatsapp_messages m
      LEFT JOIN whatsapp_conversations c ON m.conversation_id = c.id
      WHERE c.id IS NULL
      LIMIT 5
    `

    // Get recent dashboard query results
    const dashboardConversations = await sql`
      SELECT 
        c.*,
        cust.first_name,
        cust.last_name,
        cust.email,
        COUNT(m.id) as message_count,
        MAX(m.sent_at) as last_message_time,
        SUM(CASE WHEN m.direction = 'outbound' THEN m.cost ELSE 0 END) as total_cost
      FROM whatsapp_conversations c
      LEFT JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN whatsapp_messages m ON c.id = m.conversation_id
      WHERE c.created_at > NOW() - INTERVAL '7 days'
      GROUP BY c.id, cust.first_name, cust.last_name, cust.email
      ORDER BY c.last_message_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      tables_exist: tablesExist[0],
      conversations: {
        count: conversationCounts[0],
        data: conversations
      },
      messages: {
        count: messageCounts[0],
        data: messages
      },
      orphaned_messages: orphanedMessages,
      dashboard_conversations: dashboardConversations,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-WHATSAPP] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
