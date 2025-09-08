import { NextResponse } from "next/server"
import { fixDocumentDates } from "@/scripts/fix-document-dates"

export async function POST() {
  try {
    console.log("[FIX-DATES] Starting document date fix via API...")
    
    const result = await fixDocumentDates()
    
    return NextResponse.json({
      success: true,
      message: "Document dates fixed successfully",
      ...result
    })
    
  } catch (error) {
    console.error("[FIX-DATES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix document dates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Document Date Fix API",
    description: "POST to this endpoint to fix null document_date fields using original CSV data",
    usage: "POST /api/documents/fix-dates"
  })
}
