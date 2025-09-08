import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration') || 'LN64XFG'

    console.log(`🧪 [SIMPLE-SPEC] Testing simple specification for ${registration}`)

    // Return mock data to test the API structure
    const mockData = {
      registration: registration.toUpperCase().replace(/\s/g, ''),
      make: 'VOLKSWAGEN',
      model: 'GOLF',
      derivative: 'TSI MATCH',
      year: 2014,
      engineSize: '1395cc',
      fuelType: 'PETROL',
      colour: 'BLACK',
      co2Emissions: 116,
      source: 'MOCK_DATA'
    }

    console.log(`✅ [SIMPLE-SPEC] Returning mock data:`, mockData)

    return NextResponse.json({
      success: true,
      data: mockData,
      cached: false,
      source: 'MOCK_DATA'
    })

  } catch (error) {
    console.error('❌ [SIMPLE-SPEC] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
