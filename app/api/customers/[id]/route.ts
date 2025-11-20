import { type NextRequest, NextResponse } from "next/server"
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const customerId = resolvedParams.id
    console.log(`[CUSTOMER-API] Fetching customer data for ID: ${customerId}`)

    // Get customer from database with all fields
    const customerQuery = await sql`
      SELECT
        c.*,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE c.id = ${customerId}
      GROUP BY c.id
      LIMIT 1
    `;

    if (customerQuery.length === 0) {
      console.log(`[CUSTOMER-API] Customer not found: ${customerId}`)
      return NextResponse.json({
        success: false,
        error: "Customer not found"
      }, { status: 404 })
    }

    const customer = customerQuery[0];

    // Debug: Log the raw customer data to understand the structure
    console.log(`[CUSTOMER-API] Raw customer data:`, {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address_line1: customer.address_line1,
      city: customer.city,
      postcode: customer.postcode
    });

    // Get customer vehicles
    const vehiclesQuery = await sql`
      SELECT
        registration,
        make,
        model,
        year,
        mot_expiry_date as motExpiry,
        color
      FROM vehicles
      WHERE owner_id = ${customerId}
      ORDER BY registration
    `;

    // Get customer documents/service history with job descriptions
    const documentsQuery = await sql`
      SELECT
        d.id,
        d.doc_date_issued as date,
        d.doc_type as type,
        d.doc_number as number,
        d.total_gross as amount,
        d.vehicle_registration,
        d.status,
        de.labour_description,
        de.doc_notes,
        -- Get a summary of line items
        COALESCE(
          STRING_AGG(DISTINCT li.description, ', ' ORDER BY li.description),
          de.labour_description,
          'No description available'
        ) as job_description
      FROM documents d
      LEFT JOIN document_extras de ON d._id = de.document_id
      LEFT JOIN line_items li ON d._id = li.document_id
      WHERE d._id_customer = ${customerId}
      GROUP BY d.id, d.doc_date_issued, d.doc_type, d.doc_number, d.total_gross, d.vehicle_registration, d.status, de.labour_description, de.doc_notes
      ORDER BY d.doc_date_issued DESC
      LIMIT 10
    `;

    // Calculate totals
    const totalsQuery = await sql`
      SELECT
        COUNT(DISTINCT d.id) as total_jobs,
        COALESCE(SUM(d.total_gross), 0) as total_spent
      FROM documents d
      WHERE d._id_customer = ${customerId}
    `;

    const totals = totalsQuery[0] || { total_jobs: 0, total_spent: 0 };

    // Format customer data to match expected structure
    // Map current database fields to expected frontend fields
    const customerData = {
      id: customer.id,
      _ID: customer.id, // Legacy compatibility
      accountNumber: customer.account_number,
      title: customer.title,
      forename: customer.first_name,
      surname: customer.last_name,
      companyName: customer.company_name,
      contactTelephone: customer.phone,
      contactMobile: customer.phone, // Same field in current schema
      contactEmail: customer.email,
      addressHouseNo: customer.address_line1?.split(' ')[0] || '',
      addressRoad: customer.address_line1,
      addressLocality: customer.address_line2,
      addressTown: customer.city,
      addressCounty: customer.country,
      addressPostCode: customer.postcode,
      notes: customer.notes,
      vehicleCount: parseInt(customer.vehicle_count) || 0,
      lastInvoiceDate: customer.last_contact_date,
      vehicles: vehiclesQuery,
      documents: documentsQuery,
      totalJobs: parseInt(totals.total_jobs) || 0,
      totalSpent: parseFloat(totals.total_spent) || 0,
      // Additional legacy compatibility fields
      nameTitle: customer.title,
      nameForename: customer.first_name,
      nameSurname: customer.last_name,
      nameCompany: customer.company_name
    };

    console.log(`[CUSTOMER-API] ✅ Customer data loaded:`, {
      id: customerData.id,
      name: `${customerData.forename} ${customerData.surname}`,
      vehicles: customerData.vehicleCount
    });

    return NextResponse.json(customerData);
  } catch (error) {
    console.error("[CUSTOMER-API] Error fetching customer:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to load customer data"
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id
    const updates = await request.json()

    console.log(`[CUSTOMER-API] Updating customer: ${customerId}`, updates)

    // Update customer in database
    const updateQuery = await sql`
      UPDATE customers
      SET
        forename = ${updates.forename || updates.first_name},
        surname = ${updates.surname || updates.last_name},
        contact_telephone = ${updates.contactTelephone || updates.phone},
        contact_mobile = ${updates.contactMobile},
        contact_email = ${updates.contactEmail || updates.email},
        address_house_no = ${updates.addressHouseNo || updates.address_line1},
        address_road = ${updates.addressRoad || updates.address_line2},
        address_locality = ${updates.addressLocality},
        address_town = ${updates.addressTown || updates.city},
        address_county = ${updates.addressCounty},
        address_post_code = ${updates.addressPostCode || updates.postcode}
      WHERE id = ${customerId}
      RETURNING *
    `;

    if (updateQuery.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Customer not found"
      }, { status: 404 })
    }

    const updatedCustomer = updateQuery[0];

    return NextResponse.json({
      success: true,
      customer: {
        id: updatedCustomer.id,
        _ID: updatedCustomer.id,
        forename: updatedCustomer.forename,
        surname: updatedCustomer.surname,
        contactTelephone: updatedCustomer.contact_telephone,
        contactMobile: updatedCustomer.contact_mobile,
        contactEmail: updatedCustomer.contact_email,
        addressHouseNo: updatedCustomer.address_house_no,
        addressRoad: updatedCustomer.address_road,
        addressLocality: updatedCustomer.address_locality,
        addressTown: updatedCustomer.address_town,
        addressCounty: updatedCustomer.address_county,
        addressPostCode: updatedCustomer.address_post_code
      }
    });

  } catch (error) {
    console.error("[CUSTOMER-API] Error updating customer:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to update customer"
    }, { status: 500 })
  }
}
