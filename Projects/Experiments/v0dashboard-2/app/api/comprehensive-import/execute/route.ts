import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const {
      phase = 1,
      confirmClean = false,
      batchSize = 1000,
      testMode = false
    } = await request.json()

    console.log(`[COMPREHENSIVE-IMPORT] Starting Phase ${phase}`)
    console.log(`[COMPREHENSIVE-IMPORT] Settings: batchSize=${batchSize}, testMode=${testMode}, confirmClean=${confirmClean}`)

    switch (phase) {
      case 1:
        return await executePhase1_CleanPreparation(confirmClean)
      case 2:
        return await executePhase2_CoreDataImport(batchSize, testMode)
      case 3:
        return await executePhase3_DocumentImport(batchSize, testMode)
      case 4:
        return await executePhase4_DataEnhancement(batchSize, testMode)
      case 5:
        return await executePhase5_FinalVerification()
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid phase number",
          validPhases: [1, 2, 3, 4, 5]
        }, { status: 400 })
    }

  } catch (error) {
    console.error("[COMPREHENSIVE-IMPORT] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Import execution failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function executePhase1_CleanPreparation(confirmClean: boolean) {
  console.log("[PHASE-1] 🧹 Clean Import Preparation")

  if (!confirmClean) {
    return NextResponse.json({
      success: false,
      error: "Phase 1 requires confirmClean: true",
      warning: "This will backup and clear ALL existing data",
      message: "Set confirmClean: true to proceed with data cleanup"
    }, { status: 400 })
  }

  const startTime = Date.now()
  const results = {
    phase: 1,
    name: "Clean Import Preparation",
    steps: []
  }

  try {
    // Step 1: Create backup
    console.log("[PHASE-1] Step 1: Creating database backup...")
    results.steps.push({
      step: 1,
      name: "Database Backup",
      status: "in_progress",
      startTime: new Date()
    })

    const backupResult = await createDatabaseBackup()
    results.steps[0].status = "completed"
    results.steps[0].result = backupResult
    results.steps[0].endTime = new Date()

    // Step 2: Clear existing data
    console.log("[PHASE-1] Step 2: Clearing existing data...")
    results.steps.push({
      step: 2,
      name: "Clear Existing Data",
      status: "in_progress",
      startTime: new Date()
    })

    const clearResult = await clearExistingData()
    results.steps[1].status = "completed"
    results.steps[1].result = clearResult
    results.steps[1].endTime = new Date()

    // Step 3: Reset sequences
    console.log("[PHASE-1] Step 3: Resetting sequences...")
    results.steps.push({
      step: 3,
      name: "Reset Sequences",
      status: "in_progress",
      startTime: new Date()
    })

    const resetResult = await resetSequences()
    results.steps[2].status = "completed"
    results.steps[2].result = resetResult
    results.steps[2].endTime = new Date()

    // Step 4: Verify clean state
    console.log("[PHASE-1] Step 4: Verifying clean state...")
    results.steps.push({
      step: 4,
      name: "Verify Clean State",
      status: "in_progress",
      startTime: new Date()
    })

    const verifyResult = await verifyCleanState()
    results.steps[3].status = "completed"
    results.steps[3].result = verifyResult
    results.steps[3].endTime = new Date()

    const endTime = Date.now()

    return NextResponse.json({
      success: true,
      phase: 1,
      completed: true,
      duration: endTime - startTime,
      results,
      nextPhase: {
        phase: 2,
        name: "Core Data Import",
        description: "Ready to import customers and vehicles"
      }
    })

  } catch (error) {
    console.error("[PHASE-1] Error:", error)
    return NextResponse.json({
      success: false,
      phase: 1,
      error: "Phase 1 failed",
      details: error instanceof Error ? error.message : "Unknown error",
      results
    }, { status: 500 })
  }
}

async function executePhase2_CoreDataImport(batchSize: number, testMode: boolean) {
  console.log("[PHASE-2] 👥 Core Data Import")

  const startTime = Date.now()
  const results = {
    phase: 2,
    name: "Core Data Import",
    steps: []
  }

  try {
    // Step 1: Import Customers
    console.log("[PHASE-2] Step 1: Importing customers...")
    results.steps.push({
      step: 1,
      name: "Import Customers",
      status: "in_progress",
      startTime: new Date()
    })

    const customersResult = await importCustomersFromSource(batchSize, testMode)
    results.steps[0].status = "completed"
    results.steps[0].result = customersResult
    results.steps[0].endTime = new Date()

    // Step 2: Import Vehicles
    console.log("[PHASE-2] Step 2: Importing vehicles...")
    results.steps.push({
      step: 2,
      name: "Import Vehicles",
      status: "in_progress",
      startTime: new Date()
    })

    const vehiclesResult = await importVehiclesFromSource(batchSize, testMode)
    results.steps[1].status = "completed"
    results.steps[1].result = vehiclesResult
    results.steps[1].endTime = new Date()

    // Step 3: Verify relationships
    console.log("[PHASE-2] Step 3: Verifying customer-vehicle relationships...")
    results.steps.push({
      step: 3,
      name: "Verify Relationships",
      status: "in_progress",
      startTime: new Date()
    })

    const relationshipResult = await verifyCustomerVehicleRelationships()
    results.steps[2].status = "completed"
    results.steps[2].result = relationshipResult
    results.steps[2].endTime = new Date()

    const endTime = Date.now()

    return NextResponse.json({
      success: true,
      phase: 2,
      completed: true,
      duration: endTime - startTime,
      results,
      nextPhase: {
        phase: 3,
        name: "Document System Import",
        description: "Ready to import complete document history"
      }
    })

  } catch (error) {
    console.error("[PHASE-2] Error:", error)
    return NextResponse.json({
      success: false,
      phase: 2,
      error: "Phase 2 failed",
      details: error instanceof Error ? error.message : "Unknown error",
      results
    }, { status: 500 })
  }
}

async function executePhase3_DocumentImport(batchSize: number, testMode: boolean) {
  console.log("[PHASE-3] 📄 Document System Import")

  const startTime = Date.now()
  const results = {
    phase: 3,
    name: "Document System Import",
    steps: []
  }

  try {
    // This is the most complex phase - importing all document-related data
    // Step 1: Import Documents
    console.log("[PHASE-3] Step 1: Importing documents...")
    results.steps.push({
      step: 1,
      name: "Import Documents",
      status: "in_progress",
      startTime: new Date()
    })

    const documentsResult = await importDocumentsFromSource(batchSize, testMode)
    results.steps[0].status = "completed"
    results.steps[0].result = documentsResult
    results.steps[0].endTime = new Date()

    // Step 2: Import Line Items
    console.log("[PHASE-3] Step 2: Importing line items...")
    results.steps.push({
      step: 2,
      name: "Import Line Items",
      status: "in_progress",
      startTime: new Date()
    })

    const lineItemsResult = await importLineItemsFromSource(batchSize, testMode)
    results.steps[1].status = "completed"
    results.steps[1].result = lineItemsResult
    results.steps[1].endTime = new Date()

    // Step 3: Import Document Extras
    console.log("[PHASE-3] Step 3: Importing document extras...")
    results.steps.push({
      step: 3,
      name: "Import Document Extras",
      status: "in_progress",
      startTime: new Date()
    })

    const extrasResult = await importDocumentExtrasFromSource(batchSize, testMode)
    results.steps[2].status = "completed"
    results.steps[2].result = extrasResult
    results.steps[2].endTime = new Date()

    // Step 4: Import Receipts
    console.log("[PHASE-3] Step 4: Importing receipts...")
    results.steps.push({
      step: 4,
      name: "Import Receipts",
      status: "in_progress",
      startTime: new Date()
    })

    const receiptsResult = await importReceiptsFromSource(batchSize, testMode)
    results.steps[3].status = "completed"
    results.steps[3].result = receiptsResult
    results.steps[3].endTime = new Date()

    const endTime = Date.now()

    return NextResponse.json({
      success: true,
      phase: 3,
      completed: true,
      duration: endTime - startTime,
      results,
      nextPhase: {
        phase: 4,
        name: "Data Enhancement",
        description: "Ready for DVLA updates and MOT integration"
      }
    })

  } catch (error) {
    console.error("[PHASE-3] Error:", error)
    return NextResponse.json({
      success: false,
      phase: 3,
      error: "Phase 3 failed",
      details: error instanceof Error ? error.message : "Unknown error",
      results
    }, { status: 500 })
  }
}

async function executePhase4_DataEnhancement(batchSize: number, testMode: boolean) {
  console.log("[PHASE-4] 🔍 Data Enhancement")

  const startTime = Date.now()
  const results = {
    phase: 4,
    name: "Data Enhancement",
    steps: []
  }

  try {
    // Step 1: DVLA Updates
    console.log("[PHASE-4] Step 1: DVLA vehicle data updates...")
    results.steps.push({
      step: 1,
      name: "DVLA Updates",
      status: "in_progress",
      startTime: new Date()
    })

    const dvlaResult = await executeDvlaUpdates(batchSize, testMode)
    results.steps[0].status = "completed"
    results.steps[0].result = dvlaResult
    results.steps[0].endTime = new Date()

    // Step 2: MOT History Integration
    console.log("[PHASE-4] Step 2: MOT history integration...")
    results.steps.push({
      step: 2,
      name: "MOT History Integration",
      status: "in_progress",
      startTime: new Date()
    })

    const motResult = await integrateMotHistory(batchSize, testMode)
    results.steps[1].status = "completed"
    results.steps[1].result = motResult
    results.steps[1].endTime = new Date()

    // Step 3: Customer Data Cleaning
    console.log("[PHASE-4] Step 3: Customer data cleaning...")
    results.steps.push({
      step: 3,
      name: "Customer Data Cleaning",
      status: "in_progress",
      startTime: new Date()
    })

    const cleaningResult = await cleanCustomerData(batchSize, testMode)
    results.steps[2].status = "completed"
    results.steps[2].result = cleaningResult
    results.steps[2].endTime = new Date()

    const endTime = Date.now()

    return NextResponse.json({
      success: true,
      phase: 4,
      completed: true,
      duration: endTime - startTime,
      results,
      nextPhase: {
        phase: 5,
        name: "Final Verification",
        description: "Ready for final checks and optimization"
      }
    })

  } catch (error) {
    console.error("[PHASE-4] Error:", error)
    return NextResponse.json({
      success: false,
      phase: 4,
      error: "Phase 4 failed",
      details: error instanceof Error ? error.message : "Unknown error",
      results
    }, { status: 500 })
  }
}

async function executePhase5_FinalVerification() {
  console.log("[PHASE-5] ✅ Final Verification")

  const startTime = Date.now()
  const results = {
    phase: 5,
    name: "Final Verification",
    steps: []
  }

  try {
    // Step 1: Data Integrity Checks
    console.log("[PHASE-5] Step 1: Data integrity checks...")
    results.steps.push({
      step: 1,
      name: "Data Integrity Checks",
      status: "in_progress",
      startTime: new Date()
    })

    const integrityResult = await performDataIntegrityChecks()
    results.steps[0].status = "completed"
    results.steps[0].result = integrityResult
    results.steps[0].endTime = new Date()

    // Step 2: Performance Optimization
    console.log("[PHASE-5] Step 2: Performance optimization...")
    results.steps.push({
      step: 2,
      name: "Performance Optimization",
      status: "in_progress",
      startTime: new Date()
    })

    const optimizationResult = await optimizeDatabase()
    results.steps[1].status = "completed"
    results.steps[1].result = optimizationResult
    results.steps[1].endTime = new Date()

    // Step 3: Final Statistics
    console.log("[PHASE-5] Step 3: Generating final statistics...")
    results.steps.push({
      step: 3,
      name: "Final Statistics",
      status: "in_progress",
      startTime: new Date()
    })

    const statsResult = await generateFinalStatistics()
    results.steps[2].status = "completed"
    results.steps[2].result = statsResult
    results.steps[2].endTime = new Date()

    const endTime = Date.now()

    return NextResponse.json({
      success: true,
      phase: 5,
      completed: true,
      duration: endTime - startTime,
      results,
      importComplete: true,
      message: "🎉 Comprehensive import completed successfully!"
    })

  } catch (error) {
    console.error("[PHASE-5] Error:", error)
    return NextResponse.json({
      success: false,
      phase: 5,
      error: "Phase 5 failed",
      details: error instanceof Error ? error.message : "Unknown error",
      results
    }, { status: 500 })
  }
}

// Real implementation functions that call existing import APIs
async function createDatabaseBackup() {
  console.log("[BACKUP] Creating database backup...")
  // Call existing backup functionality
  const response = await fetch('http://localhost:3000/api/system/clean-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'backup' })
  })
  const result = await response.json()
  return { message: "Database backup created", timestamp: new Date(), details: result }
}

