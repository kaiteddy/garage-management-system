import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log('🔍 Starting vehicle data population...')

    // Get the most common registrations that need vehicle data
    const registrationsNeedingData = await sql`
      SELECT 
        cd.vehicle_registration,
        COUNT(*) as job_count
      FROM customer_documents cd
      LEFT JOIN vehicles v ON UPPER(cd.vehicle_registration) = UPPER(v.registration)
      WHERE cd.document_type IN ('ES', 'JS', 'ESTIMATE', 'INVOICE')
        AND cd.vehicle_registration IS NOT NULL
        AND cd.vehicle_registration != ''
        AND cd.vehicle_registration ~ '^[A-Z0-9 ]+$'
        AND LENGTH(cd.vehicle_registration) >= 6
        AND (
          v.registration IS NULL
          OR v.make IS NULL 
          OR v.model IS NULL 
          OR TRIM(v.make) = '' 
          OR TRIM(v.model) = ''
        )
      GROUP BY cd.vehicle_registration
      ORDER BY job_count DESC
      LIMIT 50
    `

    console.log(`📋 Found ${registrationsNeedingData.length} registrations needing vehicle data`)

    let successCount = 0
    let skipCount = 0
    const results = []

    for (const regData of registrationsNeedingData) {
      const registration = regData.vehicle_registration.trim()
      
      try {
        console.log(`🔍 Processing ${registration} (${regData.job_count} jobs)...`)

        // Try DVLA lookup
        const dvlaResponse = await fetch("http://localhost:3001/api/dvla-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration }),
        })

        if (dvlaResponse.ok) {
          const dvlaData = await dvlaResponse.json()
          
          if (dvlaData.success && dvlaData.data) {
            const vehicleData = dvlaData.data
            
            // Insert or update vehicle data
            await sql`
              INSERT INTO vehicles (
                registration, make, model, year, color, fuel_type,
                engine_size, mot_expiry_date, created_at
              ) VALUES (
                ${registration},
                ${vehicleData.make || 'UNKNOWN'},
                ${vehicleData.model || 'UNKNOWN'},
                ${vehicleData.yearOfManufacture || null},
                ${vehicleData.colour || null},
                ${vehicleData.fuelType || null},
                ${vehicleData.engineCapacity || null},
                ${vehicleData.motExpiryDate || null},
                NOW()
              )
              ON CONFLICT (registration)
              DO UPDATE SET
                make = EXCLUDED.make,
                model = EXCLUDED.model,
                year = EXCLUDED.year,
                color = EXCLUDED.color,
                fuel_type = EXCLUDED.fuel_type,
                engine_size = EXCLUDED.engine_size,
                mot_expiry_date = EXCLUDED.mot_expiry_date,
                updated_at = NOW()
            `

            successCount++
            results.push({
              registration,
              action: 'updated',
              make: vehicleData.make,
              model: vehicleData.model,
              jobCount: regData.job_count
            })

            console.log(`✅ Updated ${registration}: ${vehicleData.make} ${vehicleData.model}`)
          } else {
            skipCount++
            results.push({
              registration,
              action: 'skipped',
              reason: 'No DVLA data available',
              jobCount: regData.job_count
            })
            console.log(`⚠️  Skipped ${registration}: No DVLA data`)
          }
        } else {
          skipCount++
          results.push({
            registration,
            action: 'skipped', 
            reason: 'DVLA API error',
            jobCount: regData.job_count
          })
          console.log(`⚠️  Skipped ${registration}: DVLA API error`)
        }

        // Small delay to avoid overwhelming DVLA API
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Error processing ${registration}:`, error)
        results.push({
          registration,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          jobCount: regData.job_count
        })
      }
    }

    console.log(`\n🎉 Vehicle data population complete!`)
    console.log(`✅ Successfully updated: ${successCount}`)
    console.log(`⚠️  Skipped: ${skipCount}`)

    return NextResponse.json({
      success: true,
      message: `Processed ${registrationsNeedingData.length} registrations`,
      summary: {
        total: registrationsNeedingData.length,
        successful: successCount,
        skipped: skipCount
      },
      results
    })

  } catch (error) {
    console.error('❌ Vehicle data population failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to populate vehicle data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
