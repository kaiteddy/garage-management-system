import dotenv from 'dotenv'
import { sql } from '../lib/database/neon-client'

dotenv.config({ path: '.env.local' })

async function fixVehicleCustomerConnections() {
  console.log('🔗 FIXING VEHICLE-CUSTOMER CONNECTIONS')
  console.log('=====================================')

  try {
    // 1. Check current connection status
    console.log('📊 CURRENT STATUS:')
    const currentStatus = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(customer_id) as connected_vehicles,
        COUNT(*) - COUNT(customer_id) as orphaned_vehicles
      FROM vehicles
    `

    const status = currentStatus[0]
    console.log(`🚗 Total vehicles: ${status.total_vehicles}`)
    console.log(`✅ Connected: ${status.connected_vehicles}`)
    console.log(`❌ Orphaned: ${status.orphaned_vehicles}`)
    console.log('')

    if (parseInt(status.orphaned_vehicles) === 0) {
      console.log('🎉 All vehicles are already connected!')
      return
    }

    // 2. Analyze the connection issue
    console.log('🔍 ANALYZING CONNECTION PATTERNS...')

    // Check if vehicles have owner_id instead of customer_id
    const ownerIdCheck = await sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      AND column_name = 'owner_id'
    `

    if (parseInt(ownerIdCheck[0].count) > 0) {
      console.log('📋 Found owner_id column - checking for data...')

      const ownerIdData = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(owner_id) as with_owner_id,
          COUNT(customer_id) as with_customer_id
        FROM vehicles
      `

      const ownerData = ownerIdData[0]
      console.log(`   Vehicles with owner_id: ${ownerData.with_owner_id}`)
      console.log(`   Vehicles with customer_id: ${ownerData.with_customer_id}`)

      // If owner_id has more data than customer_id, copy it over
      if (parseInt(ownerData.with_owner_id) > parseInt(ownerData.with_customer_id)) {
        console.log('🔄 Copying owner_id to customer_id...')

        const updateResult = await sql`
          UPDATE vehicles
          SET customer_id = owner_id::text
          WHERE owner_id IS NOT NULL
          AND (customer_id IS NULL OR customer_id = '')
        `

        console.log(`✅ Updated ${updateResult.length} vehicle records`)
      }
    }

    // 3. Try to match vehicles to customers by registration patterns
    console.log('🔍 ATTEMPTING SMART MATCHING...')

    // Get sample of orphaned vehicles
    const orphanedSample = await sql`
      SELECT registration, make, model
      FROM vehicles
      WHERE customer_id IS NULL OR customer_id = ''
      LIMIT 10
    `

    console.log('Sample orphaned vehicles:')
    orphanedSample.forEach((vehicle, i) => {
      console.log(`   ${i+1}. ${vehicle.registration} - ${vehicle.make} ${vehicle.model}`)
    })

    // 4. Check if there are customer documents that might link vehicles
    console.log('🔍 CHECKING DOCUMENT CONNECTIONS...')

    const documentConnections = await sql`
      SELECT
        v.registration as vehicle_registration,
        d.customer_id,
        COUNT(*) as document_count
      FROM vehicles v
      JOIN customer_documents d ON d.description ILIKE '%' || v.registration || '%'
      WHERE (v.customer_id IS NULL OR v.customer_id = '')
      AND d.customer_id IS NOT NULL
      GROUP BY v.registration, d.customer_id
      HAVING COUNT(*) > 0
      LIMIT 100
    `

    if (documentConnections.length > 0) {
      console.log(`🎯 Found ${documentConnections.length} potential connections via documents!`)

      let connectionsFixed = 0
      for (const connection of documentConnections) {
        try {
          await sql`
            UPDATE vehicles
            SET customer_id = ${connection.customer_id}
            WHERE registration = ${connection.vehicle_registration}
          `
          connectionsFixed++
        } catch (error) {
          console.log(`   ⚠️ Failed to connect vehicle ${connection.vehicle_registration}`)
        }
      }

      console.log(`✅ Connected ${connectionsFixed} vehicles via document matching`)
    }

    // 5. Final status check
    console.log('')
    console.log('📊 FINAL STATUS:')
    const finalStatus = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(customer_id) as connected_vehicles,
        COUNT(*) - COUNT(customer_id) as orphaned_vehicles
      FROM vehicles
    `

    const final = finalStatus[0]
    console.log(`🚗 Total vehicles: ${final.total_vehicles}`)
    console.log(`✅ Connected: ${final.connected_vehicles}`)
    console.log(`❌ Still orphaned: ${final.orphaned_vehicles}`)

    const connectionRate = ((parseInt(final.connected_vehicles) / parseInt(final.total_vehicles)) * 100).toFixed(1)
    console.log(`📊 Connection rate: ${connectionRate}%`)

    const improvement = parseInt(final.connected_vehicles) - parseInt(status.connected_vehicles)
    if (improvement > 0) {
      console.log(`🎉 Improvement: +${improvement} vehicles connected!`)
    }

    if (parseInt(final.orphaned_vehicles) === 0) {
      console.log('🎊 SUCCESS! All vehicles are now connected to customers!')
    } else if (connectionRate >= 95) {
      console.log('🎉 EXCELLENT! 95%+ vehicles are connected!')
    } else if (connectionRate >= 80) {
      console.log('✅ GOOD! Most vehicles are now connected!')
    } else {
      console.log('⚠️ More work needed - significant orphaned vehicles remain')
    }

    // 6. Show sample connected customers
    console.log('')
    console.log('👤 SAMPLE CONNECTED CUSTOMERS:')
    const sampleConnected = await sql`
      SELECT
        c.first_name,
        c.last_name,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      JOIN vehicles v ON v.customer_id = c.id
      WHERE c.first_name != 'Unknown'
      GROUP BY c.first_name, c.last_name
      HAVING COUNT(v.registration) > 0
      ORDER BY COUNT(v.registration) DESC
      LIMIT 5
    `

    sampleConnected.forEach((customer, i) => {
      console.log(`   ${i+1}. ${customer.first_name} ${customer.last_name}: ${customer.vehicle_count} vehicles`)
    })

  } catch (error) {
    console.error('❌ Error fixing vehicle connections:', error.message)
  }

  process.exit(0)
}

fixVehicleCustomerConnections()
