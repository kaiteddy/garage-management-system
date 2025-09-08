import { NextRequest, NextResponse } from 'next/server'
import { getVDGVehicleDataV2, extractVDGAddressData } from '@/lib/vehicle-data-global-v2'

export async function POST(request: NextRequest) {
  try {
    const { registration } = await request.json()

    if (!registration) {
      return NextResponse.json({ 
        success: false,
        error: "Registration number is required" 
      }, { status: 400 })
    }

    console.log(`🏠 [VDG-ADDRESS-API] Looking up address for registration ${registration}`)

    // Use VDG AddressDetails package to get registered keeper address
    const vdgResponse = await getVDGVehicleDataV2(registration, 'AddressDetails')

    if (!vdgResponse) {
      console.log(`❌ [VDG-ADDRESS-API] No data returned from VDG for ${registration}`)
      return NextResponse.json({
        success: false,
        error: "No address data found for this registration",
        registration: registration.toUpperCase().replace(/\s/g, ""),
      }, { status: 404 })
    }

    // Extract address information from the raw VDG response
    const addressData = extractVDGAddressData(vdgResponse.rawData)

    if (!addressData) {
      console.log(`❌ [VDG-ADDRESS-API] Failed to extract address data from VDG response`)
      return NextResponse.json({
        success: false,
        error: "Unable to extract address information from vehicle data",
        registration: registration.toUpperCase().replace(/\s/g, ""),
      }, { status: 404 })
    }

    console.log(`✅ [VDG-ADDRESS-API] Successfully found address for ${registration}`)
    console.log(`💰 [VDG-ADDRESS-API] Cost: £${addressData.cost.toFixed(4)}`)

    return NextResponse.json({
      success: true,
      data: {
        registration: registration.toUpperCase().replace(/\s/g, ""),
        address: addressData.address,
        cost: addressData.cost,
        source: addressData.source,
        responseId: addressData.responseId,
        accountBalance: addressData.accountBalance
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error("VDG address lookup API error:", error)

    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("404")) {
        return NextResponse.json({ 
          success: false,
          error: "Address not found for this registration" 
        }, { status: 404 })
      }

      return NextResponse.json({
        success: false,
        error: error.message,
        details: error.stack || error.message,
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const registration = searchParams.get('registration')

  if (!registration) {
    return NextResponse.json({ 
      success: false,
      error: "Registration parameter is required" 
    }, { status: 400 })
  }

  // Forward to POST endpoint
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registration })
  }))
}
