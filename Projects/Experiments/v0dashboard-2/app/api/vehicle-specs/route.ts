import { NextRequest, NextResponse } from 'next/server'

// Generate estimated vehicle specifications and repair times
function generateEstimatedSpecs(make: string, model: string, year: string) {
  const currentYear = new Date().getFullYear()
  const vehicleAge = currentYear - parseInt(year)
  const makeUpper = make.toUpperCase()
  const modelUpper = model.toUpperCase()
  
  // Estimate engine type and characteristics based on make/model/year
  let engineType = 'petrol'
  let estimatedHP = 120
  let estimatedTorque = 150
  let combinedMpg = 35
  let oilChangeInterval = '6000 miles'
  let serviceInterval = '12000 miles'
  
  // Adjust estimates based on make and model
  if (makeUpper.includes('BMW') || makeUpper.includes('MERCEDES') || makeUpper.includes('AUDI')) {
    estimatedHP = 180
    estimatedTorque = 220
    combinedMpg = 32
    oilChangeInterval = '10000 miles'
    serviceInterval = '15000 miles'
  } else if (makeUpper.includes('FORD') || makeUpper.includes('VAUXHALL') || makeUpper.includes('VOLKSWAGEN')) {
    estimatedHP = 130
    estimatedTorque = 160
    combinedMpg = 38
  } else if (makeUpper.includes('TOYOTA') || makeUpper.includes('HONDA') || makeUpper.includes('NISSAN')) {
    estimatedHP = 125
    estimatedTorque = 155
    combinedMpg = 42
    oilChangeInterval = '5000 miles'
    serviceInterval = '10000 miles'
  }
  
  // Adjust for vehicle age
  if (vehicleAge > 15) {
    oilChangeInterval = '3000 miles'
    serviceInterval = '6000 miles'
    combinedMpg = Math.max(25, combinedMpg - 5)
  } else if (vehicleAge > 10) {
    oilChangeInterval = '4000 miles'
    serviceInterval = '8000 miles'
    combinedMpg = Math.max(28, combinedMpg - 3)
  }
  
  // Estimate repair times based on vehicle complexity and age
  const baseMultiplier = vehicleAge > 15 ? 1.3 : vehicleAge > 10 ? 1.2 : 1.0
  const luxuryMultiplier = (makeUpper.includes('BMW') || makeUpper.includes('MERCEDES') || makeUpper.includes('AUDI')) ? 1.4 : 1.0
  const multiplier = baseMultiplier * luxuryMultiplier
  
  const repairTimes = {
    oil_change: `${(0.5 * multiplier).toFixed(1)} hours`,
    brake_pads_front: `${(1.5 * multiplier).toFixed(1)} hours`,
    brake_pads_rear: `${(1.2 * multiplier).toFixed(1)} hours`,
    brake_discs_front: `${(2.0 * multiplier).toFixed(1)} hours`,
    brake_discs_rear: `${(1.8 * multiplier).toFixed(1)} hours`,
    spark_plugs: `${(1.5 * multiplier).toFixed(1)} hours`,
    air_filter: `${(0.3 * multiplier).toFixed(1)} hours`,
    cabin_filter: `${(0.4 * multiplier).toFixed(1)} hours`,
    battery_replacement: `${(0.5 * multiplier).toFixed(1)} hours`,
    alternator: `${(2.5 * multiplier).toFixed(1)} hours`,
    starter_motor: `${(2.0 * multiplier).toFixed(1)} hours`,
    clutch_replacement: `${(6.0 * multiplier).toFixed(1)} hours`,
    timing_belt: `${(4.0 * multiplier).toFixed(1)} hours`,
    water_pump: `${(3.0 * multiplier).toFixed(1)} hours`,
    radiator: `${(2.5 * multiplier).toFixed(1)} hours`,
    exhaust_system: `${(2.0 * multiplier).toFixed(1)} hours`,
    suspension_struts: `${(3.0 * multiplier).toFixed(1)} hours`,
    cv_joints: `${(2.5 * multiplier).toFixed(1)} hours`,
    wheel_alignment: '1.0 hours',
    mot_test: '1.0 hours',
    diagnostic: '1.0 hours',
    service_small: `${(2.0 * multiplier).toFixed(1)} hours`,
    service_full: `${(4.0 * multiplier).toFixed(1)} hours`,
    tyre_replacement: '0.5 hours',
    wheel_balance: '0.5 hours'
  }
  
  return {
    year: parseInt(year),
    make: make,
    model: model,
    description: `${year} ${make} ${model}`,
    
    // Engine specifications (estimated)
    engine_type: engineType,
    fuel_type: engineType,
    horsepower_hp: estimatedHP,
    torque_ft_lbs: estimatedTorque,
    transmission: vehicleAge > 10 ? 'Manual' : 'Automatic',
    drive_type: 'FWD',
    
    // Fuel economy (estimated)
    combined_mpg: combinedMpg,
    epa_city_mpg: Math.round(combinedMpg * 0.85),
    epa_highway_mpg: Math.round(combinedMpg * 1.15),
    
    // Service intervals
    oil_change_interval: oilChangeInterval,
    service_interval: serviceInterval,
    mot_interval: '12 months',
    
    // Repair times (Autodata-style)
    repair_times: repairTimes
  }
}

export async function POST(request: NextRequest) {
  try {
    const { make, model, year } = await request.json()

    if (!make || !model || !year) {
      return NextResponse.json(
        { success: false, error: 'Make, model, and year are required' },
        { status: 400 }
      )
    }

    console.log(`🔍 [VEHICLE-SPECS] Looking up specs for: ${year} ${make} ${model}`)

    // Generate estimated specifications (Autodata-style)
    const specs = generateEstimatedSpecs(make, model, year)
    
    console.log(`✅ [VEHICLE-SPECS] Generated estimated specs for: ${year} ${make} ${model}`)

    return NextResponse.json({
      success: true,
      specs,
      source: 'Estimated (Autodata-style)',
      message: `Vehicle specifications and repair times estimated for ${year} ${make} ${model}`
    })

  } catch (error) {
    console.error('❌ [VEHICLE-SPECS] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch vehicle specifications' 
      },
      { status: 500 }
    )
  }
}
