import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[DATA-INTEGRITY] Starting comprehensive data integrity check...')

    // 1. Check basic counts
    console.log('[DATA-INTEGRITY] Step 1: Checking basic record counts...')

    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const motHistoryCount = await sql`SELECT COUNT(*) as count FROM mot_history`
    const documentsCount = await sql`SELECT COUNT(*) as count FROM customer_documents`
    const lineItemsCount = await sql`SELECT COUNT(*) as count FROM document_line_items`
    const extrasCount = await sql`SELECT COUNT(*) as count FROM document_extras`
    const receiptsCount = await sql`SELECT COUNT(*) as count FROM document_receipts`

    const counts = {
      customers: parseInt(customerCount[0].count),
      vehicles: parseInt(vehicleCount[0].count),
      mot_history: parseInt(motHistoryCount[0].count),
      documents: parseInt(documentsCount[0].count),
      line_items: parseInt(lineItemsCount[0].count),
      extras: parseInt(extrasCount[0].count),
      receipts: parseInt(receiptsCount[0].count)
    }

    console.log('[DATA-INTEGRITY] Record counts:', counts)

    // 2. Check customer-vehicle relationships
    console.log('[DATA-INTEGRITY] Step 2: Checking customer-vehicle relationships...')

    const vehiclesWithCustomers = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      INNER JOIN customers c ON v.customer_id = c.id::text
    `

    const vehiclesWithoutCustomers = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id::text
      WHERE c.id IS NULL
    `

    const customerVehicleIntegrity = {
      vehicles_with_customers: parseInt(vehiclesWithCustomers[0].count),
      vehicles_without_customers: parseInt(vehiclesWithoutCustomers[0].count),
      integrity_percentage: ((parseInt(vehiclesWithCustomers[0].count) / counts.vehicles) * 100).toFixed(2)
    }

    console.log('[DATA-INTEGRITY] Customer-Vehicle integrity:', customerVehicleIntegrity)

    // 3. Check vehicle-MOT relationships
    console.log('[DATA-INTEGRITY] Step 3: Checking vehicle-MOT relationships...')

    const motWithVehicles = await sql`
      SELECT COUNT(*) as count
      FROM mot_history m
      INNER JOIN vehicles v ON m.vehicle_registration = v.registration
    `

    const motWithoutVehicles = await sql`
      SELECT COUNT(*) as count
      FROM mot_history m
      LEFT JOIN vehicles v ON m.vehicle_registration = v.registration
      WHERE v.registration IS NULL
    `

    const vehicleMOTIntegrity = {
      mot_with_vehicles: parseInt(motWithVehicles[0].count),
      mot_without_vehicles: parseInt(motWithoutVehicles[0].count),
      integrity_percentage: counts.mot_history > 0 ? ((parseInt(motWithVehicles[0].count) / counts.mot_history) * 100).toFixed(2) : '0'
    }

    console.log('[DATA-INTEGRITY] Vehicle-MOT integrity:', vehicleMOTIntegrity)

    // 4. Check document-customer relationships
    console.log('[DATA-INTEGRITY] Step 4: Checking document-customer relationships...')

    const documentsWithCustomers = await sql`
      SELECT COUNT(*) as count
      FROM customer_documents d
      INNER JOIN customers c ON d.customer_id = c.id::text
    `

    const documentsWithoutCustomers = await sql`
      SELECT COUNT(*) as count
      FROM customer_documents d
      LEFT JOIN customers c ON d.customer_id = c.id::text
      WHERE c.id IS NULL
    `

    const documentCustomerIntegrity = {
      documents_with_customers: parseInt(documentsWithCustomers[0].count),
      documents_without_customers: parseInt(documentsWithoutCustomers[0].count),
      integrity_percentage: counts.documents > 0 ? ((parseInt(documentsWithCustomers[0].count) / counts.documents) * 100).toFixed(2) : '0'
    }

    console.log('[DATA-INTEGRITY] Document-Customer integrity:', documentCustomerIntegrity)

    // 5. Check line items-document relationships
    console.log('[DATA-INTEGRITY] Step 5: Checking line items-document relationships...')

    const lineItemsWithDocuments = await sql`
      SELECT COUNT(*) as count
      FROM document_line_items li
      INNER JOIN customer_documents d ON li.document_id = d.id
    `

    const lineItemsWithoutDocuments = await sql`
      SELECT COUNT(*) as count
      FROM document_line_items li
      LEFT JOIN customer_documents d ON li.document_id = d.id
      WHERE d.id IS NULL
    `

    const lineItemDocumentIntegrity = {
      line_items_with_documents: parseInt(lineItemsWithDocuments[0].count),
      line_items_without_documents: parseInt(lineItemsWithoutDocuments[0].count),
      integrity_percentage: counts.line_items > 0 ? ((parseInt(lineItemsWithDocuments[0].count) / counts.line_items) * 100).toFixed(2) : '0'
    }

    console.log('[DATA-INTEGRITY] Line Items-Document integrity:', lineItemDocumentIntegrity)

    // 6. Check extras-document relationships
    console.log('[DATA-INTEGRITY] Step 6: Checking extras-document relationships...')

    const extrasWithDocuments = await sql`
      SELECT COUNT(*) as count
      FROM document_extras e
      INNER JOIN customer_documents d ON e.document_id = d.id
    `

    const extrasWithoutDocuments = await sql`
      SELECT COUNT(*) as count
      FROM document_extras e
      LEFT JOIN customer_documents d ON e.document_id = d.id
      WHERE d.id IS NULL
    `

    const extrasDocumentIntegrity = {
      extras_with_documents: parseInt(extrasWithDocuments[0].count),
      extras_without_documents: parseInt(extrasWithoutDocuments[0].count),
      integrity_percentage: counts.extras > 0 ? ((parseInt(extrasWithDocuments[0].count) / counts.extras) * 100).toFixed(2) : '0'
    }

    console.log('[DATA-INTEGRITY] Extras-Document integrity:', extrasDocumentIntegrity)

    // 7. Check receipts-document relationships
    console.log('[DATA-INTEGRITY] Step 7: Checking receipts-document relationships...')

    const receiptsWithDocuments = await sql`
      SELECT COUNT(*) as count
      FROM document_receipts r
      INNER JOIN customer_documents d ON r.document_id = d.id
    `

    const receiptsWithoutDocuments = await sql`
      SELECT COUNT(*) as count
      FROM document_receipts r
      LEFT JOIN customer_documents d ON r.document_id = d.id
      WHERE d.id IS NULL
    `

    const receiptsDocumentIntegrity = {
      receipts_with_documents: parseInt(receiptsWithDocuments[0].count),
      receipts_without_documents: parseInt(receiptsWithoutDocuments[0].count),
      integrity_percentage: counts.receipts > 0 ? ((parseInt(receiptsWithDocuments[0].count) / counts.receipts) * 100).toFixed(2) : '0'
    }

    console.log('[DATA-INTEGRITY] Receipts-Document integrity:', receiptsDocumentIntegrity)

    // 8. Check for duplicate records
    console.log('[DATA-INTEGRITY] Step 8: Checking for duplicate records...')

    const duplicateCustomers = await sql`
      SELECT COUNT(*) as count FROM (
        SELECT email, COUNT(*)
        FROM customers
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
      ) duplicates
    `

    const duplicateVehicles = await sql`
      SELECT COUNT(*) as count FROM (
        SELECT registration, COUNT(*)
        FROM vehicles
        GROUP BY registration
        HAVING COUNT(*) > 1
      ) duplicates
    `

    const duplicateDocuments = await sql`
      SELECT COUNT(*) as count FROM (
        SELECT id, COUNT(*)
        FROM customer_documents
        GROUP BY id
        HAVING COUNT(*) > 1
      ) duplicates
    `

    const duplicates = {
      duplicate_customers: parseInt(duplicateCustomers[0].count),
      duplicate_vehicles: parseInt(duplicateVehicles[0].count),
      duplicate_documents: parseInt(duplicateDocuments[0].count)
    }

    console.log('[DATA-INTEGRITY] Duplicate records:', duplicates)

    // 9. Sample data verification
    console.log('[DATA-INTEGRITY] Step 9: Sample data verification...')

    const sampleCustomerWithData = await sql`
      SELECT
        c.id,
        c.forename,
        c.surname,
        c.email,
        COUNT(DISTINCT v.registration) as vehicle_count,
        COUNT(DISTINCT d.id) as document_count,
        COUNT(DISTINCT m.id) as mot_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id::text = v.customer_id
      LEFT JOIN customer_documents d ON c.id::text = d.customer_id
      LEFT JOIN mot_history m ON v.registration = m.vehicle_registration
      GROUP BY c.id, c.forename, c.surname, c.email
      HAVING COUNT(DISTINCT v.registration) > 0 OR COUNT(DISTINCT d.id) > 0
      ORDER BY (COUNT(DISTINCT v.registration) + COUNT(DISTINCT d.id)) DESC
      LIMIT 5
    `

    const sampleData = sampleCustomerWithData.map(row => ({
      customer_id: row.id,
      name: `${row.forename} ${row.surname}`,
      email: row.email,
      vehicles: parseInt(row.vehicle_count),
      documents: parseInt(row.document_count),
      mot_records: parseInt(row.mot_count)
    }))

    console.log('[DATA-INTEGRITY] Sample customers with data:', sampleData)

    // 10. Overall integrity score
    const overallIntegrity = {
      customer_vehicle_integrity: parseFloat(customerVehicleIntegrity.integrity_percentage),
      vehicle_mot_integrity: parseFloat(vehicleMOTIntegrity.integrity_percentage),
      document_customer_integrity: parseFloat(documentCustomerIntegrity.integrity_percentage),
      line_item_integrity: parseFloat(lineItemDocumentIntegrity.integrity_percentage),
      extras_integrity: parseFloat(extrasDocumentIntegrity.integrity_percentage),
      receipts_integrity: parseFloat(receiptsDocumentIntegrity.integrity_percentage)
    }

    const averageIntegrity = Object.values(overallIntegrity).reduce((a, b) => a + b, 0) / Object.values(overallIntegrity).length

    console.log('[DATA-INTEGRITY] Overall integrity score:', averageIntegrity.toFixed(2) + '%')

    const result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      record_counts: counts,
      integrity_checks: {
        customer_vehicle: customerVehicleIntegrity,
        vehicle_mot: vehicleMOTIntegrity,
        document_customer: documentCustomerIntegrity,
        line_item_document: lineItemDocumentIntegrity,
        extras_document: extrasDocumentIntegrity,
        receipts_document: receiptsDocumentIntegrity
      },
      duplicate_analysis: duplicates,
      sample_data: sampleData,
      overall_integrity_score: averageIntegrity.toFixed(2) + '%',
      recommendations: []
    }

    // Add recommendations based on findings
    if (customerVehicleIntegrity.vehicles_without_customers > 0) {
      result.recommendations.push(`${customerVehicleIntegrity.vehicles_without_customers} vehicles have no associated customer - consider data cleanup`)
    }

    if (vehicleMOTIntegrity.mot_without_vehicles > 0) {
      result.recommendations.push(`${vehicleMOTIntegrity.mot_without_vehicles} MOT records have no associated vehicle - consider data cleanup`)
    }

    if (documentCustomerIntegrity.documents_without_customers > 0) {
      result.recommendations.push(`${documentCustomerIntegrity.documents_without_customers} documents have no associated customer - consider data cleanup`)
    }

    if (duplicates.duplicate_customers > 0) {
      result.recommendations.push(`${duplicates.duplicate_customers} duplicate customer emails found - consider deduplication`)
    }

    if (averageIntegrity < 95) {
      result.recommendations.push('Overall data integrity below 95% - recommend comprehensive data cleanup')
    } else if (averageIntegrity >= 99) {
      result.recommendations.push('Excellent data integrity - system ready for production use')
    }

    console.log('[DATA-INTEGRITY] ✅ Data integrity check complete')

    return NextResponse.json(result)

  } catch (error) {
    console.error('[DATA-INTEGRITY] Error during integrity check:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to perform data integrity check',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
