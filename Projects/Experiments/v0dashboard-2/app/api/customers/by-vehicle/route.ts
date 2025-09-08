import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');

    if (!registration) {
      return NextResponse.json({ error: 'Registration parameter is required' }, { status: 400 });
    }

    console.log(`[CUSTOMER-BY-VEHICLE] Looking up customer for registration: ${registration}`);

    // First, check what tables exist and their structure
    console.log(`[CUSTOMER-BY-VEHICLE] Checking database structure...`);
    console.log(`[CUSTOMER-BY-VEHICLE] FORCE RECOMPILE - About to query vehicles table`);

    // Use the EXACT same query as our working debug endpoint
    const currentOwnerQuery = await sql`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.address_line2,
        c.city,
        c.postcode,
        0 as total_visits,
        v.updated_at as first_visit,
        v.updated_at as last_visit
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.registration = ${registration}
        AND v.active = true
      ORDER BY v.created_at DESC
      LIMIT 1
    `;

    console.log(`[CUSTOMER-BY-VEHICLE] FIXED - Current owner query result:`, currentOwnerQuery);

    // Then get other customers who have had documents for this vehicle (excluding current owner)
    const otherCustomersQuery = await sql`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.address_line2,
        c.city,
        c.postcode,
        COUNT(cd.id) as total_visits,
        MIN(cd.document_date) as first_visit,
        MAX(cd.document_date) as last_visit
      FROM customers c
      LEFT JOIN customer_documents cd ON c.id = cd.customer_id
      WHERE UPPER(REPLACE(cd.vehicle_registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
        AND c.id != ${currentOwnerQuery[0]?.id || 'none'}
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email, c.address_line1, c.address_line2, c.city, c.postcode
      ORDER BY MAX(cd.document_date) DESC
    `;

    console.log(`[CUSTOMER-BY-VEHICLE] Other customers query result:`, otherCustomersQuery);

    // Combine results with current owner first
    const customerQuery = [...currentOwnerQuery, ...otherCustomersQuery];

    if (customerQuery.length === 0) {
      console.log(`[CUSTOMER-BY-VEHICLE] No customers found for registration: ${registration}`);
      return NextResponse.json({
        success: true,
        customers: [],
        message: 'No customers found for this vehicle registration'
      });
    }

    console.log(`[CUSTOMER-BY-VEHICLE] Found ${customerQuery.length} customer(s) for registration: ${registration}`);

    // For each customer, get their vehicles from customer_documents table
    const customersWithVehicles = await Promise.all(
      customerQuery.map(async (customer) => {
        const vehicles = await sql`
          SELECT DISTINCT
            cd.vehicle_registration as registration,
            '' as make,
            '' as model,
            MIN(cd.document_date) as first_service,
            MAX(cd.document_date) as last_service,
            COUNT(cd.id) as service_count
          FROM customer_documents cd
          WHERE cd.customer_id = ${customer.id}
            AND cd.vehicle_registration IS NOT NULL
          GROUP BY cd.vehicle_registration
          ORDER BY MAX(cd.document_date) DESC
        `;

        return {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          email: customer.email,
          address_line1: customer.address_line1,
          address_line2: customer.address_line2,
          city: customer.city,
          postcode: customer.postcode,
          total_visits: parseInt(customer.total_visits) || 0,
          first_visit: customer.first_visit,
          last_visit: customer.last_visit,
          vehicles: vehicles,
          // Determine if this is likely the current owner (most recent service)
          is_current_owner: customerQuery.indexOf(customer) === 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      customers: customersWithVehicles,
      // For backward compatibility, also include the most recent customer as 'customer'
      customer: customersWithVehicles[0] || null,
      message: `Found ${customersWithVehicles.length} customer record(s) for this vehicle`
    });

  } catch (error) {
    console.error('[CUSTOMER-BY-VEHICLE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup customer by vehicle registration' },
      { status: 500 }
    );
  }
}
