import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const {
      method = 'batch', // 'batch', 'all', 'daily'
      batchSize = 100,
      maxConcurrency = 20,
      testMode = false
    } = await request.json()

    console.log(`[DVLA-BULK-FAST] 🚀 Starting FAST DVLA bulk processing: ${method}`)

    // Try DVLA_API_KEY first, then fall back to DVSA_API_KEY (they're often the same)
    const dvlaApiKey = process.env.DVLA_API_KEY || process.env.DVSA_API_KEY
    if (!dvlaApiKey) {
      return NextResponse.json({
        success: false,
        error: "DVLA/DVSA API key not configured",
        note: "Set DVLA_API_KEY or DVSA_API_KEY environment variable"
      }, { status: 400 })
    }

    if (method === 'batch') {
      return await processBatchRegistrations(batchSize, maxConcurrency, dvlaApiKey, testMode)
    }

    if (method === 'all') {
      return await processAllVehiclesFromDVLA(dvlaApiKey, testMode)
    }

    if (method === 'daily') {
      return await processDailyUpdates(dvlaApiKey, testMode)
    }

    return NextResponse.json({
      success: false,
      error: "Invalid method. Use 'batch', 'all', or 'daily'"
    }, { status: 400 })

  } catch (error) {
    console.error("[DVLA-BULK-FAST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process DVLA bulk request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function processBatchRegistrations(batchSize: number, maxConcurrency: number, apiKey: string, testMode: boolean) {
  console.log(`[DVLA-BULK-FAST] 📊 Processing batch of ${batchSize} registrations with ${maxConcurrency} concurrency`)

  // Get vehicles that need MOT updates
  const vehicles = await sql`
    SELECT registration, make, model, year
    FROM vehicles
    WHERE registration IS NOT NULL
      AND registration != ''
      AND (mot_last_checked IS NULL OR mot_last_checked < CURRENT_DATE - INTERVAL '7 days')
    ORDER BY
      CASE WHEN mot_last_checked IS NULL THEN 0 ELSE 1 END,
      year DESC
    LIMIT ${batchSize}
  `

  console.log(`[DVLA-BULK-FAST] Found ${vehicles.length} vehicles to process`)

  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
    rateLimited: 0,
    details: []
  }

  // Process with controlled concurrency
  const semaphore = new Array(maxConcurrency).fill(null)
  let vehicleIndex = 0

  const workers = semaphore.map(async (_, workerIndex) => {
    while (vehicleIndex < vehicles.length) {
      const currentIndex = vehicleIndex++
      if (currentIndex >= vehicles.length) break

      const vehicle = vehicles[currentIndex]

      try {
        console.log(`[DVLA-BULK-FAST] Worker ${workerIndex}: Processing ${vehicle.registration}`)

        const motData = await fetchDVLAMOTData(vehicle.registration, apiKey)

        if (motData && motData.length > 0) {
          // Update vehicle with MOT data
          const vehicleData = motData[0]
          const latestMOT = vehicleData.motTests && vehicleData.motTests.length > 0
            ? vehicleData.motTests[0]
            : null

          if (!testMode) {
            await sql`
              UPDATE vehicles
              SET
                mot_expiry_date = ${latestMOT?.expiryDate || null},
                mot_status = ${latestMOT?.testResult || 'Unknown'},
                mot_last_checked = CURRENT_TIMESTAMP,
                make = COALESCE(make, ${vehicleData.make}),
                model = COALESCE(model, ${vehicleData.model}),
                fuel_type = COALESCE(fuel_type, ${vehicleData.fuelType}),
                color = COALESCE(color, ${vehicleData.primaryColour}),
                engine_size = COALESCE(engine_size, ${vehicleData.engineSize})
              WHERE registration = ${vehicle.registration}
            `
          }

          results.updated++
          results.details.push({
            registration: vehicle.registration,
            status: 'updated',
            motExpiry: latestMOT?.expiryDate,
            motResult: latestMOT?.testResult
          })
        } else {
          results.details.push({
            registration: vehicle.registration,
            status: 'no_data',
            error: 'No MOT data found'
          })
        }

        results.processed++

        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 50))

      } catch (error) {
        console.error(`[DVLA-BULK-FAST] Error processing ${vehicle.registration}:`, error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        if (errorMessage.includes('429') || errorMessage.includes('rate')) {
          results.rateLimited++
          // Longer delay for rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else {
          results.failed++
        }

        results.details.push({
          registration: vehicle.registration,
          status: 'failed',
          error: errorMessage
        })
        results.processed++
      }
    }
  })

  await Promise.all(workers)

  return NextResponse.json({
    success: true,
    message: `DVLA bulk processing completed`,
    results,
    performance: {
      successRate: `${Math.round((results.updated / results.processed) * 100)}%`,
      rateLimitRate: `${Math.round((results.rateLimited / results.processed) * 100)}%`
    },
    timestamp: new Date().toISOString()
  })
}

