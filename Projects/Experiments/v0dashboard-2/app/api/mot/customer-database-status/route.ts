import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CUSTOMER-DATABASE-STATUS] Analyzing customer database status...")

    // Get total customer count
    const totalCount = await sql`SELECT COUNT(*) as count FROM customers`
    const total = parseInt(totalCount[0].count)

    // Get customers with complete data
    const completeData = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
        COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END) as with_last_name,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
        COUNT(CASE WHEN address_line1 IS NOT NULL AND address_line1 != '' THEN 1 END) as with_address,
        COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as with_city,
        COUNT(CASE WHEN postcode IS NOT NULL AND postcode != '' THEN 1 END) as with_postcode
      FROM customers
    `

    // Get customers with both name fields
    const withNames = await sql`
      SELECT COUNT(*) as count
      FROM customers
      WHERE (first_name IS NOT NULL AND first_name != '')
      OR (last_name IS NOT NULL AND last_name != '')
    `

    // Get customers with contact info
    const withContact = await sql`
      SELECT COUNT(*) as count
      FROM customers
      WHERE (email IS NOT NULL AND email != '')
      OR (phone IS NOT NULL AND phone != '')
    `

    // Get customers with complete profiles
    const completeProfiles = await sql`
      SELECT COUNT(*) as count
      FROM customers
      WHERE (first_name IS NOT NULL AND first_name != '')
      AND (last_name IS NOT NULL AND last_name != '')
      AND (email IS NOT NULL AND email != '')
      AND (phone IS NOT NULL AND phone != '')
    `

    // Get sample customers to show data quality
    const sampleCustomers = await sql`
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        address_line1,
        city,
        postcode,
        CASE
          WHEN (first_name IS NOT NULL AND first_name != '')
               AND (last_name IS NOT NULL AND last_name != '')
               AND (email IS NOT NULL AND email != '')
               AND (phone IS NOT NULL AND phone != '') THEN 'Complete'
          WHEN (first_name IS NOT NULL AND first_name != '')
               OR (last_name IS NOT NULL AND last_name != '') THEN 'Partial'
          ELSE 'Minimal'
        END as data_quality
      FROM customers
      ORDER BY
        CASE
          WHEN (first_name IS NOT NULL AND first_name != '')
               AND (last_name IS NOT NULL AND last_name != '')
               AND (email IS NOT NULL AND email != '')
               AND (phone IS NOT NULL AND phone != '') THEN 1
          WHEN (first_name IS NOT NULL AND first_name != '')
               OR (last_name IS NOT NULL AND last_name != '') THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 15
    `

    // Get customers connected to vehicles
    const connectedCustomers = await sql`
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
    `

    // Get customers connected to critical MOT vehicles
    const criticalConnectedCustomers = await sql`
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
    `

    const stats = completeData[0]

    return NextResponse.json({
      success: true,
      customerDatabase: {
        totalCustomers: total,
        dataQuality: {
          withFirstName: parseInt(stats.with_first_name),
          withLastName: parseInt(stats.with_last_name),
          withEmail: parseInt(stats.with_email),
          withPhone: parseInt(stats.with_phone),
          withAddress: parseInt(stats.with_address),
          withCity: parseInt(stats.with_city),
          withPostcode: parseInt(stats.with_postcode),
          withNames: parseInt(withNames[0].count),
          withContact: parseInt(withContact[0].count),
          completeProfiles: parseInt(completeProfiles[0].count)
        },
        vehicleConnections: {
          connectedToVehicles: parseInt(connectedCustomers[0].count),
          connectedToCriticalMOTs: parseInt(criticalConnectedCustomers[0].count)
        },
        percentages: {
          withNamesPercent: Math.round((parseInt(withNames[0].count) / total) * 100),
          withContactPercent: Math.round((parseInt(withContact[0].count) / total) * 100),
          completeProfilesPercent: Math.round((parseInt(completeProfiles[0].count) / total) * 100),
          connectedToVehiclesPercent: Math.round((parseInt(connectedCustomers[0].count) / total) * 100)
        }
      },
      sampleCustomers,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CUSTOMER-DATABASE-STATUS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze customer database",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
