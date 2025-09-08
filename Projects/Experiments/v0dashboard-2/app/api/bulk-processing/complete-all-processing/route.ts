import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { 
      phase = 'status', // 'status', 'documents', 'line-items', 'extras', 'verification'
      maxConcurrency = 30,
      batchSize = 1000
    } = await request.json()
    
    console.log(`[COMPLETE-ALL] 🚀 Starting complete processing phase: ${phase}`)

    if (phase === 'status') {
      return await getCompletionStatus()
    }

    if (phase === 'documents') {
      return await completeDocumentProcessing(maxConcurrency, batchSize)
    }

    if (phase === 'line-items') {
      return await completeLineItemProcessing()
    }

    if (phase === 'extras') {
      return await completeDocumentExtrasProcessing()
    }

    if (phase === 'verification') {
      return await verifyAllProcessingComplete()
    }

    return NextResponse.json({
      success: false,
      error: "Invalid phase",
      valid_phases: ['status', 'documents', 'line-items', 'extras', 'verification']
    }, { status: 400 })

  } catch (error) {
    console.error("[COMPLETE-ALL] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to complete processing",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function getCompletionStatus() {
  console.log("[COMPLETE-ALL] 📊 Getting comprehensive completion status...")

  // Get current counts
  const [documents, lineItems, documentExtras, customers, vehicles] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM documents`,
    sql`SELECT COUNT(*) as count FROM document_line_items`,
    sql`SELECT COUNT(*) as count FROM document_extras`,
    sql`SELECT COUNT(*) as count FROM customers`,
    sql`SELECT COUNT(*) as count FROM vehicles`
  ])

  // Check document completeness
  const documentAnalysis = await Promise.all([
    // Documents with missing line items
    sql`
      SELECT COUNT(*) as count FROM documents d
      WHERE NOT EXISTS (
        SELECT 1 FROM document_line_items dli 
        WHERE dli.document_id = d.id::text
      )
    `,
    // Documents with missing extras
    sql`
      SELECT COUNT(*) as count FROM documents d
      WHERE NOT EXISTS (
        SELECT 1 FROM document_extras de 
        WHERE de.document_id = d.id
      )
    `,
    // Documents with missing customer links
    sql`
      SELECT COUNT(*) as count FROM documents d
      WHERE d._id_customer NOT IN (
        SELECT id FROM customers
      )
    `,
    // Orphaned line items
    sql`
      SELECT COUNT(*) as count FROM document_line_items dli
      WHERE dli.document_id NOT IN (
        SELECT id::text FROM documents
      )
    `
  ])

  // Get processing targets from CSV files
  const csvTargets = {
    total_documents: 32890, // From Documents.csv
    total_line_items: 50000, // Estimated from LineItems.csv
    total_document_extras: 15000 // Estimated from Document_Extras.csv
  }

  const currentCounts = {
    documents: parseInt(documents[0].count),
    line_items: parseInt(lineItems[0].count),
    document_extras: parseInt(documentExtras[0].count),
    customers: parseInt(customers[0].count),
    vehicles: parseInt(vehicles[0].count)
  }

  const completionPercentages = {
    documents: Math.round((currentCounts.documents / csvTargets.total_documents) * 100),
    line_items: Math.round((currentCounts.line_items / csvTargets.total_line_items) * 100),
    document_extras: Math.round((currentCounts.document_extras / csvTargets.total_document_extras) * 100)
  }

  const dataIntegrityIssues = {
    documents_missing_line_items: parseInt(documentAnalysis[0][0].count),
    documents_missing_extras: parseInt(documentAnalysis[1][0].count),
    documents_missing_customers: parseInt(documentAnalysis[2][0].count),
    orphaned_line_items: parseInt(documentAnalysis[3][0].count)
  }

  return NextResponse.json({
    success: true,
    completion_status: {
      current_counts: currentCounts,
      csv_targets: csvTargets,
      completion_percentages: completionPercentages,
      remaining_work: {
        documents: csvTargets.total_documents - currentCounts.documents,
        line_items: csvTargets.total_line_items - currentCounts.line_items,
        document_extras: csvTargets.total_document_extras - currentCounts.document_extras
      },
      data_integrity_issues: dataIntegrityIssues,
      overall_completion: Math.round(
        (completionPercentages.documents + completionPercentages.line_items + completionPercentages.document_extras) / 3
      ),
      next_steps: [
        currentCounts.documents < csvTargets.total_documents ? 'Complete document import' : null,
        dataIntegrityIssues.documents_missing_line_items > 0 ? 'Import missing line items' : null,
        dataIntegrityIssues.documents_missing_extras > 0 ? 'Import missing document extras' : null,
        dataIntegrityIssues.orphaned_line_items > 0 ? 'Clean up orphaned data' : null
      ].filter(Boolean)
    },
    timestamp: new Date().toISOString()
  })
}

async function completeDocumentProcessing(maxConcurrency: number, batchSize: number) {
  console.log("[COMPLETE-ALL] 📄 Starting complete document processing...")

  const startTime = Date.now()
  
  // Get current document count
  const currentDocs = await sql`SELECT COUNT(*) as count FROM documents`
  const currentCount = parseInt(currentDocs[0].count)
  const target = 32890
  const remaining = target - currentCount

  console.log(`[COMPLETE-ALL] Current: ${currentCount}, Target: ${target}, Remaining: ${remaining}`)

  if (remaining <= 0) {
    return NextResponse.json({
      success: true,
      message: "All documents already processed",
      current_count: currentCount,
      target_count: target
    })
  }

  // Launch massive parallel processing to complete all remaining documents
  const results = {
    batches_launched: 0,
    estimated_completion_time: Math.ceil(remaining / (batchSize * maxConcurrency / 60)), // minutes
    processing_started: new Date().toISOString()
  }

  // Calculate optimal batch distribution
  const totalBatches = Math.ceil(remaining / batchSize)
  const batchesPerConcurrency = Math.ceil(totalBatches / maxConcurrency)

  console.log(`[COMPLETE-ALL] Launching ${totalBatches} batches across ${maxConcurrency} concurrent processes`)

  // Launch concurrent processing (fire and forget for speed)
  const promises = []
  let currentOffset = currentCount

  for (let i = 0; i < maxConcurrency && currentOffset < target; i++) {
    const batchPromise = launchDocumentBatch(currentOffset, batchSize, i)
    promises.push(batchPromise)
    currentOffset += batchSize
    results.batches_launched++
  }

  // Don't wait for completion - return immediately to avoid timeout
  return NextResponse.json({
    success: true,
    massive_processing_launched: {
      batches_launched: results.batches_launched,
      concurrent_processes: maxConcurrency,
      batch_size: batchSize,
      estimated_completion_minutes: results.estimated_completion_time,
      processing_started: results.processing_started,
      target_documents: target,
      remaining_documents: remaining
    },
    monitoring: {
      check_progress_url: "/api/bulk-processing/live-dashboard",
      estimated_completion: new Date(Date.now() + results.estimated_completion_time * 60000).toISOString()
    },
    timestamp: new Date().toISOString()
  })
}

async function launchDocumentBatch(offset: number, batchSize: number, batchId: number) {
  try {
    console.log(`[COMPLETE-ALL] Launching batch ${batchId} at offset ${offset}`)
    
    // Use fetch to launch the existing document processing API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bulk-processing/documents-simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchSize,
        offset,
        testMode: false
      })
    })

    if (!response.ok) {
      console.error(`[COMPLETE-ALL] Batch ${batchId} failed: ${response.statusText}`)
    }

    return { batchId, success: response.ok }
  } catch (error) {
    console.error(`[COMPLETE-ALL] Batch ${batchId} error:`, error)
    return { batchId, success: false, error: error.message }
  }
}

async function completeLineItemProcessing() {
  console.log("[COMPLETE-ALL] 📋 Processing line items...")

  // Check for documents missing line items
  const documentsNeedingLineItems = await sql`
    SELECT d.id, d.doc_number, d._id
    FROM documents d
    WHERE NOT EXISTS (
      SELECT 1 FROM document_line_items dli 
      WHERE dli.document_id = d.id::text
    )
    LIMIT 1000
  `

  console.log(`[COMPLETE-ALL] Found ${documentsNeedingLineItems.length} documents needing line items`)

  // Process line items from CSV for these documents
  // This would involve reading LineItems.csv and matching by document ID
  
  return NextResponse.json({
    success: true,
    line_item_processing: {
      documents_needing_line_items: documentsNeedingLineItems.length,
      processing_status: "Line item processing would be implemented here",
      next_step: "Read LineItems.csv and match to documents"
    }
  })
}

async function completeDocumentExtrasProcessing() {
  console.log("[COMPLETE-ALL] 📝 Processing document extras...")

  const documentsNeedingExtras = await sql`
    SELECT d.id, d.doc_number, d._id
    FROM documents d
    WHERE NOT EXISTS (
      SELECT 1 FROM document_extras de 
      WHERE de.document_id = d.id
    )
    LIMIT 1000
  `

  console.log(`[COMPLETE-ALL] Found ${documentsNeedingExtras.length} documents needing extras`)

  return NextResponse.json({
    success: true,
    document_extras_processing: {
      documents_needing_extras: documentsNeedingExtras.length,
      processing_status: "Document extras processing would be implemented here",
      next_step: "Read Document_Extras.csv and match to documents"
    }
  })
}

async function verifyAllProcessingComplete() {
  console.log("[COMPLETE-ALL] ✅ Verifying all processing is complete...")

  const verification = await getCompletionStatus()
  
  return verification
}
