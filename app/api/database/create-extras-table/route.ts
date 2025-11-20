import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CREATE-EXTRAS-TABLE] Creating document_extras table...")

    // Create document_extras table
    await sql`
      CREATE TABLE IF NOT EXISTS document_extras (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        labour_description TEXT,
        doc_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(document_id)
      )
    `

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_document_extras_document_id 
      ON document_extras(document_id)
    `

    console.log("[CREATE-EXTRAS-TABLE] Document extras table created successfully")

    return NextResponse.json({
      success: true,
      message: "Document extras table structure created",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CREATE-EXTRAS-TABLE] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to create document extras table",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
