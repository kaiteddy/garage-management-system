import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { getDVSAAccessToken } from "@/lib/dvsa-auth"

export async function POST(request: Request) {
  try {
    const { 
      mode = 'maximum', // 'maximum', 'insane', 'nuclear'
      batchSize = 1000,
      maxConcurrency = 100,
      testMode = false 
    } = await request.json()

    console.log(`[MAXIMUM-SPEED] 🚀 MAXIMUM SPEED MOT processing: ${mode}`)

    if (mode === 'maximum') {
      return await maximumSpeedProcessing(batchSize, maxConcurrency, testMode)
    }

    if (mode === 'insane') {
      return await insaneSpeedProcessing(batchSize, maxConcurrency, testMode)
    }

    if (mode === 'nuclear') {
      return await nuclearSpeedProcessing(batchSize, maxConcurrency, testMode)
    }

    return NextResponse.json({
      success: false,
      error: "Invalid mode. Use 'maximum', 'insane', or 'nuclear'"
    }, { status: 400 })

  } catch (error) {
    console.error("[MAXIMUM-SPEED] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process maximum speed bulk request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function maximumSpeedProcessing(batchSize: number, maxConcurrency: number, testMode: boolean) {
  console.log(`[MAXIMUM-SPEED] 💥 MAXIMUM MODE: ${batchSize} vehicles, ${maxConcurrency} concurrent`)

  const dvsaApiKey = process.env.DVSA_API_KEY
  if (!dvsaApiKey) {
    throw new Error('DVSA_API_KEY not configured')
  }

  // Get ALL vehicles that need MOT updates
  const vehicles = await sql`
    SELECT registration, make, model, year
    FROM vehicles 
    WHERE registration IS NOT NULL 
      AND registration != ''
      AND (mot_last_checked IS NULL OR mot_last_checked < CURRENT_DATE - INTERVAL '1 days')
    ORDER BY 
      CASE WHEN mot_last_checked IS NULL THEN 0 ELSE 1 END,
      CASE WHEN year IS NULL THEN 0 ELSE year END DESC
    LIMIT ${batchSize}
  `

  console.log(`[MAXIMUM-SPEED] Found ${vehicles.length} vehicles to process`)

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

  // MAXIMUM SPEED: Process ALL vehicles simultaneously with NO delays
  console.log(`[MAXIMUM-SPEED] 🔥 LAUNCHING ${vehicles.length} SIMULTANEOUS REQUESTS`)
  
  const promises = vehicles.map(async (vehicle, index) => {
    try {
      const motData = await fetchMOTDataMaximumSpeed(vehicle.registration, dvsaApiKey, accessToken)
      
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
  console.log(`[MAXIMUM-SPEED] ⚡ WAITING FOR ${promises.length} SIMULTANEOUS REQUESTS`)
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
    message: `MAXIMUM SPEED bulk processing completed`,
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

async function insaneSpeedProcessing(batchSize: number, maxConcurrency: number, testMode: boolean) {
  console.log(`[MAXIMUM-SPEED] 🔥 INSANE MODE: Multiple API keys, multiple endpoints`)

  // INSANE MODE: Use multiple strategies simultaneously
  const strategies = [
    maximumSpeedProcessing(Math.floor(batchSize * 0.3), Math.floor(maxConcurrency * 0.3), testMode),
    maximumSpeedProcessing(Math.floor(batchSize * 0.3), Math.floor(maxConcurrency * 0.3), testMode),
    maximumSpeedProcessing(Math.floor(batchSize * 0.4), Math.floor(maxConcurrency * 0.4), testMode)
  ]

  const results = await Promise.allSettled(strategies)

  return NextResponse.json({
    success: true,
    message: `INSANE SPEED bulk processing completed`,
    results: results.map((result, index) => ({
      strategy: `insane-${index + 1}`,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : { error: result.reason }
    })),
    timestamp: new Date().toISOString()
  })
}

async function nuclearSpeedProcessing(batchSize: number, maxConcurrency: number, testMode: boolean) {
  console.log(`[MAXIMUM-SPEED] ☢️ NUCLEAR MODE: EVERYTHING AT ONCE`)

  // NUCLEAR MODE: Process EVERYTHING with maximum aggression
  const vehicles = await sql`
    SELECT registration, make, model, year
    FROM vehicles 
    WHERE registration IS NOT NULL 
      AND registration != ''
      AND (mot_last_checked IS NULL OR mot_last_checked < CURRENT_DATE - INTERVAL '1 days')
    ORDER BY 
      CASE WHEN mot_last_checked IS NULL THEN 0 ELSE 1 END
  `

  console.log(`[MAXIMUM-SPEED] ☢️ NUCLEAR: Processing ALL ${vehicles.length} vehicles simultaneously`)

  const dvsaApiKey = process.env.DVSA_API_KEY!
  const accessToken = await getDVSAAccessToken()

  const startTime = Date.now()
  
  // NUCLEAR: Process EVERYTHING at once
  const promises = vehicles.map(async (vehicle) => {
    try {
      const motData = await fetchMOTDataMaximumSpeed(vehicle.registration, dvsaApiKey, accessToken)
      
      if (motData && motData.registration && !testMode) {
        const latestMOT = motData.motTests && motData.motTests.length > 0 
          ? motData.motTests[0] 
          : null

        await sql`
          UPDATE vehicles 
          SET 
            mot_expiry_date = ${latestMOT?.expiryDate || null},
            mot_status = ${latestMOT?.testResult || 'Unknown'},
            mot_last_checked = CURRENT_TIMESTAMP,
            make = COALESCE(make, ${motData.make}),
            model = COALESCE(model, ${motData.model})
          WHERE registration = ${vehicle.registration}
        `
        return { status: 'updated', registration: vehicle.registration }
      }
      return { status: 'no_data', registration: vehicle.registration }
    } catch (error) {
      return { 
        status: 'failed', 
        registration: vehicle.registration, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  const results = await Promise.allSettled(promises)
  const totalTime = Date.now() - startTime

  const summary = {
    total: results.length,
    updated: results.filter(r => r.status === 'fulfilled' && r.value.status === 'updated').length,
    failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')).length,
    noData: results.filter(r => r.status === 'fulfilled' && r.value.status === 'no_data').length
  }

  return NextResponse.json({
    success: true,
    message: `NUCLEAR SPEED processing completed`,
    results: summary,
    performance: {
      totalTimeMs: totalTime,
      totalTimeSeconds: Math.round(totalTime / 1000),
      vehiclesPerSecond: Math.round((summary.total / (totalTime / 1000)) * 100) / 100,
      successRate: `${Math.round((summary.updated / summary.total) * 100)}%`
    },
    timestamp: new Date().toISOString()
  })
}

async function fetchMOTDataMaximumSpeed(registration: string, apiKey: string, accessToken: string) {
  const cleanReg = registration.toUpperCase().replace(/\s/g, '')
  
  const response = await fetch(`https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "User-Agent": "MaximumSpeedProcessor/1.0",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
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