async function processAllVehiclesFromDVLA(apiKey: string, testMode: boolean) {
  console.log(`[DVLA-BULK-FAST] 🌍 Processing ALL vehicles from DVLA bulk endpoint`)

  // Use the DVLA bulk endpoint to get ALL vehicles
  // This is much more efficient than individual lookups
  let page = 0
  let totalProcessed = 0
  let totalUpdated = 0
  const maxPages = testMode ? 5 : 1000 // Limit for testing

  while (page < maxPages) {
    try {
      console.log(`[DVLA-BULK-FAST] Processing page ${page}...`)

      const response = await fetch(`https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?page=${page}`, {
        method: "GET",
        headers: {
          "Accept": "application/json+v6",
          "x-api-key": apiKey,
          "User-Agent": "DVLABulkProcessor/1.0",
        },
      })

      if (response.status === 404) {
        console.log(`[DVLA-BULK-FAST] Reached end of data at page ${page}`)
        break
      }

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`[DVLA-BULK-FAST] Rate limited at page ${page}, waiting...`)
          await new Promise(resolve => setTimeout(resolve, 5000))
          continue
        }
        throw new Error(`DVLA API error: ${response.status}`)
      }

      const vehicles = await response.json()
      console.log(`[DVLA-BULK-FAST] Page ${page}: ${vehicles.length} vehicles`)

      // Process vehicles from this page
      for (const vehicleData of vehicles) {
        try {
          if (!vehicleData.registration) continue

          const latestMOT = vehicleData.motTests && vehicleData.motTests.length > 0
            ? vehicleData.motTests[0]
            : null

          if (!testMode) {
            // Check if vehicle exists in our database
            const existingVehicle = await sql`
              SELECT registration FROM vehicles
              WHERE registration = ${vehicleData.registration}
              LIMIT 1
            `

            if (existingVehicle.length > 0) {
              // Update existing vehicle
              await sql`
                UPDATE vehicles
                SET
                  mot_expiry_date = ${latestMOT?.expiryDate || null},
                  mot_status = ${latestMOT?.testResult || 'Unknown'},
                  mot_last_checked = CURRENT_TIMESTAMP,
                  make = COALESCE(make, ${vehicleData.make}),
                  model = COALESCE(model, ${vehicleData.model}),
                  fuel_type = COALESCE(fuel_type, ${vehicleData.fuelType}),
                  color = COALESCE(color, ${vehicleData.primaryColour}),
                  engine_size = COALESCE(engine_size, ${vehicleData.engineSize})
                WHERE registration = ${vehicleData.registration}
              `
              totalUpdated++
            }
          }

          totalProcessed++

          if (totalProcessed % 1000 === 0) {
            console.log(`[DVLA-BULK-FAST] Processed ${totalProcessed} vehicles, updated ${totalUpdated}`)
          }

        } catch (error) {
          console.error(`[DVLA-BULK-FAST] Error processing vehicle ${vehicleData.registration}:`, error)
        }
      }

      page++

      // Small delay between pages
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`[DVLA-BULK-FAST] Error processing page ${page}:`, error)

      if (error instanceof Error && error.message.includes('429')) {
        console.log(`[DVLA-BULK-FAST] Rate limited, waiting longer...`)
        await new Promise(resolve => setTimeout(resolve, 10000))
      } else {
        page++
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `DVLA bulk processing completed`,
    results: {
      pagesProcessed: page,
      totalVehiclesProcessed: totalProcessed,
      vehiclesUpdated: totalUpdated,
      updateRate: `${Math.round((totalUpdated / totalProcessed) * 100)}%`
    },
    timestamp: new Date().toISOString()
  })
}

