import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const documentId = resolvedParams.id

    // Get complete document information
    const document = await sql`
      SELECT
        d.id,
        d.doc_number as document_number,
        d.doc_date_issued as date,
        d.doc_date_created as created_date,
        d.doc_date_paid as paid_date,
        d.doc_type as type,
        d.total_gross as amount,
        d.total_net,
        d.total_tax,
        d.status,
        d.vehicle_registration,
        d.customer_name,
        d.customer_company,
        d.customer_address,
        d.customer_phone,
        d.customer_mobile,
        d.vehicle_make,
        d.vehicle_model,
        d.vehicle_mileage,
        d._id_customer as customer_id,
        d._id_vehicle as vehicle_id,
        de.labour_description,
        de.doc_notes as notes
      FROM documents d
      LEFT JOIN document_extras de ON d.id::text = de.document_id::text
      WHERE d.id = ${documentId}
      LIMIT 1
    `

    if (document.length === 0) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      )
    }

    const doc = document[0]

    // Get all line items for this document
    const lineItems = await sql`
      SELECT
        li.id,
        li.document_id,
        li.description,
        li.quantity,
        li.unit_price,
        li.total_amount as total_price,
        li.line_type as item_type,
        li.tax_rate
      FROM line_items li
      WHERE li.document_id = ${documentId}
      ORDER BY li.id
    `

    // Get all receipts for this document
    const receipts = await sql`
      SELECT
        r.id,
        r.document_id,
        r.payment_date as receipt_date,
        r.amount,
        r.payment_method,
        r.notes as receipt_description,
        r.reference as reference_number
      FROM receipts r
      WHERE r.document_id = ${documentId}
      ORDER BY r.payment_date DESC
    `

    // Get customer details if available
    let customerDetails = null
    if (doc.customer_id) {
      const customerResult = await sql`
        SELECT
          id, first_name, last_name, phone, email,
          address_line1, address_line2, city, postcode, country
        FROM customers
        WHERE id = ${doc.customer_id}
        LIMIT 1
      `
      customerDetails = customerResult[0] || null
    }

    // Get vehicle details if available
    let vehicleDetails = null
    if (doc.vehicle_registration) {
      const vehicleResult = await sql`
        SELECT
          registration, make, model, year, color, fuel_type,
          mot_expiry_date, mot_status, vehicle_age
        FROM vehicles
        WHERE registration = ${doc.vehicle_registration}
           OR REPLACE(registration, ' ', '') = ${doc.vehicle_registration.replace(/\s+/g, '')}
        LIMIT 1
      `
      vehicleDetails = vehicleResult[0] || null
    }

    // Categorize line items
    const labour = lineItems.filter(item =>
      item.item_type?.toLowerCase().includes('labour') ||
      item.description?.toLowerCase().includes('labour')
    )
    const parts = lineItems.filter(item =>
      item.item_type?.toLowerCase().includes('parts') ||
      item.item_type?.toLowerCase().includes('part') ||
      item.description?.toLowerCase().includes('part')
    )
    const other = lineItems.filter(item =>
      !item.item_type?.toLowerCase().includes('labour') &&
      !item.item_type?.toLowerCase().includes('part') &&
      !item.description?.toLowerCase().includes('labour') &&
      !item.description?.toLowerCase().includes('part')
    )

    // Calculate totals
    const totalPaid = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount || '0'), 0)
    const outstandingBalance = parseFloat(doc.amount || '0') - totalPaid

    // Build complete document object
    const completeDocument = {
      id: doc.id,
      documentNumber: doc.document_number,
      date: doc.date,
      createdDate: doc.created_date,
      paidDate: doc.paid_date,
      type: doc.type,
      amount: parseFloat(doc.amount || '0'),
      totalNet: parseFloat(doc.total_net || '0'),
      totalTax: parseFloat(doc.total_tax || '0'),
      status: doc.status,

      // Vehicle information
      vehicle: {
        registration: doc.vehicle_registration,
        make: doc.vehicle_make || vehicleDetails?.make,
        model: doc.vehicle_model || vehicleDetails?.model,
        year: vehicleDetails?.year,
        color: vehicleDetails?.color,
        fuelType: vehicleDetails?.fuel_type,
        mileage: doc.vehicle_mileage,
        motExpiry: vehicleDetails?.mot_expiry_date,
        motStatus: vehicleDetails?.mot_status,
        age: vehicleDetails?.vehicle_age
      },

      // Customer information
      customer: {
        id: doc.customer_id,
        name: doc.customer_name,
        company: doc.customer_company,
        address: doc.customer_address,
        phone: doc.customer_phone,
        mobile: doc.customer_mobile,
        email: customerDetails?.email,
        fullAddress: customerDetails ? {
          addressLine1: customerDetails.address_line1,
          addressLine2: customerDetails.address_line2,
          city: customerDetails.city,
          postcode: customerDetails.postcode,
          country: customerDetails.country
        } : null
      },

      // Service details
      service: {
        labourDescription: doc.labour_description,
        partsDescription: null,
        workCarriedOut: null,
        recommendations: null,
        nextServiceDue: null,
        technicianName: null,
        jobCategory: null,
        warrantyInfo: null,
        notes: doc.notes
      },

      // Line items breakdown
      lineItems: {
        all: lineItems,
        labour: labour,
        parts: parts,
        other: other,
        summary: {
          labourTotal: labour.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0),
          partsTotal: parts.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0),
          otherTotal: other.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0),
          totalItems: lineItems.length
        }
      },

      // Payment information
      payments: {
        receipts: receipts,
        totalPaid: totalPaid,
        outstandingBalance: outstandingBalance,
        paymentStatus: totalPaid >= parseFloat(doc.amount || '0') ? 'paid' : 'partial',
        paymentMethods: [...new Set(receipts.map(r => r.payment_method).filter(Boolean))]
      }
    }

    return NextResponse.json({
      success: true,
      document: completeDocument,
      summary: {
        hasLineItems: lineItems.length > 0,
        hasReceipts: receipts.length > 0,
        hasCustomerDetails: !!customerDetails,
        hasVehicleDetails: !!vehicleDetails,
        isFullyPaid: totalPaid >= parseFloat(doc.amount || '0'),
        dataCompleteness: {
          basicInfo: 100,
          customerInfo: customerDetails ? 100 : 50,
          vehicleInfo: vehicleDetails ? 100 : 50,
          serviceDetails: doc.labour_description || doc.work_carried_out ? 100 : 25,
          lineItems: lineItems.length > 0 ? 100 : 0,
          payments: receipts.length > 0 ? 100 : 0
        }
      }
    })

  } catch (error) {
    console.error("[DOCUMENT-COMPLETE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch complete document information",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
