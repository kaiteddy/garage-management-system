import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFY-ACTIVE-CUSTOMERS] Analyzing customer activity and verification status...")

    // Get customer activity analysis
    const customerActivity = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        c.email,
        c.last_contact_date,
        c.phone_verified,
        COUNT(DISTINCT v.registration) as vehicle_count,
        COUNT(DISTINCT r.id) as receipt_count,
        MAX(r.receipt_date) as last_receipt_date,
        SUM(r.total_amount) as total_spent,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                              THEN v.registration END) as critical_mot_vehicles,
        CASE 
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '6 months' THEN 'very_recent'
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '1 year' THEN 'recent'
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '2 years' THEN 'moderate'
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '5 years' THEN 'old'
          WHEN MAX(r.receipt_date) IS NOT NULL THEN 'very_old'
          ELSE 'no_activity'
        END as activity_level,
        CASE 
          WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE THEN 'ready'
          WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = FALSE THEN 'needs_verification'
          WHEN c.phone IS NOT NULL THEN 'needs_formatting'
          ELSE 'no_phone'
        END as sms_readiness
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      LEFT JOIN receipts r ON c.id = r.customer_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.twilio_phone, c.email, 
               c.last_contact_date, c.phone_verified
      ORDER BY 
        CASE 
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '6 months' THEN 1
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '1 year' THEN 2
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '2 years' THEN 3
          WHEN MAX(r.receipt_date) >= CURRENT_DATE - INTERVAL '5 years' THEN 4
          WHEN MAX(r.receipt_date) IS NOT NULL THEN 5
          ELSE 6
        END,
        MAX(r.receipt_date) DESC NULLS LAST
    `

    // Get summary statistics
    const activitySummary = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as very_recent,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '1 year' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as recent,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '2 years' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as moderate,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '5 years' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '2 years' THEN 1 END) as old,
        COUNT(CASE WHEN last_contact_date < CURRENT_DATE - INTERVAL '5 years' THEN 1 END) as very_old,
        COUNT(CASE WHEN last_contact_date IS NULL THEN 1 END) as no_activity,
        COUNT(CASE WHEN twilio_phone IS NOT NULL AND phone_verified = TRUE THEN 1 END) as sms_ready,
        COUNT(CASE WHEN twilio_phone IS NOT NULL AND phone_verified = FALSE THEN 1 END) as needs_verification,
        COUNT(CASE WHEN phone IS NOT NULL AND twilio_phone IS NULL THEN 1 END) as needs_formatting,
        COUNT(CASE WHEN phone IS NULL THEN 1 END) as no_phone
      FROM customers
    `

    // Get customers with critical MOTs who are SMS ready
    const criticalMotSmsReady = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.twilio_phone,
        c.last_contact_date,
        COUNT(DISTINCT v.registration) as critical_vehicles,
        ARRAY_AGG(DISTINCT v.registration || ' (' || v.make || ' ' || v.model || ')') as vehicles
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      WHERE c.twilio_phone IS NOT NULL 
      AND c.phone_verified = TRUE
      AND c.opt_out = FALSE
      AND v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      GROUP BY c.id, c.first_name, c.last_name, c.twilio_phone, c.last_contact_date
      ORDER BY c.last_contact_date DESC NULLS LAST
      LIMIT 20
    `

    // Get customers who need verification before SMS
    const needsVerification = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        c.last_contact_date,
        COUNT(DISTINCT v.registration) as vehicle_count,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' 
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' 
                              THEN v.registration END) as critical_mot_vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE c.twilio_phone IS NOT NULL 
      AND (c.phone_verified = FALSE OR c.phone_verified IS NULL)
      AND c.last_contact_date >= CURRENT_DATE - INTERVAL '2 years'
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.twilio_phone, c.last_contact_date
      HAVING COUNT(DISTINCT v.registration) > 0
      ORDER BY c.last_contact_date DESC
      LIMIT 20
    `

    const summary = activitySummary[0]

    return NextResponse.json({
      success: true,
      customerVerification: {
        totalCustomers: parseInt(summary.total_customers),
        activityLevels: {
          veryRecent: parseInt(summary.very_recent), // Last 6 months
          recent: parseInt(summary.recent), // 6 months - 1 year
          moderate: parseInt(summary.moderate), // 1-2 years
          old: parseInt(summary.old), // 2-5 years
          veryOld: parseInt(summary.very_old), // 5+ years
          noActivity: parseInt(summary.no_activity) // No receipts
        },
        smsReadiness: {
          ready: parseInt(summary.sms_ready), // Twilio formatted & verified
          needsVerification: parseInt(summary.needs_verification), // Formatted but not verified
          needsFormatting: parseInt(summary.needs_formatting), // Has phone but not formatted
          noPhone: parseInt(summary.no_phone) // No phone number
        },
        percentages: {
          activeCustomers: Math.round(((parseInt(summary.very_recent) + parseInt(summary.recent)) / parseInt(summary.total_customers)) * 100),
          smsReadyRate: Math.round((parseInt(summary.sms_ready) / parseInt(summary.total_customers)) * 100),
          recentActivityRate: Math.round((parseInt(summary.very_recent) / parseInt(summary.total_customers)) * 100)
        }
      },
      criticalMotSmsReady: criticalMotSmsReady.slice(0, 10),
      needsVerification: needsVerification.slice(0, 10),
      recommendations: {
        priorityActions: [
          `${criticalMotSmsReady.length} customers with critical MOTs are ready for immediate SMS`,
          `${parseInt(summary.needs_verification)} customers need phone verification before SMS`,
          `${parseInt(summary.very_recent)} customers had recent activity (last 6 months)`,
          `${parseInt(summary.recent)} customers had activity in the last year`
        ],
        verificationStrategy: [
          "Start with customers who had activity in the last 2 years",
          "Prioritize customers with critical MOT vehicles",
          "Send verification SMS to unverified numbers",
          "Consider email verification for customers without phones"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[VERIFY-ACTIVE-CUSTOMERS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify active customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
