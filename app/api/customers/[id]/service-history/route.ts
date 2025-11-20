import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const customerId = resolvedParams.id

    // Get comprehensive service history for customer with all related data
    const serviceHistory = await sql`
      SELECT
        d.id,
        d._id,
        d.doc_number as document_number,
        d.doc_date_issued as date,
        d.doc_type as type,
        d.total_gross as amount,
        d.total_net,
        d.total_tax,
        d.status,
        d.vehicle_registration,
        d.customer_name,
        d.vehicle_make,
        d.vehicle_model,
        d.vehicle_mileage,
        de.labour_description,
        de.doc_notes as notes
      FROM documents d
      LEFT JOIN document_extras de ON d._id = de.document_id
      WHERE d._id_customer = ${customerId}
      ORDER BY d.doc_date_issued DESC
    `

    // Get line items for each document with detailed breakdown
    const lineItems = await sql`
      SELECT
        li.document_id,
        li.description,
        li.quantity,
        li.unit_price,
        li.total_amount as total_price,
        li.line_type as item_type,
        li.tax_rate
      FROM line_items li
      INNER JOIN documents d ON li.document_id = d._id
      WHERE d._id_customer = ${customerId}
      ORDER BY li.document_id, li.id
    `

    // Get receipts for each document
    const receipts = await sql`
      SELECT
        r.document_id,
        r.payment_date as receipt_date,
        r.amount,
        r.payment_method,
        r.notes as receipt_description,
        r.reference as reference_number
      FROM receipts r
      INNER JOIN documents d ON r.document_id = d._id
      WHERE d._id_customer = ${customerId}
      ORDER BY r.payment_date DESC
    `

    // Get customer vehicles for context
    const customerVehicles = await sql`
      SELECT registration, make, model, year, mot_expiry_date
      FROM vehicles
      WHERE owner_id = ${customerId}
      ORDER BY registration
    `

    // Organize data by document with complete service details
    const serviceHistoryWithDetails = serviceHistory.map(doc => {
      const docLineItems = lineItems.filter(item => item.document_id === doc._id)
      const docReceipts = receipts.filter(receipt => receipt.document_id === doc._id)

      // Categorize line items
      const labour = docLineItems.filter(item =>
        item.item_type?.toLowerCase().includes('labour') ||
        item.description?.toLowerCase().includes('labour')
      )
      const parts = docLineItems.filter(item =>
        item.item_type?.toLowerCase().includes('parts') ||
        item.item_type?.toLowerCase().includes('part') ||
        item.description?.toLowerCase().includes('part')
      )
      const other = docLineItems.filter(item =>
        !item.item_type?.toLowerCase().includes('labour') &&
        !item.item_type?.toLowerCase().includes('part') &&
        !item.description?.toLowerCase().includes('labour') &&
        !item.description?.toLowerCase().includes('part')
      )

      return {
        id: doc.id,
        documentNumber: doc.document_number,
        date: doc.date,
        type: doc.type,
        amount: parseFloat(doc.amount || '0'),
        totalNet: parseFloat(doc.total_net || '0'),
        totalTax: parseFloat(doc.total_tax || '0'),
        status: doc.status,
        vehicleRegistration: doc.vehicle_registration,
        vehicleMake: doc.vehicle_make,
        vehicleModel: doc.vehicle_model,
        vehicleMileage: doc.vehicle_mileage,
        customerName: doc.customer_name,
        labourDescription: doc.labour_description,
        notes: doc.notes,
        partsDescription: null,
        recommendations: null,
        lineItems: {
          all: docLineItems,
          labour: labour,
          parts: parts,
          other: other
        },
        receipts: docReceipts,
        totalPaid: docReceipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount || '0'), 0),
        paymentStatus: docReceipts.length > 0 ? 'paid' : 'unpaid'
      }
    })

    // Calculate comprehensive summary
    const totalSpent = serviceHistory.reduce((sum, doc) => sum + parseFloat(doc.amount || '0'), 0)
    const totalPaid = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount || '0'), 0)
    const outstandingBalance = totalSpent - totalPaid

    // Group by vehicle for vehicle-specific history
    const vehicleHistory = {}
    serviceHistoryWithDetails.forEach(doc => {
      if (doc.vehicleRegistration) {
        if (!vehicleHistory[doc.vehicleRegistration]) {
          vehicleHistory[doc.vehicleRegistration] = []
        }
        vehicleHistory[doc.vehicleRegistration].push(doc)
      }
    })

    return NextResponse.json({
      success: true,
      serviceHistory: serviceHistoryWithDetails,
      vehicleHistory: vehicleHistory,
      customerVehicles: customerVehicles,
      summary: {
        totalDocuments: serviceHistory.length,
        totalSpent: totalSpent,
        totalPaid: totalPaid,
        outstandingBalance: outstandingBalance,
        averageJobValue: serviceHistory.length > 0 ? totalSpent / serviceHistory.length : 0,
        dateRange: {
          earliest: serviceHistory[serviceHistory.length - 1]?.date,
          latest: serviceHistory[0]?.date
        },
        vehicleCount: Object.keys(vehicleHistory).length,
        paymentStatus: {
          paid: serviceHistoryWithDetails.filter(doc => doc.paymentStatus === 'paid').length,
          unpaid: serviceHistoryWithDetails.filter(doc => doc.paymentStatus === 'unpaid').length
        }
      }
    })

  } catch (error) {
    console.error("[CUSTOMER-SERVICE-HISTORY] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer service history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
