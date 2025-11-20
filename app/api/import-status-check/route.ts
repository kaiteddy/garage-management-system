import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[IMPORT-STATUS-CHECK] Checking current database status...")

    // Get counts from all main tables
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const documentCount = await sql`SELECT COUNT(*) as count FROM documents`

    // Try to get line items count (may not exist)
    let lineItemCount = 0
    try {
      const lineItems = await sql`SELECT COUNT(*) as count FROM document_line_items`
      lineItemCount = Number(lineItems[0].count)
    } catch (error) {
      console.log("[IMPORT-STATUS-CHECK] document_line_items table not found")
    }

    // Try to get MOT history count
    let motHistoryCount = 0
    try {
      const motHistory = await sql`SELECT COUNT(*) as count FROM mot_history`
      motHistoryCount = Number(motHistory[0].count)
    } catch (error) {
      console.log("[IMPORT-STATUS-CHECK] mot_history table not found")
    }

    // Get sample data to verify import quality
    let sampleCustomers = []
    let sampleVehicles = []
    let sampleDocuments = []

    try {
      sampleCustomers = await sql`SELECT * FROM customers LIMIT 3`
    } catch (error) {
      console.log("[IMPORT-STATUS-CHECK] Error getting customer samples:", error.message)
    }

    try {
      sampleVehicles = await sql`SELECT * FROM vehicles LIMIT 3`
    } catch (error) {
      console.log("[IMPORT-STATUS-CHECK] Error getting vehicle samples:", error.message)
    }

    try {
      sampleDocuments = await sql`SELECT * FROM documents LIMIT 3`
    } catch (error) {
      console.log("[IMPORT-STATUS-CHECK] Error getting document samples:", error.message)
    }

    const customers = Number(customerCount[0].count)
    const vehicles = Number(vehicleCount[0].count)
    const documents = Number(documentCount[0].count)
    const lineItems = lineItemCount
    const motHistory = motHistoryCount
    const totalRecords = customers + vehicles + documents + lineItems + motHistory

    return NextResponse.json({
      success: true,
      timestamp: new Date(),
      importStatus: {
        customers: {
          count: customers,
          status: customers > 0 ? "imported" : "empty",
          sample: sampleCustomers.slice(0, 3)
        },
        vehicles: {
          count: vehicles,
          status: vehicles > 0 ? "imported" : "empty",
          sample: sampleVehicles.slice(0, 3)
        },
        documents: {
          count: documents,
          status: documents > 0 ? "imported" : "empty",
          sample: sampleDocuments.slice(0, 3)
        },
        lineItems: {
          count: lineItems,
          status: lineItems > 0 ? "imported" : "empty"
        },
        motHistory: {
          count: motHistory,
          status: motHistory > 0 ? "imported" : "empty"
        }
      },
      summary: {
        totalRecords,
        importProgress: {
          phase1: "completed", // Clean preparation
          phase2: customers > 0 && vehicles > 0 ? "completed" : "pending", // Core data
          phase3: documents > 0 ? (lineItems > 0 ? "completed" : "partial") : "pending", // Documents
          phase4: "pending", // DVLA updates
          phase5: "pending"  // Final verification
        }
      },
      nextSteps: getNextSteps(customers, vehicles, documents, lineItems)
    })

  } catch (error) {
    console.error("[IMPORT-STATUS-CHECK] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check import status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

function getNextSteps(customers: number, vehicles: number, documents: number, lineItems: number) {
  if (customers === 0 && vehicles === 0) {
    return ["Start Phase 1: Clean Import Preparation", "Execute Phase 2: Core Data Import"]
  }

  if (customers > 0 && vehicles > 0 && documents === 0) {
    return ["Execute Phase 3: Document System Import"]
  }

  if (documents > 0 && lineItems === 0) {
    return ["Continue Phase 3: Line Items Import", "Import Document Extras", "Import Receipts"]
  }

  if (documents > 0 && lineItems > 0) {
    return ["Execute Phase 4: DVLA Updates", "Execute Phase 5: Final Verification"]
  }

  return ["Continue comprehensive import process"]
}
