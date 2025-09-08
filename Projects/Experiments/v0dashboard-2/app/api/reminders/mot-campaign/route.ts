import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

/**
 * Comprehensive MOT Reminder Campaign System
 * POST /api/reminders/mot-campaign
 * 
 * Sends MOT reminders using smart multi-channel communication with fallback
 * Automatically chooses the best communication method for each customer
 */
export async function POST(request: Request) {
  try {
    console.log('[MOT-CAMPAIGN] 🚀 Starting comprehensive MOT reminder campaign...')
    
    const body = await request.json()
    const {
      campaignType = 'critical', // 'critical', 'due_soon', 'upcoming'
      dryRun = true,
      limit = 50,
      enableWhatsApp = true,
      enableSMS = true,
      enableEmail = true,
      enableFallback = true,
      urgencyLevel = 'high'
    } = body

    // Get eligible customers based on campaign type
    const eligibleCustomers = await getEligibleMOTCustomers(campaignType, limit)
    
    console.log(`[MOT-CAMPAIGN] 📊 Found ${eligibleCustomers.length} eligible customers`)

    if (dryRun) {
      // Analyze communication capabilities for dry run
      const analysis = await analyzeCommunicationCapabilities(eligibleCustomers, {
        enableWhatsApp,
        enableSMS,
        enableEmail
      })

      return NextResponse.json({
        success: true,
        dryRun: true,
        campaign: {
          type: campaignType,
          eligibleCustomers: eligibleCustomers.length,
          urgencyLevel
        },
        communicationAnalysis: analysis,
        preview: eligibleCustomers.slice(0, 5).map(customer => ({
          customer: `${customer.first_name} ${customer.last_name}`,
          vehicle: `${customer.registration} - ${customer.make} ${customer.model}`,
          motExpiry: customer.mot_expiry,
          daysUntilExpiry: customer.days_until_expiry,
          availableChannels: getCustomerChannels(customer, { enableWhatsApp, enableSMS, enableEmail }),
          recommendedChannel: getRecommendedChannel(customer, { enableWhatsApp, enableSMS, enableEmail })
        }))
      })
    }

    // Execute the campaign
    const campaignResults = await executeMOTCampaign(eligibleCustomers, {
      campaignType,
      urgencyLevel,
      enableWhatsApp,
      enableSMS,
      enableEmail,
      enableFallback
    })

    return NextResponse.json({
      success: true,
      campaign: campaignResults
    })

  } catch (error) {
    console.error('[MOT-CAMPAIGN] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to execute MOT reminder campaign",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function getEligibleMOTCustomers(campaignType: string, limit: number) {
  let dateFilter = ''
  
  switch (campaignType) {
    case 'critical':
      // MOT expired or expires within 7 days
      dateFilter = `AND v.mot_expiry <= CURRENT_DATE + INTERVAL '7 days'`
      break
    case 'due_soon':
      // MOT expires within 8-30 days
      dateFilter = `AND v.mot_expiry BETWEEN CURRENT_DATE + INTERVAL '8 days' AND CURRENT_DATE + INTERVAL '30 days'`
      break
    case 'upcoming':
      // MOT expires within 31-60 days
      dateFilter = `AND v.mot_expiry BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days'`
      break
    default:
      dateFilter = `AND v.mot_expiry <= CURRENT_DATE + INTERVAL '30 days'`
  }

  const customers = await sql`
    SELECT DISTINCT
      c.id as customer_id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.twilio_phone,
      c.contact_preference,
      c.opt_out,
      c.opt_out_date,
      
      -- Vehicle information
      v.id as vehicle_id,
      v.registration,
      v.make,
      v.model,
      v.year,
      v.mot_expiry,
      v.mot_expiry - CURRENT_DATE as days_until_expiry,
      
      -- Consent and communication preferences
      consent.whatsapp_consent,
      consent.sms_consent,
      consent.email_consent,
      consent.marketing_consent,
      consent.opted_out_at,
      
      -- Communication history (to avoid spam)
      last_comm.last_communication_date,
      last_comm.last_communication_type,
      
      -- WhatsApp capability indicators
      whatsapp_conv.id as has_whatsapp_history,
      
      -- Recent response indicators
      recent_response.responded_recently
      
    FROM customers c
    INNER JOIN vehicles v ON c.id::text = v.customer_id
    LEFT JOIN customer_consent consent ON c.id::text = consent.customer_id
    LEFT JOIN (
      SELECT 
        customer_id,
        MAX(sent_at) as last_communication_date,
        communication_type as last_communication_type
      FROM customer_correspondence 
      WHERE message_category = 'mot_reminder'
        AND sent_at > CURRENT_DATE - INTERVAL '14 days'
      GROUP BY customer_id, communication_type
    ) last_comm ON c.id::text = last_comm.customer_id
    LEFT JOIN whatsapp_conversations whatsapp_conv ON c.id::text = whatsapp_conv.customer_id
    LEFT JOIN (
      SELECT 
        customer_id,
        true as responded_recently
      FROM customer_correspondence 
      WHERE direction = 'inbound'
        AND created_at > CURRENT_DATE - INTERVAL '7 days'
      GROUP BY customer_id
    ) recent_response ON c.id::text = recent_response.customer_id
    
    WHERE v.mot_expiry IS NOT NULL
      ${dateFilter}
      AND c.opt_out = false
      AND (consent.opted_out_at IS NULL OR consent.opted_out_at < CURRENT_DATE - INTERVAL '30 days')
      AND last_comm.last_communication_date IS NULL -- Don't spam customers
      AND recent_response.responded_recently IS NULL -- Don't contact if they responded recently
      
    ORDER BY 
      CASE 
        WHEN v.mot_expiry < CURRENT_DATE THEN 1 -- Expired first
        WHEN v.mot_expiry <= CURRENT_DATE + INTERVAL '7 days' THEN 2 -- Critical next
        ELSE 3 -- Others
      END,
      v.mot_expiry ASC,
      c.last_name ASC
      
    LIMIT ${limit}
  `

  return customers
}

async function analyzeCommunicationCapabilities(customers: any[], options: any) {
  const analysis = {
    totalCustomers: customers.length,
    channelCapabilities: {
      whatsapp: { capable: 0, likely: 0, unknown: 0 },
      sms: { capable: 0, likely: 0, unknown: 0 },
      email: { capable: 0, likely: 0, unknown: 0 }
    },
    communicationStrategy: {
      whatsappFirst: 0,
      smsFirst: 0,
      emailFirst: 0,
      noChannels: 0
    },
    estimatedCosts: {
      whatsapp: 0,
      sms: 0,
      email: 0,
      total: 0
    }
  }

  for (const customer of customers) {
    const channels = getCustomerChannels(customer, options)
    const recommended = getRecommendedChannel(customer, options)

    // Analyze WhatsApp capability
    if (options.enableWhatsApp && customer.twilio_phone && !customer.opt_out) {
      if (customer.has_whatsapp_history) {
        analysis.channelCapabilities.whatsapp.capable++
      } else if (customer.whatsapp_consent !== false) {
        analysis.channelCapabilities.whatsapp.likely++
      } else {
        analysis.channelCapabilities.whatsapp.unknown++
      }
    }

    // Analyze SMS capability
    if (options.enableSMS && customer.twilio_phone && !customer.opt_out) {
      if (customer.sms_consent !== false) {
        analysis.channelCapabilities.sms.capable++
      } else {
        analysis.channelCapabilities.sms.unknown++
      }
    }

    // Analyze Email capability
    if (options.enableEmail && customer.email && customer.email.includes('@') && !customer.opt_out) {
      if (customer.email_consent !== false) {
        analysis.channelCapabilities.email.capable++
      } else {
        analysis.channelCapabilities.email.unknown++
      }
    }

    // Strategy analysis
    if (recommended === 'whatsapp') {
      analysis.communicationStrategy.whatsappFirst++
      analysis.estimatedCosts.whatsapp += 0.005
    } else if (recommended === 'sms') {
      analysis.communicationStrategy.smsFirst++
      analysis.estimatedCosts.sms += 0.04
    } else if (recommended === 'email') {
      analysis.communicationStrategy.emailFirst++
      analysis.estimatedCosts.email += 0.001
    } else {
      analysis.communicationStrategy.noChannels++
    }
  }

  analysis.estimatedCosts.total = 
    analysis.estimatedCosts.whatsapp + 
    analysis.estimatedCosts.sms + 
    analysis.estimatedCosts.email

  return analysis
}

function getCustomerChannels(customer: any, options: any): string[] {
  const channels = []

  // WhatsApp capability
  if (options.enableWhatsApp && 
      customer.twilio_phone && 
      !customer.opt_out && 
      customer.whatsapp_consent !== false &&
      !customer.opted_out_at &&
      process.env.TWILIO_WHATSAPP_NUMBER) {
    channels.push('whatsapp')
  }

  // SMS capability
  if (options.enableSMS && 
      customer.twilio_phone && 
      !customer.opt_out && 
      customer.sms_consent !== false &&
      !customer.opted_out_at &&
      process.env.TWILIO_PHONE_NUMBER) {
    channels.push('sms')
  }

  // Email capability
  if (options.enableEmail && 
      customer.email && 
      customer.email.includes('@') &&
      !customer.opt_out && 
      customer.email_consent !== false &&
      !customer.opted_out_at &&
      process.env.RESEND_API_KEY) {
    channels.push('email')
  }

  return channels
}

function getRecommendedChannel(customer: any, options: any): string {
  const channels = getCustomerChannels(customer, options)
  
  if (channels.length === 0) {
    return 'none'
  }

  // Prefer customer's explicit preference if available
  if (customer.contact_preference && channels.includes(customer.contact_preference)) {
    return customer.contact_preference
  }

  // If customer has WhatsApp history, prefer WhatsApp
  if (customer.has_whatsapp_history && channels.includes('whatsapp')) {
    return 'whatsapp'
  }

  // Default priority: WhatsApp > SMS > Email (based on engagement rates)
  if (channels.includes('whatsapp')) return 'whatsapp'
  if (channels.includes('sms')) return 'sms'
  if (channels.includes('email')) return 'email'

  return 'none'
}

async function executeMOTCampaign(customers: any[], options: any) {
  const startTime = Date.now()
  const results = {
    campaignId: `mot_${options.campaignType}_${Date.now()}`,
    startTime: new Date().toISOString(),
    totalCustomers: customers.length,
    results: {
      whatsapp: { sent: 0, failed: 0, cost: 0 },
      sms: { sent: 0, failed: 0, cost: 0 },
      email: { sent: 0, failed: 0, cost: 0 },
      failed: { count: 0, customers: [] }
    },
    totalCost: 0,
    executionTime: 0,
    details: []
  }

  // Create campaign record
  const campaignRecord = await sql`
    INSERT INTO whatsapp_campaigns (
      campaign_name,
      campaign_type,
      status,
      total_recipients,
      target_criteria
    ) VALUES (
      '${`MOT ${options.campaignType} Campaign - ${new Date().toISOString()}`}',
      'mot_reminders',
      'running',
      ${customers.length},
      '${JSON.stringify(options)}'
    )
    RETURNING id
  `

  const campaignId = campaignRecord[0].id

  for (const customer of customers) {
    try {
      // Use smart communication system
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/communication/smart-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.customer_id,
          vehicleRegistration: customer.registration,
          messageType: 'mot_reminder',
          urgencyLevel: options.urgencyLevel,
          enableFallback: options.enableFallback
        })
      })

      const result = await response.json()

      if (result.success && result.result.finalResult?.success) {
        const channel = result.result.finalResult.channel
        const cost = result.result.finalResult.cost || 0

        results.results[channel].sent++
        results.results[channel].cost += cost
        results.totalCost += cost

        results.details.push({
          customerId: customer.customer_id,
          customerName: `${customer.first_name} ${customer.last_name}`,
          vehicle: customer.registration,
          channel,
          status: 'sent',
          cost,
          attempts: result.result.attempts.length
        })
      } else {
        results.results.failed.count++
        results.results.failed.customers.push({
          customerId: customer.customer_id,
          customerName: `${customer.first_name} ${customer.last_name}`,
          vehicle: customer.registration,
          error: result.result?.finalResult?.error || 'Unknown error',
          attempts: result.result?.attempts || []
        })

        results.details.push({
          customerId: customer.customer_id,
          customerName: `${customer.first_name} ${customer.last_name}`,
          vehicle: customer.registration,
          status: 'failed',
          error: result.result?.finalResult?.error || 'Unknown error'
        })
      }

      // Small delay to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error) {
      console.error(`[MOT-CAMPAIGN] Error processing customer ${customer.customer_id}:`, error)
      
      results.results.failed.count++
      results.results.failed.customers.push({
        customerId: customer.customer_id,
        customerName: `${customer.first_name} ${customer.last_name}`,
        vehicle: customer.registration,
        error: error instanceof Error ? error.message : 'Processing error'
      })
    }
  }

  results.executionTime = Date.now() - startTime

  // Update campaign record
  await sql`
    UPDATE whatsapp_campaigns 
    SET 
      status = 'completed',
      completed_at = NOW(),
      messages_sent = ${results.results.whatsapp.sent + results.results.sms.sent + results.results.email.sent},
      messages_failed = ${results.results.failed.count},
      actual_cost = ${results.totalCost}
    WHERE id = ${campaignId}
  `

  results.campaignId = campaignId
  console.log(`[MOT-CAMPAIGN] ✅ Campaign completed: ${results.results.whatsapp.sent + results.results.sms.sent + results.results.email.sent} sent, ${results.results.failed.count} failed, £${results.totalCost.toFixed(3)} total cost`)

  return results
}

