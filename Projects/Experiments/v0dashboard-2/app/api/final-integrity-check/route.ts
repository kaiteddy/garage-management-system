import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[FINAL-INTEGRITY] Starting comprehensive final integrity check...')

    // 1. Get current record counts
    const counts = {}
    const tables = ['customers', 'vehicles', 'customer_documents', 'document_line_items', 'document_receipts', 'document_extras', 'mot_history']

    for (const table of tables) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
        counts[table] = parseInt(result[0]?.count || result[0]?.COUNT || 0)
      } catch (error) {
        counts[table] = `Error: ${error.message}`
      }
    }

    // 2. Check relationships and data integrity
    const relationships = {}

    // Customer-Vehicle relationships
    try {
      const vehiclesWithCustomers = await sql`
        SELECT COUNT(*) as count
        FROM vehicles v
        INNER JOIN customers c ON v.customer_id = c.id
      `

      const vehiclesWithoutCustomers = await sql`
        SELECT COUNT(*) as count
        FROM vehicles v
        WHERE v.customer_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = v.customer_id)
      `

      relationships.customer_vehicle = {
        vehicles_with_valid_customers: parseInt(vehiclesWithCustomers[0]?.count || 0),
        vehicles_with_invalid_customers: parseInt(vehiclesWithoutCustomers[0]?.count || 0),
        vehicles_without_customers: counts.vehicles - parseInt(vehiclesWithCustomers[0]?.count || 0) - parseInt(vehiclesWithoutCustomers[0]?.count || 0)
      }
    } catch (error) {
      relationships.customer_vehicle = { error: error.message }
    }

    // Document-Customer relationships
    try {
      const documentsWithCustomers = await sql`
        SELECT COUNT(*) as count
        FROM customer_documents d
        INNER JOIN customers c ON d.customer_id = c.id
      `

      const documentsWithoutCustomers = await sql`
        SELECT COUNT(*) as count
        FROM customer_documents d
        WHERE d.customer_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = d.customer_id)
      `

      relationships.document_customer = {
        documents_with_valid_customers: parseInt(documentsWithCustomers[0]?.count || 0),
        documents_with_invalid_customers: parseInt(documentsWithoutCustomers[0]?.count || 0),
        documents_without_customers: counts.customer_documents - parseInt(documentsWithCustomers[0]?.count || 0) - parseInt(documentsWithoutCustomers[0]?.count || 0)
      }
    } catch (error) {
      relationships.document_customer = { error: error.message }
    }

    // Line Items-Document relationships
    try {
      const lineItemsWithDocuments = await sql`
        SELECT COUNT(*) as count
        FROM document_line_items li
        INNER JOIN customer_documents d ON li.document_id = d.id
      `

      relationships.line_item_document = {
        line_items_with_valid_documents: parseInt(lineItemsWithDocuments[0]?.count || 0),
        line_items_without_documents: counts.document_line_items - parseInt(lineItemsWithDocuments[0]?.count || 0)
      }
    } catch (error) {
      relationships.line_item_document = { error: error.message }
    }

    // 3. Sample data verification
    const sampleData = {}

    try {
      // Get customers with most data
      const topCustomers = await sql`
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          COUNT(DISTINCT v.registration) as vehicle_count,
          COUNT(DISTINCT d.id) as document_count
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.customer_id
        LEFT JOIN customer_documents d ON c.id = d.customer_id
        GROUP BY c.id, c.first_name, c.last_name, c.email
        ORDER BY (COUNT(DISTINCT v.registration) + COUNT(DISTINCT d.id)) DESC
        LIMIT 5
      `

      sampleData.top_customers = topCustomers.map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
        vehicles: parseInt(row.vehicle_count),
        documents: parseInt(row.document_count)
      }))
    } catch (error) {
      sampleData.top_customers = { error: error.message }
    }

    // 4. Data quality checks
    const dataQuality = {}

    try {
      // Check for missing critical data
      const customersWithoutEmail = await sql`SELECT COUNT(*) as count FROM customers WHERE email IS NULL OR email = ''`
      const vehiclesWithoutRegistration = await sql`SELECT COUNT(*) as count FROM vehicles WHERE registration IS NULL OR registration = ''`
      const documentsWithoutCustomer = await sql`SELECT COUNT(*) as count FROM customer_documents WHERE customer_id IS NULL OR customer_id = ''`

      dataQuality.missing_data = {
        customers_without_email: parseInt(customersWithoutEmail[0]?.count || 0),
        vehicles_without_registration: parseInt(vehiclesWithoutRegistration[0]?.count || 0),
        documents_without_customer: parseInt(documentsWithoutCustomer[0]?.count || 0)
      }
    } catch (error) {
      dataQuality.missing_data = { error: error.message }
    }

    // 5. Calculate overall integrity score
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0)
    const validRelationships = (
      (relationships.customer_vehicle?.vehicles_with_valid_customers || 0) +
      (relationships.document_customer?.documents_with_valid_customers || 0) +
      (relationships.line_item_document?.line_items_with_valid_documents || 0)
    )
    const totalRelationships = (
      counts.vehicles + counts.customer_documents + counts.document_line_items
    )

    const integrityScore = totalRelationships > 0 ?
      ((validRelationships / totalRelationships) * 100).toFixed(2) : '0'

    // 6. Generate recommendations
    const recommendations = []

    if (counts.customers === 0) {
      recommendations.push('❌ No customers imported - run customer import')
    } else if (counts.customers < 5000) {
      recommendations.push('⚠️ Low customer count - verify complete import')
    } else {
      recommendations.push('✅ Good customer data volume')
    }

    if (counts.vehicles === 0) {
      recommendations.push('❌ No vehicles imported - run vehicle import')
    } else if (relationships.customer_vehicle?.vehicles_with_invalid_customers > 0) {
      recommendations.push('⚠️ Some vehicles have invalid customer references')
    } else {
      recommendations.push('✅ Vehicle-customer relationships look good')
    }

    if (counts.customer_documents === 0) {
      recommendations.push('❌ No documents imported - run document import')
    } else if (counts.customer_documents > 30000) {
      recommendations.push('✅ Excellent document history imported')
    }

    if (parseFloat(integrityScore) >= 95) {
      recommendations.push('🎉 Excellent data integrity - system ready for production!')
    } else if (parseFloat(integrityScore) >= 85) {
      recommendations.push('✅ Good data integrity - minor cleanup recommended')
    } else {
      recommendations.push('⚠️ Data integrity needs improvement - run cleanup procedures')
    }

    console.log('[FINAL-INTEGRITY] ✅ Final integrity check complete')

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      summary: {
        total_records: totalRecords,
        integrity_score: `${integrityScore}%`,
        tables_with_data: Object.values(counts).filter(count => count > 0).length,
        total_tables: tables.length
      },
      record_counts: counts,
      relationships: relationships,
      data_quality: dataQuality,
      sample_data: sampleData,
      recommendations: recommendations
    })

  } catch (error) {
    console.error('[FINAL-INTEGRITY] Error during final check:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to perform final integrity check',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
