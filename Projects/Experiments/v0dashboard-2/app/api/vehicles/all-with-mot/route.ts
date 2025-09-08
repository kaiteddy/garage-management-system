import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Cost-effective derivative extraction using multiple strategies
async function getVehicleDerivative(registration: string, make: string, model: string, engineCapacity?: number, fuelType?: string): Promise<string> {
  // Strategy 1: Check if derivative already exists in database (FREE)
  try {
    const existingVehicle = await sql`
      SELECT derivative FROM vehicles
      WHERE UPPER(registration) = UPPER(${registration})
      AND derivative IS NOT NULL
      AND derivative != 'STANDARD'
      AND derivative != ''
    `

    if (existingVehicle.length > 0 && existingVehicle[0].derivative) {
      console.log(`💾 Using cached derivative for ${registration}: ${existingVehicle[0].derivative}`)
      return existingVehicle[0].derivative
    }
  } catch (error) {
    console.log(`⚠️ Could not check cached derivative for ${registration}`)
  }

  // Strategy 2: Enhanced pattern matching based on engine + fuel type (FREE)
  const intelligentDerivative = extractIntelligentDerivative(make, model, engineCapacity, fuelType)
  if (intelligentDerivative !== 'STANDARD') {
    console.log(`🧠 Intelligent derivative for ${registration}: ${intelligentDerivative}`)
    return intelligentDerivative
  }

  // Strategy 3: For now, return STANDARD (SWS API usage can be added later for specific cases)
  return 'STANDARD'
}

// Enhanced intelligent derivative extraction based on actual vehicle data patterns
function extractIntelligentDerivative(make: string, model: string, engineCapacity?: number, fuelType?: string): string {
  if (!make || !model) return 'STANDARD'

  const makeUpper = make.toUpperCase()
  const modelUpper = model.toUpperCase()
  const fuelUpper = fuelType?.toUpperCase() || ''

  console.log(`🔍 Analyzing derivative for: ${makeUpper} ${modelUpper}`)

  // Strategy 1: Extract derivative directly from model name (MOST ACCURATE)
  const extractedDerivative = extractDerivativeFromModelName(modelUpper)
  if (extractedDerivative !== 'STANDARD') {
    console.log(`✅ Extracted derivative from model name: ${extractedDerivative}`)
    return extractedDerivative
  }

  // Strategy 2: Engine + Fuel Type Intelligence
  if (engineCapacity && fuelType) {
    // Electric vehicles
    if (fuelUpper.includes('ELECTRIC')) return 'ELECTRIC'
    if (fuelUpper.includes('HYBRID')) return 'HYBRID'

    // Diesel engines
    if (fuelUpper.includes('DIESEL')) {
      if (engineCapacity >= 2000) return 'TDI'
      if (engineCapacity >= 1600) return 'TDI'
      return 'DIESEL'
    }

    // Petrol engines with performance indicators
    if (fuelUpper.includes('PETROL')) {
      if (engineCapacity >= 2500) return 'SPORT'
      if (engineCapacity >= 2000) return 'TSI'
      if (engineCapacity >= 1400 && engineCapacity < 1600) return 'TSI'
      if (engineCapacity <= 1000) return 'ECO'
    }
  }

  // Strategy 3: Make-specific defaults based on actual data patterns
  const makeDefaults = getMakeSpecificDefault(makeUpper, modelUpper)
  if (makeDefaults !== 'STANDARD') {
    console.log(`✅ Using make-specific default: ${makeDefaults}`)
    return makeDefaults
  }

  return 'STANDARD'
}

