import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const documentId = resolvedParams.id

    console.log(`[DOCUMENT-JOB-DESCRIPTION] Fetching job description for document ${documentId}`)

    // Get job description from document extras
    const jobDescription = await sql`
      SELECT
        document_id,
        labour_description,
        doc_notes
      FROM document_extras
      WHERE document_id = ${documentId}
      LIMIT 1
    `

    if (jobDescription.length === 0) {
      return NextResponse.json({
        success: true,
        jobDescription: null,
        message: "No job description found for this document"
      })
    }

    const description = jobDescription[0]

    return NextResponse.json({
      success: true,
      jobDescription: {
        documentId: description.document_id,
        labourDescription: description.labour_description,
        docNotes: description.doc_notes
      }
    })

  } catch (error) {
    console.error("[DOCUMENT-JOB-DESCRIPTION] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch job description",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
