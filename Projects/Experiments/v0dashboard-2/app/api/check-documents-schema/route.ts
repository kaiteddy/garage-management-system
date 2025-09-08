import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Check documents table schema
    const documentsSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position
    `
    
    // Get a sample document to see actual data
    const sampleDocument = await sql`
      SELECT * FROM documents LIMIT 1
    `

    // Check total document count
    const documentCount = await sql`
      SELECT COUNT(*) as total FROM documents
    `

    return NextResponse.json({
      success: true,
      schema: documentsSchema,
      sample: sampleDocument[0] || null,
      totalDocuments: documentCount[0].total
    })

  } catch (error) {
    console.error('Error checking documents schema:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check documents schema",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
