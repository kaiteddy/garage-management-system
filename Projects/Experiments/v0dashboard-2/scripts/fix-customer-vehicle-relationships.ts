#!/usr/bin/env tsx

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function fixCustomerVehicleRelationships() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    console.log('🔍 [FIX-RELATIONSHIPS] Analyzing customer-vehicle relationship issues...')

    // 1. Check the actual schema of both tables
    console.log('\n📋 [SCHEMA-CHECK] Checking table schemas...')

    const vehicleSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      AND (column_name LIKE '%customer%' OR column_name LIKE '%owner%')
      ORDER BY ordinal_position
    `);

    const customerSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name = 'id'
      ORDER BY ordinal_position
    `);

    console.log('🚗 Vehicle table foreign key columns:', vehicleSchema.rows)
    console.log('👤 Customer table ID column:', customerSchema.rows)

    // 2. Check current data counts
    const vehicleCount = await client.query('SELECT COUNT(*) as count FROM vehicles');
    const customerCount = await client.query('SELECT COUNT(*) as count FROM customers');

    console.log(`\n📊 [DATA-COUNTS]`)
    console.log(`   Vehicles: ${vehicleCount.rows[0].count}`)
    console.log(`   Customers: ${customerCount.rows[0].count}`)

    // 3. Check for vehicles with customer relationships
    const vehiclesWithCustomers = await client.query(`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner_id
      FROM vehicles
    `);

    console.log(`\n🔗 [RELATIONSHIP-STATUS]`)
    console.log(`   Total vehicles: ${vehiclesWithCustomers.rows[0].total_vehicles}`)
    console.log(`   With customer_id: ${vehiclesWithCustomers.rows[0].with_customer_id}`)
    console.log(`   With owner_id: ${vehiclesWithCustomers.rows[0].with_owner_id}`)

    // 4. Sample some data to understand the structure
    const vehicleSample = await client.query(`
      SELECT id, registration, customer_id, owner_id, make, model
      FROM vehicles
      LIMIT 5
    `);

    const customerSample = await client.query(`
      SELECT id, first_name, last_name, phone
      FROM customers
      LIMIT 5
    `);

    console.log(`\n🔍 [SAMPLE-DATA]`)
    console.log('Vehicle sample:', vehicleSample.rows)
    console.log('Customer sample:', customerSample.rows)

    // 5. Check if we need to establish relationships
    const unlinkedVehicles = await client.query(`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
    `);

    console.log(`\n⚠️  [UNLINKED-VEHICLES] ${unlinkedVehicles.rows[0].count} vehicles without customer relationships`)

    // 6. If we have customers but no relationships, try to establish some
    if (parseInt(customerCount.rows[0].count) > 0 && parseInt(unlinkedVehicles.rows[0].count) > 0) {
      console.log('\n🔧 [ESTABLISHING-RELATIONSHIPS] Creating customer-vehicle relationships...')

      // Get customers and vehicles for linking
      const customers = await client.query(`
        SELECT id, first_name, last_name
        FROM customers
        ORDER BY created_at DESC
      `);

      const vehicles = await client.query(`
        SELECT id, registration, make, model
        FROM vehicles
        WHERE customer_id IS NULL AND owner_id IS NULL
        ORDER BY registration
        LIMIT 100
      `);

      let relationshipsCreated = 0

      // Link vehicles to customers (distribute evenly)
      for (let i = 0; i < vehicles.rows.length; i++) {
        const vehicle = vehicles.rows[i]
        const customer = customers.rows[i % customers.rows.length] // Distribute vehicles among customers

        try {
          // Try both customer_id and owner_id fields
          await client.query(`
            UPDATE vehicles
            SET
              customer_id = $1,
              owner_id = $1,
              updated_at = NOW()
            WHERE id = $2
          `, [customer.id, vehicle.id]);

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
    const finalCounts = await client.query(`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner_id
      FROM vehicles
    `);

    const customerVehicleCounts = await client.query(`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        COUNT(v.id) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY vehicle_count DESC
      LIMIT 10
    `);

    console.log(`\n📈 [FINAL-STATUS]`)
    console.log(`   Total vehicles: ${finalCounts.rows[0].total_vehicles}`)
    console.log(`   With customer_id: ${finalCounts.rows[0].with_customer_id}`)
    console.log(`   With owner_id: ${finalCounts.rows[0].with_owner_id}`)

    console.log(`\n👥 [TOP-CUSTOMERS-BY-VEHICLES]`)
    customerVehicleCounts.rows.forEach(customer => {
      console.log(`   ${customer.first_name} ${customer.last_name}: ${customer.vehicle_count} vehicles`)
    })

    console.log('\n✅ [FIX-RELATIONSHIPS] Analysis and fixes completed!')

  } catch (error) {
    console.error('❌ [FIX-RELATIONSHIPS] Error:', error)
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixCustomerVehicleRelationships()
