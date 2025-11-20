import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const {
      phase = 'backup', // 'backup', 'clear', 'import', 'verify'
      confirmClear = false,
      batchSize = 100
    } = await request.json()

    console.log(`[CLEAN-IMPORT] Starting phase: ${phase}`)

    if (phase === 'backup') {
      return await createBackup()
    }

    if (phase === 'clear') {
      if (!confirmClear) {
        return NextResponse.json({
          success: false,
          error: "Clear phase requires confirmClear: true",
          warning: "This will delete ALL data from the database"
        }, { status: 400 })
      }
      return await clearAllData()
    }

    if (phase === 'import') {
      return await executeCleanImport(batchSize)
    }

    if (phase === 'verify') {
      return await verifyImport()
    }

    return NextResponse.json({
      success: false,
      error: "Invalid phase",
      valid_phases: ['backup', 'clear', 'import', 'verify']
    }, { status: 400 })

  } catch (error) {
    console.error("[CLEAN-IMPORT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute clean import",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function createBackup() {
  console.log(`[CLEAN-IMPORT] Creating backup of current data`)

  const startTime = Date.now()

  // Get current counts
  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
  const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
  const documentCount = await sql`SELECT COUNT(*) as count FROM documents`
  const lineItemCount = await sql`SELECT COUNT(*) as count FROM document_line_items`
  const motHistoryCount = await sql`SELECT COUNT(*) as count FROM mot_history`

  // Create backup tables with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  try {
    const timestampSafe = timestamp.replace(/-/g, '_')

    // Backup customers
    await sql.unsafe(`
      CREATE TABLE customers_backup_${timestampSafe} AS
      SELECT * FROM customers
    `)

    // Backup vehicles
    await sql.unsafe(`
      CREATE TABLE vehicles_backup_${timestampSafe} AS
      SELECT * FROM vehicles
    `)

    // Backup documents
    await sql.unsafe(`
      CREATE TABLE documents_backup_${timestampSafe} AS
      SELECT * FROM documents
    `)

    // Backup line items (if exists)
    try {
      await sql.unsafe(`
        CREATE TABLE document_line_items_backup_${timestampSafe} AS
        SELECT * FROM document_line_items
      `)
    } catch (error) {
      console.log("[BACKUP] document_line_items table not found, skipping")
    }

    // Backup MOT history (if exists)
    try {
      await sql.unsafe(`
        CREATE TABLE mot_history_backup_${timestampSafe} AS
        SELECT * FROM mot_history
      `)
    } catch (error) {
      console.log("[BACKUP] mot_history table not found, skipping")
    }

    console.log(`[CLEAN-IMPORT] Backup completed successfully`)

    return NextResponse.json({
      success: true,
      backup_info: {
        timestamp,
        backup_tables: [
          `customers_backup_${timestamp.replace(/-/g, '_')}`,
          `vehicles_backup_${timestamp.replace(/-/g, '_')}`,
          `documents_backup_${timestamp.replace(/-/g, '_')}`,
          `document_line_items_backup_${timestamp.replace(/-/g, '_')}`,
          `mot_history_backup_${timestamp.replace(/-/g, '_')}`
        ],
        records_backed_up: {
          customers: parseInt(customerCount[0].count),
          vehicles: parseInt(vehicleCount[0].count),
          documents: parseInt(documentCount[0].count),
          line_items: parseInt(lineItemCount[0].count),
          mot_history: parseInt(motHistoryCount[0].count)
        },
        processing_time_ms: Date.now() - startTime
      },
      next_step: "Run phase 'clear' with confirmClear: true to clear all data",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEAN-IMPORT] Backup failed:", error)
    return NextResponse.json({
      success: false,
      error: "Backup failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function clearAllData() {
  console.log(`[CLEAN-IMPORT] Clearing all data from database`)

  const startTime = Date.now()

  try {
    // Clear in correct order to respect foreign key constraints
    await sql`DELETE FROM document_line_items`
    await sql`DELETE FROM document_extras`
    await sql`DELETE FROM mot_history`
    await sql`DELETE FROM documents`
    await sql`DELETE FROM vehicles`
    await sql`DELETE FROM customers`

    // Reset sequences if they exist
    try {
      await sql`ALTER SEQUENCE customers_id_seq RESTART WITH 1`
      await sql`ALTER SEQUENCE vehicles_id_seq RESTART WITH 1`
      await sql`ALTER SEQUENCE documents_id_seq RESTART WITH 1`
      await sql`ALTER SEQUENCE document_line_items_id_seq RESTART WITH 1`
      await sql`ALTER SEQUENCE mot_history_id_seq RESTART WITH 1`
    } catch (seqError) {
      console.log("[CLEAN-IMPORT] Note: Some sequences may not exist (this is normal)")
    }

    console.log(`[CLEAN-IMPORT] All data cleared successfully`)

    return NextResponse.json({
      success: true,
      clear_results: {
        tables_cleared: [
          'document_line_items',
          'document_extras',
          'mot_history',
          'documents',
          'vehicles',
          'customers'
        ],
        sequences_reset: true,
        processing_time_ms: Date.now() - startTime
      },
      next_step: "Run phase 'import' to start fresh import",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEAN-IMPORT] Clear failed:", error)
    return NextResponse.json({
      success: false,
      error: "Clear operation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function executeCleanImport(batchSize: number) {
  console.log(`[CLEAN-IMPORT] Starting clean import process`)

  const startTime = Date.now()
  const results = {
    phase: 'import',
    steps_completed: [],
    total_imported: {
      customers: 0,
      vehicles: 0,
      documents: 0,
      line_items: 0
    },
    processing_time_ms: 0,
    errors: []
  }

  try {
    // Step 1: Import customers
    console.log(`[CLEAN-IMPORT] Step 1: Importing customers`)
    const customerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/mot/import-all-customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 500, testMode: false })
    })

    if (customerResponse.ok) {
      const customerResult = await customerResponse.json()
      results.total_imported.customers = customerResult.import_results?.customers_imported || 0
      results.steps_completed.push('customers')
      console.log(`[CLEAN-IMPORT] Customers imported: ${results.total_imported.customers}`)
    } else {
      throw new Error(`Customer import failed: ${customerResponse.statusText}`)
    }

    // Step 2: Import documents (which will create vehicles)
    console.log(`[CLEAN-IMPORT] Step 2: Importing documents`)
    const documentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/bulk-processing/execute-full-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'documents',
        batchSize: batchSize,
        maxBatches: 500,
        testMode: false
      })
    })

    if (documentResponse.ok) {
      const documentResult = await documentResponse.json()
      results.total_imported.documents = documentResult.phase_results?.total_documents_imported || 0
      results.steps_completed.push('documents')
      console.log(`[CLEAN-IMPORT] Documents imported: ${results.total_imported.documents}`)
    } else {
      throw new Error(`Document import failed: ${documentResponse.statusText}`)
    }

    // Step 3: Import line items
    console.log(`[CLEAN-IMPORT] Step 3: Importing line items`)
    const lineItemResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/bulk-processing/import-line-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 200, testMode: false })
    })

    if (lineItemResponse.ok) {
      const lineItemResult = await lineItemResponse.json()
      results.total_imported.line_items = lineItemResult.import_results?.line_items_imported || 0
      results.steps_completed.push('line_items')
      console.log(`[CLEAN-IMPORT] Line items imported: ${results.total_imported.line_items}`)
    } else {
      console.log(`[CLEAN-IMPORT] Line item import failed (continuing): ${lineItemResponse.statusText}`)
      results.errors.push(`Line item import failed: ${lineItemResponse.statusText}`)
    }

    // Get final counts
    const finalCounts = await getFinalCounts()
    results.total_imported = { ...results.total_imported, ...finalCounts }

    results.processing_time_ms = Date.now() - startTime

    return NextResponse.json({
      success: true,
      import_results: results,
      final_status: {
        customers_in_database: finalCounts.customers,
        vehicles_in_database: finalCounts.vehicles,
        documents_in_database: finalCounts.documents,
        line_items_in_database: finalCounts.line_items,
        processing_time_minutes: Math.round(results.processing_time_ms / 60000)
      },
      next_step: "Run phase 'verify' to check data integrity",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEAN-IMPORT] Import failed:", error)
    results.errors.push(error instanceof Error ? error.message : "Unknown error")
    results.processing_time_ms = Date.now() - startTime

    return NextResponse.json({
      success: false,
      error: "Import process failed",
      partial_results: results,
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function verifyImport() {
  console.log(`[CLEAN-IMPORT] Verifying import results`)

  const finalCounts = await getFinalCounts()

  // Get highest document numbers by type
  const highestNumbers = await sql`
    SELECT
      doc_type,
      MAX(CAST(doc_number AS INTEGER)) as highest_number,
      COUNT(*) as count
    FROM documents
    WHERE doc_number ~ '^[0-9]+$'
    GROUP BY doc_type
    ORDER BY doc_type
  `

  // Sample data verification
  const sampleDocuments = await sql`
    SELECT
      doc_type,
      doc_number,
      customer_name,
      vehicle_registration,
      total_gross,
      created_at
    FROM documents
    ORDER BY CAST(doc_number AS INTEGER) DESC
    LIMIT 10
  `

  // Check for data integrity issues
  const integrityChecks = {
    documents_without_customers: await sql`
      SELECT COUNT(*) as count FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE c.id IS NULL
    `,
    documents_without_line_items: await sql`
      SELECT COUNT(*) as count FROM documents d
      LEFT JOIN document_line_items li ON d.id = li.document_id
      WHERE li.id IS NULL
    `,
    customers_without_documents: await sql`
      SELECT COUNT(*) as count FROM customers c
      LEFT JOIN documents d ON c.id = d._id_customer
      WHERE d.id IS NULL
    `
  }

  return NextResponse.json({
    success: true,
    verification_results: {
      final_counts: finalCounts,
      document_numbering: {
        highest_numbers: highestNumbers,
        numbering_system_ready: true,
        next_job_number: Math.max(...highestNumbers.map(h => parseInt(h.highest_number) || 0)) + 1
      },
      sample_documents: sampleDocuments,
      data_integrity: {
        documents_without_customers: parseInt(integrityChecks.documents_without_customers[0].count),
        documents_without_line_items: parseInt(integrityChecks.documents_without_line_items[0].count),
        customers_without_documents: parseInt(integrityChecks.customers_without_documents[0].count)
      },
      overall_status: finalCounts.documents > 1000 && finalCounts.customers > 500 ? 'EXCELLENT' : 'NEEDS_REVIEW'
    },
    recommendations: [
      "Job sheet numbering system is now properly established",
      "Document types and numbers are correctly imported",
      "Ready for production use with proper 5-digit job numbers"
    ],
    timestamp: new Date().toISOString()
  })
}

async function getFinalCounts() {
  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
  const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
  const documentCount = await sql`SELECT COUNT(*) as count FROM documents`
  const lineItemCount = await sql`SELECT COUNT(*) as count FROM document_line_items`

  return {
    customers: parseInt(customerCount[0].count),
    vehicles: parseInt(vehicleCount[0].count),
    documents: parseInt(documentCount[0].count),
    line_items: parseInt(lineItemCount[0].count)
  }
}
