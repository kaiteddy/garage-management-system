import { getDVSAAccessToken } from "./dvsa-auth"
import { sql } from "./database/neon-client"

export interface MOTTestResult {
  testResult: string
  testDate: string
  expiryDate: string
  odometerValue: number
  odometerUnit: string
  motTestNumber: string
  defects: any[]
  advisories: any[]
  testClass: string
  testType: string
}

export interface VehicleMOTData {
  registration: string
  make: string
  model: string
  firstUsedDate: string
  fuelType: string
  primaryColour: string
  motTests: MOTTestResult[]
}

export interface MOTCheckResult {
  registration: string
  success: boolean
  motStatus: "valid" | "expired" | "due-soon" | "no-mot" | "error"
  expiryDate?: string
  lastTestDate?: string
  error?: string
  vehicleData?: VehicleMOTData
  processingTime?: number
}

/**
 * High-performance MOT status check with optimized error handling
 */
export async function checkMOTStatus(registration: string): Promise<MOTCheckResult> {
  const startTime = Date.now()

  try {
    const cleanReg = registration.toUpperCase().replace(/\s/g, "")
    console.log(`[MOT-API] Checking MOT status for: ${cleanReg}`)

    const token = await getDVSAAccessToken()

    const dvsaApiKey = process.env.DVSA_API_KEY;
    if (!dvsaApiKey) {
      throw new Error('DVSA_API_KEY environment variable is not set');
    }

    const apiUrl = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`;
    const requestDetails = {
      url: apiUrl,
      method: 'GET',
      headers: {
        'x-api-key': '***' + (dvsaApiKey ? dvsaApiKey.slice(-4) : 'none'),
        'Authorization': token ? 'Bearer ***' + (token.slice(-8)) : 'none',
        'Accept': 'application/json',
        'User-Agent': 'MOT-Bulk-Scanner/1.0',
        'Cache-Control': 'no-cache'
      }
    };
    
    console.log('[MOT-API] Sending request:', JSON.stringify(requestDetails, null, 2));
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-api-key': dvsaApiKey,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'MOT-Bulk-Scanner/1.0',
          'Cache-Control': 'no-cache'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      console.error('[MOT-API] Network error during fetch:', errorMessage);
      throw new Error(`Network error: ${errorMessage}`);
    }

    const processingTime = Date.now() - startTime

    if (response.status === 404) {
      return {
        registration: cleanReg,
        success: false,
        motStatus: "no-mot",
        error: "Vehicle not found in DVSA database",
        processingTime,
      }
    }

    // Log response status and headers for debugging
    console.log(`[MOT-API] Response status: ${response.status} ${response.statusText}`);
    console.log('[MOT-API] Response headers:');
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
      console.log(`  ${key}: ${value}`);
    });
    
    // For successful responses, log the response body for debugging
    if (response.ok) {
      try {
        const responseBody = await response.clone().text();
        console.log('[MOT-API] Response body:', responseBody);
      } catch (e) {
        console.error('[MOT-API] Failed to read response body:', e);
      }
    }

    if (!response.ok) {
      // Try to get the response body as text first
      let responseText: string;
      try {
        responseText = await response.text();
        console.log('[MOT-API] Raw response body:', responseText);
      } catch (e) {
        const error = e as Error;
        responseText = `Failed to get response text: ${error.message}`;
        console.error(`[MOT-API] ${responseText}`);
      }
      
      // Try to parse the response as JSON if possible
      let errorDetails = '';
      try {
        if (responseText) {
          const errorResponse = JSON.parse(responseText);
          errorDetails = `\n${JSON.stringify(errorResponse, null, 2)}`;
        }
      } catch (e) {
        // Not JSON, use the raw text
        errorDetails = `\n${responseText}`;
      }
      
      const errorMessage = `DVSA API error: ${response.status} ${response.statusText}${errorDetails}`;
      console.error('[MOT-API]', errorMessage);
      
      // Log detailed request/response info for debugging
      console.log('[MOT-API] Request URL:', `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`);
      console.log('[MOT-API] Request headers:', {
        'x-api-key': '***' + (dvsaApiKey ? dvsaApiKey.slice(-4) : 'none'),
        'Authorization': token ? 'Bearer ***' + (token.slice(-8)) : 'none',
        'Accept': 'application/json',
        'User-Agent': 'MOT-Bulk-Scanner/1.0',
        'Cache-Control': 'no-cache'
      });
      
      console.log('[MOT-API] Response headers:', responseHeaders);
      if (responseText) {
        console.log('[MOT-API] Response body:', responseText);
      }
      
      // For 403 errors, provide more specific guidance
      if (response.status === 403) {
        console.error('[MOT-API] 403 Forbidden error. Possible causes:');
        console.error('1. The API key may not have the correct permissions');
        console.error('2. The access token may be invalid or expired');
        console.error('3. The DVSA API may be experiencing issues');
        console.error('4. Your IP address may not be whitelisted with DVSA');
      }
      
      throw new Error(errorMessage);
    }

    // Parse the response as a single vehicle object
    const vehicle: VehicleMOTData = await response.json()
    
    if (!vehicle) {
      return {
        registration: cleanReg,
        success: false,
        motStatus: "no-mot",
        error: "No vehicle data returned from DVSA",
        processingTime,
      }
    }

    const latestTest = vehicle.motTests?.[0]

    if (!latestTest) {
      return {
        registration: cleanReg,
        success: true,
        motStatus: "no-mot",
        vehicleData: vehicle,
        processingTime,
      }
    }

    // Determine MOT status based on latest test
    let motStatus: MOTCheckResult["motStatus"] = "error"

    if (latestTest.testResult === "PASSED") {
      const expiryDate = new Date(latestTest.expiryDate)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 0) {
        motStatus = "expired"
      } else if (daysUntilExpiry <= 30) {
        motStatus = "due-soon"
      } else {
        motStatus = "valid"
      }
    } else {
      motStatus = "expired" // Failed test means expired MOT
    }

    return {
      registration: cleanReg,
      success: true,
      motStatus,
      expiryDate: latestTest.expiryDate,
      lastTestDate: latestTest.testDate,
      vehicleData: vehicle,
      processingTime,
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`[MOT-API] Error checking MOT for ${registration}:`, error)

    return {
      registration: registration.toUpperCase().replace(/\s/g, ""),
      success: false,
      motStatus: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      processingTime,
    }
  }
}

/**
 * Ultra-fast batch MOT checking with optimized concurrency and rate limiting
 */
export async function bulkCheckMOTStatus(
  registrations: string[],
  options: {
    concurrency?: number
    batchSize?: number
    delayBetweenBatches?: number
    onProgress?: (processed: number, total: number, current: string, avgTime: number) => void
  } = {},
): Promise<MOTCheckResult[]> {
  const {
    concurrency = 15, // Optimal concurrency for DVSA API
    batchSize = 50,
    delayBetweenBatches = 1000,
    onProgress,
  } = options

  const results: MOTCheckResult[] = []
  const totalRegistrations = registrations.length
  let processedCount = 0
  let totalProcessingTime = 0

  console.log(`[MOT-API] Starting bulk MOT check for ${totalRegistrations} vehicles`)
  console.log(
    `[MOT-API] Configuration: ${concurrency} concurrent, ${batchSize} batch size, ${delayBetweenBatches}ms delay`,
  )

  // Process in batches to manage memory and rate limits
  for (let i = 0; i < registrations.length; i += batchSize) {
    const batch = registrations.slice(i, i + batchSize)
    console.log(
      `[MOT-API] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(registrations.length / batchSize)}`,
    )

    // Process batch with controlled concurrency
    const batchResults = await processBatchWithConcurrency(batch, concurrency, (reg, avgTime) => {
      processedCount++
      totalProcessingTime += avgTime
      const overallAvgTime = totalProcessingTime / processedCount

      if (onProgress) {
        onProgress(processedCount, totalRegistrations, reg, overallAvgTime)
      }
    })

    results.push(...batchResults)

    // Delay between batches to respect rate limits
    if (i + batchSize < registrations.length && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
    }
  }

  const avgProcessingTime = totalProcessingTime / processedCount
  console.log(`[MOT-API] Bulk check completed: ${results.length} vehicles processed`)
  console.log(`[MOT-API] Average processing time: ${avgProcessingTime.toFixed(0)}ms per vehicle`)

  return results
}

/**
 * Process a batch of registrations with controlled concurrency
 */
async function processBatchWithConcurrency(
  registrations: string[],
  concurrency: number,
  onProgress: (registration: string, processingTime: number) => void,
): Promise<MOTCheckResult[]> {
  const results: MOTCheckResult[] = []
  const semaphore = new Array(concurrency).fill(null)

  const processRegistration = async (registration: string): Promise<void> => {
    const cleanReg = registration?.trim().toUpperCase().replace(/\s/g, "") || ""
    
    // Skip empty or invalid registrations
    if (!cleanReg || cleanReg.length < 2) {
      console.log(`[MOT-API] Skipping invalid registration: "${registration}"`)
      return
    }

    try {
      console.log(`[MOT-API] Processing registration: ${cleanReg}`)
      const result = await checkMOTStatus(cleanReg)
      results.push(result)
      onProgress(cleanReg, result.processingTime || 0)
    } catch (error) {
      console.error(`[MOT-API] Error processing ${cleanReg}:`, error)
      results.push({
        registration: cleanReg,
        success: false,
        motStatus: "error",
        error: error instanceof Error ? error.message : "Processing error",
      })
    }
  }

  // Filter out invalid registrations before processing
  const validRegistrations = registrations
    .map(reg => reg?.trim().toUpperCase().replace(/\s/g, ""))
    .filter(reg => reg && reg.length >= 2);

  if (validRegistrations.length < registrations.length) {
    console.log(`[MOT-API] Filtered out ${registrations.length - validRegistrations.length} invalid registrations`);
  }

  // Process worker promises
  const workers = semaphore.map(async () => {
    let index = 0
    while (index < validRegistrations.length) {
      const currentIndex = index++
      if (currentIndex < validRegistrations.length) {
        await processRegistration(validRegistrations[currentIndex])
        // Small delay between requests to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * Update vehicle MOT data in database
 */
export async function updateVehicleMOTData(registration: string, motData: MOTCheckResult): Promise<void> {
  try {
    await sql`
      UPDATE vehicles 
      SET 
        mot_expiry_date = ${motData.expiryDate || null},
        mot_status = ${motData.motStatus},
        mot_last_checked = NOW(),
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration.toUpperCase().replace(/\s/g, "")}
    `
  } catch (error) {
    console.error(`[MOT-API] Error updating vehicle ${registration}:`, error)
    throw error
  }
}

/**
 * Batch update vehicle MOT data for improved performance
 */
export async function batchUpdateVehicleMOTData(motResults: MOTCheckResult[]): Promise<void> {
  try {
    console.log(`[MOT-API] Batch updating ${motResults.length} vehicle records`)

    // Filter successful results only
    const successfulResults = motResults.filter((result) => result.success && result.motStatus !== "error")

    if (successfulResults.length === 0) {
      console.log("[MOT-API] No successful results to update")
      return
    }

    // Use transaction for batch update
    for (const result of successfulResults) {
      await updateVehicleMOTData(result.registration, result)
    }

    console.log(`[MOT-API] Successfully updated ${successfulResults.length} vehicle records`)
  } catch (error) {
    console.error("[MOT-API] Error in batch update:", error)
    throw error
  }
}

/**
 * Get all vehicle registrations for bulk scanning
 */
export async function getAllVehicleRegistrations(): Promise<string[]> {
  try {
    const result = await sql`
      SELECT DISTINCT registration 
      FROM vehicles 
      WHERE registration IS NOT NULL 
      AND registration != ''
      ORDER BY registration
    `

    return result.map((row: any) => row.registration)
  } catch (error) {
    console.error("[MOT-API] Error getting vehicle registrations:", error)
    throw error
  }
}

/**
 * Import vehicles from CSV data to database for bulk scanning
 */
export async function importVehiclesFromCSV(csvData: any[]): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  try {
    console.log(`[MOT-API] Importing ${csvData.length} vehicles to database`)

    for (const vehicle of csvData) {
      try {
        if (!vehicle.Registration || vehicle.Registration.trim() === "") {
          continue // Skip vehicles without registration
        }

        await sql`
          INSERT INTO vehicles (
            registration, 
            make, 
            model, 
            year, 
            color, 
            fuel_type,
            mot_status
          ) VALUES (
            ${vehicle.Registration.trim()},
            ${vehicle.Make || null},
            ${vehicle.Model || null},
            ${vehicle.Year ? Number.parseInt(vehicle.Year) : null},
            ${vehicle.Colour || null},
            ${vehicle.FuelType || null},
            'unknown'
          )
          ON CONFLICT (registration) DO UPDATE SET
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            color = EXCLUDED.color,
            fuel_type = EXCLUDED.fuel_type,
            updated_at = NOW()
        `
        imported++
      } catch (error) {
        errors.push(
          `Error importing ${vehicle.Registration}: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    }

    console.log(`[MOT-API] Successfully imported ${imported} vehicles`)
    return { imported, errors }
  } catch (error) {
    console.error("[MOT-API] Error in bulk import:", error)
    throw error
  }
}

