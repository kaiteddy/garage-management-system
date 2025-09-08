import { NextRequest, NextResponse } from 'next/server'
import { getVDGVehicleDataV2, VDG_PACKAGES } from '@/lib/vehicle-data-global-v2'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const registration = searchParams.get('registration') || 'LN64XFG'
  const packageName = searchParams.get('package') || 'VehicleDetailsWithImage'
  
  console.log(`🧪 [VDG-V2-API] Testing new VDG API for ${registration} with package: ${packageName}`)
  
  try {
    // Validate package name
    if (!Object.values(VDG_PACKAGES).includes(packageName)) {
      return NextResponse.json({
        error: 'Invalid package name',
        availablePackages: Object.values(VDG_PACKAGES),
        providedPackage: packageName
      }, { status: 400 })
    }
    
    const result = await getVDGVehicleDataV2(registration, packageName)
    
    return NextResponse.json({
      success: true,
      registration: registration.toUpperCase(),
      package: packageName,
      result,
      summary: {
        make: result.make,
        model: result.model,
        year: result.year,
        fuelType: result.fuelType,
        hasImage: !!result.imageUrl,
        specificationsCount: result.specifications?.length || 0,
        cost: result.cost,
        responseId: result.responseId
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`❌ [VDG-V2-API] Error:`, error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      registration: registration.toUpperCase(),
      package: packageName,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
