import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { getDVSAAccessToken } from "@/lib/dvsa-auth"

export async function POST(request: Request) {
  try {
    const { 
      method = 'aggressive', // 'aggressive', 'smart', 'parallel'
      batchSize = 200,
      maxConcurrency = 50,
      testMode = false 
    } = await request.json()

    console.log(`[ULTRA-FAST-BULK] 🚀 ULTRA-FAST MOT processing: ${method}`)

    if (method === 'aggressive') {
      return await aggressiveBulkProcessing(batchSize, maxConcurrency, testMode)
    }

    if (method === 'smart') {
      return await smartBulkProcessing(batchSize, maxConcurrency, testMode)
    }

    if (method === 'parallel') {
      return await parallelBulkProcessing(batchSize, maxConcurrency, testMode)
    }

    return NextResponse.json({
      success: false,
      error: "Invalid method. Use 'aggressive', 'smart', or 'parallel'"
    }, { status: 400 })

  } catch (error) {
    console.error("[ULTRA-FAST-BULK] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process ultra-fast bulk request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function aggressiveBulkProcessing(batchSize: number, maxConcurrency: number, testMode: boolean) {
  console.log(`[ULTRA-FAST-BULK] 💥 AGGRESSIVE MODE: ${batchSize} vehicles, ${maxConcurrency} concurrent`)

  const dvsaApiKey = process.env.DVSA_API_KEY
  if (!dvsaApiKey) {
    throw new Error('DVSA_API_KEY not configured')
  }

  // Get vehicles that need MOT updates - prioritize recent years
  const vehicles = await sql`
    SELECT registration, make, model, year
    FROM vehicles 
    WHERE registration IS NOT NULL 
      AND registration != ''
      AND (mot_last_checked IS NULL OR mot_last_checked < CURRENT_DATE - INTERVAL '7 days')
      AND (year IS NULL OR year >= 2018)
    ORDER BY 
      CASE WHEN year IS NULL THEN 0 ELSE year END DESC,
      CASE WHEN mot_last_checked IS NULL THEN 0 ELSE 1 END
    LIMIT ${batchSize}
  `

  console.log(`[ULTRA-FAST-BULK] Found ${vehicles.length} vehicles to process`)

  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
    rateLimited: 0,
    noData: 0,
    details: []
  }

  const startTime = Date.now()

  // Get access token once
  const accessToken = await getDVSAAccessToken()

  // AGGRESSIVE: Process ALL vehicles simultaneously with minimal delays
  const promises = vehicles.map(async (vehicle, index) => {
    // Stagger requests slightly to avoid immediate burst
    await new Promise(resolve => setTimeout(resolve, index * 10))

    try {
      const motData = await fetchMOTDataAggressive(vehicle.registration, dvsaApiKey, accessToken)
      
      if (motData && motData.registration) {
        const latestMOT = motData.motTests && motData.motTests.length > 0 
          ? motData.motTests[0] 
          : null

        if (!testMode) {
          await sql`
            UPDATE vehicles 
            SET 
              mot_expiry_date = ${latestMOT?.expiryDate || null},
              mot_status = ${latestMOT?.testResult || 'Unknown'},
              mot_last_checked = CURRENT_TIMESTAMP,
              make = COALESCE(make, ${motData.make}),
              model = COALESCE(model, ${motData.model}),
              fuel_type = COALESCE(fuel_type, ${motData.fuelType}),
              color = COALESCE(color, ${motData.primaryColour}),
              engine_size = COALESCE(engine_size, ${motData.engineSize})
            WHERE registration = ${vehicle.registration}
          `
        }

        results.updated++
        return {
          registration: vehicle.registration,
          status: 'updated',
          motExpiry: latestMOT?.expiryDate,
          motResult: latestMOT?.testResult
        }
      } else {
        results.noData++
        return {
          registration: vehicle.registration,
          status: 'no_data'
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        results.rateLimited++
      } else {
        results.failed++
      }

      return {
        registration: vehicle.registration,
        status: 'failed',
        error: errorMessage
      }
    }
  })

  // Wait for ALL requests to complete
  const promiseResults = await Promise.allSettled(promises)
  
  promiseResults.forEach((result, index) => {
    results.processed++
    if (result.status === 'fulfilled') {
      results.details.push(result.value)
    } else {
      results.failed++
      results.details.push({
        registration: vehicles[index].registration,
        status: 'failed',
        error: result.reason
      })
    }
  })

  const totalTime = Date.now() - startTime
  const vehiclesPerSecond = Math.round((results.processed / (totalTime / 1000)) * 100) / 100

  return NextResponse.json({
    success: true,
    message: `AGGRESSIVE bulk processing completed`,
    results,
    performance: {
      totalTimeMs: totalTime,
      totalTimeSeconds: Math.round(totalTime / 1000),
      vehiclesPerSecond,
      successRate: `${Math.round((results.updated / results.processed) * 100)}%`,
      rateLimitRate: `${Math.round((results.rateLimited / results.processed) * 100)}%`
    },
    timestamp: new Date().toISOString()
  })
}

async function smartBulkProcessing(batchSize: number, maxConcurrency: number, testMode: boolean) {
  console.log(`[ULTRA-FAST-BULK] 🧠 SMART MODE: Adaptive processing`)

  // Smart mode: Start conservative, then ramp up based on success rate
  let currentConcurrency = Math.min(5, maxConcurrency)
  let currentDelay = 100
  let successRate = 0
  let rateLimitRate = 0

  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
    rateLimited: 0,
    adaptations: []
  }

  // Process in adaptive batches
  const smallBatchSize = 20
  const totalBatches = Math.ceil(batchSize / smallBatchSize)

  for (let batch = 0; batch < totalBatches; batch++) {
    const offset = batch * smallBatchSize
    
    console.log(`[ULTRA-FAST-BULK] Smart batch ${batch + 1}/${totalBatches}, concurrency: ${currentConcurrency}, delay: ${currentDelay}ms`)

    const batchResults = await processBatchSmart(smallBatchSize, offset, currentConcurrency, currentDelay, testMode)
    
    // Update totals
    results.processed += batchResults.processed
    results.updated += batchResults.updated
    results.failed += batchResults.failed
    results.rateLimited += batchResults.rateLimited

    // Calculate rates
    successRate = results.updated / results.processed
    rateLimitRate = results.rateLimited / results.processed

    // Adapt strategy based on results
    if (rateLimitRate > 0.1) {
      // Too many rate limits - slow down
      currentConcurrency = Math.max(1, Math.floor(currentConcurrency * 0.7))
      currentDelay = Math.min(2000, currentDelay * 1.5)
      results.adaptations.push(`Batch ${batch}: Slowed down due to rate limits`)
    } else if (successRate > 0.8 && rateLimitRate < 0.05) {
      // High success, low rate limits - speed up
      currentConcurrency = Math.min(maxConcurrency, Math.floor(currentConcurrency * 1.3))
      currentDelay = Math.max(10, currentDelay * 0.8)
      results.adaptations.push(`Batch ${batch}: Sped up due to good performance`)
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return NextResponse.json({
    success: true,
    message: `SMART bulk processing completed`,
    results,
    finalSettings: {
      concurrency: currentConcurrency,
      delay: currentDelay,
      finalSuccessRate: `${Math.round(successRate * 100)}%`,
      finalRateLimitRate: `${Math.round(rateLimitRate * 100)}%`
    },
    timestamp: new Date().toISOString()
  })
}

async function parallelBulkProcessing(batchSize: number, maxConcurrency: number, testMode: boolean) {
  console.log(`[ULTRA-FAST-BULK] ⚡ PARALLEL MODE: Multiple strategies simultaneously`)

  // Run multiple approaches in parallel
  const strategies = [
    aggressiveBulkProcessing(Math.floor(batchSize * 0.4), Math.floor(maxConcurrency * 0.6), testMode),
    smartBulkProcessing(Math.floor(batchSize * 0.6), Math.floor(maxConcurrency * 0.4), testMode)
  ]

  const results = await Promise.allSettled(strategies)

  return NextResponse.json({
    success: true,
    message: `PARALLEL bulk processing completed`,
    results: results.map((result, index) => ({
      strategy: index === 0 ? 'aggressive' : 'smart',
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : { error: result.reason }
    })),
    timestamp: new Date().toISOString()
  })
}

async function processBatchSmart(batchSize: number, offset: number, concurrency: number, delay: number, testMode: boolean) {
  const vehicles = await sql`
    SELECT registration, make, model, year
    FROM vehicles 
    WHERE registration IS NOT NULL 
      AND registration != ''
      AND (mot_last_checked IS NULL OR mot_last_checked < CURRENT_DATE - INTERVAL '7 days')
    ORDER BY year DESC NULLS LAST
    LIMIT ${batchSize} OFFSET ${offset}
  `

  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
    rateLimited: 0
  }

  const dvsaApiKey = process.env.DVSA_API_KEY!
  const accessToken = await getDVSAAccessToken()

  // Process with controlled concurrency
  const semaphore = new Array(concurrency).fill(null)
  let vehicleIndex = 0

  const workers = semaphore.map(async () => {
    while (vehicleIndex < vehicles.length) {
      const currentIndex = vehicleIndex++
      if (currentIndex >= vehicles.length) break

      const vehicle = vehicles[currentIndex]
      
      try {
        await new Promise(resolve => setTimeout(resolve, delay))
        
        const motData = await fetchMOTDataAggressive(vehicle.registration, dvsaApiKey, accessToken)
        
        if (motData && motData.registration) {
          const latestMOT = motData.motTests && motData.motTests.length > 0 
            ? motData.motTests[0] 
            : null

          if (!testMode) {
            await sql`
              UPDATE vehicles 
              SET 
                mot_expiry_date = ${latestMOT?.expiryDate || null},
                mot_status = ${latestMOT?.testResult || 'Unknown'},
                mot_last_checked = CURRENT_TIMESTAMP
              WHERE registration = ${vehicle.registration}
            `
          }

          results.updated++
        }

        results.processed++

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        if (errorMessage.includes('429') || errorMessage.includes('rate')) {
          results.rateLimited++
        } else {
          results.failed++
        }

        results.processed++
      }
    }
  })

  await Promise.all(workers)
  return results
}

async function fetchMOTDataAggressive(registration: string, apiKey: string, accessToken: string) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '')
  
  const response = await fetch(`https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "User-Agent": "UltraFastBulkProcessor/1.0",
      "Cache-Control": "no-cache"
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null // Vehicle not found
    }
    throw new Error(`DVSA API error: ${response.status}`)
  }

  return await response.json()
}
