import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CRITICAL-CHECK-ENHANCED] Getting enhanced critical MOT check with vehicle age and SORN status...")

    // Get critical MOTs with enhanced vehicle information
    const criticalVehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        v.vehicle_age,
        v.year_of_manufacture,
        v.sorn_status,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'expiring_soon'
          ELSE 'other'
        END as mot_urgency,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN
            CURRENT_DATE - v.mot_expiry_date
          ELSE
            v.mot_expiry_date - CURRENT_DATE
        END as days_difference,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.city,
        c.postcode,
        CASE
          WHEN c.id IS NOT NULL THEN 'Yes'
          ELSE 'No'
        END as has_customer_data
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        -- Expired within last 6 months
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        -- Expiring in next 14 days
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      ORDER BY
        CASE WHEN v.mot_expiry_date < CURRENT_DATE THEN 1 ELSE 2 END,
        v.mot_expiry_date ASC
    `

    // Get summary statistics
    const summary = await sql`
      SELECT
        COUNT(*) as total_critical,
        COUNT(CASE WHEN v.mot_expiry_date < CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) as with_customer_data,
        COUNT(CASE WHEN v.vehicle_age IS NOT NULL THEN 1 END) as with_age_data,
        COUNT(CASE WHEN v.sorn_status = 'likely_sorn' THEN 1 END) as likely_sorn,
        COUNT(CASE WHEN v.sorn_status = 'possibly_sorn' THEN 1 END) as possibly_sorn,
        COUNT(CASE WHEN v.sorn_status = 'active' THEN 1 END) as active_status
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
    `

    // Get age distribution of critical vehicles
    const ageDistribution = await sql`
      SELECT
        CASE
          WHEN v.vehicle_age < 3 THEN 'New (0-2 years)'
          WHEN v.vehicle_age < 6 THEN 'Recent (3-5 years)'
          WHEN v.vehicle_age < 10 THEN 'Mature (6-9 years)'
          WHEN v.vehicle_age < 15 THEN 'Older (10-14 years)'
          WHEN v.vehicle_age >= 15 THEN 'Vintage (15+ years)'
          ELSE 'Unknown Age'
        END as age_category,
        COUNT(*) as count,
        COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) as with_customer_data
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      GROUP BY
        CASE
          WHEN v.vehicle_age < 3 THEN 'New (0-2 years)'
          WHEN v.vehicle_age < 6 THEN 'Recent (3-5 years)'
          WHEN v.vehicle_age < 10 THEN 'Mature (6-9 years)'
          WHEN v.vehicle_age < 15 THEN 'Older (10-14 years)'
          WHEN v.vehicle_age >= 15 THEN 'Vintage (15+ years)'
          ELSE 'Unknown Age'
        END
      ORDER BY count DESC
    `

    // Get SORN status distribution
    const sornDistribution = await sql`
      SELECT
        v.sorn_status,
        COUNT(*) as count,
        COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) as with_customer_data
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      GROUP BY v.sorn_status
      ORDER BY count DESC
    `

    const summaryStats = summary[0]

    return NextResponse.json({
      success: true,
      data: {
        vehicles: criticalVehicles,
        summary: {
          total: parseInt(summaryStats.total_critical),
          expired: parseInt(summaryStats.expired),
          expiringSoon: parseInt(summaryStats.expiring_soon),
          withCustomerData: parseInt(summaryStats.with_customer_data),
          withAgeData: parseInt(summaryStats.with_age_data),
          likelySorn: parseInt(summaryStats.likely_sorn),
          possiblySorn: parseInt(summaryStats.possibly_sorn),
          activeStatus: parseInt(summaryStats.active_status),
          customerDataRate: Math.round((parseInt(summaryStats.with_customer_data) / parseInt(summaryStats.total_critical)) * 100),
          ageDataRate: Math.round((parseInt(summaryStats.with_age_data) / parseInt(summaryStats.total_critical)) * 100),
          lastChecked: new Date().toISOString()
        },
        ageDistribution,
        sornDistribution
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CRITICAL-CHECK-ENHANCED] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get enhanced critical MOT check",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
