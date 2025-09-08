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

    // Get customer vehicles (using owner_id only for consistency)
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
        cd.id,
        cd.document_date as date,
        cd.document_type as type,
        cd.document_number as number,
        cd.total_gross as amount,
        cd.vehicle_registration,
        cd.status,
        de.labour_description,
        de.doc_notes,
        -- Get a summary of line items
        COALESCE(
          STRING_AGG(DISTINCT li.description, ', ' ORDER BY li.description),
          de.labour_description,
          'No description available'
        ) as job_description
      FROM customer_documents cd
      LEFT JOIN document_extras de ON cd.id = de.document_id
      LEFT JOIN line_items li ON cd.id = li.document_id
      WHERE cd.customer_id = ${customerId}
      GROUP BY cd.id, cd.document_date, cd.document_type, cd.document_number, cd.total_gross, cd.vehicle_registration, cd.status, de.labour_description, de.doc_notes
      ORDER BY cd.document_date DESC
      LIMIT 10
    `;

    // Calculate totals
    const totalsQuery = await sql`
      SELECT
        COUNT(DISTINCT cd.id) as total_jobs,
        COALESCE(SUM(cd.total_gross), 0) as total_spent
      FROM customer_documents cd
      WHERE cd.customer_id = ${customerId}
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params
    const updates = await request.json()

    console.log(`[CUSTOMER-API] Updating customer: ${customerId}`, updates)

    // Update customer in database
    const updateQuery = await sql`
      UPDATE customers
      SET
        first_name = ${updates.forename || updates.first_name},
        last_name = ${updates.surname || updates.last_name},
        phone = ${updates.contactTelephone || updates.phone},
        email = ${updates.contactEmail || updates.email},
        address_line1 = ${updates.addressRoad || updates.address_line1},
        address_line2 = ${updates.addressLocality || updates.address_line2},
        city = ${updates.addressTown || updates.city},
        postcode = ${updates.addressPostCode || updates.postcode}
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