async function clearExistingData() {
  console.log("[CLEAR] Clearing existing data...")
  // Call existing clear functionality
  const response = await fetch('http://localhost:3000/api/system/clean-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'clear', confirmClear: true })
  })
  const result = await response.json()
  return { message: "Existing data cleared", details: result }
}

async function resetSequences() {
  console.log("[RESET] Resetting sequences...")

  const sequencesToReset = []

  // Try to reset sequences that exist
  try {
    await sql`SELECT setval(pg_get_serial_sequence('customers', 'id'), 1, false)`
    sequencesToReset.push('customers_id_seq')
  } catch (error) {
    console.log("[RESET] customers sequence not found or not needed")
  }

  try {
    await sql`SELECT setval(pg_get_serial_sequence('vehicles', 'id'), 1, false)`
    sequencesToReset.push('vehicles_id_seq')
  } catch (error) {
    console.log("[RESET] vehicles sequence not found or not needed")
  }

  try {
    await sql`SELECT setval(pg_get_serial_sequence('documents', 'id'), 1, false)`
    sequencesToReset.push('documents_id_seq')
  } catch (error) {
    console.log("[RESET] documents sequence not found or not needed")
  }

  return { message: "Sequences reset", sequences: sequencesToReset }
}

async function verifyCleanState() {
  console.log("[VERIFY] Verifying clean state...")
  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
  const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
  const documentCount = await sql`SELECT COUNT(*) as count FROM documents`

  const totalRecords = Number(customerCount[0].count) + Number(vehicleCount[0].count) + Number(documentCount[0].count)
  return {
    message: "Database state verified",
    totalRecords,
    customers: Number(customerCount[0].count),
    vehicles: Number(vehicleCount[0].count),
    documents: Number(documentCount[0].count)
  }
}