// Extract derivative from model name using comprehensive pattern matching
function extractDerivativeFromModelName(modelUpper: string): string {
  // Common derivative patterns found in actual vehicle data
  const derivativePatterns = [
    // Luxury/Premium trims
    { pattern: /\b(ELEGANCE|CLASSIC|EXECUTIVE|SOLAIR)\b/, derivative: 'ELEGANCE' },
    { pattern: /\b(GHIA|GHIA X)\b/, derivative: 'GHIA' },
    { pattern: /\b(SE|SE 20V|SE TURBO 20V)\b/, derivative: 'SE' },
    { pattern: /\b(GLX|GL|GS|GX)\b/, derivative: 'GL' },
    { pattern: /\b(LX|LS|LSI|LXI)\b/, derivative: 'LX' },

    // Sport/Performance trims
    { pattern: /\b(SPORT|SPORTIF|R)\b/, derivative: 'SPORT' },
    { pattern: /\b(GTI|GTD|GT)\b/, derivative: 'GTI' },
    { pattern: /\b(ST|ST-LINE)\b/, derivative: 'ST' },
    { pattern: /\b(M SPORT|M-SPORT)\b/, derivative: 'M SPORT' },
    { pattern: /\b(AMG|AMG LINE)\b/, derivative: 'AMG' },

    // Engine/Tech trims
    { pattern: /\b(TSI|TDI|TFSI)\b/, derivative: 'TSI' },
    { pattern: /\b(16V|20V|TURBO)\b/, derivative: 'TURBO' },
    { pattern: /\b(VTEC|VVT-I|DSI)\b/, derivative: 'VTEC' },
    { pattern: /\b(BLUEMOTION|ECO)\b/, derivative: 'ECO' },

    // Basic/Entry trims
    { pattern: /\b(CL|C)\b/, derivative: 'CL' },
    { pattern: /\b(L|BASE)\b/, derivative: 'L' },
    { pattern: /\b(XL|XN|XR)\b/, derivative: 'X' },
    { pattern: /\b(ENCORE|TREND)\b/, derivative: 'TREND' },

    // Special editions
    { pattern: /\b(QUIKSILVER|PASSION|COMPACT)\b/, derivative: 'SPECIAL' },
    { pattern: /\b(SV|SLX|SXI)\b/, derivative: 'SV' },

    // Series/Class indicators
    { pattern: /\b(\d+ SERIES|\d+I|C\d+|E\d+|A\d+)\b/, derivative: 'SERIES' },
  ]

  // Try to match patterns in order of specificity
  for (const { pattern, derivative } of derivativePatterns) {
    const match = modelUpper.match(pattern)
    if (match) {
      // Return the actual matched text if it's more specific
      const matchedText = match[1] || match[0]
      return matchedText.replace(/\b/g, '').trim()
    }
  }

  return 'STANDARD'
}

