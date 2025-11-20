"use server"

import { getDVSAAccessToken, DVSA_CONFIG } from "./dvsa-auth"

export interface DVSATestResult {
  success: boolean
  step: string
  message: string
  data?: any
  error?: string
  timestamp: string
}

export async function runDVSASystemTest(): Promise<DVSATestResult[]> {
  const results: DVSATestResult[] = []
  const timestamp = new Date().toISOString()

  // Test 1: OAuth Token Authentication
  try {
    console.log("🧪 Test 1: OAuth Token Authentication")
    const token = await getDVSAAccessToken()

    results.push({
      success: true,
      step: "OAuth Authentication",
      message: `Successfully obtained access token using working configuration`,
      data: {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 50) + "...",
        tokenType: token.startsWith("eyJ") ? "JWT" : "Opaque",
        scope: DVSA_CONFIG.scope,
        endpoint: DVSA_CONFIG.tokenUrl,
      },
      timestamp,
    })
  } catch (error) {
    results.push({
      success: false,
      step: "OAuth Authentication",
      message: "Failed to obtain OAuth access token",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp,
    })
    return results // Stop if auth fails
  }

  // Test 2: DVSA API Connectivity
  try {
    console.log("🧪 Test 2: DVSA API Connectivity")
    const token = await getDVSAAccessToken()
    const testRegistration = "EX64UWJ"
    const apiUrl = `${DVSA_CONFIG.baseUrl}/registration/${testRegistration}`

    console.log(`🌐 Testing API endpoint: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-Key": DVSA_CONFIG.apiKey,
        Accept: "application/json",
      },
    })

    const responseText = await response.text()
    console.log(`📡 API response: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const data = JSON.parse(responseText)
      results.push({
        success: true,
        step: "DVSA API Connectivity",
        message: `API responded successfully (${response.status})`,
        data: {
          endpoint: apiUrl,
          status: response.status,
          statusText: response.statusText,
          vehicleFound: !!data.registration,
          make: data.make,
          model: data.model,
          motTestCount: data.motTests?.length || 0,
          responseLength: responseText.length,
        },
        timestamp,
      })
    } else {
      results.push({
        success: false,
        step: "DVSA API Connectivity",
        message: `API returned error (${response.status})`,
        error: responseText,
        data: {
          endpoint: apiUrl,
          status: response.status,
          statusText: response.statusText,
        },
        timestamp,
      })
    }
  } catch (error) {
    results.push({
      success: false,
      step: "DVSA API Connectivity",
      message: "Failed to test API connectivity",
      error: error instanceof Error ? error.message : "Connection error",
      timestamp,
    })
  }

  // Test 3: DVSA Connection
  try {
    console.log("🧪 Test 3: DVSA Connection")
    const connectionTestResult = await testDVSAConnection()

    results.push({
      success: connectionTestResult.success,
      step: "DVSA Connection",
      message: connectionTestResult.message,
      data: connectionTestResult.details,
      timestamp,
    })
  } catch (error) {
    results.push({
      success: false,
      step: "DVSA Connection",
      message: "Failed to test DVSA connection",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp,
    })
  }

  return results
}

export async function testSpecificRegistration(registration: string): Promise<DVSATestResult> {
  const timestamp = new Date().toISOString()

  try {
    console.log(`🧪 Testing specific registration: ${registration}`)
    const token = await getDVSAAccessToken()
    const cleanReg = registration.toUpperCase().replace(/\s/g, "")
    const apiUrl = `${DVSA_CONFIG.baseUrl}/registration/${cleanReg}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-Key": DVSA_CONFIG.apiKey,
        Accept: "application/json",
      },
    })

    const responseText = await response.text()

    if (response.ok) {
      const data = JSON.parse(responseText)
      const latestMOT = data.motTests?.[0]

      return {
        success: true,
        step: `Registration Test: ${registration}`,
        message: `Successfully retrieved data for ${registration}`,
        data: {
          endpoint: apiUrl,
          registration: data.registration,
          make: data.make,
          model: data.model,
          fuelType: data.fuelType,
          primaryColour: data.primaryColour,
          firstUsedDate: data.firstUsedDate,
          motTestCount: data.motTests?.length || 0,
          latestMOT: latestMOT
            ? {
                completedDate: latestMOT.completedDate,
                testResult: latestMOT.testResult,
                expiryDate: latestMOT.expiryDate,
                odometerValue: latestMOT.odometerValue,
                odometerUnit: latestMOT.odometerUnit,
                defectCount: latestMOT.rfrAndComments?.length || 0,
              }
            : null,
        },
        timestamp,
      }
    } else {
      return {
        success: false,
        step: `Registration Test: ${registration}`,
        message: `API returned error for ${registration} (${response.status})`,
        error: responseText,
        data: {
          endpoint: apiUrl,
          status: response.status,
          statusText: response.statusText,
        },
        timestamp,
      }
    }
  } catch (error) {
    return {
      success: false,
      step: `Registration Test: ${registration}`,
      message: `Failed to test registration ${registration}`,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp,
    }
  }
}

export async function testDVSAConnection(): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    // Test basic connectivity
    const testUrl = "https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=AA19AAA"

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Accept: "application/json+v6",
        "x-api-key": process.env.DVSA_API_KEY || "demo-key",
        "User-Agent": "ServiceDataTable/1.0",
      },
    })

    if (response.status === 401) {
      return {
        success: false,
        message: "Authentication failed - Invalid API key",
      }
    }

    if (response.status === 404) {
      return {
        success: true,
        message: "DVSA API connection successful (test registration not found, which is expected)",
      }
    }

    if (response.ok) {
      return {
        success: true,
        message: "DVSA API connection successful",
      }
    }

    return {
      success: false,
      message: `DVSA API returned status: ${response.status} ${response.statusText}`,
    }
  } catch (error) {
    return {
      success: false,
      message: "Failed to connect to DVSA API",
      details: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
