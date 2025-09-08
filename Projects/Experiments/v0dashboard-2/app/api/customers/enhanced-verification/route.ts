import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[ENHANCED-VERIFICATION] Getting enhanced customer verification with document history...")

    // Get comprehensive customer data combining vehicles, MOTs, and document history
    const enhancedCustomerData = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        c.email,
        c.phone_verified,
        c.last_contact_date,
        -- Vehicle data
        COUNT(DISTINCT v.registration) as total_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                              THEN v.registration END) as critical_mot_vehicles,
        MIN(v.mot_expiry_date) as earliest_mot_expiry,
        AVG(v.vehicle_age) as average_vehicle_age,
        -- Document activity data
        COALESCE(ca.total_documents, 0) as lifetime_documents,
        COALESCE(ca.total_spent, 0) as lifetime_spent,
        COALESCE(ca.vehicles_serviced, 0) as vehicles_serviced,
        COALESCE(ca.mot_services, 0) as mot_services,
        ca.activity_level,
        ca.last_document_date,
        -- SMS readiness
        CASE 
          WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE AND (c.opt_out = FALSE OR c.opt_out IS NULL) THEN 'ready'
          WHEN c.twilio_phone IS NOT NULL AND (c.phone_verified = FALSE OR c.phone_verified IS NULL) THEN 'needs_verification'
          WHEN c.phone IS NOT NULL AND c.twilio_phone IS NULL THEN 'needs_formatting'
          WHEN c.opt_out = TRUE THEN 'opted_out'
          ELSE 'no_phone'
        END as sms_status,
        -- Priority scoring
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                                    AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                                    THEN v.registration END) > 0 THEN 'urgent'
          WHEN COALESCE(ca.total_spent, 0) > 5000 THEN 'high_value'
          WHEN COUNT(DISTINCT v.registration) > 0 THEN 'has_vehicles'
          ELSE 'low_priority'
        END as priority_level,
        -- Customer value tier
        CASE 
          WHEN COALESCE(ca.total_spent, 0) > 20000 THEN 'premium'
          WHEN COALESCE(ca.total_spent, 0) > 5000 THEN 'high_value'
          WHEN COALESCE(ca.total_spent, 0) > 1000 THEN 'regular'
          WHEN COALESCE(ca.total_spent, 0) > 0 THEN 'occasional'
          ELSE 'new'
        END as customer_tier
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      LEFT JOIN customer_activity ca ON c.id = ca.customer_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.twilio_phone, c.email, 
               c.phone_verified, c.last_contact_date, ca.total_documents, ca.total_spent,
               ca.vehicles_serviced, ca.mot_services, ca.activity_level, ca.last_document_date
      ORDER BY 
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                                    AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                                    THEN v.registration END) > 0 THEN 1
          WHEN COALESCE(ca.total_spent, 0) > 5000 THEN 2
          WHEN COUNT(DISTINCT v.registration) > 0 THEN 3
          ELSE 4
        END,
        COALESCE(ca.total_spent, 0) DESC
    `

    // Get summary statistics
    const summaryStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        -- SMS readiness
        COUNT(CASE WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE THEN 1 END) as sms_ready,
        COUNT(CASE WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = FALSE THEN 1 END) as needs_verification,
        -- Priority levels
        COUNT(CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                   AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as urgent_customers,
        COUNT(CASE WHEN ca.total_spent > 5000 THEN 1 END) as high_value_customers,
        COUNT(CASE WHEN v.registration IS NOT NULL THEN 1 END) as customers_with_vehicles,
        -- Customer tiers
        COUNT(CASE WHEN ca.total_spent > 20000 THEN 1 END) as premium_customers,
        COUNT(CASE WHEN ca.total_spent > 5000 AND ca.total_spent <= 20000 THEN 1 END) as high_value_tier,
        COUNT(CASE WHEN ca.total_spent > 1000 AND ca.total_spent <= 5000 THEN 1 END) as regular_customers,
        COUNT(CASE WHEN ca.total_spent > 0 AND ca.total_spent <= 1000 THEN 1 END) as occasional_customers,
        COUNT(CASE WHEN ca.total_spent IS NULL OR ca.total_spent = 0 THEN 1 END) as new_customers,
        -- Business metrics
        SUM(COALESCE(ca.total_spent, 0)) as total_lifetime_revenue,
        AVG(COALESCE(ca.total_spent, 0)) as average_customer_value
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      LEFT JOIN customer_activity ca ON c.id = ca.customer_id
    `

    // Get urgent customers ready for SMS
    const urgentSmsReady = enhancedCustomerData.filter(customer => 
      customer.sms_status === 'ready' && 
      customer.priority_level === 'urgent' &&
      customer.critical_mot_vehicles > 0
    ).slice(0, 50)

    // Get high-value customers ready for SMS
    const highValueSmsReady = enhancedCustomerData.filter(customer => 
      customer.sms_status === 'ready' && 
      customer.customer_tier === 'premium' &&
      customer.total_vehicles > 0
    ).slice(0, 20)

    // Get customer tier breakdown
    const customerTierBreakdown = await sql`
      SELECT 
        CASE 
          WHEN ca.total_spent > 20000 THEN 'premium'
          WHEN ca.total_spent > 5000 THEN 'high_value'
          WHEN ca.total_spent > 1000 THEN 'regular'
          WHEN ca.total_spent > 0 THEN 'occasional'
          ELSE 'new'
        END as customer_tier,
        COUNT(*) as count,
        COUNT(CASE WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE THEN 1 END) as sms_ready_count,
        SUM(ca.total_spent) as tier_revenue,
        AVG(ca.total_spent) as average_spent
      FROM customers c
      LEFT JOIN customer_activity ca ON c.id = ca.customer_id
      GROUP BY 
        CASE 
          WHEN ca.total_spent > 20000 THEN 'premium'
          WHEN ca.total_spent > 5000 THEN 'high_value'
          WHEN ca.total_spent > 1000 THEN 'regular'
          WHEN ca.total_spent > 0 THEN 'occasional'
          ELSE 'new'
        END
      ORDER BY tier_revenue DESC
    `

    const stats = summaryStats[0]

    return NextResponse.json({
      success: true,
      enhancedVerification: {
        totalCustomers: parseInt(stats.total_customers),
        smsReadiness: {
          ready: parseInt(stats.sms_ready),
          needsVerification: parseInt(stats.needs_verification)
        },
        priorityLevels: {
          urgent: parseInt(stats.urgent_customers),
          highValue: parseInt(stats.high_value_customers),
          withVehicles: parseInt(stats.customers_with_vehicles)
        },
        customerTiers: {
          premium: parseInt(stats.premium_customers),
          highValue: parseInt(stats.high_value_tier),
          regular: parseInt(stats.regular_customers),
          occasional: parseInt(stats.occasional_customers),
          new: parseInt(stats.new_customers)
        },
        businessMetrics: {
          totalLifetimeRevenue: parseFloat(stats.total_lifetime_revenue) || 0,
          averageCustomerValue: parseFloat(stats.average_customer_value) || 0
        }
      },
      urgentSmsReady: urgentSmsReady.map(customer => ({
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.twilio_phone,
        criticalVehicles: customer.critical_mot_vehicles,
        totalVehicles: customer.total_vehicles,
        lifetimeSpent: parseFloat(customer.lifetime_spent) || 0,
        customerTier: customer.customer_tier,
        earliestExpiry: customer.earliest_mot_expiry
      })),
      highValueSmsReady: highValueSmsReady.map(customer => ({
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.twilio_phone,
        totalVehicles: customer.total_vehicles,
        lifetimeSpent: parseFloat(customer.lifetime_spent) || 0,
        customerTier: customer.customer_tier,
        lifetimeDocuments: customer.lifetime_documents
      })),
      customerTierBreakdown,
      recommendations: {
        immediateActions: [
          `${urgentSmsReady.length} urgent customers with critical MOTs ready for SMS`,
          `${highValueSmsReady.length} premium customers (£20k+ spent) ready for proactive contact`,
          `${parseInt(stats.high_value_customers)} high-value customers (£5k+ spent) in database`,
          `Total lifetime revenue tracked: £${(parseFloat(stats.total_lifetime_revenue) || 0).toLocaleString()}`
        ],
        smsStrategy: [
          "Prioritize urgent customers with critical MOTs first",
          "Target premium customers (£20k+ spent) for proactive services",
          "Focus on high-value customers (£5k+ spent) for retention",
          "Use customer tier and spending history to personalize messages"
        ],
        businessInsights: [
          `Premium customers represent highest value - personalized service recommended`,
          `Average customer value: £${Math.round(parseFloat(stats.average_customer_value) || 0)}`,
          `${parseInt(stats.customers_with_vehicles)} customers have vehicles for ongoing service`,
          `Document history provides customer relationship context`
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ENHANCED-VERIFICATION] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get enhanced verification",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
