import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFY-CONNECTIONS] Starting comprehensive data connection verification...")

    // 1. Basic table counts
    const tableCounts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`,
      sql`SELECT COUNT(*) as count FROM document_extras`
    ])

    // 2. Check data relationships
    const relationshipCheck = await Promise.all([
      // Vehicles with valid customer connections
      sql`
        SELECT COUNT(*) as count FROM vehicles v
        INNER JOIN customers c ON v.owner_id = c.id
      `,
      // Documents with valid customer connections
      sql`
        SELECT COUNT(*) as count FROM documents d
        WHERE d._id_customer IS NOT NULL
        AND EXISTS (SELECT 1 FROM customers c WHERE c.id::text = d._id_customer)
      `,
      // Documents with valid vehicle connections
      sql`
        SELECT COUNT(*) as count FROM documents d
        WHERE d.vehicle_registration IS NOT NULL
        AND EXISTS (SELECT 1 FROM vehicles v WHERE UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(d.vehicle_registration, ' ', '')))
      `,
      // Check for orphaned vehicles (no customer connection)
      sql`
        SELECT COUNT(*) as count FROM vehicles v
        WHERE v.owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = v.owner_id)
      `,
      // Check for orphaned documents (no customer connection)
      sql`
        SELECT COUNT(*) as count FROM documents d
        WHERE d._id_customer IS NULL OR NOT EXISTS (SELECT 1 FROM customers c WHERE c.id::text = d._id_customer)
      `
    ])

    // 3. Sample connected data to verify relationships work
    const sampleConnectedData = await sql`
      SELECT
        c.first_name, c.last_name, c.phone,
        v.registration, v.make, v.model,
        d.doc_number, d.doc_type, d.total_gross
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      INNER JOIN documents d ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      LIMIT 10
    `

    // 4. Check SMS campaign readiness (customers with vehicles and phone numbers)
    const smsCampaignReadiness = await sql`
      SELECT COUNT(*) as count FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      WHERE c.phone IS NOT NULL
      AND c.phone != ''
      AND v.mot_expiry_date IS NOT NULL
      AND v.mot_expiry_date >= CURRENT_DATE - INTERVAL '1 year'
      AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '1 year'
    `

    // 5. Check document line items connections
    const documentLineItemsCheck = await sql`
      SELECT COUNT(*) as count FROM document_line_items dli
      INNER JOIN documents d ON dli.document_id = d.id
    `

    // 6. Check document extras connections
    const documentExtrasCheck = await sql`
      SELECT COUNT(*) as count FROM document_extras de
      INNER JOIN documents d ON de.document_id = d.id
    `

    // 7. Sample customer with full data (vehicles, documents, line items)
    const fullCustomerSample = await sql`
      SELECT
        c.first_name, c.last_name, c.phone, c.email,
        v.registration, v.make, v.model, v.mot_expiry_date,
        d.doc_number, d.doc_type, d.doc_date_issued, d.total_gross,
        COUNT(dli.id) as line_item_count,
        de.labour_description
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      INNER JOIN documents d ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      LEFT JOIN document_line_items dli ON d.id = dli.document_id
      LEFT JOIN document_extras de ON d.id = de.document_id
      WHERE c.phone IS NOT NULL
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email,
               v.registration, v.make, v.model, v.mot_expiry_date,
               d.doc_number, d.doc_type, d.doc_date_issued, d.total_gross,
               de.labour_description
      LIMIT 5
    `

    // 8. Check for data integrity issues
    const integrityIssues = await Promise.all([
      // Vehicles with invalid registration format
      sql`
        SELECT COUNT(*) as count FROM vehicles
        WHERE registration IS NULL OR registration = '' OR LENGTH(registration) < 6
      `,
      // Customers with missing essential data
      sql`
        SELECT COUNT(*) as count FROM customers
        WHERE (first_name IS NULL OR first_name = '')
        AND (last_name IS NULL OR last_name = '')
        AND (phone IS NULL OR phone = '')
      `,
      // Documents with missing essential data
      sql`
        SELECT COUNT(*) as count FROM documents
        WHERE doc_number IS NULL OR doc_number = ''
        OR customer_name IS NULL OR customer_name = ''
      `
    ])

    return NextResponse.json({
      success: true,
      verification: {
        tableCounts: {
          customers: parseInt(tableCounts[0][0].count),
          vehicles: parseInt(tableCounts[1][0].count),
          documents: parseInt(tableCounts[2][0].count),
          documentLineItems: parseInt(tableCounts[3][0].count),
          documentExtras: parseInt(tableCounts[4][0].count)
        },
        relationships: {
          vehiclesWithCustomers: parseInt(relationshipCheck[0][0].count),
          documentsWithCustomers: parseInt(relationshipCheck[1][0].count),
          documentsWithVehicles: parseInt(relationshipCheck[2][0].count),
          orphanedVehicles: parseInt(relationshipCheck[3][0].count),
          orphanedDocuments: parseInt(relationshipCheck[4][0].count)
        },
        connections: {
          documentLineItemsConnected: parseInt(documentLineItemsCheck[0].count),
          documentExtrasConnected: parseInt(documentExtrasCheck[0].count),
          smsCampaignReady: parseInt(smsCampaignReadiness[0].count)
        },
        integrityIssues: {
          vehiclesWithInvalidRegistration: parseInt(integrityIssues[0][0].count),
          customersWithMissingData: parseInt(integrityIssues[1][0].count),
          documentsWithMissingData: parseInt(integrityIssues[2][0].count)
        },
        samples: {
          connectedData: sampleConnectedData,
          fullCustomerData: fullCustomerSample
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[VERIFY-CONNECTIONS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify data connections",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
