import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[COMPREHENSIVE-VERIFICATION] Starting comprehensive database verification...")

    // 1. Basic table counts
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const documentCount = await sql`SELECT COUNT(*) as count FROM documents`
    const lineItemCount = await sql`SELECT COUNT(*) as count FROM line_items`

    // 2. Data integrity checks
    const orphanedVehicles = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.owner_id IS NOT NULL AND c.id IS NULL
    `

    const orphanedDocuments = await sql`
      SELECT COUNT(*) as count
      FROM documents d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.customer_id IS NOT NULL AND c.id IS NULL
    `

    const orphanedLineItems = await sql`
      SELECT COUNT(*) as count
      FROM line_items li
      LEFT JOIN documents d ON li.document_id = d.id
      WHERE li.document_id IS NOT NULL AND d.id IS NULL
    `

    // 3. Relationship statistics
    const vehicleCustomerStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_customers,
        COUNT(*) - COUNT(owner_id) as vehicles_without_customers
      FROM vehicles
    `

    const documentVehicleStats = await sql`
      SELECT
        COUNT(*) as total_documents,
        COUNT(vehicle_id) as documents_with_vehicles,
        COUNT(*) - COUNT(vehicle_id) as documents_without_vehicles
      FROM documents
    `

    // 4. Data quality checks
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

    // 5. Financial statistics
    const financialStats = await sql`
      SELECT
        COUNT(*) as total_documents,
        SUM(total_gross) as total_revenue,
        AVG(total_gross) as average_invoice_value,
        MIN(total_gross) as min_invoice_value,
        MAX(total_gross) as max_invoice_value,
        COUNT(CASE WHEN total_gross > 0 THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN total_gross = 0 THEN 1 END) as zero_value_documents
      FROM documents
    `

    const lineItemStats = await sql`
      SELECT
        COUNT(*) as total_line_items,
        SUM(total_amount) as total_line_value,
        AVG(total_amount) as average_line_value,
        COUNT(DISTINCT document_id) as documents_with_line_items,
        COUNT(CASE WHEN line_type = 'service' THEN 1 END) as service_items,
        COUNT(CASE WHEN line_type = 'part' THEN 1 END) as part_items,
        COUNT(CASE WHEN line_type NOT IN ('service', 'part') THEN 1 END) as other_items
      FROM line_items
    `

    // 6. MOT and vehicle status
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

    // 7. Recent activity
    const recentActivity = await sql`
      SELECT
        'customers' as table_name,
        COUNT(*) as records_created_today,
        MAX(created_at) as latest_record
      FROM customers
      WHERE created_at >= CURRENT_DATE
      UNION ALL
      SELECT
        'vehicles' as table_name,
        COUNT(*) as records_created_today,
        MAX(created_at) as latest_record
      FROM vehicles
      WHERE created_at >= CURRENT_DATE
      UNION ALL
      SELECT
        'documents' as table_name,
        COUNT(*) as records_created_today,
        MAX(created_at) as latest_record
      FROM documents
      WHERE created_at >= CURRENT_DATE
      UNION ALL
      SELECT
        'line_items' as table_name,
        COUNT(*) as records_created_today,
        MAX(created_at) as latest_record
      FROM line_items
      WHERE created_at >= CURRENT_DATE
    `

    // 8. Sample data for verification
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

    const sampleDocuments = await sql`
      SELECT d.id, d.doc_number, d.doc_type, d.total_gross, c.first_name, c.last_name
      FROM documents d
      LEFT JOIN customers c ON d.customer_id = c.id
      ORDER BY d.created_at DESC
      LIMIT 5
    `

    // 9. Calculate overall health score
    const totalCustomers = parseInt(customerCount[0].count)
    const totalVehicles = parseInt(vehicleCount[0].count)
    const totalDocuments = parseInt(documentCount[0].count)
    const totalLineItems = parseInt(lineItemCount[0].count)

    const vehiclesWithCustomers = parseInt(vehicleCustomerStats[0].vehicles_with_customers)
    const documentsWithVehicles = parseInt(documentVehicleStats[0].documents_with_vehicles)
    const customersWithEmail = parseInt(customerDataQuality[0].customers_with_email)

    const healthScore = Math.round(
      (
        (totalCustomers > 5000 ? 25 : (totalCustomers / 5000) * 25) +
        (totalVehicles > 8000 ? 25 : (totalVehicles / 8000) * 25) +
        (totalDocuments > 25000 ? 25 : (totalDocuments / 25000) * 25) +
        (totalLineItems > 70000 ? 25 : (totalLineItems / 70000) * 25)
      )
    )

    const dataQualityScore = Math.round(
      (
        (vehiclesWithCustomers / totalVehicles * 30) +
        (documentsWithVehicles / totalDocuments * 30) +
        (customersWithEmail / totalCustomers * 40)
      )
    )

    return NextResponse.json({
      success: true,
      message: "Comprehensive database verification completed",
      summary: {
        totalCustomers,
        totalVehicles,
        totalDocuments,
        totalLineItems,
        healthScore,
        dataQualityScore,
        overallStatus: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'fair' : 'needs_improvement'
      },
      counts: {
        customers: parseInt(customerCount[0].count),
        vehicles: parseInt(vehicleCount[0].count),
        documents: parseInt(documentCount[0].count),
        lineItems: parseInt(lineItemCount[0].count)
      },
      dataIntegrity: {
        orphanedVehicles: parseInt(orphanedVehicles[0].count),
        orphanedDocuments: parseInt(orphanedDocuments[0].count),
        orphanedLineItems: parseInt(orphanedLineItems[0].count),
        integrityScore: Math.max(0, 100 - (parseInt(orphanedVehicles[0].count) + parseInt(orphanedDocuments[0].count) + parseInt(orphanedLineItems[0].count)))
      },
      relationships: {
        vehicleCustomerStats: vehicleCustomerStats[0],
        documentVehicleStats: documentVehicleStats[0]
      },
      dataQuality: {
        customers: customerDataQuality[0],
        vehicles: vehicleDataQuality[0]
      },
      financial: {
        totalRevenue: parseFloat(financialStats[0].total_revenue || '0'),
        averageInvoiceValue: parseFloat(financialStats[0].average_invoice_value || '0'),
        totalDocuments: parseInt(financialStats[0].total_documents),
        paidInvoices: parseInt(financialStats[0].paid_invoices || '0'),
        lineItemValue: parseFloat(lineItemStats[0].total_line_value || '0')
      },
      mot: motStats[0],
      recentActivity,
      samples: {
        customers: sampleCustomers,
        vehicles: sampleVehicles,
        documents: sampleDocuments
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[COMPREHENSIVE-VERIFICATION] Error:", error)
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
