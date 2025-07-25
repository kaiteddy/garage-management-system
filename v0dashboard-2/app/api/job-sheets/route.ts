import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[JOB-SHEETS-API] Fetching job sheets from documents table...")

    // Get the highest job number to ensure continuity for new job sheets
    const maxJobNumber = await sql`
      SELECT MAX(CAST(doc_number AS INTEGER)) as max_number
      FROM documents
      WHERE doc_number ~ '^[0-9]+$'
        AND doc_type IN ('ES', 'JOB', 'ESTIMATE', 'INVOICE')
    `

    const currentHighest = maxJobNumber[0]?.max_number || 0
    console.log(`[JOB-SHEETS-API] Current highest job number: ${currentHighest} (next will be ${currentHighest + 1})`)

    // Get job sheets from documents table with proper field mapping and data cleaning
    const jobSheets = await sql`
      SELECT
        d.id,
        d._id as document_id,
        -- Format job number to be 5 digits with leading zeros
        LPAD(d.doc_number::text, 5, '0') as job_number,
        d.doc_number as raw_job_number,
        -- Use proper date field or current date if null
        COALESCE(d.doc_date_issued, d.doc_date_created, CURRENT_DATE) as date,
        d._id_customer as customer_id,
        -- Clean vehicle registration - only use if it looks like a valid reg
        CASE
          WHEN d.vehicle_registration ~ '^[A-Z0-9]{2,8}$'
            AND d.vehicle_registration !~ '^[0-9]+\.[0-9]+$'
            AND LENGTH(d.vehicle_registration) >= 3
          THEN d.vehicle_registration
          ELSE NULL
        END as vehicle_registration,
        d.vehicle_make,
        d.vehicle_model,
        -- Fix potential data mapping issues with amounts
        CASE
          WHEN d.total_gross::numeric > 0 THEN d.total_gross::numeric
          ELSE 0
        END as total_amount,
        CASE
          WHEN d.total_net::numeric > 0 THEN d.total_net::numeric
          ELSE 0
        END as labour_amount,
        d.doc_status as status,
        d.doc_type as type,
        d.customer_name,
        c.first_name,
        c.last_name
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE d.doc_type IN ('ES', 'JOB', 'ESTIMATE', 'INVOICE')
        AND (d.doc_status = '1' OR d.doc_status = '2' OR d.doc_status IS NULL)
        AND d.doc_number ~ '^[0-9]+$'  -- Only numeric job numbers
      ORDER BY
        CAST(d.doc_number AS INTEGER) DESC
      LIMIT 100
    `

    // Transform data to match expected format
    const transformedJobSheets = jobSheets.map((sheet: any) => {
      // Determine status based on database status
      let status = 'Open'
      if (sheet.status === '2') {
        status = 'Completed'
      } else if (sheet.status === '3') {
        status = 'Invoiced'
      } else if (sheet.total_amount > 0 && sheet.status === '1') {
        status = 'In Progress'
      }

      // Format date
      const formatDate = (dateString: string) => {
        if (!dateString) return new Date().toLocaleDateString('en-GB')
        const date = new Date(dateString)
        return date.toLocaleDateString('en-GB')
      }

      // Get customer name
      const customerName = sheet.customer_name ||
        (sheet.first_name && sheet.last_name ? `${sheet.first_name} ${sheet.last_name}` : '') ||
        'No customer assigned'

      // Get vehicle info
      const makeModel = sheet.vehicle_make && sheet.vehicle_model
        ? `${sheet.vehicle_make} ${sheet.vehicle_model}`
        : 'Unknown Vehicle'

      return {
        id: sheet.id || sheet.document_id,
        jobNumber: sheet.job_number, // Already formatted as 5-digit in SQL
        date: formatDate(sheet.date),
        registration: sheet.vehicle_registration || 'N/A',
        makeModel: makeModel,
        customer: customerName,
        labour: parseFloat(sheet.labour_amount || '0'),
        total: parseFloat(sheet.total_amount || '0'),
        status: status,
        description: '',
        customerId: sheet.customer_id,
        documentId: sheet.document_id,
        type: sheet.type
      }
    })

    console.log(`[JOB-SHEETS-API] Found ${transformedJobSheets.length} job sheets`)

    return NextResponse.json({
      success: true,
      jobSheets: transformedJobSheets,
      count: transformedJobSheets.length,
      numbering_info: {
        current_highest: currentHighest,
        next_job_number: currentHighest + 1,
        next_formatted: String(currentHighest + 1).padStart(5, '0')
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[JOB-SHEETS-API] Error fetching job sheets:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch job sheets",
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
      // Create new job sheet
      const { jobNumber, customerId, vehicleRegistration, items, totalAmount } = body

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
          ${totalAmount},
          NOW(),
          'open'
        )
        RETURNING id
      `

      return NextResponse.json({
        success: true,
        jobSheet: { id: result[0].id, jobNumber },
        message: "Job sheet created successfully"
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("[JOB-SHEETS-API] Error creating job sheet:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create job sheet",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
