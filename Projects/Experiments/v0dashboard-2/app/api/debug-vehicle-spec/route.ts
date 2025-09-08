import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration') || 'LN64XFG'

    console.log(`🧪 [DEBUG-SPEC] Testing vehicle specification for ${registration}`)

    // Test 1: Direct MOT API call
    console.log(`🧪 [DEBUG-SPEC] Test 1: Direct MOT API call`)
    let motApiResult = null
    try {
      const motResponse = await fetch(`http://localhost:3001/api/mot-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registration }),
        signal: AbortSignal.timeout(10000)
      })

      if (motResponse.ok) {
        motApiResult = await motResponse.json()
        console.log(`✅ [DEBUG-SPEC] MOT API success:`, { make: motApiResult.make, model: motApiResult.model })
      } else {
        console.log(`❌ [DEBUG-SPEC] MOT API failed: ${motResponse.status}`)
        motApiResult = { error: `HTTP ${motResponse.status}` }
      }
    } catch (error) {
      console.log(`❌ [DEBUG-SPEC] MOT API error:`, error)
      motApiResult = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Test 2: Try to call our own vehicle specification function
    console.log(`🧪 [DEBUG-SPEC] Test 2: Internal function call`)
    let internalResult = null
    try {
      // Try to call the function directly
      const { getMotHistorySpecification } = await import('../vehicle-specification/route')
      // This won't work because the function is not exported, but let's see what happens
    } catch (error) {
      console.log(`❌ [DEBUG-SPEC] Internal function not accessible:`, error)
      internalResult = { error: 'Function not exported' }
    }

    // Test 3: Manual derivative extraction
    console.log(`🧪 [DEBUG-SPEC] Test 3: Manual derivative extraction`)
    let derivativeResult = null
    if (motApiResult && motApiResult.make && motApiResult.model) {
      // Simple derivative extraction logic
      const make = motApiResult.make.toUpperCase()
      const model = motApiResult.model.toUpperCase()
      
      let derivative = 'STANDARD'
      
      // Check for common VW Golf derivatives
      if (make === 'VOLKSWAGEN' && model === 'GOLF') {
        // For VW Golf, check engine capacity and fuel type
        if (motApiResult.engineCapacity) {
          if (motApiResult.engineCapacity <= 1000) {
            derivative = 'TSI'
          } else if (motApiResult.engineCapacity >= 2000) {
            derivative = motApiResult.fuelType === 'DIESEL' ? 'TDI' : 'TSI'
          } else {
            derivative = 'SE'
          }
        }
      }
      
      derivativeResult = {
        make: motApiResult.make,
        model: motApiResult.model,
        derivative: derivative,
        year: motApiResult.yearOfManufacture,
        engineSize: motApiResult.engineCapacity ? `${motApiResult.engineCapacity}cc` : undefined,
        fuelType: motApiResult.fuelType,
        colour: motApiResult.colour,
        source: 'MANUAL_EXTRACTION'
      }
    }

    return NextResponse.json({
      success: true,
      registration,
      tests: {
        motApiCall: {
          success: !!(motApiResult && motApiResult.make),
          data: motApiResult,
          hasVehicleData: !!(motApiResult && motApiResult.make && motApiResult.model)
        },
        internalCall: {
          success: false,
          data: internalResult
        },
        derivativeExtraction: {
          success: !!derivativeResult,
          data: derivativeResult
        }
      },
      summary: {
        motApiWorking: !!(motApiResult && motApiResult.make),
        canExtractDerivative: !!derivativeResult,
        recommendedApproach: motApiResult && motApiResult.make ? 'Use MOT API + derivative extraction' : 'Check API configuration'
      }
    })

  } catch (error) {
    console.error('❌ [DEBUG-SPEC] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