// Get make-specific defaults based on actual data analysis
function getMakeSpecificDefault(makeUpper: string, modelUpper: string): string {
  const makeDefaults = {
    'HONDA': {
      'CIVIC': 'LSI',
      'ACCORD': 'LX',
      'CR-V': 'ES',
      'SHUTTLE': 'LS'
    },
    'MERCEDES': {
      'C-CLASS': 'CLASSIC',
      'E-CLASS': 'ELEGANCE',
      'SL': 'SL',
      '190': 'E',
      'COMPACT': 'E'
    },
    'VOLKSWAGEN': {
      'GOLF': 'CL',
      'POLO': 'CL',
      'PASSAT': 'SE',
      'TRANSPORTER': 'BASE'
    },
    'FORD': {
      'FIESTA': 'GHIA',
      'MONDEO': 'GLX',
      'CAPRI': 'SPORT'
    },
    'TOYOTA': {
      'COROLLA': 'GL',
      'CARINA': 'CD',
      'PREVIA': 'GL',
      'STARLET': 'SPORTIF'
    },
    'PEUGEOT': {
      '106': 'XL',
      '406': 'LX',
      '407': 'SE',
      '806': 'SV'
    },
    'NISSAN': {
      'MICRA': 'GS',
      'ALMERA': 'GX'
    },
    'BMW': {
      '3 SERIES': 'SE',
      '316I': 'BASE'
    },
    'VOLVO': {
      '850': 'SE'
    }
  }

  const makeData = makeDefaults[makeUpper]
  if (makeData) {
    // Try exact model match
    for (const [modelPattern, derivative] of Object.entries(makeData)) {
      if (modelUpper.includes(modelPattern) || modelPattern.includes(modelUpper.split(' ')[0])) {
        return derivative
      }
    }
  }

  return 'STANDARD'
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚗 Loading all vehicles with MOT data...")

    // Get limit parameter for testing (default to 10 for initial testing)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    console.log(`📊 Limiting to ${limit} vehicles for enhanced specification`)

    // Get vehicles in the system with limit for testing
    const vehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.color,
        v.fuel_type,
        v.mot_expiry_date,
        v.mot_status,
        v.mot_last_checked,
        v.tax_status,
        v.tax_due_date,
        v.owner_id,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.phone as customer_phone,
        CASE
          WHEN v.mot_expiry_date IS NULL THEN 'UNKNOWN'
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          ELSE 'VALID'
        END as urgency_level
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration IS NOT NULL
        AND v.registration != ''
      ORDER BY
        CASE
          WHEN v.mot_expiry_date IS NULL THEN 999
          ELSE (v.mot_expiry_date - CURRENT_DATE)
        END ASC,
        v.registration ASC
      LIMIT ${limit}
    `

    console.log(`📊 Found ${vehicles.length} vehicles`)

    // Process vehicles using the same pattern as vehicles-fast API
    const processedVehicles = await Promise.all(vehicles.map(async (vehicle) => {
      // Calculate days until MOT expiry
      let daysUntilMOTExpiry = 999
      if (vehicle.mot_expiry_date) {
        const today = new Date()
        const expiryDate = new Date(vehicle.mot_expiry_date)
        const diffTime = expiryDate.getTime() - today.getTime()
        daysUntilMOTExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      // Calculate days until tax expiry
      let daysUntilTaxExpiry = 999
      if (vehicle.tax_due_date) {
        const today = new Date()
        const taxDueDate = new Date(vehicle.tax_due_date)
        const diffTime = taxDueDate.getTime() - today.getTime()
        daysUntilTaxExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      // Build customer name from first and last name
      const customerName = vehicle.customer_first_name && vehicle.customer_last_name
        ? `${vehicle.customer_first_name} ${vehicle.customer_last_name}`.trim()
        : null

      // Get enhanced vehicle specification using cost-effective approach
      let enhancedSpec = null

      // Use existing vehicle data as base
      const baseMake = vehicle.make || 'Unknown'
      const baseModel = vehicle.model || 'Unknown'
      const engineCapacity = vehicle.engine_size || undefined
      const fuelType = vehicle.fuel_type || undefined

      // Get intelligent derivative (FREE - no API calls)
      const derivative = await getVehicleDerivative(
        vehicle.registration,
        baseMake,
        baseModel,
        engineCapacity,
        fuelType
      )

      enhancedSpec = {
        make: baseMake,
        model: baseModel,
        derivative: derivative,
        year: vehicle.year,
        engineSize: engineCapacity ? `${engineCapacity}cc` : undefined,
        fuelType: fuelType,
        colour: vehicle.color
      }

      console.log(`✅ Enhanced spec for ${vehicle.registration}: ${enhancedSpec.make} ${enhancedSpec.model} ${enhancedSpec.derivative}`)

      return {
        id: vehicle.registration, // Use registration as ID for now
        registration: vehicle.registration,
        make: enhancedSpec?.make || vehicle.make || 'Unknown',
        model: enhancedSpec?.model || vehicle.model || 'Unknown',
        derivative: enhancedSpec?.derivative || vehicle.derivative || null,
        year: enhancedSpec?.year?.toString() || vehicle.year?.toString(),
        color: enhancedSpec?.colour || vehicle.color,
        fuelType: enhancedSpec?.fuelType || vehicle.fuel_type,
        engineSize: enhancedSpec?.engineSize || null,
        motStatus: vehicle.mot_status || 'Unknown',
        motExpiryDate: vehicle.mot_expiry_date,
        taxStatus: vehicle.tax_status || 'Unknown',
        taxDueDate: vehicle.tax_due_date,
        chassis: enhancedSpec?.vin || null,
        engineCode: null,
        co2Emissions: enhancedSpec?.co2Emissions || null,
        euroStatus: enhancedSpec?.euroStatus || null,
        typeApproval: null,
        wheelplan: null,
        customerName: customerName,
        customerPhone: vehicle.customer_phone,
        customerEmail: null,
        customerCompany: null,
        customerPostCode: null,
        customerTown: null,
        daysUntilMOTExpiry,
        daysUntilTaxExpiry,
        motUrgency: vehicle.urgency_level.toLowerCase(),
        createdAt: null,
        updatedAt: null
      }
    }))

    // Generate summary statistics
    const summary = {
      total: processedVehicles.length,
      withMOTData: processedVehicles.filter(v => v.motExpiryDate).length,
      withoutMOTData: processedVehicles.filter(v => !v.motExpiryDate).length,
      expired: processedVehicles.filter(v => v.daysUntilMOTExpiry < 0).length,
      critical: processedVehicles.filter(v => v.daysUntilMOTExpiry >= 0 && v.daysUntilMOTExpiry <= 7).length,
      warning: processedVehicles.filter(v => v.daysUntilMOTExpiry > 7 && v.daysUntilMOTExpiry <= 14).length,
      attention: processedVehicles.filter(v => v.daysUntilMOTExpiry > 14 && v.daysUntilMOTExpiry <= 30).length,
      ok: processedVehicles.filter(v => v.daysUntilMOTExpiry > 30).length
    }

    console.log("📈 Vehicle Summary:", summary)

    return NextResponse.json({
      success: true,
      vehicles: processedVehicles,
      summary,
      message: `Loaded ${processedVehicles.length} vehicles with MOT tracking data`
    })

  } catch (error) {
    console.error("❌ Error loading vehicles with MOT data:", error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load vehicles",
        errorDetails: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null
        },
        vehicles: [],
        summary: {
          total: 0,
          withMOTData: 0,
          withoutMOTData: 0,
          expired: 0,
          critical: 0,
          warning: 0,
          attention: 0,
          ok: 0
        }
      },
      { status: 500 }
    )
  }
}
