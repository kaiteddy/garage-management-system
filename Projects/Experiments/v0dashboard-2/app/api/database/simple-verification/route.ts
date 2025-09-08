import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[SIMPLE-VERIFICATION] Starting simple database verification...")

    // 1. Basic table counts
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`

    // 2. Vehicle-customer relationships
    const vehicleCustomerStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_customers,
        COUNT(*) - COUNT(owner_id) as vehicles_without_customers
      FROM vehicles
    `

    // 3. Data quality checks
    const customerDataQuality = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as customers_with_email,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as customers_with_phone,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as customers_with_first_name,
        COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END) as customers_with_last_name,
        COUNT(CASE WHEN address_line1 IS NOT NULL AND address_line1 != '' THEN 1 END) as customers_with_address
      FROM customers
    `

    const vehicleDataQuality = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN registration IS NOT NULL AND registration != '' THEN 1 END) as vehicles_with_registration,
        COUNT(CASE WHEN make IS NOT NULL AND make != '' THEN 1 END) as vehicles_with_make,
        COUNT(CASE WHEN model IS NOT NULL AND model != '' THEN 1 END) as vehicles_with_model,
        COUNT(CASE WHEN year IS NOT NULL THEN 1 END) as vehicles_with_year,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as vehicles_with_mot_expiry
      FROM vehicles
    `

    // 4. MOT and vehicle status
    const motStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as vehicles_with_mot_date,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as vehicles_mot_expired,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as vehicles_mot_due_soon,
        COUNT(CASE WHEN mot_status = 'valid' THEN 1 END) as vehicles_mot_valid,
        COUNT(CASE WHEN mot_status = 'expired' THEN 1 END) as vehicles_mot_status_expired
      FROM vehicles
    `

    // 5. Sample data for verification
    const sampleCustomers = await sql`
      SELECT id, first_name, last_name, email, phone, city
      FROM customers 
      ORDER BY created_at DESC
      LIMIT 5
    `

    const sampleVehicles = await sql`
      SELECT v.registration, v.make, v.model, v.year, c.first_name, c.last_name
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      ORDER BY v.created_at DESC
      LIMIT 5
    `

    // 6. Calculate health scores
    const totalCustomers = parseInt(customerCount[0].count)
    const totalVehicles = parseInt(vehicleCount[0].count)

    const vehiclesWithCustomers = parseInt(vehicleCustomerStats[0].vehicles_with_customers)
    const customersWithEmail = parseInt(customerDataQuality[0].customers_with_email)

    const healthScore = Math.round(
      (
        (totalCustomers > 5000 ? 50 : (totalCustomers / 5000) * 50) +
        (totalVehicles > 8000 ? 50 : (totalVehicles / 8000) * 50)
      )
    )

    const dataQualityScore = Math.round(
      (
        (vehiclesWithCustomers / totalVehicles * 50) +
        (customersWithEmail / totalCustomers * 50)
      )
    )

    return NextResponse.json({
      success: true,
      message: "Simple database verification completed",
      summary: {
        totalCustomers,
        totalVehicles,
        healthScore,
        dataQualityScore,
        overallStatus: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'fair' : 'needs_improvement'
      },
      counts: {
        customers: parseInt(customerCount[0].count),
        vehicles: parseInt(vehicleCount[0].count)
      },
      relationships: {
        vehicleCustomerStats: vehicleCustomerStats[0]
      },
      dataQuality: {
        customers: customerDataQuality[0],
        vehicles: vehicleDataQuality[0]
      },
      mot: motStats[0],
      samples: {
        customers: sampleCustomers,
        vehicles: sampleVehicles
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SIMPLE-VERIFICATION] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify database",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
