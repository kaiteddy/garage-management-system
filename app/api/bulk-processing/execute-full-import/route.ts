import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { 
      phase = 'documents', // 'documents', 'dvla', 'verification'
      batchSize = 100,
      maxBatches = 50, // Limit for safety
      testMode = false
    } = await request.json()
    
    console.log(`[FULL-IMPORT] Starting phase: ${phase}, batchSize: ${batchSize}, maxBatches: ${maxBatches}, testMode: ${testMode}`)

    if (phase === 'documents') {
      return await executeDocumentImport(batchSize, maxBatches, testMode)
    }
    
    if (phase === 'dvla') {
      return await executeDvlaUpdates(batchSize, maxBatches, testMode)
    }
    
    if (phase === 'verification') {
      return await executeVerification()
    }

    return NextResponse.json({
      success: false,
      error: "Invalid phase",
      valid_phases: ['documents', 'dvla', 'verification']
    }, { status: 400 })

  } catch (error) {
    console.error("[FULL-IMPORT] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to execute full import",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function executeDocumentImport(batchSize: number, maxBatches: number, testMode: boolean) {
  console.log(`[FULL-IMPORT] Starting document import phase`)
  
  const startTime = Date.now()
  const results = {
    phase: 'documents',
    batches_processed: 0,
    total_documents_imported: 0,
    total_failed: 0,
    batch_details: [],
    processing_time_ms: 0
  }

  let offset = 0
  let batchCount = 0
  
  while (batchCount < maxBatches) {
    try {
      console.log(`[FULL-IMPORT] Processing document batch ${batchCount + 1}, offset: ${offset}`)
      
      // Call the document import API
      const batchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bulk-processing/documents-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize,
          offset,
          testMode: false // Always run in production mode for full import
        })
      })
      
      if (!batchResponse.ok) {
        throw new Error(`Batch ${batchCount + 1} failed: ${batchResponse.statusText}`)
      }
      
      const batchResult = await batchResponse.json()
      
      if (!batchResult.success) {
        throw new Error(`Batch ${batchCount + 1} failed: ${batchResult.error}`)
      }
      
      // Update results
      results.total_documents_imported += batchResult.batch_results.documents_imported
      results.total_failed += batchResult.batch_results.failed
      results.batch_details.push({
        batch_number: batchCount + 1,
        offset,
        documents_imported: batchResult.batch_results.documents_imported,
        failed: batchResult.batch_results.failed,
        processing_time: Date.now() - startTime
      })
      
      batchCount++
      offset += batchSize
      
      // Check if we've processed all documents
      if (batchResult.next_batch.estimated_remaining <= 0) {
        console.log(`[FULL-IMPORT] All documents processed`)
        break
      }
      
      // In test mode, limit to 3 batches
      if (testMode && batchCount >= 3) {
        console.log(`[FULL-IMPORT] Test mode - stopping after 3 batches`)
        break
      }
      
      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`[FULL-IMPORT] Batch ${batchCount + 1} error:`, error)
      results.batch_details.push({
        batch_number: batchCount + 1,
        offset,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: Date.now() - startTime
      })
      batchCount++
      offset += batchSize
    }
  }
  
  results.batches_processed = batchCount
  results.processing_time_ms = Date.now() - startTime
  
  // Get final document count
  const finalCount = await sql`SELECT COUNT(*) as count FROM documents`
  
  return NextResponse.json({
    success: true,
    phase_results: results,
    final_status: {
      total_documents_in_database: parseInt(finalCount[0].count),
      estimated_documents_remaining: Math.max(0, 32890 - results.total_documents_imported),
      processing_time_minutes: Math.round(results.processing_time_ms / 60000),
      average_documents_per_minute: Math.round(results.total_documents_imported / (results.processing_time_ms / 60000))
    },
    next_steps: results.total_documents_imported > 1000 ? 
      "Document import successful - ready for DVLA phase" : 
      "Continue document import or investigate issues",
    timestamp: new Date().toISOString()
  })
}

