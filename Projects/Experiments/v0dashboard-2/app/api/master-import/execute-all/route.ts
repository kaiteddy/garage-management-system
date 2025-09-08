import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("[MASTER-IMPORT] Starting comprehensive import of all data...")

    const results = {
      customers: null,
      vehicles: null,
      documents: null,
      lineItems: null,
      verification: null,
      startTime: new Date().toISOString(),
      endTime: null,
      totalDuration: null,
      success: false
    }

    // Step 1: Import Customers (with duplicate email handling)
    console.log("[MASTER-IMPORT] Step 1: Importing customers...")
    try {
      const customerResponse = await fetch('http://localhost:3000/api/mot/import-all-7000-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      results.customers = await customerResponse.json()
      console.log(`[MASTER-IMPORT] Customers imported: ${results.customers.results?.imported || 0}`)
    } catch (error) {
      console.error("[MASTER-IMPORT] Customer import failed:", error)
      results.customers = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Step 2: Import Vehicles (with customer relationship handling)
    console.log("[MASTER-IMPORT] Step 2: Importing vehicles...")
    try {
      const vehicleResponse = await fetch('http://localhost:3000/api/vehicles/import-all-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      results.vehicles = await vehicleResponse.json()
      console.log(`[MASTER-IMPORT] Vehicles imported: ${results.vehicles.results?.imported || 0}`)
    } catch (error) {
      console.error("[MASTER-IMPORT] Vehicle import failed:", error)
      results.vehicles = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Step 3: Import Documents (with customer/vehicle validation)
    console.log("[MASTER-IMPORT] Step 3: Importing documents...")
    try {
      const documentResponse = await fetch('http://localhost:3000/api/documents/import-all-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      results.documents = await documentResponse.json()
      console.log(`[MASTER-IMPORT] Documents imported: ${results.documents.results?.imported || 0}`)
    } catch (error) {
      console.error("[MASTER-IMPORT] Document import failed:", error)
      results.documents = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Step 4: Import Line Items (with document validation)
    console.log("[MASTER-IMPORT] Step 4: Importing line items...")
    try {
      const lineItemResponse = await fetch('http://localhost:3000/api/line-items/import-all-line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      results.lineItems = await lineItemResponse.json()
      console.log(`[MASTER-IMPORT] Line items imported: ${results.lineItems.results?.imported || 0}`)
    } catch (error) {
      console.error("[MASTER-IMPORT] Line item import failed:", error)
      results.lineItems = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Step 5: Comprehensive Database Verification
    console.log("[MASTER-IMPORT] Step 5: Running comprehensive verification...")
    try {
      const verificationResponse = await fetch('http://localhost:3000/api/database/comprehensive-verification', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      results.verification = await verificationResponse.json()
      console.log(`[MASTER-IMPORT] Verification completed with health score: ${results.verification.summary?.healthScore || 0}`)
    } catch (error) {
      console.error("[MASTER-IMPORT] Verification failed:", error)
      results.verification = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Calculate final results
    results.endTime = new Date().toISOString()
    const startTime = new Date(results.startTime)
    const endTime = new Date(results.endTime)
    results.totalDuration = Math.round((endTime.getTime() - startTime.getTime()) / 1000) // seconds

    // Determine overall success
    const customerSuccess = results.customers?.success && (results.customers?.results?.imported || 0) > 5000
    const vehicleSuccess = results.vehicles?.success && (results.vehicles?.results?.imported || 0) > 8000
    const documentSuccess = results.documents?.success && (results.documents?.results?.imported || 0) > 20000
    const lineItemSuccess = results.lineItems?.success && (results.lineItems?.results?.imported || 0) > 60000
    const verificationSuccess = results.verification?.success && (results.verification?.summary?.healthScore || 0) > 70

    results.success = customerSuccess && vehicleSuccess && documentSuccess && lineItemSuccess && verificationSuccess

    // Create summary
    const summary = {
      overallSuccess: results.success,
      totalDuration: results.totalDuration,
      importCounts: {
        customers: results.customers?.results?.imported || 0,
        vehicles: results.vehicles?.results?.imported || 0,
        documents: results.documents?.results?.imported || 0,
        lineItems: results.lineItems?.results?.imported || 0
      },
      targetAchievement: {
        customers: {
          imported: results.customers?.results?.imported || 0,
          target: 7000,
          achieved: (results.customers?.results?.imported || 0) >= 5000
        },
        vehicles: {
          imported: results.vehicles?.results?.imported || 0,
          target: 10000,
          achieved: (results.vehicles?.results?.imported || 0) >= 8000
        },
        documents: {
          imported: results.documents?.results?.imported || 0,
          target: 30000,
          achieved: (results.documents?.results?.imported || 0) >= 20000
        },
        lineItems: {
          imported: results.lineItems?.results?.imported || 0,
          target: 90000,
          achieved: (results.lineItems?.results?.imported || 0) >= 60000
        }
      },
      healthScore: results.verification?.summary?.healthScore || 0,
      dataQualityScore: results.verification?.summary?.dataQualityScore || 0,
      totalRevenue: results.verification?.financial?.totalRevenue || 0,
      systemStatus: results.verification?.summary?.overallStatus || 'unknown'
    }

    console.log("[MASTER-IMPORT] Master import completed!")
    console.log(`[MASTER-IMPORT] Summary: ${summary.importCounts.customers} customers, ${summary.importCounts.vehicles} vehicles, ${summary.importCounts.documents} documents, ${summary.importCounts.lineItems} line items`)
    console.log(`[MASTER-IMPORT] Health Score: ${summary.healthScore}/100, Duration: ${summary.totalDuration}s`)

    return NextResponse.json({
      success: results.success,
      message: results.success ? "Master import completed successfully!" : "Master import completed with some issues",
      summary,
      detailedResults: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[MASTER-IMPORT] Master import failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Master import failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
