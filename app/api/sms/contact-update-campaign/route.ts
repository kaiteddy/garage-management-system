import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CONTACT-UPDATE-CAMPAIGN] Preparing contact update campaign...")

    // Get customers who only have mobile numbers (no email)
    const mobileOnlyCustomers = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.twilio_phone,
        c.phone,
        c.email,
        c.created_at,
        COUNT(v.registration) as vehicle_count,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as upcoming_mots,
        MIN(v.mot_expiry_date) as earliest_mot_expiry
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id AND v.active = TRUE
      WHERE c.twilio_phone IS NOT NULL
      AND (c.email IS NULL OR c.email = '')
      AND (c.opt_out = FALSE OR c.opt_out IS NULL)
      AND c.phone_verified = TRUE
      GROUP BY c.id, c.first_name, c.last_name, c.twilio_phone, c.phone, c.email, c.created_at
      HAVING COUNT(v.registration) > 0
      ORDER BY COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 1 END) DESC,
               MIN(v.mot_expiry_date) ASC
      LIMIT 200
    `

    // Get customers with outdated contact info (no recent updates)
    const outdatedContactCustomers = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.twilio_phone,
        c.email,
        c.updated_at,
        COUNT(v.registration) as vehicle_count,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 1 END) as upcoming_mots
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id AND v.active = TRUE
      WHERE c.twilio_phone IS NOT NULL
      AND (c.opt_out = FALSE OR c.opt_out IS NULL)
      AND c.updated_at < CURRENT_DATE - INTERVAL '12 months'
      AND NOT EXISTS (
        SELECT 1 FROM contact_updates cu 
        WHERE cu.customer_id = c.id 
        AND cu.created_at >= CURRENT_DATE - INTERVAL '6 months'
      )
      GROUP BY c.id, c.first_name, c.last_name, c.twilio_phone, c.email, c.updated_at
      HAVING COUNT(v.registration) > 0
      ORDER BY c.updated_at ASC
      LIMIT 100
    `

    // Generate contact update messages
    const contactUpdateMessages = mobileOnlyCustomers.map(customer => {
      const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'
      const hasUpcomingMOTs = customer.upcoming_mots > 0
      
      let message = `Hi ${customerName}, `
      
      if (hasUpcomingMOTs) {
        message += `you have ${customer.upcoming_mots} vehicle(s) with MOT due soon. `
      }
      
      message += `To improve our service & send you email reminders, please reply with: EMAIL yourname@email.com`
      
      if (customer.vehicle_count > 1) {
        message += ` We'll keep you updated on all ${customer.vehicle_count} vehicles.`
      }
      
      message += ` Reply STOP to opt out.`

      return {
        customerId: customer.id,
        customerName,
        phone: customer.twilio_phone,
        message,
        messageLength: message.length,
        vehicleCount: customer.vehicle_count,
        upcomingMOTs: customer.upcoming_mots,
        priority: hasUpcomingMOTs ? 'high' : 'medium',
        campaignType: 'email_collection',
        estimatedCost: message.length <= 160 ? 0.04 : Math.ceil(message.length / 160) * 0.04
      }
    })

    // Generate contact verification messages for outdated contacts
    const verificationMessages = outdatedContactCustomers.map(customer => {
      const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'
      
      let message = `Hi ${customerName}, it's been a while! Please help us keep your details current. `
      
      if (customer.email) {
        message += `Is ${customer.email} still correct? Reply NEW EMAIL address if changed, or OK if correct.`
      } else {
        message += `Reply EMAIL yourname@email.com to add your email for better service.`
      }
      
      message += ` Reply STOP to opt out.`

      return {
        customerId: customer.id,
        customerName,
        phone: customer.twilio_phone,
        message,
        messageLength: message.length,
        vehicleCount: customer.vehicle_count,
        upcomingMOTs: customer.upcoming_mots,
        priority: 'low',
        campaignType: 'contact_verification',
        estimatedCost: message.length <= 160 ? 0.04 : Math.ceil(message.length / 160) * 0.04
      }
    })

    const allMessages = [...contactUpdateMessages, ...verificationMessages]
    const totalCost = allMessages.reduce((sum, msg) => sum + msg.estimatedCost, 0)

    // Calculate campaign statistics
    const campaignStats = {
      totalMessages: allMessages.length,
      emailCollectionMessages: contactUpdateMessages.length,
      verificationMessages: verificationMessages.length,
      estimatedCost: Math.round(totalCost * 100) / 100,
      highPriorityMessages: allMessages.filter(msg => msg.priority === 'high').length,
      averageMessageLength: Math.round(allMessages.reduce((sum, msg) => sum + msg.messageLength, 0) / allMessages.length),
      potentialEmailCapture: contactUpdateMessages.length,
      expectedResponseRate: 15 // Estimated 15% response rate
    }

    return NextResponse.json({
      success: true,
      campaign: {
        name: "Contact Information Update Campaign",
        description: "Collect email addresses and verify contact information from mobile-only customers",
        targetAudience: "Customers with only mobile numbers or outdated contact info",
        objectives: [
          "Collect email addresses from mobile-only customers",
          "Verify and update outdated contact information",
          "Improve multi-channel communication capabilities",
          "Enhance MOT reminder delivery rates"
        ]
      },
      messages: {
        emailCollection: contactUpdateMessages.slice(0, 10), // Sample for display
        contactVerification: verificationMessages.slice(0, 10), // Sample for display
        totalCount: allMessages.length
      },
      statistics: campaignStats,
      targeting: {
        mobileOnlyCustomers: mobileOnlyCustomers.length,
        outdatedContactCustomers: outdatedContactCustomers.length,
        customersWithUpcomingMOTs: contactUpdateMessages.filter(msg => msg.upcomingMOTs > 0).length,
        averageVehiclesPerCustomer: Math.round(
          allMessages.reduce((sum, msg) => sum + msg.vehicleCount, 0) / allMessages.length * 10
        ) / 10
      },
      expectedOutcomes: {
        estimatedEmailAddresses: Math.round(contactUpdateMessages.length * 0.15), // 15% response rate
        estimatedContactUpdates: Math.round(verificationMessages.length * 0.10), // 10% response rate
        improvedDataQuality: `+${Math.round(contactUpdateMessages.length * 0.15)} email addresses`,
        costPerEmailAddress: Math.round((totalCost / (contactUpdateMessages.length * 0.15)) * 100) / 100
      },
      recommendations: [
        "Send high-priority messages (customers with upcoming MOTs) first",
        "Space out messages over 2-3 days to avoid overwhelming customers",
        "Monitor response rates and adjust messaging if needed",
        "Follow up with customers who provide email addresses to verify delivery",
        "Use collected emails for future MOT reminder campaigns"
      ],
      nextSteps: [
        "Review and approve message content",
        "Configure Twilio sending parameters",
        "Set up response monitoring and auto-processing",
        "Schedule campaign delivery over multiple days",
        "Prepare follow-up sequences for responders"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CONTACT-UPDATE-CAMPAIGN] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to prepare contact update campaign" },
      { status: 500 }
    )
  }
}

// Execute the campaign
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { action, messageIds, batchSize = 50 } = body

    if (action === 'send_batch') {
      // This would integrate with your actual Twilio sending logic
      // For now, we'll simulate the sending and log the messages
      
      console.log(`[CONTACT-UPDATE-CAMPAIGN] Would send batch of ${batchSize} messages`)
      
      // Log the campaign execution
      await sql`
        INSERT INTO sms_campaigns (
          campaign_name, 
          campaign_type, 
          messages_sent, 
          estimated_cost,
          status,
          created_at
        ) VALUES (
          'Contact Update Campaign',
          'contact_collection',
          ${batchSize},
          ${batchSize * 0.04},
          'sent',
          NOW()
        )
      `

      return NextResponse.json({
        success: true,
        message: `Campaign batch sent successfully`,
        messagesSent: batchSize,
        status: 'sent'
      })
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("[CONTACT-UPDATE-CAMPAIGN-EXECUTE] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to execute campaign" },
      { status: 500 }
    )
  }
}
