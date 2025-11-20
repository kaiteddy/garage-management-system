import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFY-REAL-DATA] 🔍 Verifying all data is from real sources...")

    // Get current counts
    const [customerCount, vehicleCount, documentCount, motCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`,
      sql`SELECT COUNT(*) as count FROM mot_history`
    ])

    // Check for any obvious test/sample patterns
    const testPatterns = await Promise.all([
      // Test customers
      sql`
        SELECT COUNT(*) as count FROM customers 
        WHERE 
          email LIKE '%@example.com' 
          OR email LIKE '%@test.com'
          OR first_name IN ('Test', 'Sample', 'Demo', 'John', 'Jane')
          OR last_name IN ('Test', 'Sample', 'Demo', 'Doe', 'Smith')
          OR phone = '07123456789'
      `,
      // Test documents
      sql`
        SELECT COUNT(*) as count FROM documents 
        WHERE 
          customer_name LIKE '%Test%'
          OR customer_name LIKE '%Sample%'
          OR customer_name IN ('John Smith', 'Jane Doe', 'Sarah Johnson')
          OR vehicle_registration IN ('AB12 CDE', 'FG34 HIJ', 'TEST123')
      `,
      // Test vehicles
      sql`
        SELECT COUNT(*) as count FROM vehicles 
        WHERE 
          registration IN ('AB12 CDE', 'FG34 HIJ', 'TEST123', 'SAMPLE1')
          OR make = 'TestMake'
          OR model = 'TestModel'
      `
    ])

    // Get sample of real data to verify authenticity
    const realDataSamples = await Promise.all([
      // Real customers (from CSV import)
      sql`
        SELECT first_name, last_name, phone, email, city, postcode
        FROM customers 
        WHERE 
          first_name IS NOT NULL 
          AND last_name IS NOT NULL
          AND email NOT LIKE '%@example.com'
          AND email NOT LIKE '%@test.com'
        ORDER BY RANDOM()
        LIMIT 10
      `,
      // Real documents (from CSV import)
      sql`
        SELECT doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued
        FROM documents 
        WHERE 
          customer_name IS NOT NULL
          AND customer_name NOT LIKE '%Test%'
          AND customer_name NOT LIKE '%Sample%'
          AND total_gross > 0
        ORDER BY total_gross DESC
        LIMIT 10
      `,
      // Real vehicles (from CSV import)
      sql`
        SELECT registration, make, model, year, color, fuel_type
        FROM vehicles 
        WHERE 
          registration IS NOT NULL
          AND make IS NOT NULL
          AND model IS NOT NULL
          AND registration NOT IN ('AB12 CDE', 'FG34 HIJ', 'TEST123')
        ORDER BY RANDOM()
        LIMIT 10
      `
    ])

    // Check data source integrity
    const dataSourceCheck = await Promise.all([
      // Customers with proper structure (from Customers.csv)
      sql`
        SELECT COUNT(*) as count FROM customers 
        WHERE 
          first_name IS NOT NULL 
          AND last_name IS NOT NULL
          AND LENGTH(first_name) > 1
          AND LENGTH(last_name) > 1
      `,
      // Documents with proper structure (from Documents.csv)
      sql`
        SELECT COUNT(*) as count FROM documents 
        WHERE 
          doc_number IS NOT NULL
          AND customer_name IS NOT NULL
          AND _id_customer IS NOT NULL
          AND LENGTH(doc_number) > 0
      `,
      // Vehicles with proper registration format
      sql`
        SELECT COUNT(*) as count FROM vehicles 
        WHERE 
          registration IS NOT NULL
          AND LENGTH(registration) >= 6
          AND registration ~ '^[A-Z0-9 ]+$'
      `
    ])

    // Get top customers by service history (should be real business customers)
    const topCustomers = await sql`
      SELECT 
        customer_name,
        COUNT(*) as document_count,
        SUM(total_gross) as total_spent,
        MIN(doc_date_issued) as first_service,
        MAX(doc_date_issued) as last_service
      FROM documents 
      WHERE 
        customer_name IS NOT NULL 
        AND customer_name != ''
        AND customer_name NOT LIKE '%Test%'
        AND customer_name NOT LIKE '%Sample%'
      GROUP BY customer_name
      ORDER BY document_count DESC
      LIMIT 10
    `

    // Calculate data quality metrics
    const totalCustomers = parseInt(customerCount[0].count)
    const totalDocuments = parseInt(documentCount[0].count)
    const totalVehicles = parseInt(vehicleCount[0].count)
    
    const testCustomers = parseInt(testPatterns[0][0].count)
    const testDocuments = parseInt(testPatterns[1][0].count)
    const testVehicles = parseInt(testPatterns[2][0].count)
    
    const realCustomers = parseInt(dataSourceCheck[0][0].count)
    const realDocuments = parseInt(dataSourceCheck[1][0].count)
    const realVehicleRegs = parseInt(dataSourceCheck[2][0].count)

    // Determine data integrity status
    let integrityStatus = "EXCELLENT"
    let issues = []

    if (testCustomers > 0) {
      issues.push(`${testCustomers} customers with test patterns`)
      integrityStatus = "NEEDS_CLEANUP"
    }
    
    if (testDocuments > 0) {
      issues.push(`${testDocuments} documents with test patterns`)
      integrityStatus = "NEEDS_CLEANUP"
    }
    
    if (testVehicles > 0) {
      issues.push(`${testVehicles} vehicles with test patterns`)
      integrityStatus = "NEEDS_CLEANUP"
    }

    if (issues.length === 0) {
      integrityStatus = "VERIFIED_REAL_DATA_ONLY"
    }

    return NextResponse.json({
      success: true,
      data_integrity_report: {
        database_totals: {
          customers: totalCustomers,
          vehicles: totalVehicles,
          documents: totalDocuments,
          mot_history: parseInt(motCount[0].count)
        },
        test_data_detection: {
          test_customers_found: testCustomers,
          test_documents_found: testDocuments,
          test_vehicles_found: testVehicles,
          total_test_items: testCustomers + testDocuments + testVehicles
        },
        real_data_verification: {
          customers_with_proper_structure: realCustomers,
          documents_with_proper_structure: realDocuments,
          vehicles_with_proper_registrations: realVehicleRegs,
          percentage_real_customers: Math.round((realCustomers / totalCustomers) * 100),
          percentage_real_documents: Math.round((realDocuments / totalDocuments) * 100)
        },
        data_quality_samples: {
          real_customers: realDataSamples[0],
          real_documents: realDataSamples[1],
          real_vehicles: realDataSamples[2],
          top_customers_by_service_history: topCustomers
        },
        integrity_assessment: {
          status: integrityStatus,
          issues_found: issues,
          data_source_confidence: issues.length === 0 ? "HIGH" : "MEDIUM",
          recommendation: issues.length === 0 ? 
            "Data appears to be entirely from real sources" : 
            "Some test/sample data detected - cleanup recommended"
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[VERIFY-REAL-DATA] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to verify real data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
