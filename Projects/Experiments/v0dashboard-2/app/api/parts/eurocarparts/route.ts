import { NextRequest, NextResponse } from 'next/server'
import { EuroCarPartsOmnipart } from '@/lib/services/eurocarparts-omnipart'

export async function POST(request: NextRequest) {
  try {
    const { action, registration, partNumber, category } = await request.json()

    console.log(`🚗 [EUROCARPARTS-API] ${action} request:`, { registration, partNumber, category })

    // Set credentials from environment or request
    const username = process.env.EUROCARPARTS_USERNAME || 'eli@elimotors.co.uk'
    const password = process.env.EUROCARPARTS_PASSWORD || 'Rutstein8029'
    
    EuroCarPartsOmnipart.setCredentials(username, password)

    switch (action) {
      case 'lookup-vehicle':
        if (!registration) {
          return NextResponse.json({
            success: false,
            error: 'Registration number is required'
          }, { status: 400 })
        }

        const vehicle = await EuroCarPartsOmnipart.lookupVehicle(registration)
        
        if (vehicle) {
          return NextResponse.json({
            success: true,
            vehicle,
            source: 'Euro Car Parts Omnipart',
            timestamp: new Date().toISOString()
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Vehicle not found in Euro Car Parts database'
          }, { status: 404 })
        }

      case 'search-parts-by-registration':
        if (!registration) {
          return NextResponse.json({
            success: false,
            error: 'Registration number is required'
          }, { status: 400 })
        }

        const partsResult = await EuroCarPartsOmnipart.searchPartsByRegistration(registration, category)
        
        return NextResponse.json({
          ...partsResult,
          source: 'Euro Car Parts Omnipart',
          timestamp: new Date().toISOString()
        })

      case 'search-parts-by-number':
        if (!partNumber) {
          return NextResponse.json({
            success: false,
            error: 'Part number is required'
          }, { status: 400 })
        }

        const partResult = await EuroCarPartsOmnipart.searchByPartNumber(partNumber)
        
        return NextResponse.json({
          ...partResult,
          source: 'Euro Car Parts Omnipart',
          timestamp: new Date().toISOString()
        })

      case 'test-connection':
        const testResult = await EuroCarPartsOmnipart.testConnection()
        
        return NextResponse.json({
          ...testResult,
          source: 'Euro Car Parts Omnipart',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: lookup-vehicle, search-parts-by-registration, search-parts-by-number, test-connection'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ [EUROCARPARTS-API] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for simple vehicle lookup
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')
    const action = searchParams.get('action') || 'lookup-vehicle'

    if (!registration && action !== 'test-connection') {
      return NextResponse.json({
        success: false,
        error: 'Registration parameter is required'
      }, { status: 400 })
    }

    // Forward to POST endpoint
    return POST(new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        registration
      })
    }))

  } catch (error) {
    console.error('❌ [EUROCARPARTS-API] GET Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