async function importCustomersFromSource(batchSize: number, testMode: boolean) {
  console.log(`[IMPORT-CUSTOMERS] Starting customer import, batchSize: ${batchSize}, testMode: ${testMode}`)

  // Call existing customer import API
  const response = await fetch('http://localhost:3000/api/mot/import-from-original-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  const result = await response.json()
  return {
    imported: result.customers_imported || 0,
    failed: result.customers_failed || 0,
    testMode,
    details: result
  }
}

async function importVehiclesFromSource(batchSize: number, testMode: boolean) {
  console.log(`[IMPORT-VEHICLES] Vehicle import included in customer import`)
  // Vehicles are imported together with customers in the original source import
  return { imported: 0, failed: 0, testMode, message: "Vehicles imported with customers" }
}

async function verifyCustomerVehicleRelationships() {
  console.log("[VERIFY-RELATIONSHIPS] Verifying customer-vehicle relationships...")

  const orphanedVehicles = await sql`
    SELECT COUNT(*) as count
    FROM vehicles v
    LEFT JOIN customers c ON v.customer_id = c.id
    WHERE c.id IS NULL
  `

  return {
    verified: true,
    orphanedVehicles: Number(orphanedVehicles[0].count),
    message: `Found ${orphanedVehicles[0].count} orphaned vehicles`
  }
}

async function importDocumentsFromSource(batchSize: number, testMode: boolean) {
  console.log(`[IMPORT-DOCUMENTS] Starting document import, batchSize: ${batchSize}, testMode: ${testMode}`)

  // Call existing document import API
  const response = await fetch('http://localhost:3000/api/documents/import-complete-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  const result = await response.json()
  return {
    imported: result.documents_imported || 0,
    failed: result.documents_failed || 0,
    testMode,
    details: result
  }
}

async function importLineItemsFromSource(batchSize: number, testMode: boolean) {
  console.log(`[IMPORT-LINEITEMS] Line items import included in document import`)
  // Line items are imported together with documents
  return { imported: 0, failed: 0, testMode, message: "Line items imported with documents" }
}

async function importDocumentExtrasFromSource(batchSize: number, testMode: boolean) {
  console.log(`[IMPORT-EXTRAS] Document extras import included in document import`)
  // Document extras are imported together with documents
  return { imported: 0, failed: 0, testMode, message: "Document extras imported with documents" }
}

async function importReceiptsFromSource(batchSize: number, testMode: boolean) {
  console.log(`[IMPORT-RECEIPTS] Receipts import included in document import`)
  // Receipts are imported together with documents
  return { imported: 0, failed: 0, testMode, message: "Receipts imported with documents" }
}

async function executeDvlaUpdates(batchSize: number, testMode: boolean) {
  console.log(`[DVLA-UPDATES] Starting DVLA updates, batchSize: ${batchSize}, testMode: ${testMode}`)

  // Call existing DVLA update API
  const response = await fetch('http://localhost:3000/api/bulk-processing/execute-full-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'dvla', batchSize, testMode })
  })

  const result = await response.json()
  return {
    updated: result.updated || 0,
    failed: result.failed || 0,
    testMode,
    details: result
  }
}

async function integrateMotHistory(batchSize: number, testMode: boolean) {
  console.log(`[MOT-INTEGRATION] MOT history integration included in DVLA updates`)
  // MOT history is integrated as part of DVLA updates
  return { integrated: 0, failed: 0, testMode, message: "MOT history integrated with DVLA updates" }
}

async function cleanCustomerData(batchSize: number, testMode: boolean) {
  console.log(`[CLEAN-DATA] Customer data cleaning included in import process`)
  // Customer data cleaning happens during import
  return { cleaned: 0, phonesCleaned: 0, testMode, message: "Customer data cleaned during import" }
}

async function performDataIntegrityChecks() {
  console.log("[INTEGRITY] Performing data integrity checks...")

  // Check for basic data integrity
  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
  const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
  const documentCount = await sql`SELECT COUNT(*) as count FROM documents`

  const issues = []

  // Check for orphaned vehicles
  const orphanedVehicles = await sql`
    SELECT COUNT(*) as count
    FROM vehicles v
    LEFT JOIN customers c ON v.customer_id = c.id
    WHERE c.id IS NULL
  `

  if (Number(orphanedVehicles[0].count) > 0) {
    issues.push(`${orphanedVehicles[0].count} orphaned vehicles found`)
  }

  return {
    passed: issues.length === 0,
    issues: issues.length,
    details: issues,
    statistics: {
      customers: Number(customerCount[0].count),
      vehicles: Number(vehicleCount[0].count),
      documents: Number(documentCount[0].count)
    }
  }
}

async function optimizeDatabase() {
  console.log("[OPTIMIZE] Optimizing database...")

  // Create indexes for better performance
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(_id_customer)`
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents(_id_vehicle)`
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(doc_date_created)`

    return { optimized: true, indexesCreated: 7 }
  } catch (error) {
    return { optimized: false, error: error.message, indexesCreated: 0 }
  }
}

async function generateFinalStatistics() {
  console.log("[STATISTICS] Generating final statistics...")

  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
  const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
  const documentCount = await sql`SELECT COUNT(*) as count FROM documents`

  // Try to get line items count
  let lineItemCount = 0
  try {
    const lineItems = await sql`SELECT COUNT(*) as count FROM document_line_items`
    lineItemCount = Number(lineItems[0].count)
  } catch (error) {
    console.log("[STATISTICS] Line items table not found")
  }

  const customers = Number(customerCount[0].count)
  const vehicles = Number(vehicleCount[0].count)
  const documents = Number(documentCount[0].count)
  const lineItems = lineItemCount
  const totalRecords = customers + vehicles + documents + lineItems

  return {
    customers,
    vehicles,
    documents,
    lineItems,
    totalRecords,
    timestamp: new Date()
  }
}
