import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[STATUS] Generating live dashboard with real-time data...")

    // Get all core statistics in parallel for better performance
    const [
      customerCount,
      vehicleCount,
      documentCount,
      motHistoryCount,
      criticalMotCount,
      smsReadyCount,
      highValueCustomers,
      totalRevenue,
      recentDocuments
    ] = await Promise.all([
      // Core counts
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''`,

      // Document counts
      sql`
        SELECT
          COALESCE((SELECT COUNT(*) FROM documents), 0) +
          COALESCE((SELECT COUNT(*) FROM customer_documents), 0) as count
      `,

      // MOT history count
      sql`SELECT COUNT(*) as count FROM mot_history`,

      // Critical MOT count (expired or expiring within 14 days)
      sql`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE mot_expiry_date IS NOT NULL
        AND (
          (mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND mot_expiry_date < CURRENT_DATE)
          OR
          (mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
        )
      `,

      // SMS ready customers
      sql`
        SELECT COUNT(*) as count
        FROM customers
        WHERE phone IS NOT NULL
        AND phone != ''
        AND (opt_out = FALSE OR opt_out IS NULL)
      `,

      // High-value customers (£5k+ spent)
      sql`
        SELECT COUNT(*) as count
        FROM customer_activity
        WHERE total_spent > 5000
      `,

      // Total lifetime revenue
      sql`
        SELECT COALESCE(SUM(total_spent), 0) as total_revenue
        FROM customer_activity
      `,

      // Recent document activity (last 30 days)
      sql`
        SELECT COUNT(*) as count
        FROM documents
        WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
      `
    ])

    // Check document tables status
    let documentStatus = {}

    try {
      const customerDocs = await sql`SELECT COUNT(*) as count FROM customer_documents`
      documentStatus.customer_documents = parseInt(customerDocs[0].count)
    } catch {
      documentStatus.customer_documents = 'Table does not exist'
    }

    try {
      const lineItems = await sql`SELECT COUNT(*) as count FROM document_line_items`
      documentStatus.document_line_items = parseInt(lineItems[0].count)
    } catch {
      documentStatus.document_line_items = 'Table does not exist'
    }

    try {
      const extras = await sql`SELECT COUNT(*) as count FROM document_extras`
      documentStatus.document_extras = parseInt(extras[0].count)
    } catch {
      documentStatus.document_extras = 'Table does not exist'
    }

    try {
      const receipts = await sql`SELECT COUNT(*) as count FROM document_receipts`
      documentStatus.document_receipts = parseInt(receipts[0].count)
    } catch {
      documentStatus.document_receipts = 'Table does not exist'
    }

    // Check customer activity
    let customerActivityStatus = {}
    try {
      const activity = await sql`SELECT COUNT(*) as count FROM customer_activity`
      customerActivityStatus.customer_activity = parseInt(activity[0].count)
    } catch {
      customerActivityStatus.customer_activity = 'Table does not exist'
    }

    // Get sample high-value documents
    let sampleDocuments = []
    try {
      sampleDocuments = await sql`
        SELECT id, customer_id, document_type, document_date, total_gross, vehicle_registration
        FROM customer_documents
        WHERE total_gross IS NOT NULL
        ORDER BY total_gross DESC
        LIMIT 5
      `
    } catch {
      try {
        sampleDocuments = await sql`
          SELECT id, _id_customer as customer_id, doc_type as document_type,
                 doc_date_issued as document_date, total_gross, vehicle_registration
          FROM documents
          WHERE total_gross IS NOT NULL
          ORDER BY total_gross DESC
          LIMIT 5
        `
      } catch {
        sampleDocuments = []
      }
    }

    // Calculate derived metrics
    const customers = parseInt(customerCount[0].count)
    const vehicles = parseInt(vehicleCount[0].count)
    const documents = parseInt(documentCount[0].count)
    const motHistory = parseInt(motHistoryCount[0].count)
    const criticalMots = parseInt(criticalMotCount[0].count)
    const smsReady = parseInt(smsReadyCount[0].count)
    const highValue = parseInt(highValueCustomers[0].count)
    const revenue = parseFloat(totalRevenue[0].total_revenue) || 0
    const recentDocs = parseInt(recentDocuments[0].count)

    // Calculate average revenue per customer
    const avgRevenuePerCustomer = customers > 0 ? revenue / customers : 0

    return NextResponse.json({
      success: true,
      systemStatus: {
        customers,
        vehicles,
        documents,
        motHistory,
        criticalMots,
        smsReady,
        highValueCustomers: highValue,
        totalRevenue: revenue,
        avgRevenuePerCustomer,
        recentDocuments: recentDocs,
        documentTables: documentStatus,
        customerActivity: customerActivityStatus,
        sampleDocuments
      },
      liveMetrics: {
        totalCustomers: customers,
        totalVehicles: vehicles,
        serviceDocuments: documents,
        lifetimeRevenue: revenue,
        criticalMotReminders: criticalMots,
        highValueCustomers: highValue,
        smsReadyCustomers: smsReady,
        avgRevenuePerCustomer: Math.round(avgRevenuePerCustomer),
        recentActivity: recentDocs
      },
      importProgress: {
        documentsImported: typeof documentStatus.customer_documents === 'number' && documentStatus.customer_documents > 0,
        lineItemsImported: typeof documentStatus.document_line_items === 'number' && documentStatus.document_line_items > 0,
        extrasImported: typeof documentStatus.document_extras === 'number' && documentStatus.document_extras > 0,
        receiptsImported: typeof documentStatus.document_receipts === 'number' && documentStatus.document_receipts > 0,
        customerActivityImported: typeof customerActivityStatus.customer_activity === 'number' && customerActivityStatus.customer_activity > 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[STATUS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