export async function GET() {
  try {
    // Get MOT campaign statistics
    const campaignStats = await sql`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_campaigns,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as active_campaigns,
        SUM(messages_sent) as total_messages_sent,
        SUM(actual_cost) as total_cost,
        MAX(created_at) as last_campaign_date
      FROM whatsapp_campaigns
      WHERE campaign_type = 'mot_reminders'
        AND created_at > NOW() - INTERVAL '30 days'
    `

    const recentCampaigns = await sql`
      SELECT 
        id,
        campaign_name,
        status,
        total_recipients,
        messages_sent,
        messages_failed,
        actual_cost,
        created_at,
        completed_at
      FROM whatsapp_campaigns
      WHERE campaign_type = 'mot_reminders'
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Get eligible customers for next campaign
    const eligibleCounts = await sql`
      SELECT 
        COUNT(CASE WHEN v.mot_expiry <= CURRENT_DATE THEN 1 END) as expired_mot,
        COUNT(CASE WHEN v.mot_expiry BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as critical_mot,
        COUNT(CASE WHEN v.mot_expiry BETWEEN CURRENT_DATE + INTERVAL '8 days' AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as due_soon_mot,
        COUNT(CASE WHEN v.mot_expiry BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as upcoming_mot
      FROM customers c
      INNER JOIN vehicles v ON c.id::text = v.customer_id
      WHERE c.opt_out = false
        AND v.mot_expiry IS NOT NULL
    `

    return NextResponse.json({
      success: true,
      statistics: campaignStats[0],
      recentCampaigns,
      eligibleCustomers: eligibleCounts[0],
      systemCapabilities: {
        whatsappEnabled: !!process.env.TWILIO_WHATSAPP_NUMBER,
        smsEnabled: !!process.env.TWILIO_PHONE_NUMBER,
        emailEnabled: !!process.env.RESEND_API_KEY,
        smartRoutingEnabled: true,
        fallbackEnabled: true
      }
    })

  } catch (error) {
    console.error('[MOT-CAMPAIGN] Error getting statistics:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get MOT campaign statistics"
    }, { status: 500 })
  }
}