async function executeDvlaUpdates(batchSize: number, maxBatches: number, testMode: boolean) {
  console.log(`[FULL-IMPORT] Starting DVLA update phase`)
  
  const startTime = Date.now()
  const results = {
    phase: 'dvla',
    batches_processed: 0,
    total_vehicles_updated: 0,
    total_failed: 0,
    batch_details: [],
    processing_time_ms: 0
  }

  let offset = 0
  let batchCount = 0
  
  while (batchCount < maxBatches) {
    try {
      console.log(`[FULL-IMPORT] Processing DVLA batch ${batchCount + 1}, offset: ${offset}`)
      
      // Call the DVLA batch API
      const batchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bulk-processing/dvla-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize: Math.min(batchSize, 25), // Smaller batches for DVLA to respect rate limits
          offset,
          testMode: false
        })
      })
      
      if (!batchResponse.ok) {
        throw new Error(`DVLA batch ${batchCount + 1} failed: ${batchResponse.statusText}`)
      }
      
      const batchResult = await batchResponse.json()
      
      if (!batchResult.success) {
        throw new Error(`DVLA batch ${batchCount + 1} failed: ${batchResult.error}`)
      }
      
      // Update results
      results.total_vehicles_updated += batchResult.batch_results.updated
      results.total_failed += batchResult.batch_results.failed
      results.batch_details.push({
        batch_number: batchCount + 1,
        offset,
        vehicles_updated: batchResult.batch_results.updated,
        failed: batchResult.batch_results.failed,
        remaining: batchResult.batch_info.remaining_vehicles,
        processing_time: Date.now() - startTime
      })
      
      batchCount++
      offset += Math.min(batchSize, 25)
      
      // Check if we've processed all vehicles
      if (batchResult.batch_info.remaining_vehicles <= 0) {
        console.log(`[FULL-IMPORT] All vehicles processed`)
        break
      }
      
      // In test mode, limit to 5 batches
      if (testMode && batchCount >= 5) {
        console.log(`[FULL-IMPORT] Test mode - stopping after 5 batches`)
        break
      }
      
      // Longer delay for DVLA API rate limiting (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.error(`[FULL-IMPORT] DVLA batch ${batchCount + 1} error:`, error)
      results.batch_details.push({
        batch_number: batchCount + 1,
        offset,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: Date.now() - startTime
      })
      batchCount++
      offset += Math.min(batchSize, 25)
    }
  }
  
  results.batches_processed = batchCount
  results.processing_time_ms = Date.now() - startTime
  
  // Get final vehicle completion status
  const vehiclesMissingData = await sql`
    SELECT COUNT(*) as count FROM vehicles 
    WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
  `
  
  return NextResponse.json({
    success: true,
    phase_results: results,
    final_status: {
      vehicles_still_missing_data: parseInt(vehiclesMissingData[0].count),
      vehicles_updated_this_session: results.total_vehicles_updated,
      processing_time_minutes: Math.round(results.processing_time_ms / 60000),
      average_vehicles_per_minute: Math.round(results.total_vehicles_updated / (results.processing_time_ms / 60000))
    },
    next_steps: parseInt(vehiclesMissingData[0].count) < 1000 ? 
      "DVLA updates successful - ready for verification phase" : 
      "Continue DVLA updates or investigate API issues",
    timestamp: new Date().toISOString()
  })
}

async function executeVerification() {
  console.log(`[FULL-IMPORT] Starting verification phase`)
  
  // Get comprehensive status
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
  
  // Sample verification - check a few customers
  const sampleCustomers = await sql`
    SELECT 
      c.id,
      c.first_name,
      c.last_name,
      COUNT(DISTINCT v.registration) as vehicle_count,
      COUNT(DISTINCT d.id) as document_count
    FROM customers c
    LEFT JOIN vehicles v ON c.id = v.owner_id
    LEFT JOIN documents d ON c.id = d._id_customer
    GROUP BY c.id, c.first_name, c.last_name
    ORDER BY document_count DESC
    LIMIT 10
  `
  
  const completionPercentages = {
    customers_with_documents: Math.round((parseInt(customersWithDocuments[0].count) / parseInt(totalCustomers[0].count)) * 100),
    vehicles_with_complete_data: Math.round((1 - parseInt(vehiclesMissingData[0].count) / parseInt(totalVehicles[0].count)) * 100),
    vehicles_with_mot_history: Math.round((parseInt(vehiclesWithMotHistory[0].count) / parseInt(totalVehicles[0].count)) * 100)
  }
  
  return NextResponse.json({
    success: true,
    verification_results: {
      database_scale: {
        total_customers: parseInt(totalCustomers[0].count),
        total_vehicles: parseInt(totalVehicles[0].count),
        total_documents: parseInt(totalDocuments[0].count),
        total_mot_history: parseInt(totalMotHistory[0].count)
      },
      data_completeness: completionPercentages,
      remaining_issues: {
        vehicles_missing_dvla_data: parseInt(vehiclesMissingData[0].count),
        customers_without_documents: parseInt(totalCustomers[0].count) - parseInt(customersWithDocuments[0].count),
        vehicles_without_mot_history: parseInt(totalVehicles[0].count) - parseInt(vehiclesWithMotHistory[0].count)
      },
      sample_customers: sampleCustomers,
      overall_status: completionPercentages.customers_with_documents > 80 && 
                     completionPercentages.vehicles_with_complete_data > 80 ? 
                     'EXCELLENT' : 
                     completionPercentages.customers_with_documents > 50 ? 
                     'GOOD' : 'NEEDS_IMPROVEMENT'
    },
    timestamp: new Date().toISOString()
  })
}
