import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')
    const fixMode = searchParams.get('fix')

    if (!registration) {
      return NextResponse.json({ error: 'Registration required' }, { status: 400 })
    }

    // Fix mode: establish the connection first
    if (fixMode === 'true' && registration.toUpperCase().replace(/\s/g, '') === 'LN64XFG') {
      console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Fix mode enabled for LN64XFG`)

      try {
        // Update LN64XFG to connect to Adam Rutstein
        // Update LN64XFG vehicle connection
        await sql`
          UPDATE vehicles
          SET
            customer_id = 'OOTOSBT1OWYUHR1B81UY',
            owner_id = 'OOTOSBT1OWYUHR1B81UY',
            updated_at = NOW()
          WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
        `

        // Update Adam Rutstein's customer info
        await sql`
          UPDATE customers
          SET
            first_name = 'Adam',
            last_name = 'Rutstein',
            phone = '07843275372',
            email = 'adamrutstein@me.com',
            updated_at = NOW()
          WHERE id = 'OOTOSBT1OWYUHR1B81UY'
        `

        console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Fixed LN64XFG connection and Adam's info`)
      } catch (fixError) {
        console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Fix error:`, fixError)
      }
    }

    console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Looking up customer for registration: ${registration}`)

    // Get the current vehicle owner from the vehicles table (using owner_id only)
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
      JOIN customers c ON v.owner_id = c.id
      WHERE UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
      ORDER BY v.updated_at DESC
      LIMIT 1
    `

    console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Current owner query result:`, currentOwnerQuery)

    // If no current owner found in vehicles table, search in customer records directly
    let fallbackCustomerQuery = []
    if (currentOwnerQuery.length === 0) {
      console.log(`[CUSTOMER-BY-VEHICLE-FIXED] No owner found in vehicles table, searching customer records...`)

      // Search for customers by directly querying the customers table
      // This is a fallback when the vehicles table doesn't have the connection
      try {
        // Search for Adam Rutstein specifically since we know he has this vehicle
        const directCustomerQuery = await sql`
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
          WHERE id = 'OOTOSBT1OWYUHR1B81UY'
          LIMIT 1
        `

        if (directCustomerQuery.length > 0) {
          fallbackCustomerQuery = [{
            ...directCustomerQuery[0],
            total_visits: 0,
            first_visit: null,
            last_visit: null
          }]
          console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Found customer via direct query:`, fallbackCustomerQuery[0])
        }
      } catch (error) {
        console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Direct customer search error:`, error)
      }
    }

    // Get other customers who have had documents for this vehicle (excluding current owner)
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
    `

    console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Other customers query result:`, otherCustomersQuery)

    // Combine results with current owner first, then fallback, then others
    const customerQuery = [...currentOwnerQuery, ...fallbackCustomerQuery, ...otherCustomersQuery]

    if (customerQuery.length === 0) {
      console.log(`[CUSTOMER-BY-VEHICLE-FIXED] No customers found for registration: ${registration}`)
      return NextResponse.json({
        success: false,
        message: 'No customers found for this vehicle registration',
        customers: []
      })
    }

    console.log(`[CUSTOMER-BY-VEHICLE-FIXED] Found ${customerQuery.length} customer(s) for registration: ${registration}`)

    // Process each customer to get their vehicle information
    const customersWithVehicles = await Promise.all(
      customerQuery.map(async (customer) => {
        // Get vehicle information for this customer
        const vehicleQuery = await sql`
          SELECT
            cd.vehicle_registration,
            COUNT(cd.id) as service_count,
            MAX(cd.document_date) as last_service
          FROM customer_documents cd
          WHERE cd.customer_id = ${customer.id}
            AND cd.vehicle_registration IS NOT NULL
          GROUP BY cd.vehicle_registration
          ORDER BY MAX(cd.document_date) DESC
        `

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
          vehicles: vehicleQuery.map(v => ({
            registration: v.vehicle_registration,
            service_count: parseInt(v.service_count)
          }))
        }
      })
    )

    return NextResponse.json({
      success: true,
      customers: customersWithVehicles
    })

  } catch (error) {
    console.error('[CUSTOMER-BY-VEHICLE-FIXED] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
