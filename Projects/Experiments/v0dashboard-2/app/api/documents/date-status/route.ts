import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Get statistics about document dates
    const stats = await sql`
      SELECT
        COUNT(*) as total_records,
        COUNT(document_date) as records_with_dates,
        COUNT(*) - COUNT(document_date) as records_without_dates,
        CAST(
          (COUNT(document_date)::float / COUNT(*)::float) * 100 AS DECIMAL(5,2)
        ) as percentage_with_dates
      FROM customer_documents
    `
    
    // Get some sample records with dates
    const samplesWithDates = await sql`
      SELECT id, document_number, document_date, document_type
      FROM customer_documents 
      WHERE document_date IS NOT NULL
      ORDER BY document_date DESC
      LIMIT 5
    `
    
    // Get some sample records without dates
    const samplesWithoutDates = await sql`
      SELECT id, document_number, document_date, document_type, created_at
      FROM customer_documents 
      WHERE document_date IS NULL
      LIMIT 5
    `
    
    return NextResponse.json({
      success: true,
      statistics: stats[0],
      samplesWithDates,
      samplesWithoutDates
    })
    
  } catch (error) {
    console.error("[DATE-STATUS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get date status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
