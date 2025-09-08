import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[REAL-CUSTOMERS-CHECK] 🔍 Checking real customer data for SMS campaigns")

    // Get real customers with vehicles and MOT data
    const realCustomersWithMot = await sql`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        c.email,
        c.phone_verified,
        v.registration,
        v.make,
        v.model,
        v.year,
        COALESCE(v.mot_expiry_date, mh.expiry_date) as mot_expiry_date,
        CASE 
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) < CURRENT_DATE 
            THEN CURRENT_DATE - COALESCE(v.mot_expiry_date, mh.expiry_date)
          ELSE COALESCE(v.mot_expiry_date, mh.expiry_date) - CURRENT_DATE
        END as days_difference,
        CASE 
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) < CURRENT_DATE THEN 'EXPIRED'
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '90 days' THEN 'UPCOMING'
          ELSE 'FUTURE'
        END as urgency_level
      FROM customers c
      JOIN vehicles v ON c.id = v.owner_id
      LEFT JOIN (
        SELECT DISTINCT ON (vehicle_registration) 
          vehicle_registration,
          expiry_date,
          test_result
        FROM mot_history 
        WHERE expiry_date IS NOT NULL
        ORDER BY vehicle_registration, test_date DESC
      ) mh ON UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(mh.vehicle_registration, ' ', ''))
      WHERE (v.mot_expiry_date IS NOT NULL OR mh.expiry_date IS NOT NULL)
      AND c.phone IS NOT NULL
      AND c.phone != ''
      AND c.first_name IS NOT NULL
      AND c.last_name IS NOT NULL
      ORDER BY COALESCE(v.mot_expiry_date, mh.expiry_date) ASC
      LIMIT 20
    `

    // Group by urgency level
    const urgencyBreakdown = {
      EXPIRED: realCustomersWithMot.filter(c => c.urgency_level === 'EXPIRED'),
      DUE_SOON: realCustomersWithMot.filter(c => c.urgency_level === 'DUE_SOON'),
      UPCOMING: realCustomersWithMot.filter(c => c.urgency_level === 'UPCOMING'),
      FUTURE: realCustomersWithMot.filter(c => c.urgency_level === 'FUTURE')
    }

    // Get total counts
    const totalCounts = await sql`
      SELECT 
        COUNT(DISTINCT c.id) as total_customers_with_mot,
        COUNT(DISTINCT CASE WHEN c.phone IS NOT NULL AND c.phone != '' THEN c.id END) as customers_with_phone,
        COUNT(DISTINCT CASE WHEN c.phone_verified = TRUE THEN c.id END) as verified_customers,
        COUNT(DISTINCT v.registration) as total_vehicles_with_mot
      FROM customers c
      JOIN vehicles v ON c.id = v.owner_id
      LEFT JOIN (
        SELECT DISTINCT ON (vehicle_registration) 
          vehicle_registration,
          expiry_date
        FROM mot_history 
        WHERE expiry_date IS NOT NULL
        ORDER BY vehicle_registration, test_date DESC
      ) mh ON UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(mh.vehicle_registration, ' ', ''))
      WHERE (v.mot_expiry_date IS NOT NULL OR mh.expiry_date IS NOT NULL)
    `

    return NextResponse.json({
      success: true,
      realCustomerCheck: {
        timestamp: new Date().toISOString(),
        
        totalCounts: totalCounts[0],
        
        urgencyBreakdown: {
          expired: {
            count: urgencyBreakdown.EXPIRED.length,
            customers: urgencyBreakdown.EXPIRED.slice(0, 5).map(c => ({
              name: `${c.first_name} ${c.last_name}`,
              phone: c.phone,
              vehicle: `${c.registration} ${c.make || ''} ${c.model || ''}`.trim(),
              motExpiry: c.mot_expiry_date,
              daysOverdue: c.days_difference,
              phoneVerified: c.phone_verified
            }))
          },
          dueSoon: {
            count: urgencyBreakdown.DUE_SOON.length,
            customers: urgencyBreakdown.DUE_SOON.slice(0, 5).map(c => ({
              name: `${c.first_name} ${c.last_name}`,
              phone: c.phone,
              vehicle: `${c.registration} ${c.make || ''} ${c.model || ''}`.trim(),
              motExpiry: c.mot_expiry_date,
              daysUntilExpiry: c.days_difference,
              phoneVerified: c.phone_verified
            }))
          },
          upcoming: {
            count: urgencyBreakdown.UPCOMING.length,
            customers: urgencyBreakdown.UPCOMING.slice(0, 5).map(c => ({
              name: `${c.first_name} ${c.last_name}`,
              phone: c.phone,
              vehicle: `${c.registration} ${c.make || ''} ${c.model || ''}`.trim(),
              motExpiry: c.mot_expiry_date,
              daysUntilExpiry: c.days_difference,
              phoneVerified: c.phone_verified
            }))
          },
          future: {
            count: urgencyBreakdown.FUTURE.length,
            customers: urgencyBreakdown.FUTURE.slice(0, 5).map(c => ({
              name: `${c.first_name} ${c.last_name}`,
              phone: c.phone,
              vehicle: `${c.registration} ${c.make || ''} ${c.model || ''}`.trim(),
              motExpiry: c.mot_expiry_date,
              daysUntilExpiry: c.days_difference,
              phoneVerified: c.phone_verified
            }))
          }
        },

        sampleRealCustomers: realCustomersWithMot.slice(0, 10).map(customer => ({
          customerId: customer.id,
          customerName: `${customer.first_name} ${customer.last_name}`,
          phone: customer.phone,
          twilioPhone: customer.twilio_phone,
          phoneVerified: customer.phone_verified,
          email: customer.email,
          registration: customer.registration,
          vehicle: `${customer.make || ''} ${customer.model || ''}`.trim(),
          year: customer.year,
          motExpiryDate: customer.mot_expiry_date,
          daysDifference: customer.days_difference,
          urgencyLevel: customer.urgency_level,
          estimatedCost: customer.urgency_level === 'EXPIRED' ? 0.015 : 0.0075,
          eligible: customer.phone && customer.phone !== ''
        })),

        recommendations: [
          urgencyBreakdown.EXPIRED.length > 0 ? 
            `${urgencyBreakdown.EXPIRED.length} customers have expired MOTs - high priority for SMS` :
            'No expired MOTs found in current data',
          urgencyBreakdown.DUE_SOON.length > 0 ? 
            `${urgencyBreakdown.DUE_SOON.length} customers have MOTs due soon - good for proactive SMS` :
            'No MOTs due soon in current data',
          urgencyBreakdown.UPCOMING.length > 0 ? 
            `${urgencyBreakdown.UPCOMING.length} customers have upcoming MOTs - suitable for advance reminders` :
            'No upcoming MOTs in current data',
          `Total ${totalCounts[0].customers_with_phone} customers have phone numbers for SMS campaigns`
        ]
      }
    })

  } catch (error) {
    console.error("[REAL-CUSTOMERS-CHECK] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check real customer data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
