import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const documentId = resolvedParams.id
    console.log(`[DOCUMENT-DETAILS] 📄 Fetching complete details for document ID: ${documentId}`)

    // Fetch main document details
    const documentResult = await sql`
      SELECT
        d.id,
        d.doc_number,
        d.customer_name,
        d.vehicle_registration,
        d.total_gross,
        d.total_net,
        d.total_tax,
        d.doc_date_issued,
        d.status,
        d._id,
        d._id_customer,
        d.doc_type
      FROM documents d
      WHERE d.id = ${documentId}
    `

    if (documentResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Document not found"
      }, { status: 404 })
    }

    const document = documentResult[0]

    // Fetch customer details
    const customerResult = await sql`
      SELECT
        id,
        first_name,
        last_name,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        postcode
      FROM customers
      WHERE id = ${document._id_customer}
    `

    // Fetch vehicle details
    const vehicleResult = await sql`
      SELECT
        registration,
        make,
        model,
        year,
        engine_size,
        fuel_type,
        mot_expiry_date,
        tax_due_date
      FROM vehicles
      WHERE registration = ${document.vehicle_registration}
    `

    // Fetch line items
    const lineItemsResult = await sql`
      SELECT
        id,
        description,
        quantity,
        unit_price,
        total_price,
        tax_rate,
        item_type
      FROM document_line_items
      WHERE document_id = ${documentId}
      ORDER BY id
    `

    // Fetch document extras (service descriptions)
    const extrasResult = await sql`
      SELECT
        labour_description,
        doc_notes
      FROM document_extras
      WHERE document_id = ${documentId}
    `

    // Calculate totals from line items
    const lineItemTotals = lineItemsResult.reduce((acc, item) => {
      acc.subtotal += parseFloat(item.total_price || 0)
      acc.tax += parseFloat(item.total_price || 0) * (parseFloat(item.tax_rate || 0) / 100)
      return acc
    }, { subtotal: 0, tax: 0 })

    const response = {
      success: true,
      document: {
        id: document.id,
        documentNumber: document.doc_number,
        type: document.doc_type === '1' ? 'Service Invoice' : 'Document',
        date: document.doc_date_issued,
        status: document.status,

        // Financial details
        totalGross: parseFloat(document.total_gross || 0),
        totalNet: parseFloat(document.total_net || 0),
        totalTax: parseFloat(document.total_tax || 0),

        // Customer information
        customer: customerResult.length > 0 ? {
          id: customerResult[0].id,
          name: `${customerResult[0].first_name || ''} ${customerResult[0].last_name || ''}`.trim(),
          firstName: customerResult[0].first_name,
          lastName: customerResult[0].last_name,
          phone: customerResult[0].phone,
          email: customerResult[0].email,
          address: {
            line1: customerResult[0].address_line1,
            line2: customerResult[0].address_line2,
            city: customerResult[0].city,
            postcode: customerResult[0].postcode
          }
        } : {
          name: document.customer_name || 'N/A',
          phone: 'N/A',
          email: 'N/A'
        },

        // Vehicle information
        vehicle: vehicleResult.length > 0 ? {
          registration: vehicleResult[0].registration,
          make: vehicleResult[0].make,
          model: vehicleResult[0].model,
          year: vehicleResult[0].year,
          engineSize: vehicleResult[0].engine_size,
          fuelType: vehicleResult[0].fuel_type,
          motExpiry: vehicleResult[0].mot_expiry_date,
          taxExpiry: vehicleResult[0].tax_due_date
        } : {
          registration: document.vehicle_registration || 'N/A',
          make: 'N/A',
          model: 'N/A'
        },

        // Line items
        lineItems: lineItemsResult.map(item => ({
          id: item.id,
          description: item.description,
          quantity: parseFloat(item.quantity || 0),
          unitPrice: parseFloat(item.unit_price || 0),
          totalPrice: parseFloat(item.total_price || 0),
          taxRate: parseFloat(item.tax_rate || 0),
          type: item.item_type
        })),

        // Service details
        serviceDetails: extrasResult.length > 0 ? {
          labourDescription: extrasResult[0].labour_description,
          notes: extrasResult[0].doc_notes
        } : null,

        // Calculated totals
        calculatedTotals: {
          subtotal: lineItemTotals.subtotal,
          tax: lineItemTotals.tax,
          total: lineItemTotals.subtotal + lineItemTotals.tax,
          itemCount: lineItemsResult.length
        }
      }
    }

    console.log(`[DOCUMENT-DETAILS] ✅ Successfully fetched details for document ${documentId}`)
    console.log(`[DOCUMENT-DETAILS] Customer: ${response.document.customer.name}`)
    console.log(`[DOCUMENT-DETAILS] Vehicle: ${response.document.vehicle.registration}`)
    console.log(`[DOCUMENT-DETAILS] Total: £${response.document.totalGross}`)
    console.log(`[DOCUMENT-DETAILS] Line Items: ${response.document.lineItems.length}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error("[DOCUMENT-DETAILS] ❌ Error fetching document details:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch document details",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
