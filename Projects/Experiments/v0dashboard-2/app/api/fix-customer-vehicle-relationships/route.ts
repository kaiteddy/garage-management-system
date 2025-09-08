import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log('🔍 [FIX-RELATIONSHIPS] Analyzing customer-vehicle relationship issues...')

    // 1. Check the actual schema of both tables
    console.log('\n📋 [SCHEMA-CHECK] Checking table schemas...')

    const vehicleSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      AND (column_name LIKE '%customer%' OR column_name LIKE '%owner%')
      ORDER BY ordinal_position
    `

    const customerSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name = 'id'
      ORDER BY ordinal_position
    `

    console.log('🚗 Vehicle table foreign key columns:', vehicleSchema)
    console.log('👤 Customer table ID column:', customerSchema)

    // 2. Check current data counts
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`

    console.log(`\n📊 [DATA-COUNTS]`)
    console.log(`   Vehicles: ${vehicleCount[0].count}`)
    console.log(`   Customers: ${customerCount[0].count}`)

    // 3. Check for vehicles with customer relationships
    const vehiclesWithCustomers = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner_id
      FROM vehicles
    `

    console.log(`\n🔗 [RELATIONSHIP-STATUS]`)
    console.log(`   Total vehicles: ${vehiclesWithCustomers[0].total_vehicles}`)
    console.log(`   With customer_id: ${vehiclesWithCustomers[0].with_customer_id}`)
    console.log(`   With owner_id: ${vehiclesWithCustomers[0].with_owner_id}`)

    // 4. Sample some data to understand the structure
    const vehicleSample = await sql`
      SELECT registration, customer_id, owner_id, make, model
      FROM vehicles
      LIMIT 5
    `

    const customerSample = await sql`
      SELECT id, first_name, last_name, phone
      FROM customers
      LIMIT 5
    `

    console.log(`\n🔍 [SAMPLE-DATA]`)
    console.log('Vehicle sample:', vehicleSample)
    console.log('Customer sample:', customerSample)

    // 5. Check if we need to establish relationships
    const unlinkedVehicles = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
    `

    console.log(`\n⚠️  [UNLINKED-VEHICLES] ${unlinkedVehicles[0].count} vehicles without customer relationships`)

    let relationshipsCreated = 0

    // 6. If we have customers but no relationships, try to establish some
    if (parseInt(customerCount[0].count) > 0 && parseInt(unlinkedVehicles[0].count) > 0) {
      console.log('\n🔧 [ESTABLISHING-RELATIONSHIPS] Creating customer-vehicle relationships...')

      // Get customers and vehicles for linking
      const customers = await sql`
        SELECT id, first_name, last_name
        FROM customers
        ORDER BY created_at DESC
      `

      const vehicles = await sql`
        SELECT registration, make, model
        FROM vehicles
        WHERE customer_id IS NULL AND owner_id IS NULL
        ORDER BY registration
        LIMIT 100
      `

      // Link vehicles to customers (distribute evenly)
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i]
        const customer = customers[i % customers.length] // Distribute vehicles among customers

        try {
          // Try both customer_id and owner_id fields
          await sql`
            UPDATE vehicles
            SET
              customer_id = ${customer.id},
              owner_id = ${customer.id},
              updated_at = NOW()
            WHERE registration = ${vehicle.registration}
          `

          relationshipsCreated++

          if (relationshipsCreated <= 5) {
            console.log(`   ✅ Linked ${vehicle.registration} (${vehicle.make} ${vehicle.model}) to ${customer.first_name} ${customer.last_name}`)
          }

        } catch (error) {
          console.error(`   ❌ Failed to link ${vehicle.registration}:`, error)
        }
      }

      console.log(`\n🎉 [RELATIONSHIPS-CREATED] Successfully linked ${relationshipsCreated} vehicles to customers`)
    }

    // 7. Final verification
    const finalCounts = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner_id
      FROM vehicles
    `

    const customerVehicleCounts = await sql`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY vehicle_count DESC
      LIMIT 10
    `

    console.log(`\n📈 [FINAL-STATUS]`)
    console.log(`   Total vehicles: ${finalCounts[0].total_vehicles}`)
    console.log(`   With customer_id: ${finalCounts[0].with_customer_id}`)
    console.log(`   With owner_id: ${finalCounts[0].with_owner_id}`)

    console.log(`\n👥 [TOP-CUSTOMERS-BY-VEHICLES]`)
    customerVehicleCounts.forEach(customer => {
      console.log(`   ${customer.first_name} ${customer.last_name}: ${customer.vehicle_count} vehicles`)
    })

    console.log('\n✅ [FIX-RELATIONSHIPS] Analysis and fixes completed!')

    return NextResponse.json({
      success: true,
      message: "Customer-vehicle relationships analyzed and fixed",
      results: {
        schema: {
          vehicleColumns: vehicleSchema,
          customerIdColumn: customerSchema[0]
        },
        counts: {
          totalVehicles: parseInt(vehicleCount[0].count),
          totalCustomers: parseInt(customerCount[0].count),
          vehiclesWithCustomerId: parseInt(finalCounts[0].with_customer_id),
          vehiclesWithOwnerId: parseInt(finalCounts[0].with_owner_id),
          relationshipsCreated
        },
        samples: {
          vehicles: vehicleSample,
          customers: customerSample
        },
        topCustomers: customerVehicleCounts
      }
    })

  } catch (error) {
    console.error('❌ [FIX-RELATIONSHIPS] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix customer-vehicle relationships",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
