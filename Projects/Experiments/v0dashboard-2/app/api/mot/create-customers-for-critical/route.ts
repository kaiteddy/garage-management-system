import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CREATE-CUSTOMERS-CRITICAL] Creating customers for critical MOT vehicles...")

    // Get the actual critical vehicles that exist
    const criticalVehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date
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
      LIMIT 100
    `

    console.log(`[CREATE-CUSTOMERS-CRITICAL] Found ${criticalVehicles.length} critical vehicles`)

    if (criticalVehicles.length === 0) {
      // If no critical vehicles, create customers for some vehicles with MOT dates
      const vehiclesWithMOT = await sql`
        SELECT registration, make, model, mot_expiry_date
        FROM vehicles
        WHERE mot_expiry_date IS NOT NULL
        AND owner_id IS NULL
        AND registration IS NOT NULL
        AND registration != ''
        ORDER BY mot_expiry_date ASC
        LIMIT 50
      `

      console.log(`[CREATE-CUSTOMERS-CRITICAL] No critical vehicles found, using ${vehiclesWithMOT.length} vehicles with MOT dates`)

      return await createCustomersForVehicles(vehiclesWithMOT)
    }

    return await createCustomersForVehicles(criticalVehicles)

  } catch (error) {
    console.error("[CREATE-CUSTOMERS-CRITICAL] Error:", error)
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

async function createCustomersForVehicles(vehicles: any[]) {
  let customersCreated = 0
  let relationshipsEstablished = 0

  for (const vehicle of vehicles) {
    try {
      // Generate customer data
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

      console.log(`[CREATE-CUSTOMERS-CRITICAL] Created customer ${customerData.firstName} ${customerData.lastName} for vehicle ${vehicle.registration}`)

    } catch (error) {
      console.error(`[CREATE-CUSTOMERS-CRITICAL] Error processing vehicle ${vehicle.registration}:`, error)
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
    message: `Successfully created customers for vehicles`,
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

  // Generate based on vehicle registration for consistency
  const regHash = vehicle.registration ? vehicle.registration.replace(/[^A-Z0-9]/g, '').length : Math.floor(Math.random() * 100)
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
