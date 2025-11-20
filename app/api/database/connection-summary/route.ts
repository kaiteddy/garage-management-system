import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CONNECTION-SUMMARY] Generating comprehensive data connection summary...")

    // 1. Basic table counts
    const tableCounts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`,
      sql`SELECT COUNT(*) as count FROM document_extras`
    ])

    // 2. Connection statistics
    const connectionStats = await Promise.all([
      // Vehicles connected to customers
      sql`SELECT COUNT(*) as count FROM vehicles WHERE owner_id IS NOT NULL`,
      // Documents connected to customers
      sql`SELECT COUNT(*) as count FROM documents WHERE _id_customer IS NOT NULL`,
      // Documents connected to vehicles
      sql`SELECT COUNT(*) as count FROM documents WHERE vehicle_registration IS NOT NULL`,
      // Customers with phone numbers
      sql`SELECT COUNT(*) as count FROM customers WHERE phone IS NOT NULL AND phone != ''`,
      // SMS campaign ready customers
      sql`
        SELECT COUNT(*) as count FROM customers c
        INNER JOIN vehicles v ON c.id = v.owner_id
        WHERE c.phone IS NOT NULL AND c.phone != ''
        AND v.mot_expiry_date IS NOT NULL
        AND v.mot_expiry_date >= CURRENT_DATE - INTERVAL '1 year'
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '1 year'
      `
    ])

    // 3. Data quality checks
    const qualityChecks = await Promise.all([
      // Orphaned vehicles (no customer)
      sql`SELECT COUNT(*) as count FROM vehicles WHERE owner_id IS NULL`,
      // Orphaned documents (no customer)
      sql`SELECT COUNT(*) as count FROM documents WHERE _id_customer IS NULL`,
      // Documents without vehicle registration
      sql`SELECT COUNT(*) as count FROM documents WHERE vehicle_registration IS NULL OR vehicle_registration = ''`,
      // Customers without phone numbers
      sql`SELECT COUNT(*) as count FROM customers WHERE phone IS NULL OR phone = ''`
    ])

    // 4. Sample fully connected data
    const fullyConnectedSample = await sql`
      SELECT
        c.first_name, c.last_name, c.phone, c.email,
        v.registration, v.make, v.model, v.mot_expiry_date, v.mot_status,
        d.doc_number, d.doc_type, d.doc_date_issued, d.total_gross,
        COUNT(dli.id) as line_item_count
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      INNER JOIN documents d ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      LEFT JOIN document_line_items dli ON d.id = dli.document_id
      WHERE c.phone IS NOT NULL AND c.phone != ''
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email,
               v.registration, v.make, v.model, v.mot_expiry_date, v.mot_status,
               d.doc_number, d.doc_type, d.doc_date_issued, d.total_gross
      ORDER BY d.doc_date_issued DESC
      LIMIT 10
    `

    // 5. MOT campaign readiness by urgency
    const motCampaignReadiness = await Promise.all([
      // Expired MOTs (within last year)
      sql`
        SELECT COUNT(*) as count FROM customers c
        INNER JOIN vehicles v ON c.id = v.owner_id
        WHERE c.phone IS NOT NULL AND c.phone != ''
        AND v.mot_expiry_date < CURRENT_DATE
        AND v.mot_expiry_date >= CURRENT_DATE - INTERVAL '1 year'
      `,
      // Critical MOTs (expiring within 7 days)
      sql`
        SELECT COUNT(*) as count FROM customers c
        INNER JOIN vehicles v ON c.id = v.owner_id
        WHERE c.phone IS NOT NULL AND c.phone != ''
        AND v.mot_expiry_date >= CURRENT_DATE
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days'
      `,
      // Due soon MOTs (expiring 8-30 days)
      sql`
        SELECT COUNT(*) as count FROM customers c
        INNER JOIN vehicles v ON c.id = v.owner_id
        WHERE c.phone IS NOT NULL AND c.phone != ''
        AND v.mot_expiry_date > CURRENT_DATE + INTERVAL '7 days'
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      `
    ])

    // 6. Document line items and extras connectivity
    const documentConnectivity = await Promise.all([
      sql`SELECT COUNT(*) as count FROM document_line_items`,
      sql`SELECT COUNT(*) as count FROM document_extras`
    ])

    const summary = {
      tables: {
        customers: parseInt(tableCounts[0][0].count),
        vehicles: parseInt(tableCounts[1][0].count),
        documents: parseInt(tableCounts[2][0].count),
        documentLineItems: parseInt(tableCounts[3][0].count),
        documentExtras: parseInt(tableCounts[4][0].count)
      },
      connections: {
        vehiclesWithCustomers: parseInt(connectionStats[0][0].count),
        documentsWithCustomers: parseInt(connectionStats[1][0].count),
        documentsWithVehicles: parseInt(connectionStats[2][0].count),
        customersWithPhones: parseInt(connectionStats[3][0].count),
        smsReadyCustomers: parseInt(connectionStats[4][0].count)
      },
      dataQuality: {
        orphanedVehicles: parseInt(qualityChecks[0][0].count),
        orphanedDocuments: parseInt(qualityChecks[1][0].count),
        documentsWithoutVehicles: parseInt(qualityChecks[2][0].count),
        customersWithoutPhones: parseInt(qualityChecks[3][0].count)
      },
      motCampaigns: {
        expired: parseInt(motCampaignReadiness[0][0].count),
        critical: parseInt(motCampaignReadiness[1][0].count),
        dueSoon: parseInt(motCampaignReadiness[2][0].count)
      },
      documentConnectivity: {
        lineItemsConnected: parseInt(documentConnectivity[0][0].count),
        extrasConnected: parseInt(documentConnectivity[1][0].count)
      },
      sampleData: fullyConnectedSample
    }

    // Calculate connection percentages
    const connectionPercentages = {
      vehicleCustomerConnection: Math.round((summary.connections.vehiclesWithCustomers / summary.tables.vehicles) * 100),
      documentCustomerConnection: Math.round((summary.connections.documentsWithCustomers / summary.tables.documents) * 100),
      documentVehicleConnection: Math.round((summary.connections.documentsWithVehicles / summary.tables.documents) * 100),
      customerPhoneCompletion: Math.round((summary.connections.customersWithPhones / summary.tables.customers) * 100)
    }

    return NextResponse.json({
      success: true,
      summary,
      connectionPercentages,
      status: {
        dataConnected: summary.connections.vehiclesWithCustomers > 8000 && summary.connections.documentsWithCustomers > 13000,
        smsReady: summary.connections.smsReadyCustomers > 5000,
        qualityGood: summary.dataQuality.orphanedVehicles < 2000 && summary.dataQuality.orphanedDocuments === 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CONNECTION-SUMMARY] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate connection summary",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
