import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CLEAN-SAMPLE-DATA] 🧹 Starting safe sample data cleanup...")

    const results = {
      customers_before: 0,
      customers_after: 0,
      documents_before: 0,
      documents_after: 0,
      test_customers_removed: 0,
      test_documents_removed: 0,
      workshop_data_removed: 0
    }

    // Get initial counts
    const [customerCount, documentCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM documents`
    ])

    results.customers_before = parseInt(customerCount[0].count)
    results.documents_before = parseInt(documentCount[0].count)

    console.log(`[CLEAN-SAMPLE-DATA] Initial: ${results.customers_before} customers, ${results.documents_before} documents`)

    // 1. Remove obvious test customers with generic names and test emails
    console.log("[CLEAN-SAMPLE-DATA] 🔍 Removing obvious test customers...")
    
    const testCustomers = await sql`
      DELETE FROM customers 
      WHERE 
        -- Remove customers with test email patterns
        (email LIKE '%@example.com' OR email LIKE '%@test.com')
        OR
        -- Remove customers with test phone numbers
        phone = '07123456789'
        OR
        -- Remove customers with test addresses
        address_line1 = '123 Test Street'
        OR
        -- Remove specific test combinations
        (first_name = 'John' AND last_name = 'Smith' AND email LIKE '%example%')
        OR
        (first_name = 'Jane' AND last_name = 'Doe')
        OR
        (first_name = 'Test' OR last_name = 'Test')
        OR
        (first_name = 'Sample' OR last_name = 'Sample')
      RETURNING id, first_name, last_name, email
    `

    results.test_customers_removed = testCustomers.length
    console.log(`[CLEAN-SAMPLE-DATA] ❌ Removed ${testCustomers.length} test customers`)

    // 2. Remove workshop sample data and hardcoded test documents
    console.log("[CLEAN-SAMPLE-DATA] 🔍 Removing workshop sample data...")
    
    const workshopData = await sql`
      DELETE FROM documents 
      WHERE 
        -- Remove workshop sample data
        customer_name IN ('John Smith', 'Sarah Johnson')
        OR
        vehicle_registration IN ('AB12 CDE', 'FG34 HIJ')
        OR
        doc_number IN ('90941', '90942')
        OR
        -- Remove hardcoded test document
        _id = '665CDFCD4CEDBB41BBF283DED1CD97B2'
        OR
        -- Remove documents with test patterns
        customer_name LIKE '%Test%'
        OR customer_name LIKE '%Sample%'
      RETURNING id, doc_number, customer_name
    `

    results.workshop_data_removed = workshopData.length
    console.log(`[CLEAN-SAMPLE-DATA] ❌ Removed ${workshopData.length} workshop/test documents`)

    // 3. Clean up orphaned data
    console.log("[CLEAN-SAMPLE-DATA] 🔍 Cleaning up orphaned data...")

    // Remove line items for deleted documents
    const orphanedLineItems = await sql`
      DELETE FROM document_line_items 
      WHERE document_id NOT IN (
        SELECT id::text FROM documents
      )
    `

    // Remove document extras for deleted documents  
    const orphanedExtras = await sql`
      DELETE FROM document_extras 
      WHERE document_id NOT IN (
        SELECT id FROM documents
      )
    `

    // Remove MOT history for test vehicles
    const testMotHistory = await sql`
      DELETE FROM mot_history 
      WHERE vehicle_registration IN ('AB12 CDE', 'FG34 HIJ', 'TEST123')
    `

    // Update vehicles to remove links to deleted customers
    await sql`
      UPDATE vehicles 
      SET owner_id = NULL 
      WHERE owner_id NOT IN (
        SELECT id FROM customers
      )
    `

    // Get final counts
    const [finalCustomerCount, finalDocumentCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM documents`
    ])

    results.customers_after = parseInt(finalCustomerCount[0].count)
    results.documents_after = parseInt(finalDocumentCount[0].count)

    // 4. Verify remaining data is real
    console.log("[CLEAN-SAMPLE-DATA] 🔍 Verifying remaining data...")

    const sampleCustomers = await sql`
      SELECT first_name, last_name, phone, email, city
      FROM customers 
      WHERE first_name IS NOT NULL AND last_name IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 5
    `

    const sampleDocuments = await sql`
      SELECT doc_number, customer_name, vehicle_registration, total_gross
      FROM documents 
      WHERE customer_name IS NOT NULL
      ORDER BY total_gross DESC
      LIMIT 5
    `

    // Check for any remaining suspicious patterns
    const suspiciousCustomers = await sql`
      SELECT COUNT(*) as count FROM customers 
      WHERE 
        email LIKE '%test%' 
        OR email LIKE '%example%'
        OR first_name IN ('Test', 'Sample', 'Demo')
        OR last_name IN ('Test', 'Sample', 'Demo')
    `

    const suspiciousDocuments = await sql`
      SELECT COUNT(*) as count FROM documents 
      WHERE 
        customer_name LIKE '%Test%'
        OR customer_name LIKE '%Sample%'
        OR vehicle_registration LIKE '%TEST%'
    `

    console.log("[CLEAN-SAMPLE-DATA] ✅ Sample data cleanup completed!")

    return NextResponse.json({
      success: true,
      cleanup_summary: {
        customers_removed: results.customers_before - results.customers_after,
        documents_removed: results.documents_before - results.documents_after,
        test_customers_removed: results.test_customers_removed,
        workshop_data_removed: results.workshop_data_removed,
        total_items_cleaned: results.test_customers_removed + results.workshop_data_removed
      },
      final_counts: {
        customers: results.customers_after,
        documents: results.documents_after
      },
      data_verification: {
        sample_real_customers: sampleCustomers,
        sample_real_documents: sampleDocuments,
        remaining_suspicious_customers: parseInt(suspiciousCustomers[0].count),
        remaining_suspicious_documents: parseInt(suspiciousDocuments[0].count)
      },
      data_integrity_status: parseInt(suspiciousCustomers[0].count) === 0 && parseInt(suspiciousDocuments[0].count) === 0 ? 
        "CLEAN - NO SAMPLE DATA DETECTED" : 
        "MOSTLY CLEAN - SOME SUSPICIOUS PATTERNS REMAIN",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEAN-SAMPLE-DATA] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to clean sample data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
