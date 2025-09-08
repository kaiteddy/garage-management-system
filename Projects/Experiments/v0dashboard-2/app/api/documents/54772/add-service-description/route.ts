import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[ADD-SERVICE-DESCRIPTION] 🔧 Adding service description for document 54772...")

    // Check if service description already exists
    const existing = await sql`
      SELECT id FROM document_extras WHERE document_id = ${54772}
    `

    if (existing.length > 0) {
      // Update existing record
      await sql`
        UPDATE document_extras SET
          labour_description = ${'Investigated Engine Fuel Leak - Found Cylinder 4 Injector Pipe Leaking. Replaced Injector Pipe And Bled Fuel System.'},
          doc_notes = ${'Complete fuel system repair for NG07 LML Toyota Hi-Ace'}
        WHERE document_id = ${54772}
      `
    } else {
      // Insert new record with unique ID
      await sql`
        INSERT INTO document_extras (
          id, document_id, labour_description, doc_notes
        ) VALUES (
          ${'54772_service_description'},
          ${'54772'},
          ${'Investigated Engine Fuel Leak - Found Cylinder 4 Injector Pipe Leaking. Replaced Injector Pipe And Bled Fuel System.'},
          ${'Complete fuel system repair for NG07 LML Toyota Hi-Ace'}
        )
      `
    }

    // Verify the addition
    const verification = await sql`
      SELECT
        document_id,
        labour_description,
        doc_notes
      FROM document_extras
      WHERE document_id = ${54772}
    `

    console.log("[ADD-SERVICE-DESCRIPTION] ✅ Service description added successfully!")

    return NextResponse.json({
      success: true,
      message: "Service description added successfully",
      serviceDetails: verification[0] || null
    })

  } catch (error) {
    console.error("[ADD-SERVICE-DESCRIPTION] ❌ Error adding service description:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to add service description",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
