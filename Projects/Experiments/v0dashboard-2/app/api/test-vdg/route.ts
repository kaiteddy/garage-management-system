import { NextRequest, NextResponse } from 'next/server'
import { getVDGVehicleData, getVDGVehicleDataWithPackages, testVDGConnection, testVDGAPIFormat } from '@/lib/vehicle-data-global'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration') || 'LN64XFG'
    const packages = searchParams.get('packages')?.split(',') || ['VehicleDetailsWithImage']
    const testConnection = searchParams.get('test') === 'true'
    const testFormat = searchParams.get('format') === 'true'
    const mockTest = searchParams.get('mock') === 'true'

    console.log(`🧪 [TEST-VDG] Testing VDG API for ${registration} with packages: ${packages.join(', ')}`)

    if (testConnection) {
      const connectionTest = await testVDGConnection()
      return NextResponse.json({
        success: connectionTest,
        message: connectionTest ? 'VDG API connection successful' : 'VDG API connection failed',
        apiKey: process.env.VDG_API_KEY ? 'Using env variable' : 'Using hardcoded key',
        keyPreview: `${process.env.VDG_API_KEY || 'E04CCF69-8A11-48F3-AE37-D1A74ED96F82'}`.substring(0, 8) + '...'
      })
    }

    if (testFormat) {
      const formatTest = await testVDGAPIFormat(registration)
      return NextResponse.json({
        success: true,
        message: 'API format test completed',
        results: formatTest
      })
    }

    // Test VDG data retrieval with selected packages
    const vdgData = await getVDGVehicleDataWithPackages(registration, packages)

    if (vdgData) {
      // Calculate total cost based on selected packages
      const packageCosts: { [key: string]: number } = {
        'VehicleDetails': 0.05,
        'VehicleDetailsWithImage': 0.14,
        'MotHistoryDetails': 0.05,
        'SpecAndOptionsDetails': 0.18,
        'TyreDetails': 0.08,
        'BatteryDetails': 0.06,
        'AddressDetails': 0.05
      }

      const totalCost = packages.reduce((sum, pkg) => sum + (packageCosts[pkg] || 0), 0)
      const swsCost = 0.70
      const savings = swsCost - totalCost

      return NextResponse.json({
        success: true,
        data: vdgData,
        packages: packages,
        cost: `£${totalCost.toFixed(2)} total`,
        savings: `${Math.round((savings / swsCost) * 100)}% vs SWS (£${swsCost})`,
        comparison: {
          sws_cost: `£${swsCost.toFixed(2)}`,
          vdg_cost: `£${totalCost.toFixed(2)}`,
          savings_per_lookup: `£${savings.toFixed(2)}`,
          savings_percentage: `${Math.round((savings / swsCost) * 100)}%`
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No data found for registration',
        registration,
        packages
      })
    }

  } catch (error) {
    console.error('❌ [TEST-VDG] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrations } = body

    if (!registrations || !Array.isArray(registrations)) {
      return NextResponse.json({
        success: false,
        error: 'Please provide an array of registrations'
      }, { status: 400 })
    }

    console.log(`🧪 [TEST-VDG] Bulk testing ${registrations.length} vehicles`)

    const results = []
    let totalCost = 0

    for (const registration of registrations) {
      const vdgData = await getVDGVehicleData(registration)
      totalCost += 0.32 // £0.32 per lookup

      results.push({
        registration,
        success: !!vdgData,
        data: vdgData,
        cost: '£0.32'
      })

      // Add small delay to respect rate limits (10 per second)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const swsCost = registrations.length * 0.70
    const vdgCost = totalCost
    const savings = swsCost - vdgCost

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total_vehicles: registrations.length,
        successful_lookups: results.filter(r => r.success).length,
        sws_total_cost: `£${swsCost.toFixed(2)}`,
        vdg_total_cost: `£${vdgCost.toFixed(2)}`,
        total_savings: `£${savings.toFixed(2)}`,
        savings_percentage: `${Math.round((savings / swsCost) * 100)}%`
      }
    })

  } catch (error) {
    console.error('❌ [TEST-VDG] Bulk test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
