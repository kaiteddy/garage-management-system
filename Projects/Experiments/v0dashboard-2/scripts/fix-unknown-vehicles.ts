#!/usr/bin/env tsx

import { sql } from "@/lib/database/neon-client"
import { lookupVehicle } from "@/lib/dvla-api"

async function fixUnknownVehicles() {
  console.log('🔍 Finding vehicles with missing make/model data...')

  try {
    // Get all vehicles that are missing make or model data
    const vehiclesNeedingUpdate = await sql`
      SELECT DISTINCT cd.vehicle_registration
      FROM customer_documents cd
      LEFT JOIN vehicles v ON UPPER(cd.vehicle_registration) = UPPER(v.registration)
      WHERE cd.vehicle_registration IS NOT NULL 
        AND cd.vehicle_registration != ''
        AND (
          v.make IS NULL 
          OR v.model IS NULL 
          OR TRIM(v.make) = '' 
          OR TRIM(v.model) = ''
          OR v.make = 'UNKNOWN'
          OR v.model = 'UNKNOWN'
        )
      ORDER BY cd.vehicle_registration
      LIMIT 50
    `

    console.log(`📋 Found ${vehiclesNeedingUpdate.length} vehicles needing updates`)

    let successCount = 0
    let failCount = 0

    for (const vehicle of vehiclesNeedingUpdate) {
      const registration = vehicle.vehicle_registration
      console.log(`\n🔍 Processing: ${registration}`)

      try {
        // Get DVLA data
        const dvlaData = await lookupVehicle(registration)
        
        if (dvlaData && dvlaData.make) {
          console.log(`✅ DVLA found: ${dvlaData.make} ${dvlaData.model || 'MODEL NOT PROVIDED'}`)

          // Check if vehicle exists in vehicles table
          const existingVehicle = await sql`
            SELECT id FROM vehicles 
            WHERE UPPER(registration) = UPPER(${registration})
          `

          if (existingVehicle.length > 0) {
            // Update existing vehicle
            await sql`
              UPDATE vehicles 
              SET 
                make = ${dvlaData.make},
                model = ${dvlaData.model || null},
                year = ${dvlaData.yearOfManufacture || null},
                color = ${dvlaData.colour || null},
                fuel_type = ${dvlaData.fuelType || null},
                engine_size = ${dvlaData.engineCapacity || null},
                mot_status = ${dvlaData.motStatus || null},
                mot_expiry_date = ${dvlaData.motExpiryDate || null},
                tax_status = ${dvlaData.taxStatus || null},
                tax_due_date = ${dvlaData.taxDueDate || null},
                updated_at = NOW()
              WHERE UPPER(registration) = UPPER(${registration})
            `
            console.log(`✅ Updated existing vehicle: ${registration}`)
          } else {
            // Create new vehicle record
            await sql`
              INSERT INTO vehicles (
                registration, make, model, year, color, fuel_type,
                engine_size, mot_status, mot_expiry_date, tax_status, tax_due_date,
                created_at, updated_at
              ) VALUES (
                ${registration.toUpperCase()},
                ${dvlaData.make},
                ${dvlaData.model || null},
                ${dvlaData.yearOfManufacture || null},
                ${dvlaData.colour || null},
                ${dvlaData.fuelType || null},
                ${dvlaData.engineCapacity || null},
                ${dvlaData.motStatus || null},
                ${dvlaData.motExpiryDate || null},
                ${dvlaData.taxStatus || null},
                ${dvlaData.taxDueDate || null},
                NOW(),
                NOW()
              )
            `
            console.log(`✅ Created new vehicle record: ${registration}`)
          }

          successCount++
        } else {
          console.log(`❌ No DVLA data found for: ${registration}`)
          failCount++
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing ${registration}:`, error)
        failCount++
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`✅ Successfully updated: ${successCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`📋 Total processed: ${successCount + failCount}`)

  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the script
fixUnknownVehicles()
  .then(() => {
    console.log('\n🎉 Script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
