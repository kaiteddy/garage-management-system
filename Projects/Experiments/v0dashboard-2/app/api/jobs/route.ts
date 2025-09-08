import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[JOBS-API] Fetching jobs from documents table...")

    // Get jobs from documents table (estimates and job sheets)
    const jobs = await sql`
      SELECT
        d.id,
        d.doc_number as job_number,
        d.doc_date_issued as scheduled_date,
        d._id_customer as customer_id,
        d.vehicle_registration,
        d.total_gross as estimated_cost,
        d.doc_status as status,
        d.customer_name,
        COALESCE(d.customer_name, 'Service work') as description
      FROM documents d
      WHERE d.doc_type IN ('Job Sheet', 'Estimate', 'Booking', 'Quote')
      ORDER BY d.doc_date_issued DESC
      LIMIT 1000
    `

    // Transform data to match expected format
    const transformedJobs = jobs.map(job => {
      // Determine priority based on amount or other criteria
      let priority = 'medium'
      const amount = parseFloat(job.estimated_cost || '0')
      if (amount > 500) priority = 'high'
      else if (amount < 100) priority = 'low'

      // Map status to expected values
      let status = job.status || 'pending'
      if (status === 'open') status = 'pending'
      if (status === 'completed') status = 'completed'
      if (status === 'in_progress') status = 'in-progress'

      return {
        id: job.id,
        jobNumber: job.job_number || `JOB-${job.id}`,
        customerName: job.customer_name || 'No customer assigned',
        vehicleReg: job.vehicle_registration || 'N/A',
        description: job.description || 'Service work',
        status: status,
        priority: priority,
        scheduledDate: job.scheduled_date ? new Date(job.scheduled_date).toISOString() : new Date().toISOString(),
        estimatedCost: amount
      }
    })

    console.log(`[JOBS-API] Found ${transformedJobs.length} jobs`)

    return NextResponse.json({
      success: true,
      jobs: transformedJobs,
      count: transformedJobs.length
    })

  } catch (error) {
    console.error("[JOBS-API] Error fetching jobs:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch jobs",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "create") {
      // Create new job
      const { jobNumber, customerId, vehicleRegistration, description, estimatedCost } = body

      const result = await sql`
        INSERT INTO documents (
          document_number,
          document_type,
          customer_id,
          vehicle_registration,
          total_amount,
          document_date,
          status
        ) VALUES (
          ${jobNumber},
          'job_sheet',
          ${customerId},
          ${vehicleRegistration},
          ${estimatedCost},
          NOW(),
          'pending'
        )
        RETURNING id
      `

      // Add job description if provided
      if (description && result[0].id) {
        await sql`
          INSERT INTO document_extras (
            document_id,
            labour_description
          ) VALUES (
            ${result[0].id},
            ${description}
          )
        `
      }

      return NextResponse.json({
        success: true,
        job: { id: result[0].id, jobNumber },
        message: "Job created successfully"
      })
    }

    if (action === "update-status") {
      const { id, status } = body

      await sql`
        UPDATE documents
        SET status = ${status}
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Job status updated successfully"
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("[JOBS-API] Error processing job:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process job",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
