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

    // Try to find customer through documents table (which seems to have vehicle_registration)
    const customerQuery = await sql`
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
        COUNT(d.id) as total_visits,
        MAX(d.doc_date_issued) as last_visit
      FROM customers c
      LEFT JOIN documents d ON c.id::text = d._id_customer
      WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email, c.address_line1, c.address_line2, c.city, c.postcode
      LIMIT 1
    `;

    if (customerQuery.length === 0) {
      console.log(`[CUSTOMER-BY-VEHICLE] No customer found for registration: ${registration}`);
      return NextResponse.json({
        success: true,
        customer: null,
        message: 'No customer found for this vehicle registration'
      });
    }

    const customer = customerQuery[0];
    console.log(`[CUSTOMER-BY-VEHICLE] Found customer via documents: ${customer.first_name} ${customer.last_name}`);

    // Get customer's vehicles from documents table
    const vehicles = await sql`
      SELECT DISTINCT
        d.vehicle_registration as registration,
        d.vehicle_make as make,
        d.vehicle_model as model,
        EXTRACT(YEAR FROM d.doc_date_issued) as year
      FROM documents d
      WHERE d._id_customer = ${customer.id}::text
        AND d.vehicle_registration IS NOT NULL
      ORDER BY d.vehicle_registration
    `;

    return NextResponse.json({
      success: true,
      customer: {
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
        last_visit: customer.last_visit,
        vehicles: vehicles
      }
    });

  } catch (error) {
    console.error('[CUSTOMER-BY-VEHICLE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup customer by vehicle registration' },
      { status: 500 }
    );
  }
}
