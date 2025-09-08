import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[INVOICES-API] Fetching invoices from documents table...")

    // Get invoices from documents table
    const invoices = await sql`
      SELECT
        d.id,
        d.doc_number as invoice_number,
        d.doc_date_issued as issue_date,
        d._id_customer as customer_id,
        d.vehicle_registration,
        d.total_gross as total_amount,
        COALESCE(d.doc_date_paid, '1900-01-01') as paid_date,
        d.doc_status as status,
        d.customer_name,
        d.vehicle_make || ' ' || d.vehicle_model as vehicle_make_model
      FROM documents d
      WHERE d.doc_type IN ('Invoice', 'Receipt')
      ORDER BY d.doc_date_issued DESC
      LIMIT 1000
    `

    // Transform data to match expected format
    const transformedInvoices = invoices.map(invoice => {
      const issueDate = invoice.issue_date ? new Date(invoice.issue_date) : new Date()
      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + 30) // 30 days payment terms

      const totalAmount = parseFloat(invoice.total_amount || '0')
      const paidAmount = invoice.paid_date && invoice.paid_date !== '1900-01-01' ? totalAmount : 0

      // Determine status based on payment and due date
      let status = invoice.status || 'draft'
      if (paidAmount >= totalAmount) {
        status = 'paid'
      } else if (new Date() > dueDate && paidAmount < totalAmount) {
        status = 'overdue'
      } else if (status === 'draft') {
        status = 'sent'
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number || `INV-${invoice.id}`,
        customerName: invoice.customer_name || 'No customer assigned',
        vehicleReg: invoice.vehicle_registration || 'N/A',
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        status: status
      }
    })

    console.log(`[INVOICES-API] Found ${transformedInvoices.length} invoices`)

    return NextResponse.json({
      success: true,
      invoices: transformedInvoices,
      count: transformedInvoices.length
    })

  } catch (error) {
    console.error("[INVOICES-API] Error fetching invoices:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch invoices",
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
      // Create new invoice
      const { invoiceNumber, customerId, vehicleRegistration, totalAmount } = body

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
          ${invoiceNumber},
          'invoice',
          ${customerId},
          ${vehicleRegistration},
          ${totalAmount},
          NOW(),
          'draft'
        )
        RETURNING id
      `

      return NextResponse.json({
        success: true,
        invoice: { id: result[0].id, invoiceNumber },
        message: "Invoice created successfully"
      })
    }

    if (action === "update-payment") {
      const { id, paidAmount } = body

      await sql`
        UPDATE documents
        SET paid_amount = ${paidAmount},
            status = CASE
              WHEN ${paidAmount} >= total_amount THEN 'paid'
              ELSE 'partial'
            END
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Payment updated successfully"
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("[INVOICES-API] Error processing invoice:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process invoice",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
