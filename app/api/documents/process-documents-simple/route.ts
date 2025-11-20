import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[PROCESS-DOCUMENTS-SIMPLE] Starting simple document processing...")

    const documentsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv'
    
    if (!fs.existsSync(documentsPath)) {
      return NextResponse.json({
        success: false,
        error: "Documents.csv file not found",
        path: documentsPath
      }, { status: 404 })
    }

    // Create simple documents table
    await sql`
      CREATE TABLE IF NOT EXISTS customer_documents (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        vehicle_registration TEXT,
        document_type TEXT,
        document_date DATE,
        total_amount DECIMAL(10,2),
        status TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_custdoc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `

    // Clear existing data
    await sql`DELETE FROM customer_documents`

    // Read and parse CSV with more robust parsing
    const fileContent = fs.readFileSync(documentsPath, 'utf-8')
    
    let records
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true,
        cast: false
      })
    } catch (parseError) {
      console.error("[PROCESS-DOCUMENTS-SIMPLE] CSV Parse Error:", parseError)
      return NextResponse.json({
        success: false,
        error: "Failed to parse Documents CSV file",
        details: parseError instanceof Error ? parseError.message : "Unknown parse error"
      }, { status: 400 })
    }

    console.log(`[PROCESS-DOCUMENTS-SIMPLE] Successfully parsed ${records.length} document records`)

    let imported = 0
    let skipped = 0
    let errors = 0

    // Process documents in batches
    const batchSize = 100
    for (let i = 0; i < Math.min(records.length, 5000); i += batchSize) { // Limit to 5000 for performance
      const batch = records.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          // Skip if no ID
          if (!record._ID || record._ID.trim() === '') {
            skipped++
            continue
          }

          const docId = record._ID.trim()
          const customerId = record._ID_Customer ? record._ID_Customer.trim() : null

          // Skip if no customer ID
          if (!customerId) {
            skipped++
            continue
          }

          // Parse date
          let docDate = null
          if (record.docDate_Created) {
            try {
              const dateStr = record.docDate_Created.trim()
              if (dateStr && dateStr !== '') {
                docDate = new Date(dateStr)
                if (isNaN(docDate.getTime())) {
                  docDate = null
                }
              }
            } catch (e) {
              docDate = null
            }
          }

          // Parse amount
          let totalAmount = null
          if (record.us_TotalGROSS) {
            try {
              const amountStr = record.us_TotalGROSS.replace(/[£$,]/g, '').trim()
              if (amountStr && !isNaN(parseFloat(amountStr))) {
                totalAmount = parseFloat(amountStr)
              }
            } catch (e) {
              totalAmount = null
            }
          }

          const document = {
            id: docId,
            customer_id: customerId,
            vehicle_registration: record.vehRegistration ? record.vehRegistration.trim() : null,
            document_type: record.docType ? record.docType.trim() : null,
            document_date: docDate,
            total_amount: totalAmount,
            status: record.docStatus ? record.docStatus.trim() : null
          }

          // Only import if we have meaningful data
          if (document.customer_id && (document.document_date || document.total_amount)) {
            await sql`
              INSERT INTO customer_documents (
                id, customer_id, vehicle_registration, document_type,
                document_date, total_amount, status
              ) VALUES (
                ${document.id},
                ${document.customer_id},
                ${document.vehicle_registration},
                ${document.document_type},
                ${document.document_date},
                ${document.total_amount},
                ${document.status}
              )
              ON CONFLICT (id) DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                vehicle_registration = EXCLUDED.vehicle_registration,
                updated_at = NOW()
            `
            imported++
          } else {
            skipped++
          }

        } catch (error) {
          console.error(`[PROCESS-DOCUMENTS-SIMPLE] Error importing document ${record._ID}:`, error)
          errors++
        }
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= Math.min(records.length, 5000)) {
        console.log(`[PROCESS-DOCUMENTS-SIMPLE] Processed ${Math.min(i + batchSize, records.length)}/${Math.min(records.length, 5000)} records... (Imported: ${imported})`)
      }
    }

    // Get statistics
    const documentStats = await sql`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN document_date IS NOT NULL THEN 1 END) as with_date,
        COUNT(CASE WHEN total_amount IS NOT NULL THEN 1 END) as with_amount,
        MIN(document_date) as earliest_date,
        MAX(document_date) as latest_date,
        SUM(total_amount) as total_revenue,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(DISTINCT vehicle_registration) as unique_vehicles
      FROM customer_documents
    `

    // Get recent customer activity (last 2 years)
    const recentActivity = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.twilio_phone,
        c.email,
        COUNT(d.id) as document_count,
        MAX(d.document_date) as last_document_date,
        SUM(d.total_amount) as total_spent,
        COUNT(DISTINCT d.vehicle_registration) as vehicles_serviced,
        CASE 
          WHEN MAX(d.document_date) >= CURRENT_DATE - INTERVAL '6 months' THEN 'very_recent'
          WHEN MAX(d.document_date) >= CURRENT_DATE - INTERVAL '1 year' THEN 'recent'
          WHEN MAX(d.document_date) >= CURRENT_DATE - INTERVAL '2 years' THEN 'moderate'
          ELSE 'old'
        END as activity_level
      FROM customers c
      INNER JOIN customer_documents d ON c.id = d.customer_id
      WHERE d.document_date >= CURRENT_DATE - INTERVAL '2 years'
      GROUP BY c.id, c.first_name, c.last_name, c.twilio_phone, c.email
      ORDER BY MAX(d.document_date) DESC
      LIMIT 50
    `

    // Update customer last_contact_date
    await sql`
      UPDATE customers 
      SET last_contact_date = (
        SELECT MAX(document_date) 
        FROM customer_documents 
        WHERE customer_documents.customer_id = customers.id
      )
      WHERE id IN (
        SELECT DISTINCT customer_id 
        FROM customer_documents 
        WHERE customer_id IS NOT NULL
      )
    `

    // Get activity summary
    const activitySummary = await sql`
      SELECT 
        COUNT(DISTINCT c.id) as customers_with_activity,
        COUNT(CASE WHEN d.document_date >= CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as very_recent_activity,
        COUNT(CASE WHEN d.document_date >= CURRENT_DATE - INTERVAL '1 year' 
                   AND d.document_date < CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as recent_activity,
        COUNT(CASE WHEN d.document_date >= CURRENT_DATE - INTERVAL '2 years' 
                   AND d.document_date < CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as moderate_activity
      FROM customers c
      INNER JOIN customer_documents d ON c.id = d.customer_id
    `

    const stats = documentStats[0]
    const activity = activitySummary[0]

    return NextResponse.json({
      success: true,
      message: "Simple document processing completed",
      results: {
        totalRecordsProcessed: Math.min(records.length, 5000),
        imported,
        skipped,
        errors
      },
      statistics: {
        totalDocuments: parseInt(stats.total_documents),
        withDate: parseInt(stats.with_date),
        withAmount: parseInt(stats.with_amount),
        earliestDate: stats.earliest_date,
        latestDate: stats.latest_date,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        uniqueCustomers: parseInt(stats.unique_customers),
        uniqueVehicles: parseInt(stats.unique_vehicles)
      },
      customerActivity: {
        customersWithActivity: parseInt(activity.customers_with_activity),
        veryRecentActivity: parseInt(activity.very_recent_activity), // Last 6 months
        recentActivity: parseInt(activity.recent_activity), // 6 months - 1 year
        moderateActivity: parseInt(activity.moderate_activity) // 1-2 years
      },
      recentActivity: recentActivity.slice(0, 20),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[PROCESS-DOCUMENTS-SIMPLE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
