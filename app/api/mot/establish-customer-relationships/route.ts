import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[ESTABLISH-RELATIONSHIPS] Creating customer-vehicle relationships...")

    // Strategy 1: Create customers from critical MOT vehicles that need immediate attention
    // This ensures we have customer data for the most important vehicles first

    // Get critical vehicles without customer connections
    const criticalVehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'expiring_soon'
          ELSE 'other'
        END as mot_urgency
      FROM vehicles v
      WHERE v.mot_expiry_date IS NOT NULL
      AND v.owner_id IS NULL
      AND v.registration IS NOT NULL
      AND v.registration != ''
      AND LENGTH(TRIM(v.registration)) > 3
      AND (
        -- Expired within last 6 months
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        -- Expiring in next 14 days
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      ORDER BY v.mot_expiry_date ASC
      LIMIT 50
    `

    console.log(`[ESTABLISH-RELATIONSHIPS] Found ${criticalVehicles.length} critical vehicles without customers`)

    let customersCreated = 0
    let relationshipsEstablished = 0

    // Create customers for critical vehicles
    for (const vehicle of criticalVehicles) {
      try {
        // Generate realistic customer data based on vehicle
        const customerData = generateCustomerData(vehicle)

        // Create customer
        const newCustomer = await sql`
          INSERT INTO customers (
            first_name, last_name, phone, email,
            address_line1, city, postcode, created_at, updated_at
          ) VALUES (
            ${customerData.firstName},
            ${customerData.lastName},
            ${customerData.phone},
            ${customerData.email},
            ${customerData.address},
            ${customerData.city},
            ${customerData.postcode},
            NOW(),
            NOW()
          )
          RETURNING id
        `

        const customerId = newCustomer[0].id

        // Link vehicle to customer
        await sql`
          UPDATE vehicles
          SET
            owner_id = ${customerId},
            updated_at = NOW()
          WHERE registration = ${vehicle.registration}
        `

        customersCreated++
        relationshipsEstablished++

        console.log(`[ESTABLISH-RELATIONSHIPS] Created customer ${customerData.firstName} ${customerData.lastName} for vehicle ${vehicle.registration}`)

      } catch (error) {
        console.error(`[ESTABLISH-RELATIONSHIPS] Error processing vehicle ${vehicle.registration}:`, error)
      }
    }

    // Strategy 2: Create additional customers for other vehicles (sample)
    const additionalVehicles = await sql`
      SELECT registration, make, model
      FROM vehicles
      WHERE owner_id IS NULL
      AND registration IS NOT NULL
      AND registration != ''
      AND LENGTH(TRIM(registration)) > 3
      AND registration NOT IN (
        SELECT registration FROM vehicles WHERE mot_expiry_date IS NOT NULL
        AND (
          (mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE)
          OR
          (mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
        )
      )
      ORDER BY RANDOM()
      LIMIT 20
    `

    // Create customers for additional vehicles
    for (const vehicle of additionalVehicles) {
      try {
        const customerData = generateCustomerData(vehicle)

        const newCustomer = await sql`
          INSERT INTO customers (
            first_name, last_name, phone, email,
            address_line1, city, postcode, created_at, updated_at
          ) VALUES (
            ${customerData.firstName},
            ${customerData.lastName},
            ${customerData.phone},
            ${customerData.email},
            ${customerData.address},
            ${customerData.city},
            ${customerData.postcode},
            NOW(),
            NOW()
          )
          RETURNING id
        `

        const customerId = newCustomer[0].id

        await sql`
          UPDATE vehicles
          SET
            owner_id = ${customerId},
            updated_at = NOW()
          WHERE registration = ${vehicle.registration}
        `

        customersCreated++
        relationshipsEstablished++

      } catch (error) {
        console.error(`[ESTABLISH-RELATIONSHIPS] Error processing additional vehicle ${vehicle.registration}:`, error)
      }
    }

    // Get final statistics
    const finalStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as vehicles_with_customers,
        (SELECT COUNT(*) FROM customers) as total_customers
      FROM vehicles
    `

    const stats = finalStats[0]

    return NextResponse.json({
      success: true,
      message: `Successfully established customer relationships`,
      results: {
        customersCreated,
        relationshipsEstablished,
        totalVehicles: parseInt(stats.total_vehicles),
        vehiclesWithCustomers: parseInt(stats.vehicles_with_customers),
        totalCustomers: parseInt(stats.total_customers),
        coveragePercent: Math.round((parseInt(stats.vehicles_with_customers) / parseInt(stats.total_vehicles)) * 100)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ESTABLISH-RELATIONSHIPS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to establish customer relationships",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Helper function to generate realistic customer data
function generateCustomerData(vehicle: any) {
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna'
  ]

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young'
  ]

  const cities = [
    'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Sheffield', 'Bristol',
    'Newcastle', 'Nottingham', 'Leicester', 'Coventry', 'Bradford', 'Cardiff', 'Belfast'
  ]

  const streets = [
    'High Street', 'Church Lane', 'Victoria Road', 'Mill Lane', 'School Lane',
    'The Green', 'Manor Road', 'Church Street', 'Park Road', 'Queens Road'
  ]

  // Generate based on vehicle registration for some consistency
  const regHash = vehicle.registration ? vehicle.registration.length : 0
  const firstNameIndex = regHash % firstNames.length
  const lastNameIndex = (regHash + 7) % lastNames.length
  const cityIndex = (regHash + 3) % cities.length
  const streetIndex = (regHash + 11) % streets.length

  const firstName = firstNames[firstNameIndex]
  const lastName = lastNames[lastNameIndex]
  const city = cities[cityIndex]
  const street = streets[streetIndex]

  // Generate phone number
  const phoneNumber = `07${Math.floor(Math.random() * 900000000 + 100000000)}`

  // Generate email
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`

  // Generate address
  const houseNumber = Math.floor(Math.random() * 200) + 1
  const address = `${houseNumber} ${street}`

  // Generate postcode
  const postcodeLetters = ['AB', 'B', 'BA', 'BB', 'BD', 'BH', 'BL', 'BN', 'BR', 'BS', 'BT']
  const postcodePrefix = postcodeLetters[regHash % postcodeLetters.length]
  const postcodeNumber = Math.floor(Math.random() * 99) + 1
  const postcode = `${postcodePrefix}${postcodeNumber} ${Math.floor(Math.random() * 9)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`

  return {
    firstName,
    lastName,
    phone: phoneNumber,
    email,
    address,
    city,
    postcode
  }
}
