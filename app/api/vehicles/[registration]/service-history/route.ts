import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request, { params }: { params: Promise<{ registration: string }> }) {
  try {
    const resolvedParams = await params
    const registration = decodeURIComponent(resolvedParams.registration)
    const cleanReg = registration.replace(/\s+/g, '')

    // Get comprehensive service history for vehicle with all related data
    const serviceHistory = await sql`
      SELECT
        d.id,
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
        d._id_customer as customer_id,
        de.labour_description,
        de.doc_notes as notes
      FROM documents d
      LEFT JOIN document_extras de ON d.id::text = de.document_id::text
      WHERE d.vehicle_registration = ${registration}
         OR d.vehicle_registration = ${cleanReg}
         OR REPLACE(d.vehicle_registration, ' ', '') = ${cleanReg}
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
      INNER JOIN documents d ON li.document_id = d.id::text
      WHERE d.vehicle_registration = ${registration}
         OR d.vehicle_registration = ${cleanReg}
         OR REPLACE(d.vehicle_registration, ' ', '') = ${cleanReg}
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
      INNER JOIN documents d ON r.document_id = d.id::text
      WHERE d.vehicle_registration = ${registration}
         OR d.vehicle_registration = ${cleanReg}
         OR REPLACE(d.vehicle_registration, ' ', '') = ${cleanReg}
      ORDER BY r.payment_date DESC
    `

    // Get vehicle details
    const vehicleDetails = await sql`
      SELECT
        registration, make, model, year, color, fuel_type,
        mot_expiry_date, mot_status, owner_id, vehicle_age,
        mot_test_date, mot_test_result, mot_odometer_value
      FROM vehicles
      WHERE registration = ${registration}
         OR registration = ${cleanReg}
         OR REPLACE(registration, ' ', '') = ${cleanReg}
      LIMIT 1
    `

    // Get customer details if vehicle has owner
    let customerDetails = null
    if (vehicleDetails.length > 0 && vehicleDetails[0].owner_id) {
      const customerResult = await sql`
        SELECT id, first_name, last_name, phone, email
        FROM customers
        WHERE id = ${vehicleDetails[0].owner_id}
        LIMIT 1
      `
      customerDetails = customerResult[0] || null
    }

    // Organize data by document with complete service details
    const serviceHistoryWithDetails = serviceHistory.map(doc => {
      const docLineItems = lineItems.filter(item => item.document_id === doc.id.toString())
      const docReceipts = receipts.filter(receipt => receipt.document_id === doc.id.toString())

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
        customerId: doc.customer_id,
        customerName: doc.customer_name,
        labourDescription: doc.labour_description,
        notes: doc.notes,
        partsDescription: null,
        recommendations: null,
        workCarriedOut: null,
        nextServiceDue: null,
        lineItems: {
          all: docLineItems,
          labour: labour,
          parts: parts,
          other: other,
          summary: {
            labourTotal: labour.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0),
            partsTotal: parts.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0),
            otherTotal: other.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0)
          }
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

    // Service intervals analysis
    const serviceIntervals = []
    for (let i = 0; i < serviceHistoryWithDetails.length - 1; i++) {
      const current = serviceHistoryWithDetails[i]
      const previous = serviceHistoryWithDetails[i + 1]

      if (current.date && previous.date) {
        const daysBetween = Math.floor((new Date(current.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24))
        serviceIntervals.push(daysBetween)
      }
    }

    const averageServiceInterval = serviceIntervals.length > 0
      ? Math.round(serviceIntervals.reduce((sum, days) => sum + days, 0) / serviceIntervals.length)
      : null

    return NextResponse.json({
      success: true,
      vehicle: vehicleDetails[0] || null,
      customer: customerDetails,
      serviceHistory: serviceHistoryWithDetails,
      summary: {
        totalDocuments: serviceHistory.length,
        totalSpent: totalSpent,
        totalPaid: totalPaid,
        outstandingBalance: outstandingBalance,
        averageJobValue: serviceHistory.length > 0 ? totalSpent / serviceHistory.length : 0,
        averageServiceInterval: averageServiceInterval,
        dateRange: {
          earliest: serviceHistory[serviceHistory.length - 1]?.date,
          latest: serviceHistory[0]?.date
        },
        paymentStatus: {
          paid: serviceHistoryWithDetails.filter(doc => doc.paymentStatus === 'paid').length,
          unpaid: serviceHistoryWithDetails.filter(doc => doc.paymentStatus === 'unpaid').length
        },
        serviceTypes: {
          invoices: serviceHistoryWithDetails.filter(doc => doc.type === 'SI').length,
          quotes: serviceHistoryWithDetails.filter(doc => doc.type === 'SQ').length,
          other: serviceHistoryWithDetails.filter(doc => doc.type !== 'SI' && doc.type !== 'SQ').length
        }
      }
    })

  } catch (error) {
    console.error("[VEHICLE-SERVICE-HISTORY] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch vehicle service history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
