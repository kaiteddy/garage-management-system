import { NextResponse } from "next/server"
import { TurboImporter } from "@/scripts/turbo-import"

export async function POST() {
  try {
    console.log("[TURBO-IMPORT] Starting lightning-fast import...")
    
    const importer = new TurboImporter()
    await importer.run()
    
    return NextResponse.json({
      success: true,
      message: "Turbo import completed successfully!",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[TURBO-IMPORT] Failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Turbo import failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Turbo Import API",
    description: "Lightning-fast comprehensive data import system",
    usage: "POST to this endpoint to start turbo import",
    features: [
      "Parallel processing",
      "Bulk operations", 
      "Real-time progress tracking",
      "Instant verification",
      "Dependency-aware import order"
    ],
    expectedFiles: [
      "Customers.csv",
      "Vehicles.csv", 
      "Documents.csv",
      "LineItems.csv",
      "Receipts.csv",
      "Document_Extras.csv"
    ]
  })
}
