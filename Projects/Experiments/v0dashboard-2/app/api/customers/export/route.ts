import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Get all customers with their details
    const customers = await sql`
      SELECT
        id,
        first_name,
        last_name,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        country,
        postcode,
        date_of_birth,
        contact_preference,
        phone_verified,
        opt_out,
        created_at,
        updated_at
      FROM customers
      ORDER BY last_name, first_name
    `;

    // Convert to CSV format
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Phone',
      'Email',
      'Address Line 1',
      'Address Line 2',
      'City',
      'Country',
      'Postcode',
      'Date of Birth',
      'Contact Preference',
      'Phone Verified',
      'Opt Out',
      'Created At',
      'Updated At'
    ];

    const csvRows = [
      headers.join(','),
      ...customers.map(customer => [
        customer.id,
        customer.first_name || '',
        customer.last_name || '',
        customer.phone || '',
        customer.email || '',
        customer.address_line1 || '',
        customer.address_line2 || '',
        customer.city || '',
        customer.country || '',
        customer.postcode || '',
        customer.date_of_birth || '',
        customer.contact_preference || '',
        customer.phone_verified || false,
        customer.opt_out || false,
        customer.created_at || '',
        customer.updated_at || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to export customers',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
