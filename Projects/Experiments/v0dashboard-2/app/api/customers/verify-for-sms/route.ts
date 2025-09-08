import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFY-FOR-SMS] Verifying customers ready for SMS reminders...")

    // Get comprehensive customer verification data
    const customerVerification = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        c.email,
        c.phone_verified,
        c.opt_out,
        COUNT(DISTINCT v.registration) as total_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date IS NOT NULL THEN v.registration END) as vehicles_with_mot,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                              THEN v.registration END) as critical_mot_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date < CURRENT_DATE 
                              AND v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                              THEN v.registration END) as expired_mot_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE 
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
                              THEN v.registration END) as expiring_mot_vehicles,
        MIN(v.mot_expiry_date) as earliest_mot_expiry,
        MAX(v.mot_expiry_date) as latest_mot_expiry,
        CASE 
          WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE AND (c.opt_out = FALSE OR c.opt_out IS NULL) THEN 'ready'
          WHEN c.twilio_phone IS NOT NULL AND (c.phone_verified = FALSE OR c.phone_verified IS NULL) THEN 'needs_verification'
          WHEN c.phone IS NOT NULL AND c.twilio_phone IS NULL THEN 'needs_formatting'
          WHEN c.opt_out = TRUE THEN 'opted_out'
          ELSE 'no_phone'
        END as sms_status,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                                    AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                                    THEN v.registration END) > 0 THEN 'urgent'
          WHEN COUNT(DISTINCT v.registration) > 0 THEN 'has_vehicles'
          ELSE 'no_vehicles'
        END as priority_level
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.twilio_phone, c.email, 
               c.phone_verified, c.opt_out
      ORDER BY 
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                                    AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                                    THEN v.registration END) > 0 THEN 1
          WHEN COUNT(DISTINCT v.registration) > 0 THEN 2
          ELSE 3
        END,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                              THEN v.registration END) DESC
    `

    // Get summary statistics
    const summaryStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE AND (c.opt_out = FALSE OR c.opt_out IS NULL) THEN 1 END) as sms_ready,
        COUNT(CASE WHEN c.twilio_phone IS NOT NULL AND (c.phone_verified = FALSE OR c.phone_verified IS NULL) THEN 1 END) as needs_verification,
        COUNT(CASE WHEN c.phone IS NOT NULL AND c.twilio_phone IS NULL THEN 1 END) as needs_formatting,
        COUNT(CASE WHEN c.opt_out = TRUE THEN 1 END) as opted_out,
        COUNT(CASE WHEN c.phone IS NULL THEN 1 END) as no_phone,
        COUNT(CASE WHEN v.registration IS NOT NULL THEN 1 END) as with_vehicles,
        COUNT(CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                   AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as with_critical_mots
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
    `

    // Get customers ready for immediate SMS (critical MOTs)
    const urgentSmsReady = customerVerification.filter(customer => 
      customer.sms_status === 'ready' && 
      customer.priority_level === 'urgent' &&
      customer.critical_mot_vehicles > 0
    ).slice(0, 20)

    // Get customers needing verification (have critical MOTs but need phone verification)
    const urgentNeedsVerification = customerVerification.filter(customer => 
      customer.sms_status === 'needs_verification' && 
      customer.priority_level === 'urgent' &&
      customer.critical_mot_vehicles > 0
    ).slice(0, 20)

    // Get SMS readiness breakdown
    const smsReadinessBreakdown = await sql`
      SELECT 
        CASE 
          WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE AND (c.opt_out = FALSE OR c.opt_out IS NULL) THEN 'ready'
          WHEN c.twilio_phone IS NOT NULL AND (c.phone_verified = FALSE OR c.phone_verified IS NULL) THEN 'needs_verification'
          WHEN c.phone IS NOT NULL AND c.twilio_phone IS NULL THEN 'needs_formatting'
          WHEN c.opt_out = TRUE THEN 'opted_out'
          ELSE 'no_phone'
        END as sms_status,
        COUNT(*) as count,
        COUNT(CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                   AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as with_critical_mots
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY 
        CASE 
          WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE AND (c.opt_out = FALSE OR c.opt_out IS NULL) THEN 'ready'
          WHEN c.twilio_phone IS NOT NULL AND (c.phone_verified = FALSE OR c.phone_verified IS NULL) THEN 'needs_verification'
          WHEN c.phone IS NOT NULL AND c.twilio_phone IS NULL THEN 'needs_formatting'
          WHEN c.opt_out = TRUE THEN 'opted_out'
          ELSE 'no_phone'
        END
      ORDER BY count DESC
    `

    const stats = summaryStats[0]

    return NextResponse.json({
      success: true,
      verification: {
        totalCustomers: parseInt(stats.total_customers),
        smsReadiness: {
          ready: parseInt(stats.sms_ready),
          needsVerification: parseInt(stats.needs_verification),
          needsFormatting: parseInt(stats.needs_formatting),
          optedOut: parseInt(stats.opted_out),
          noPhone: parseInt(stats.no_phone)
        },
        vehicleConnections: {
          withVehicles: parseInt(stats.with_vehicles),
          withCriticalMots: parseInt(stats.with_critical_mots)
        },
        percentages: {
          smsReadyRate: Math.round((parseInt(stats.sms_ready) / parseInt(stats.total_customers)) * 100),
          vehicleConnectionRate: Math.round((parseInt(stats.with_vehicles) / parseInt(stats.total_customers)) * 100),
          criticalMotRate: Math.round((parseInt(stats.with_critical_mots) / parseInt(stats.total_customers)) * 100)
        }
      },
      urgentSmsReady: urgentSmsReady.map(customer => ({
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.twilio_phone,
        criticalVehicles: customer.critical_mot_vehicles,
        expiredVehicles: customer.expired_mot_vehicles,
        expiringVehicles: customer.expiring_mot_vehicles,
        earliestExpiry: customer.earliest_mot_expiry
      })),
      urgentNeedsVerification: urgentNeedsVerification.map(customer => ({
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.phone,
        twilioPhone: customer.twilio_phone,
        criticalVehicles: customer.critical_mot_vehicles,
        earliestExpiry: customer.earliest_mot_expiry
      })),
      smsReadinessBreakdown,
      recommendations: {
        immediateActions: [
          `${urgentSmsReady.length} customers with critical MOTs are ready for immediate SMS`,
          `${urgentNeedsVerification.length} customers with critical MOTs need phone verification`,
          `${parseInt(stats.sms_ready)} total customers are SMS-ready`,
          `${parseInt(stats.with_critical_mots)} customers have vehicles with critical MOT status`
        ],
        twilioPreparation: [
          "Phone numbers are formatted to E.164 standard (+44xxxxxxxxxx)",
          "UK mobile numbers are preferred for SMS delivery",
          "Landline numbers may not support SMS",
          "Consider email fallback for customers without mobile phones"
        ],
        verificationProcess: [
          "Send verification SMS to unverified numbers",
          "Start with customers who have critical MOT vehicles",
          "Implement opt-out mechanism for SMS preferences",
          "Track delivery status and responses"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[VERIFY-FOR-SMS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify customers for SMS",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
