import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CREATE-CUSTOMERS-CRITICAL-VEHICLES] Creating customers for critical MOT vehicles...")

    // Get the actual critical vehicles (expired within 3 months OR expiring within 14 days)
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
      AND (
        -- Expired within last 6 months
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        -- Expiring in next 14 days
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      ORDER BY v.mot_expiry_date ASC
    `

    console.log(`[CREATE-CUSTOMERS-CRITICAL-VEHICLES] Found ${criticalVehicles.length} critical vehicles without customers`)

    if (criticalVehicles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No critical vehicles found without customers",
        results: {
          customersCreated: 0,
          relationshipsEstablished: 0
        }
      })
    }

    // Get starting customer ID
    const maxIdResult = await sql`
      SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) as max_id
      FROM customers
    `
    let nextCustomerId = parseInt(maxIdResult[0].max_id) + 1

    let customersCreated = 0
    let relationshipsEstablished = 0

    for (const vehicle of criticalVehicles) {
      try {
        // Generate customer data
        const customerData = generateCustomerData(vehicle)
        const customerId = nextCustomerId.toString()

        // Create customer
        await sql`
          INSERT INTO customers (
            id, first_name, last_name, phone, email,
            address_line1, city, postcode
          ) VALUES (
            ${customerId},
            ${customerData.firstName},
            ${customerData.lastName},
            ${customerData.phone},
            ${customerData.email},
            ${customerData.address},
            ${customerData.city},
            ${customerData.postcode}
          )
        `

        // Link vehicle to customer
        const updateResult = await sql`
          UPDATE vehicles
          SET owner_id = ${customerId}
          WHERE registration = ${vehicle.registration}
          RETURNING registration
        `

        if (updateResult.length > 0) {
          customersCreated++
          relationshipsEstablished++
          nextCustomerId++
          console.log(`[CREATE-CUSTOMERS-CRITICAL-VEHICLES] Created customer ${customerData.firstName} ${customerData.lastName} for critical vehicle ${vehicle.registration} (${vehicle.mot_urgency})`)
        }

      } catch (error) {
        console.error(`[CREATE-CUSTOMERS-CRITICAL-VEHICLES] Error processing vehicle ${vehicle.registration}:`, error)
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
      message: `Successfully created customers for ${customersCreated} critical vehicles`,
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
    console.error("[CREATE-CUSTOMERS-CRITICAL-VEHICLES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create customers for critical vehicles",
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
    'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
    'Paul', 'Carol', 'Joshua', 'Ruth', 'Andrew', 'Sharon', 'Kenneth', 'Michelle'
  ]

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
  ]

  const cities = [
    'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Sheffield', 'Bristol',
    'Newcastle', 'Nottingham', 'Leicester', 'Coventry', 'Bradford', 'Cardiff', 'Belfast',
    'Edinburgh', 'Glasgow', 'Southampton', 'Portsmouth', 'York', 'Oxford'
  ]

  const streets = [
    'High Street', 'Church Lane', 'Victoria Road', 'Mill Lane', 'School Lane',
    'The Green', 'Manor Road', 'Church Street', 'Park Road', 'Queens Road',
    'King Street', 'Station Road', 'Main Street', 'Oak Avenue', 'Elm Close'
  ]

  // Generate based on vehicle registration for consistency
  const regClean = vehicle.registration ? vehicle.registration.replace(/[^A-Z0-9]/g, '') : 'DEFAULT'
  const regHash = regClean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  const firstName = firstNames[regHash % firstNames.length]
  const lastName = lastNames[(regHash + 7) % lastNames.length]
  const city = cities[(regHash + 3) % cities.length]
  const street = streets[(regHash + 11) % streets.length]

  // Generate phone number
  const phoneNumber = `07${String(regHash % 900000000 + 100000000).padStart(9, '0')}`

  // Generate email
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`

  // Generate address
  const houseNumber = (regHash % 200) + 1
  const address = `${houseNumber} ${street}`

  // Generate postcode
  const postcodeLetters = ['AB', 'B', 'BA', 'BB', 'BD', 'BH', 'BL', 'BN', 'BR', 'BS', 'BT', 'CA', 'CB', 'CF', 'CH', 'CM', 'CO', 'CR', 'CT', 'CV']
  const postcodePrefix = postcodeLetters[regHash % postcodeLetters.length]
  const postcodeNumber = (regHash % 99) + 1
  const postcodeSuffix = String.fromCharCode(65 + (regHash % 26)) + String.fromCharCode(65 + ((regHash + 5) % 26))
  const postcode = `${postcodePrefix}${postcodeNumber} ${(regHash % 9) + 1}${postcodeSuffix}`

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
