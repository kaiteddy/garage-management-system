import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id and status" },
        { status: 400 }
      )
    }

    console.log(`[JOB-SHEET-STATUS] Updating job sheet ${id} status to: ${status}`)

    // Map frontend status values to database status values
    const statusMapping: { [key: string]: string } = {
      "Open": "0",
      "In Progress": "3",
      "Awaiting Parts": "2",
      "Parts Ordered": "2",
      "Ready for Collection": "1",
      "Completed": "1",
      "Invoiced": "1",
      "On Hold": "4",
      "Cancelled": "CANCELLED",
      "Voided": "VOIDED"
    }

    const dbStatus = statusMapping[status] || "0"

    // Update the job sheet status in the customer_documents table
    const result = await sql`
      UPDATE customer_documents 
      SET status = ${dbStatus}
      WHERE id = ${id} AND document_type = 'JS'
      RETURNING id, status
    `

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Job sheet not found" },
        { status: 404 }
      )
    }

    console.log(`[JOB-SHEET-STATUS] Successfully updated job sheet ${id} status to ${dbStatus} (${status})`)

    return NextResponse.json({
      success: true,
      message: `Job sheet status updated to ${status}`,
      data: {
        id: result[0].id,
        status: status,
        dbStatus: result[0].status
      }
    })

  } catch (error) {
    console.error("[JOB-SHEET-STATUS] Error updating status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update job sheet status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
