import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { registration } = await request.json()
    
    if (!registration) {
      return NextResponse.json({
        success: false,
        error: "Registration number is required"
      }, { status: 400 })
    }

    const cleanReg = registration.trim().toUpperCase().replace(/\s/g, '')
    console.log(`[VEHICLE-LOOKUP] Starting comprehensive lookup for: ${cleanReg}`)

    // Step 1: Check if vehicle already exists in database
    const existingVehicles = await sql`
      SELECT * FROM vehicles 
      WHERE registration = ${cleanReg}
      OR REPLACE(registration, ' ', '') = ${cleanReg}
      LIMIT 1
    `

    if (existingVehicles.length > 0) {
      const vehicle = existingVehicles[0]
      console.log(`[VEHICLE-LOOKUP] ✅ Found existing vehicle in database: ${vehicle.registration}`)
      
      // Check if we have complete data (make AND model)
      if (vehicle.make && vehicle.model) {
        return NextResponse.json({
          success: true,
          vehicle: {
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            derivative: vehicle.derivative,
            year: vehicle.year,
            color: vehicle.color,
            fuel_type: vehicle.fuel_type,
            engine_size: vehicle.engine_size,
            vin: vehicle.vin,
            mot_status: vehicle.mot_status,
            mot_expiry_date: vehicle.mot_expiry_date,
            tax_status: vehicle.tax_status,
            tax_due_date: vehicle.tax_due_date
          },
          source: "database",
          message: "Vehicle data found in database"
        })
      } else {
        console.log(`[VEHICLE-LOOKUP] ⚠️ Incomplete data in database, refreshing from APIs`)
      }
    }

    // Step 2: Fetch from DVLA API
    let vehicleData: any = {}
    let dvlaSuccess = false
    
    try {
      console.log(`[VEHICLE-LOOKUP] 🔍 Fetching DVLA data for: ${cleanReg}`)
      const dvlaResponse = await fetch(`${request.nextUrl.origin}/api/dvla-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: cleanReg }),
      })

      if (dvlaResponse.ok) {
        const dvlaResult = await dvlaResponse.json()
        if (dvlaResult.success && dvlaResult.data) {
          vehicleData = { ...vehicleData, ...dvlaResult.data }
          dvlaSuccess = true
          console.log(`[VEHICLE-LOOKUP] ✅ DVLA data retrieved: Make=${vehicleData.make}`)
        }
      }
    } catch (error) {
      console.error(`[VEHICLE-LOOKUP] ❌ DVLA API error:`, error)
    }

    // Step 3: Fetch from MOT API (critical for model information)
    let motSuccess = false
    
    try {
      console.log(`[VEHICLE-LOOKUP] 🔍 Fetching MOT data for: ${cleanReg}`)
      const motResponse = await fetch(`${request.nextUrl.origin}/api/mot-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: cleanReg }),
      })

      if (motResponse.ok) {
        const motResult = await motResponse.json()
        // MOT API doesn't return a 'success' field, check for registration instead
        if (motResult.registration || motResult.make) {
          // MOT API provides model information that DVLA doesn't
          vehicleData.model = motResult.model || vehicleData.model
          vehicleData.make = motResult.make || vehicleData.make
          vehicleData.primaryColour = motResult.colour || vehicleData.primaryColour
          vehicleData.fuelType = motResult.fuelType || vehicleData.fuelType
          vehicleData.engineSize = motResult.engineSize || vehicleData.engineSize
          motSuccess = true
          console.log(`[VEHICLE-LOOKUP] ✅ MOT data retrieved: Make=${motResult.make}, Model=${motResult.model}`)
        }
      }
    } catch (error) {
      console.error(`[VEHICLE-LOOKUP] ❌ MOT API error:`, error)
    }

    // Step 4: Return the combined data (skip database storage for now to avoid schema issues)
    if (dvlaSuccess || motSuccess) {
      console.log(`[VEHICLE-LOOKUP] ✅ Vehicle data retrieved successfully for ${cleanReg}`)

      return NextResponse.json({
        success: true,
        vehicle: {
          registration: cleanReg,
          make: vehicleData.make || '',
          model: vehicleData.model || '',
          derivative: vehicleData.derivative || '',
          year: vehicleData.yearOfManufacture || null,
          color: vehicleData.colour || vehicleData.primaryColour || '',
          fuel_type: vehicleData.fuelType || '',
          engine_size: vehicleData.engineCapacity ? `${vehicleData.engineCapacity}cc` : vehicleData.engineSize || '',
          vin: vehicleData.vin || vehicleData.chassisNumber || '',
          mot_status: vehicleData.motStatus || '',
          mot_expiry_date: vehicleData.motExpiryDate || null,
          tax_status: vehicleData.taxStatus || '',
          tax_due_date: vehicleData.taxDueDate || null
        },
        source: "api_lookup",
        apis_used: {
          dvla: dvlaSuccess,
          mot: motSuccess
        },
        message: `Vehicle data fetched from ${dvlaSuccess && motSuccess ? 'DVLA and MOT APIs' : dvlaSuccess ? 'DVLA API' : 'MOT API'}`,
        note: "Database storage temporarily disabled - data returned from APIs only"
      })
    }

    // Step 5: No data found from any source
    console.log(`[VEHICLE-LOOKUP] ❌ No vehicle data found for: ${cleanReg}`)
    return NextResponse.json({
      success: false,
      error: "Vehicle not found in any data source",
      registration: cleanReg,
      apis_tried: {
        dvla: !dvlaSuccess ? "failed" : "no_data",
        mot: !motSuccess ? "failed" : "no_data"
      }
    }, { status: 404 })

  } catch (error) {
    console.error("[VEHICLE-LOOKUP] ❌ Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