async function processDailyUpdates(apiKey: string, testMode: boolean) {
  console.log(`[DVLA-BULK-FAST] 📅 Processing daily MOT updates`)

  // Get yesterday's date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '')

  let page = 1
  let totalProcessed = 0
  let totalUpdated = 0
  const maxPages = testMode ? 5 : 1440 // DVLA has up to 1440 pages per day

  while (page <= maxPages) {
    try {
      console.log(`[DVLA-BULK-FAST] Processing daily updates for ${dateStr}, page ${page}...`)

      const response = await fetch(`https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?date=${dateStr}&page=${page}`, {
        method: "GET",
        headers: {
          "Accept": "application/json+v6",
          "x-api-key": apiKey,
          "User-Agent": "DVLADailyProcessor/1.0",
        },
      })

      if (response.status === 404) {
        console.log(`[DVLA-BULK-FAST] No more data for ${dateStr} at page ${page}`)
        break
      }

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`[DVLA-BULK-FAST] Rate limited, waiting...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        throw new Error(`DVLA API error: ${response.status}`)
      }

      const vehicles = await response.json()
      console.log(`[DVLA-BULK-FAST] Daily page ${page}: ${vehicles.length} vehicles`)

      // Process vehicles from this page (same logic as above)
      for (const vehicleData of vehicles) {
        try {
          if (!vehicleData.registration) continue

          const latestMOT = vehicleData.motTests && vehicleData.motTests.length > 0
            ? vehicleData.motTests[0]
            : null

          if (!testMode) {
            const existingVehicle = await sql`
              SELECT registration FROM vehicles
              WHERE registration = ${vehicleData.registration}
              LIMIT 1
            `

            if (existingVehicle.length > 0) {
              await sql`
                UPDATE vehicles
                SET
                  mot_expiry_date = ${latestMOT?.expiryDate || null},
                  mot_status = ${latestMOT?.testResult || 'Unknown'},
                  mot_last_checked = CURRENT_TIMESTAMP
                WHERE registration = ${vehicleData.registration}
              `
              totalUpdated++
            }
          }

          totalProcessed++

        } catch (error) {
          console.error(`[DVLA-BULK-FAST] Error processing daily vehicle ${vehicleData.registration}:`, error)
        }
      }

      page++
      await new Promise(resolve => setTimeout(resolve, 50))

    } catch (error) {
      console.error(`[DVLA-BULK-FAST] Error processing daily page ${page}:`, error)
      page++
    }
  }

  return NextResponse.json({
    success: true,
    message: `DVLA daily processing completed for ${dateStr}`,
    results: {
      date: dateStr,
      pagesProcessed: page - 1,
      totalVehiclesProcessed: totalProcessed,
      vehiclesUpdated: totalUpdated
    },
    timestamp: new Date().toISOString()
  })
}

async function fetchDVLAMOTData(registration: string, apiKey: string) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '')

  const response = await fetch(`https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${cleanReg}`, {
    method: "GET",
    headers: {
      "Accept": "application/json+v6",
      "x-api-key": apiKey,
      "User-Agent": "DVLAFastProcessor/1.0",
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null // Vehicle not found
    }
    throw new Error(`DVLA API error: ${response.status}`)
  }

  return await response.json()
}
