import { NextRequest, NextResponse } from 'next/server'
import { EuroCarPartsOrdering } from '@/lib/services/eurocarparts-ordering'
import { RealAutomotiveData } from '@/lib/services/real-automotive-data'
import { RealOmnipartAPI } from '@/lib/services/real-omnipart-api'

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json()

    console.log(`🛒 [PARTS-ORDERING-API] ${action} request:`, params)

    // Set credentials from environment
    EuroCarPartsOrdering.setCredentials({
      username: process.env.EUROCARPARTS_USERNAME || '',
      password: process.env.EUROCARPARTS_PASSWORD || '',
      accountNumber: process.env.EUROCARPARTS_ACCOUNT || '',
      apiKey: process.env.EUROCARPARTS_API_KEY || ''
    })

    switch (action) {
      case 'search-parts':
        const { query, type = 'registration' } = params

        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Search query is required'
          }, { status: 400 })
        }

        // Use REAL Omnipart API for vehicle and parts search
        if (type === 'registration') {
          // First, try to get vehicle data from our database
          let vehicle = null
          try {
            const dbResponse = await fetch(`${request.nextUrl.origin}/api/vehicles/${encodeURIComponent(query)}`)
            if (dbResponse.ok) {
              const dbResult = await dbResponse.json()
              if (dbResult.success && dbResult.vehicle) {
                // Convert our database format to Omnipart format
                const dbVehicle = dbResult.vehicle
                vehicle = {
                  vrm: dbVehicle.registration,
                  vin: dbVehicle.vin,
                  make: dbVehicle.make,
                  model: dbVehicle.model,
                  variant: 'Standard',
                  year: dbVehicle.year?.toString() || '',
                  engine: `${dbVehicle.engineSize || ''}cc`,
                  fuelType: dbVehicle.fuelType || '',
                  transmission: 'Manual',
                  bodyType: 'Hatchback',
                  doors: '5',
                  engineCode: ''
                }
                console.log(`✅ [PARTS-ORDERING] Using database vehicle data for ${query}:`, vehicle)
              }
            }
          } catch (error) {
            console.log(`⚠️ [PARTS-ORDERING] Could not fetch from database, will try external API`)
          }

          // If no database vehicle found, try external API
          if (!vehicle) {
            const vehicleResult = await RealOmnipartAPI.searchVehicleByVRM(query)
            if (vehicleResult.success && vehicleResult.vehicles && vehicleResult.vehicles.length > 0) {
              vehicle = vehicleResult.vehicles[0]
              console.log(`✅ [PARTS-ORDERING] Using external API vehicle data for ${query}:`, vehicle)
            }
          }

          if (vehicle) {
            // Get vehicle-specific parts using the vehicle data
            const partsResult = await RealOmnipartAPI.searchVehicleParts(vehicle)

            return NextResponse.json({
              success: true,
              vehicle,
              parts: partsResult.products || [],
              totalCount: partsResult.totalCount,
              searchTerm: query,
              searchType: type,
              source: 'REAL Euro Car Parts Omnipart API (Vehicle-Specific)',
              timestamp: new Date().toISOString(),
              vehicleReference: {
                vrm: vehicle.vrm,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                engineCode: vehicle.engineCode
              }
            })
          } else {
            // Fallback to general automotive data
            const completeData = await RealAutomotiveData.getCompleteVehicleData(query)
            return NextResponse.json({
              success: true,
              vehicle: completeData.vehicle,
              parts: completeData.parts,
              totalCount: completeData.parts.length,
              searchTerm: query,
              searchType: type,
              source: 'Real Automotive Data (Fallback)',
              timestamp: new Date().toISOString()
            })
          }
        } else {
          // Search parts by term using real Omnipart API
          const partsResult = await RealOmnipartAPI.searchProducts(undefined, query)

          if (partsResult.success) {
            return NextResponse.json({
              success: true,
              parts: partsResult.products,
              totalCount: partsResult.totalCount,
              searchTerm: query,
              searchType: type,
              source: 'REAL Euro Car Parts Omnipart API',
              timestamp: new Date().toISOString()
            })
          } else {
            // Fallback to general parts search
            const parts = await RealAutomotiveData.searchRealParts(query)
            return NextResponse.json({
              success: true,
              parts,
              totalCount: parts.length,
              searchTerm: query,
              searchType: type,
              source: 'Real Automotive Data (Fallback)',
              timestamp: new Date().toISOString()
            })
          }
        }

      case 'search-vehicle-parts-by-category':
        const { vehicle: searchVehicle, category, categoryId } = params

        if (!searchVehicle) {
          return NextResponse.json({
            success: false,
            error: 'Vehicle data is required for category search'
          }, { status: 400 })
        }

        try {
          console.log(`🔍 [PARTS-ORDERING] Searching ${category} parts for vehicle:`, searchVehicle)

          // Use the vehicle data to search for category-specific parts
          const partsResult = await RealOmnipartAPI.searchVehicleParts(searchVehicle, category)

          return NextResponse.json({
            success: true,
            vehicle: searchVehicle,
            parts: partsResult.products || [],
            totalCount: partsResult.totalCount,
            searchTerm: category,
            searchType: 'vehicle-category',
            categoryId: categoryId,
            source: 'REAL Euro Car Parts Omnipart API (Vehicle + Category)',
            timestamp: new Date().toISOString(),
            vehicleReference: {
              vrm: searchVehicle.vrm,
              make: searchVehicle.make,
              model: searchVehicle.model,
              year: searchVehicle.year,
              engineCode: searchVehicle.engineCode
            }
          })
        } catch (error) {
          console.error('❌ [PARTS-ORDERING] Category search failed:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to search category parts for vehicle',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }

      case 'get-part-details':
        const { partNumber } = params
        
        if (!partNumber) {
          return NextResponse.json({
            success: false,
            error: 'Part number is required'
          }, { status: 400 })
        }

        const partDetails = await EuroCarPartsOrdering.getPartDetails(partNumber)
        
        return NextResponse.json({
          ...partDetails,
          source: 'Euro Car Parts',
          timestamp: new Date().toISOString()
        })

      case 'add-to-basket':
        const { items } = params
        
        if (!items || !Array.isArray(items) || items.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Items array is required'
          }, { status: 400 })
        }

        const basketResult = await EuroCarPartsOrdering.addToBasket(items)
        
        return NextResponse.json({
          ...basketResult,
          source: 'Euro Car Parts',
          timestamp: new Date().toISOString()
        })

      case 'place-order':
        const { orderRequest } = params
        
        if (!orderRequest) {
          return NextResponse.json({
            success: false,
            error: 'Order request is required'
          }, { status: 400 })
        }

        const orderResult = await EuroCarPartsOrdering.placeOrder(orderRequest)
        
        return NextResponse.json({
          ...orderResult,
          source: 'Euro Car Parts',
          timestamp: new Date().toISOString()
        })

      case 'track-order':
        const { trackingNumber } = params
        
        if (!trackingNumber) {
          return NextResponse.json({
            success: false,
            error: 'Tracking number is required'
          }, { status: 400 })
        }

        const trackingResult = await EuroCarPartsOrdering.trackOrder(trackingNumber)
        
        return NextResponse.json({
          ...trackingResult,
          source: 'Euro Car Parts',
          timestamp: new Date().toISOString()
        })

      case 'order-history':
        const { customerId, jobSheetId } = params
        
        const historyResult = await EuroCarPartsOrdering.getOrderHistory(customerId, jobSheetId)
        
        return NextResponse.json({
          ...historyResult,
          source: 'Euro Car Parts',
          timestamp: new Date().toISOString()
        })

      case 'test-connection':
        // Test real Omnipart API connection
        const realConnectionTest = await RealOmnipartAPI.testConnection()

        if (realConnectionTest.success) {
          return NextResponse.json({
            ...realConnectionTest,
            source: 'REAL Euro Car Parts Omnipart API',
            timestamp: new Date().toISOString()
          })
        }

        // Fallback to mock connection test
        const connectionResult = await EuroCarPartsOrdering.testConnection()

        return NextResponse.json({
          ...connectionResult,
          source: 'Euro Car Parts (Mock)',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: search-parts, get-part-details, add-to-basket, place-order, track-order, order-history, test-connection'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ [PARTS-ORDERING-API] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for simple queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'test-connection'
    const query = searchParams.get('query')
    const partNumber = searchParams.get('partNumber')
    const trackingNumber = searchParams.get('trackingNumber')

    // Forward to POST endpoint
    const body: any = { action }
    
    if (query) body.query = query
    if (partNumber) body.partNumber = partNumber
    if (trackingNumber) body.trackingNumber = trackingNumber

    return POST(new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }))

  } catch (error) {
    console.error('❌ [PARTS-ORDERING-API] GET Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
