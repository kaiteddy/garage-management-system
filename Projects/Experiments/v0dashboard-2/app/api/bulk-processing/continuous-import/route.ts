import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { 
      maxDocumentBatches = 100,
      maxDvlaBatches = 50,
      documentBatchSize = 250,
      dvlaBatchSize = 20,
      runConcurrently = true
    } = await request.json()
    
    console.log(`[CONTINUOUS-IMPORT] Starting continuous bulk processing...`)
    console.log(`[CONTINUOUS-IMPORT] Document batches: ${maxDocumentBatches}, DVLA batches: ${maxDvlaBatches}`)

    const startTime = Date.now()
    const results = {
      document_processing: {
        batches_completed: 0,
        total_imported: 0,
        total_failed: 0,
        processing_time_ms: 0
      },
      dvla_processing: {
        batches_completed: 0,
        total_updated: 0,
        total_failed: 0,
        processing_time_ms: 0
      },
      overall_stats: {
        start_time: new Date().toISOString(),
        total_processing_time_ms: 0
      }
    }

    if (runConcurrently) {
      // Run document and DVLA processing concurrently
      const [docResults, dvlaResults] = await Promise.all([
        processDocumentsContinuously(maxDocumentBatches, documentBatchSize),
        processDvlaContinuously(maxDvlaBatches, dvlaBatchSize)
      ])
      
      results.document_processing = docResults
      results.dvla_processing = dvlaResults
    } else {
      // Run sequentially - documents first, then DVLA
      results.document_processing = await processDocumentsContinuously(maxDocumentBatches, documentBatchSize)
      results.dvla_processing = await processDvlaContinuously(maxDvlaBatches, dvlaBatchSize)
    }

    results.overall_stats.total_processing_time_ms = Date.now() - startTime

    // Get final status
    const finalStatus = await getFinalProcessingStatus()

    return NextResponse.json({
      success: true,
      continuous_processing_results: results,
      final_database_status: finalStatus,
      performance_summary: {
        total_time_minutes: Math.round(results.overall_stats.total_processing_time_ms / 60000),
        documents_per_minute: Math.round(results.document_processing.total_imported / (results.overall_stats.total_processing_time_ms / 60000)),
        vehicles_per_minute: Math.round(results.dvla_processing.total_updated / (results.overall_stats.total_processing_time_ms / 60000)),
        overall_efficiency: results.document_processing.total_imported + results.dvla_processing.total_updated > 5000 ? 'EXCELLENT' : 'GOOD'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CONTINUOUS-IMPORT] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to execute continuous import",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function processDocumentsContinuously(maxBatches: number, batchSize: number) {
  console.log(`[CONTINUOUS-IMPORT] Starting continuous document processing...`)
  
  const startTime = Date.now()
  const results = {
    batches_completed: 0,
    total_imported: 0,
    total_failed: 0,
    processing_time_ms: 0,
    batch_details: []
  }

  let offset = 4000 // Start from where we left off
  
  for (let batchNum = 1; batchNum <= maxBatches; batchNum++) {
    try {
      console.log(`[CONTINUOUS-IMPORT] Document batch ${batchNum}/${maxBatches}, offset: ${offset}`)
      
      const response = await fetch(`http://localhost:3000/api/bulk-processing/documents-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize,
          offset,
          testMode: false
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const batchResult = await response.json()
      
      if (!batchResult.success) {
        throw new Error(batchResult.error || 'Unknown batch error')
      }
      
      results.total_imported += batchResult.batch_results.documents_imported
      results.total_failed += batchResult.batch_results.failed
      results.batches_completed++
      
      results.batch_details.push({
        batch: batchNum,
        offset,
        imported: batchResult.batch_results.documents_imported,
        failed: batchResult.batch_results.failed,
        time: Date.now() - startTime
      })
      
      offset += batchSize
      
      // Check if we've processed all available documents
      if (batchResult.next_batch.estimated_remaining <= 0) {
        console.log(`[CONTINUOUS-IMPORT] All documents processed at batch ${batchNum}`)
        break
      }
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`[CONTINUOUS-IMPORT] Document batch ${batchNum} failed:`, error)
      results.batch_details.push({
        batch: batchNum,
        offset,
        error: error instanceof Error ? error.message : 'Unknown error',
        time: Date.now() - startTime
      })
      offset += batchSize
    }
  }
  
  results.processing_time_ms = Date.now() - startTime
  return results
}

async function processDvlaContinuously(maxBatches: number, batchSize: number) {
  console.log(`[CONTINUOUS-IMPORT] Starting continuous DVLA processing...`)
  
  const startTime = Date.now()
  const results = {
    batches_completed: 0,
    total_updated: 0,
    total_failed: 0,
    processing_time_ms: 0,
    batch_details: []
  }

  let offset = 500 // Start from where we left off
  
  for (let batchNum = 1; batchNum <= maxBatches; batchNum++) {
    try {
      console.log(`[CONTINUOUS-IMPORT] DVLA batch ${batchNum}/${maxBatches}, offset: ${offset}`)
      
      const response = await fetch(`http://localhost:3000/api/bulk-processing/dvla-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize,
          offset,
          testMode: false
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const batchResult = await response.json()
      
      if (!batchResult.success) {
        throw new Error(batchResult.error || 'Unknown batch error')
      }
      
      results.total_updated += batchResult.batch_results.updated
      results.total_failed += batchResult.batch_results.failed
      results.batches_completed++
      
      results.batch_details.push({
        batch: batchNum,
        offset,
        updated: batchResult.batch_results.updated,
        failed: batchResult.batch_results.failed,
        remaining: batchResult.batch_info.remaining_vehicles,
        time: Date.now() - startTime
      })
      
      offset += batchSize
      
      // Check if we've processed all vehicles needing updates
      if (batchResult.batch_info.remaining_vehicles <= 100) {
        console.log(`[CONTINUOUS-IMPORT] Most vehicles processed at batch ${batchNum}`)
        break
      }
      
      // Longer delay for DVLA API rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.error(`[CONTINUOUS-IMPORT] DVLA batch ${batchNum} failed:`, error)
      results.batch_details.push({
        batch: batchNum,
        offset,
        error: error instanceof Error ? error.message : 'Unknown error',
        time: Date.now() - startTime
      })
      offset += batchSize
    }
  }
  
  results.processing_time_ms = Date.now() - startTime
  return results
}

async function getFinalProcessingStatus() {
  const totalCustomers = await sql`SELECT COUNT(*) as count FROM customers`
  const totalVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`
  const totalDocuments = await sql`SELECT COUNT(*) as count FROM documents`
  const totalMotHistory = await sql`SELECT COUNT(*) as count FROM mot_history`
  
  const vehiclesMissingData = await sql`
    SELECT COUNT(*) as count FROM vehicles 
    WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
  `
  
  const customersWithDocuments = await sql`
    SELECT COUNT(DISTINCT _id_customer) as count FROM documents
  `
  
  const vehiclesWithMotHistory = await sql`
    SELECT COUNT(DISTINCT vehicle_registration) as count FROM mot_history
  `

  return {
    totals: {
      customers: parseInt(totalCustomers[0].count),
      vehicles: parseInt(totalVehicles[0].count),
      documents: parseInt(totalDocuments[0].count),
      mot_history: parseInt(totalMotHistory[0].count)
    },
    completion_percentages: {
      customers_with_documents: Math.round((parseInt(customersWithDocuments[0].count) / parseInt(totalCustomers[0].count)) * 100),
      vehicles_with_complete_data: Math.round((1 - parseInt(vehiclesMissingData[0].count) / parseInt(totalVehicles[0].count)) * 100),
      vehicles_with_mot_history: Math.round((parseInt(vehiclesWithMotHistory[0].count) / parseInt(totalVehicles[0].count)) * 100)
    },
    remaining_work: {
      vehicles_missing_data: parseInt(vehiclesMissingData[0].count),
      customers_without_documents: parseInt(totalCustomers[0].count) - parseInt(customersWithDocuments[0].count)
    }
  }
}
