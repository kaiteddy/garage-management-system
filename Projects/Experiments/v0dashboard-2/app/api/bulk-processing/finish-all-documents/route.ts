import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { action = 'status' } = await request.json()
    
    console.log(`[FINISH-ALL-DOCS] 🚀 Action: ${action}`)

    if (action === 'status') {
      return await getCurrentStatus()
    }

    if (action === 'complete') {
      return await launchMassiveCompletion()
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action. Use 'status' or 'complete'"
    }, { status: 400 })

  } catch (error) {
    console.error("[FINISH-ALL-DOCS] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function getCurrentStatus() {
  console.log("[FINISH-ALL-DOCS] 📊 Getting current processing status...")

  // Get current counts
  const [documents, lineItems, documentExtras] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM documents`,
    sql`SELECT COUNT(*) as count FROM document_line_items`,
    sql`SELECT COUNT(*) as count FROM document_extras`
  ])

  const currentCounts = {
    documents: parseInt(documents[0].count),
    line_items: parseInt(lineItems[0].count),
    document_extras: parseInt(documentExtras[0].count)
  }

  // CSV targets
  const targets = {
    documents: 32890,
    line_items: 50000, // Estimated
    document_extras: 15000 // Estimated
  }

  const remaining = {
    documents: Math.max(0, targets.documents - currentCounts.documents),
    line_items: Math.max(0, targets.line_items - currentCounts.line_items),
    document_extras: Math.max(0, targets.document_extras - currentCounts.document_extras)
  }

  const completion = {
    documents: Math.round((currentCounts.documents / targets.documents) * 100),
    line_items: Math.round((currentCounts.line_items / targets.line_items) * 100),
    document_extras: Math.round((currentCounts.document_extras / targets.document_extras) * 100)
  }

  // Check data integrity
  const integrityChecks = await Promise.all([
    // Documents missing line items
    sql`
      SELECT COUNT(*) as count FROM documents d
      WHERE d.id NOT IN (
        SELECT DISTINCT CAST(document_id AS INTEGER) 
        FROM document_line_items 
        WHERE document_id ~ '^[0-9]+$'
      )
    `,
    // Recent processing activity
    sql`
      SELECT COUNT(*) as count FROM documents 
      WHERE created_at > NOW() - INTERVAL '10 minutes'
    `
  ])

  const issues = {
    documents_missing_line_items: parseInt(integrityChecks[0][0].count),
    recent_activity: parseInt(integrityChecks[1][0].count)
  }

  return NextResponse.json({
    success: true,
    processing_status: {
      current_counts: currentCounts,
      targets: targets,
      remaining: remaining,
      completion_percentages: completion,
      overall_completion: Math.round((completion.documents + completion.line_items + completion.document_extras) / 3),
      data_integrity: issues,
      is_processing_active: issues.recent_activity > 0,
      estimated_time_remaining: Math.ceil(remaining.documents / 500) // 500 docs per minute estimate
    },
    recommendations: [
      remaining.documents > 1000 ? `Complete ${remaining.documents.toLocaleString()} remaining documents` : null,
      issues.documents_missing_line_items > 100 ? `Fix ${issues.documents_missing_line_items} documents missing line items` : null,
      remaining.document_extras > 1000 ? `Import ${remaining.document_extras.toLocaleString()} document extras` : null
    ].filter(Boolean),
    timestamp: new Date().toISOString()
  })
}

async function launchMassiveCompletion() {
  console.log("[FINISH-ALL-DOCS] 🚀 Launching massive completion process...")

  const startTime = Date.now()

  // Get current status
  const currentDocs = await sql`SELECT COUNT(*) as count FROM documents`
  const currentCount = parseInt(currentDocs[0].count)
  const target = 32890
  const remaining = Math.max(0, target - currentCount)

  console.log(`[FINISH-ALL-DOCS] Current: ${currentCount}, Target: ${target}, Remaining: ${remaining}`)

  if (remaining === 0) {
    return NextResponse.json({
      success: true,
      message: "All documents already processed!",
      current_count: currentCount,
      target_count: target,
      completion_percentage: 100
    })
  }

  // Launch multiple concurrent batches to finish processing
  const batchSize = 2000
  const maxConcurrentBatches = 20
  const totalBatches = Math.ceil(remaining / batchSize)
  const batchesToLaunch = Math.min(totalBatches, maxConcurrentBatches)

  console.log(`[FINISH-ALL-DOCS] Launching ${batchesToLaunch} concurrent batches of ${batchSize} documents each`)

  const results = {
    batches_launched: 0,
    processing_started: new Date().toISOString(),
    estimated_completion_minutes: Math.ceil(remaining / (batchSize * batchesToLaunch / 5)) // 5 minutes per batch estimate
  }

  // Launch batches (don't wait for completion to avoid timeout)
  let currentOffset = currentCount
  
  for (let i = 0; i < batchesToLaunch && currentOffset < target; i++) {
    // Fire and forget - launch batch processing
    launchBatch(currentOffset, batchSize, i).catch(error => {
      console.error(`[FINISH-ALL-DOCS] Batch ${i} failed:`, error)
    })
    
    currentOffset += batchSize
    results.batches_launched++
    
    // Small delay between launches to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return NextResponse.json({
    success: true,
    massive_completion_launched: {
      batches_launched: results.batches_launched,
      batch_size: batchSize,
      total_documents_targeted: batchSize * results.batches_launched,
      remaining_documents: remaining,
      estimated_completion_minutes: results.estimated_completion_minutes,
      processing_started: results.processing_started
    },
    monitoring: {
      check_progress: "Call this API with action='status' to monitor progress",
      live_dashboard: "/api/bulk-processing/live-dashboard",
      estimated_completion_time: new Date(Date.now() + results.estimated_completion_minutes * 60000).toISOString()
    },
    next_steps: [
      "Monitor progress using the live dashboard",
      "Check status in 5-10 minutes",
      "Verify completion when processing finishes"
    ],
    timestamp: new Date().toISOString()
  })
}

async function launchBatch(offset: number, batchSize: number, batchId: number) {
  try {
    console.log(`[FINISH-ALL-DOCS] Launching batch ${batchId}: offset ${offset}, size ${batchSize}`)
    
    const response = await fetch(`http://localhost:3000/api/bulk-processing/documents-simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchSize,
        offset,
        testMode: false
      })
    })

    const result = await response.json()
    console.log(`[FINISH-ALL-DOCS] Batch ${batchId} result:`, result.success ? 'SUCCESS' : 'FAILED')
    
    return result
  } catch (error) {
    console.error(`[FINISH-ALL-DOCS] Batch ${batchId} error:`, error)
    throw error
  }
}
