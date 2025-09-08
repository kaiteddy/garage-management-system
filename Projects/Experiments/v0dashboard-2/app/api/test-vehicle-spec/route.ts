import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration') || 'LN64XFG'

    console.log(`🧪 [TEST-SPEC] Testing vehicle specification for ${registration}`)

    // Test MOT API directly
    const motResponse = await fetch(`http://localhost:3001/api/mot-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registration })
    })

    console.log(`🧪 [TEST-SPEC] MOT API response status: ${motResponse.status}`)

    if (!motResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `MOT API returned ${motResponse.status}`,
        registration
      })
    }

    const motData = await motResponse.json()
    console.log(`🧪 [TEST-SPEC] MOT API data:`, {
      make: motData.make,
      model: motData.model,
      year: motData.yearOfManufacture,
      engineCapacity: motData.engineCapacity,
      fuelType: motData.fuelType
    })

    // Extract derivative using the same logic
    const derivative = extractDerivativeFromModel(motData.make, motData.model, motData.engineCapacity, motData.fuelType)

    const result = {
      registration: registration.toUpperCase().replace(/\s/g, ''),
      make: motData.make,
      model: motData.model,
      derivative: derivative,
      year: motData.yearOfManufacture,
      engineSize: motData.engineCapacity ? `${motData.engineCapacity}cc` : undefined,
      fuelType: motData.fuelType,
      colour: motData.colour,
      co2Emissions: motData.vehicleDetails?.co2Emissions,
      source: 'MOT_HISTORY_TEST'
    }

    console.log(`🧪 [TEST-SPEC] Final result:`, result)

    return NextResponse.json({
      success: true,
      data: result,
      debug: {
        motApiStatus: motResponse.status,
        rawMotData: motData
      }
    })

  } catch (error) {
    console.error('❌ [TEST-SPEC] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Extract derivative from model name using intelligent parsing
function extractDerivativeFromModel(make: string, model: string, engineCapacity?: number, fuelType?: string): string {
  if (!make || !model) return 'STANDARD'

  const makeUpper = make.toUpperCase()
  const modelUpper = model.toUpperCase()

  // Common derivative patterns found in UK vehicle data
  const derivativePatterns = [
    // Volkswagen patterns
    { make: 'VOLKSWAGEN', model: 'GOLF', patterns: ['MATCH', 'SE', 'SEL', 'R-LINE', 'GTI', 'R', 'GTD', 'BLUEMOTION', 'TSI', 'TDI'] },
    { make: 'VOLKSWAGEN', model: 'POLO', patterns: ['MATCH', 'SE', 'SEL', 'R-LINE', 'GTI', 'BLUEMOTION', 'TSI', 'TDI'] },
    
    // Ford patterns
    { make: 'FORD', model: 'FIESTA', patterns: ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE', 'ACTIVE', 'TREND', 'STYLE', 'EDGE'] },
    { make: 'FORD', model: 'FOCUS', patterns: ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE', 'ACTIVE', 'TREND', 'STYLE', 'EDGE', 'RS', 'ST'] },
    
    // Honda patterns
    { make: 'HONDA', model: 'JAZZ', patterns: ['S', 'SE', 'SR', 'EX', 'DSI', 'VTEC'] },
    
    // Toyota patterns
    { make: 'TOYOTA', model: 'AYGO', patterns: ['X', 'X-PLAY', 'X-CITE', 'X-CLUSIV', 'VVT-I'] },
  ]

  // Find matching patterns for this make/model
  const matchingPattern = derivativePatterns.find(p => 
    p.make === makeUpper && p.model === modelUpper
  )

  if (matchingPattern) {
    // Look for derivative patterns in the model string
    for (const pattern of matchingPattern.patterns) {
      if (modelUpper.includes(pattern)) {
        return pattern
      }
    }
  }

  // Generic patterns that work across makes
  const genericPatterns = [
    'BLUEMOTION TECHNOLOGY', 'BLUEMOTION', 'TECHNOLOGY',
    'TSI', 'TDI', 'TFSI', 'VTEC', 'VVT-I', 'DSI',
    'SPORT', 'SE', 'SEL', 'S LINE', 'R-LINE', 'AMG LINE',
    'TITANIUM', 'ZETEC', 'TREND', 'STYLE', 'EDGE',
    'ICON', 'DESIGN', 'EXCEL', 'ACTIVE', 'VIGNALE',
    'ECOFLEX', 'ECOBOOST', 'HYBRID', 'ELECTRIC'
  ]

  // Look for generic patterns
  for (const pattern of genericPatterns) {
    if (modelUpper.includes(pattern)) {
      return pattern
    }
  }

  // Engine-based derivative detection
  if (engineCapacity && fuelType) {
    const fuelUpper = fuelType.toUpperCase()
    
    if (fuelUpper.includes('ELECTRIC')) return 'ELECTRIC'
    if (fuelUpper.includes('HYBRID')) return 'HYBRID'
    
    if (engineCapacity >= 2000) {
      return fuelUpper.includes('DIESEL') ? 'TDI' : 'TSI'
    } else if (engineCapacity >= 1600) {
      return 'SPORT'
    } else if (engineCapacity <= 1000) {
      return 'ECO'
    }
  }

  return 'STANDARD'
}