/**
 * Get MOT scan statistics with safe error handling
 */
export async function getMOTScanStats(): Promise<{
  totalVehicles: number
  scannedVehicles: number
  validMOTs: number
  expiredMOTs: number
  dueSoonMOTs: number
  unknownMOTs: number
  lastScanDate: string | null
}> {
  const safeCount = async (query: string): Promise<number> => {
    try {
      const result = await sql.unsafe(query)
      return Number(result[0]?.count || 0)
    } catch (error) {
      if (error instanceof Error && error.message.includes("does not exist")) {
        return 0
      }
      throw error
    }
  }

  try {
    const [totalVehicles, scannedVehicles, validMOTs, expiredMOTs, dueSoonMOTs, unknownMOTs] = await Promise.all([
      safeCount("SELECT COUNT(*) as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''"),
      safeCount("SELECT COUNT(*) as count FROM vehicles WHERE mot_last_checked IS NOT NULL"),
      safeCount("SELECT COUNT(*) as count FROM vehicles WHERE mot_status = 'valid'"),
      safeCount("SELECT COUNT(*) as count FROM vehicles WHERE mot_status = 'expired'"),
      safeCount("SELECT COUNT(*) as count FROM vehicles WHERE mot_status = 'due-soon'"),
      safeCount("SELECT COUNT(*) as count FROM vehicles WHERE mot_status = 'unknown' OR mot_status IS NULL"),
    ])

    let lastScanDate: string | null = null
    try {
      const lastScanResult =
        await sql`SELECT MAX(mot_last_checked) as last_scan FROM vehicles WHERE mot_last_checked IS NOT NULL`
      lastScanDate = lastScanResult[0]?.last_scan || null
    } catch (error) {
      // Ignore error if table doesn't exist
    }

    return {
      totalVehicles,
      scannedVehicles,
      validMOTs,
      expiredMOTs,
      dueSoonMOTs,
      unknownMOTs,
      lastScanDate,
    }
  } catch (error) {
    console.error("[MOT-API] Error getting MOT scan stats:", error)
    return {
      totalVehicles: 0,
      scannedVehicles: 0,
      validMOTs: 0,
      expiredMOTs: 0,
      dueSoonMOTs: 0,
      unknownMOTs: 0,
      lastScanDate: null,
    }
  }
}
