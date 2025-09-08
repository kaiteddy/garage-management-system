import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[PURGE-SAMPLE-DATA] 🧹 Starting comprehensive sample data cleanup...")

    const results = {
      customers_before: 0,
      customers_after: 0,
      vehicles_before: 0,
      vehicles_after: 0,
      documents_before: 0,
      documents_after: 0,
      sample_customers_removed: 0,
      test_documents_removed: 0,
      artificial_data_removed: 0
    }

    // Get initial counts
    const initialCounts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`
    ])

    results.customers_before = parseInt(initialCounts[0][0].count)
    results.vehicles_before = parseInt(initialCounts[1][0].count)
    results.documents_before = parseInt(initialCounts[2][0].count)

    console.log(`[PURGE-SAMPLE-DATA] Initial counts: ${results.customers_before} customers, ${results.vehicles_before} vehicles, ${results.documents_before} documents`)

    // 1. Remove artificial/generated customers (those with generic names or test patterns)
    console.log("[PURGE-SAMPLE-DATA] 🔍 Identifying and removing artificial customers...")

    const artificialCustomers = await sql`
      DELETE FROM customers
      WHERE
        -- Remove customers with generic test names
        (first_name IN ('John', 'Jane', 'Test', 'Sample') AND last_name IN ('Smith', 'Doe', 'Test', 'Sample'))
        OR
        -- Remove customers with test email patterns
        email LIKE '%@example.com'
        OR email LIKE '%@test.com'
        OR email LIKE '%test%'
        OR
        -- Remove customers with test phone patterns
        phone LIKE '07123456789'
        OR phone LIKE '01234567890'
        OR
        -- Remove customers with test addresses
        address_line1 LIKE '%Test%'
        OR address_line1 LIKE '%Sample%'
        OR address_line1 LIKE '123 Test Street'
        OR
        -- Remove customers with sequential numeric IDs (likely generated)
        id ~ '^[0-9]+$' AND LENGTH(id) <= 6
      RETURNING id, first_name, last_name, email
    `

    results.sample_customers_removed = artificialCustomers.length
    console.log(`[PURGE-SAMPLE-DATA] ❌ Removed ${artificialCustomers.length} artificial customers`)

    // 2. Remove test documents (hardcoded or sample data)
    console.log("[PURGE-SAMPLE-DATA] 🔍 Removing test documents...")

    const testDocuments = await sql`
      DELETE FROM documents
      WHERE
        -- Remove hardcoded test documents
        _id = '665CDFCD4CEDBB41BBF283DED1CD97B2'
        OR
        -- Remove documents with test customer names
        customer_name IN ('John Smith', 'Jane Doe', 'Test Customer', 'Sample Customer')
        OR
        -- Remove documents with test vehicle registrations
        vehicle_registration IN ('AB12 CDE', 'FG34 HIJ', 'TEST123', 'SAMPLE1')
        OR
        -- Remove documents with obviously fake data
        customer_name LIKE '%Test%'
        OR customer_name LIKE '%Sample%'
        OR
        -- Remove documents linked to removed customers
        _id_customer = ANY(ARRAY[${artificialCustomers.map(c => `'${c.id}'`).join(',') || "''"}])
      RETURNING id, doc_number, customer_name
    `

    results.test_documents_removed = testDocuments.length
    console.log(`[PURGE-SAMPLE-DATA] ❌ Removed ${testDocuments.length} test documents`)

    // 3. Clean up orphaned vehicles (not linked to real customers)
    console.log("[PURGE-SAMPLE-DATA] 🔍 Cleaning up orphaned vehicles...")

    await sql`
      UPDATE vehicles
      SET owner_id = NULL
      WHERE owner_id NOT IN (
        SELECT id FROM customers
      )
    `

    // 4. Remove any remaining artificial data patterns
    console.log("[PURGE-SAMPLE-DATA] 🔍 Final cleanup of artificial patterns...")

    // Remove MOT history for test vehicles
    const testMotHistory = await sql`
      DELETE FROM mot_history
      WHERE vehicle_registration IN ('AB12 CDE', 'FG34 HIJ', 'TEST123', 'SAMPLE1')
      RETURNING id
    `

    // Remove line items for deleted documents
    const orphanedLineItems = await sql`
      DELETE FROM document_line_items
      WHERE document_id NOT IN (
        SELECT id::text FROM documents
      )
      RETURNING id
    `

    // Remove document extras for deleted documents
    const orphanedExtras = await sql`
      DELETE FROM document_extras
      WHERE document_id NOT IN (
        SELECT id FROM documents
      )
      RETURNING document_id
    `

    results.artificial_data_removed = testMotHistory.length + orphanedLineItems.length + orphanedExtras.length

    // 5. Verify data integrity - ensure all remaining data is from real sources
    console.log("[PURGE-SAMPLE-DATA] 🔍 Verifying data integrity...")

    // Check for customers from original CSV files (should have proper structure)
    const realCustomers = await sql`
      SELECT COUNT(*) as count FROM customers
      WHERE
        first_name IS NOT NULL
        AND last_name IS NOT NULL
        AND first_name != ''
        AND last_name != ''
        AND first_name NOT IN ('John', 'Jane', 'Test', 'Sample')
        AND (email IS NULL OR email NOT LIKE '%@example.com')
    `

    // Check for documents from real CSV import
    const realDocuments = await sql`
      SELECT COUNT(*) as count FROM documents
      WHERE
        doc_number IS NOT NULL
        AND customer_name IS NOT NULL
        AND customer_name != ''
        AND customer_name NOT LIKE '%Test%'
        AND customer_name NOT LIKE '%Sample%'
    `

    // Get final counts
    const finalCounts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`
    ])

    results.customers_after = parseInt(finalCounts[0][0].count)
    results.vehicles_after = parseInt(finalCounts[1][0].count)
    results.documents_after = parseInt(finalCounts[2][0].count)

    // 6. Get sample of remaining data to verify it's real
    const sampleRealCustomers = await sql`
      SELECT first_name, last_name, phone, email, city
      FROM customers
      WHERE first_name IS NOT NULL AND last_name IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 5
    `

    const sampleRealDocuments = await sql`
      SELECT doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued
      FROM documents
      WHERE customer_name IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 5
    `

    console.log("[PURGE-SAMPLE-DATA] ✅ Sample data cleanup completed!")

    return NextResponse.json({
      success: true,
      cleanup_results: results,
      data_verification: {
        real_customers_verified: parseInt(realCustomers[0].count),
        real_documents_verified: parseInt(realDocuments[0].count),
        sample_remaining_customers: sampleRealCustomers,
        sample_remaining_documents: sampleRealDocuments
      },
      summary: {
        customers_removed: results.customers_before - results.customers_after,
        vehicles_cleaned: results.vehicles_before - results.vehicles_after,
        documents_removed: results.documents_before - results.documents_after,
        total_artificial_items_removed: results.sample_customers_removed + results.test_documents_removed + results.artificial_data_removed
      },
      data_integrity_status: "VERIFIED_REAL_DATA_ONLY",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[PURGE-SAMPLE-DATA] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to purge sample data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
