import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[WHATSAPP-DASHBOARD] Generating WhatsApp dashboard data...")

    // Get basic statistics
    const statsResult = await WhatsAppService.getDashboardStats()
    
    // Get recent conversations
    const recentConversations = await sql`
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
      LIMIT 10
    `

    // Get message volume by day (last 7 days)
    const messageVolume = await sql`
      SELECT 
        DATE(sent_at) as message_date,
        COUNT(*) as total_messages,
        COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_messages,
        COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_messages,
        SUM(cost) as daily_cost
      FROM whatsapp_messages
      WHERE sent_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(sent_at)
      ORDER BY message_date DESC
    `

    // Get consent statistics
    const consentStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN whatsapp_consent = TRUE THEN 1 END) as whatsapp_consented,
        COUNT(CASE WHEN sms_consent = TRUE THEN 1 END) as sms_consented,
        COUNT(CASE WHEN marketing_consent = TRUE THEN 1 END) as marketing_consented,
        COUNT(CASE WHEN opted_out_at IS NOT NULL THEN 1 END) as opted_out,
        COUNT(CASE WHEN phone_verified = TRUE THEN 1 END) as phone_verified
      FROM customer_consent
    `

    // Get pending verifications
    const pendingVerifications = await sql`
      SELECT 
        vq.*,
        c.first_name,
        c.last_name,
        v.make,
        v.model
      FROM message_verification_queue vq
      LEFT JOIN customers c ON vq.customer_id = c.id
      LEFT JOIN vehicles v ON vq.vehicle_registration = v.registration
      WHERE vq.verification_status = 'pending'
      AND vq.expires_at > NOW()
      ORDER BY vq.created_at ASC
      LIMIT 20
    `

    // Get cost comparison (WhatsApp vs SMS)
    const costComparison = await sql`
      SELECT 
        'WhatsApp' as channel,
        COUNT(*) as message_count,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost_per_message
      FROM whatsapp_messages
      WHERE sent_at > NOW() - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'SMS' as channel,
        COUNT(*) as message_count,
        SUM(estimated_cost) as total_cost,
        AVG(estimated_cost) as avg_cost_per_message
      FROM sms_log
      WHERE sent_at > NOW() - INTERVAL '30 days'
    `

    // Calculate savings
    const whatsappData = costComparison.find(c => c.channel === 'WhatsApp') || { message_count: 0, total_cost: 0 }
    const smsData = costComparison.find(c => c.channel === 'SMS') || { message_count: 0, total_cost: 0 }
    
    const totalMessages = parseInt(whatsappData.message_count) + parseInt(smsData.message_count)
    const actualCost = parseFloat(whatsappData.total_cost) + parseFloat(smsData.total_cost)
    const wouldHaveCostSMS = totalMessages * 0.04 // If all were SMS
    const savings = wouldHaveCostSMS - actualCost

    return NextResponse.json({
      success: true,
      dashboard: {
        statistics: statsResult.success ? statsResult.stats : {},
        recentConversations,
        messageVolume,
        consentStats: consentStats[0] || {},
        pendingVerifications,
        costComparison,
        savings: {
          totalMessages,
          actualCost: Math.round(actualCost * 100) / 100,
          wouldHaveCostSMS: Math.round(wouldHaveCostSMS * 100) / 100,
          savings: Math.round(savings * 100) / 100,
          savingsPercentage: wouldHaveCostSMS > 0 ? Math.round((savings / wouldHaveCostSMS) * 100) : 0
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[WHATSAPP-DASHBOARD] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to generate WhatsApp dashboard"
    }, { status: 500 })
  }
}
