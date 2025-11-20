import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { 
      operation = 'status', // 'status', 'start-dvla', 'start-documents', 'start-all'
      testMode = true,
      batchSize = 50
    } = await request.json()
    
    console.log(`[MASTER-CONTROL] Operation: ${operation}, testMode: ${testMode}`)

    if (operation === 'status') {
      // Get current status of all data integrity issues
      const status = await getDataIntegrityStatus()
      return NextResponse.json({
        success: true,
        operation: 'status',
        current_status: status,
        recommendations: generateRecommendations(status),
        timestamp: new Date().toISOString()
      })
    }

    if (operation === 'start-dvla') {
      // Start DVLA batch processing
      const dvlaStatus = await startDvlaBatchProcessing(testMode, batchSize)
      return NextResponse.json({
        success: true,
        operation: 'start-dvla',
        dvla_processing: dvlaStatus,
        timestamp: new Date().toISOString()
      })
    }

    if (operation === 'start-documents') {
      // Start document batch processing
      const docStatus = await startDocumentBatchProcessing(testMode, batchSize)
      return NextResponse.json({
        success: true,
        operation: 'start-documents',
        document_processing: docStatus,
        timestamp: new Date().toISOString()
      })
    }

    if (operation === 'start-all') {
      // Start comprehensive processing
      const allStatus = await startComprehensiveProcessing(testMode, batchSize)
      return NextResponse.json({
        success: true,
        operation: 'start-all',
        comprehensive_processing: allStatus,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid operation",
      valid_operations: ['status', 'start-dvla', 'start-documents', 'start-all']
    }, { status: 400 })

  } catch (error) {
    console.error("[MASTER-CONTROL] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to execute master control operation",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function getDataIntegrityStatus() {
  const totalCustomers = await sql`SELECT COUNT(*) as count FROM customers`
  const totalVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`
  const totalDocuments = await sql`SELECT COUNT(*) as count FROM documents`
  const totalMotHistory = await sql`SELECT COUNT(*) as count FROM mot_history`
  
  const vehiclesMissingData = await sql`
    SELECT COUNT(*) as count FROM vehicles 
    WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
  `
  
  const customersNoDocuments = await sql`
    SELECT COUNT(DISTINCT c.id) as count 
    FROM customers c
    LEFT JOIN documents d ON c.id = d._id_customer
    WHERE d.id IS NULL
  `
  
  const vehiclesNoMotHistory = await sql`
    SELECT COUNT(DISTINCT v.registration) as count 
    FROM vehicles v
    LEFT JOIN mot_history mh ON v.registration = mh.vehicle_registration
    WHERE mh.id IS NULL
  `

  return {
    database_scale: {
      total_customers: parseInt(totalCustomers[0].count),
      total_vehicles: parseInt(totalVehicles[0].count),
      total_documents: parseInt(totalDocuments[0].count),
      total_mot_history: parseInt(totalMotHistory[0].count)
    },
    data_integrity_issues: {
      vehicles_missing_dvla_data: parseInt(vehiclesMissingData[0].count),
      customers_with_no_documents: parseInt(customersNoDocuments[0].count),
      vehicles_with_no_mot_history: parseInt(vehiclesNoMotHistory[0].count)
    },
    completion_percentages: {
      vehicle_data_complete: Math.round((1 - parseInt(vehiclesMissingData[0].count) / parseInt(totalVehicles[0].count)) * 100),
      customers_with_documents: Math.round((1 - parseInt(customersNoDocuments[0].count) / parseInt(totalCustomers[0].count)) * 100),
      vehicles_with_mot_history: Math.round((1 - parseInt(vehiclesNoMotHistory[0].count) / parseInt(totalVehicles[0].count)) * 100)
    }
  }
}

function generateRecommendations(status) {
  const recommendations = []
  
  if (status.data_integrity_issues.vehicles_missing_dvla_data > 1000) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Start DVLA batch processing',
      reason: `${status.data_integrity_issues.vehicles_missing_dvla_data} vehicles need DVLA data updates`,
      estimated_time: `${Math.ceil(status.data_integrity_issues.vehicles_missing_dvla_data * 2 / 60)} minutes`
    })
  }
  
  if (status.data_integrity_issues.customers_with_no_documents > 1000) {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Start document batch import',
      reason: `${status.data_integrity_issues.customers_with_no_documents} customers have no service documents`,
      estimated_time: 'Variable - depends on CSV file size'
    })
  }
  
  if (status.completion_percentages.vehicle_data_complete < 50) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Prioritize vehicle data completion',
      reason: `Only ${status.completion_percentages.vehicle_data_complete}% of vehicles have complete data`
    })
  }
  
  return recommendations
}

async function startDvlaBatchProcessing(testMode, batchSize) {
  // This would trigger the DVLA batch processing
  return {
    status: 'initiated',
    test_mode: testMode,
    batch_size: batchSize,
    message: 'DVLA batch processing initiated - call /api/bulk-processing/dvla-batch to execute batches'
  }
}

async function startDocumentBatchProcessing(testMode, batchSize) {
  // This would trigger the document batch processing
  return {
    status: 'initiated',
    test_mode: testMode,
    batch_size: batchSize,
    message: 'Document batch processing initiated - call /api/bulk-processing/documents-batch to execute batches'
  }
}

async function startComprehensiveProcessing(testMode, batchSize) {
  return {
    status: 'initiated',
    test_mode: testMode,
    processing_plan: [
      '1. Document import (restore service history)',
      '2. DVLA data updates (complete vehicle information)',
      '3. MOT history creation (compliance data)',
      '4. Data verification and cleanup'
    ],
    message: 'Comprehensive processing plan created - execute each phase sequentially'
  }
}
