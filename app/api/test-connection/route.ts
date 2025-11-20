import { NextResponse } from "next/server"
import { testDatabaseConnection } from "@/lib/database/neon-client"
import { getDVSAAccessToken, getDVLAApiKey } from "@/lib/dvsa-auth"

export async function GET() {
  const results = {
    database: { status: "unknown", message: "", error: null as string | null },
    dvla: { status: "unknown", message: "", error: null as string | null },
    dvsa: { status: "unknown", message: "", error: null as string | null },
  }

  // Test Database Connection
  try {
    const dbConnected = await testDatabaseConnection()
    if (dbConnected) {
      results.database.status = "success"
      results.database.message = "Database connection successful"
    } else {
      results.database.status = "error"
      results.database.message = "Database connection failed"
    }
  } catch (error) {
    results.database.status = "error"
    results.database.message = "Database connection test failed"
    results.database.error = error instanceof Error ? error.message : "Unknown error"
  }

  // Test DVLA API Key
  try {
    const apiKey = getDVLAApiKey()
    if (apiKey) {
      results.dvla.status = "success"
      results.dvla.message = "DVLA API key is configured"
    }
  } catch (error) {
    results.dvla.status = "error"
    results.dvla.message = "DVLA API key not configured"
    results.dvla.error = error instanceof Error ? error.message : "Unknown error"
  }

  // Test DVSA Authentication
  try {
    const token = await getDVSAAccessToken()
    if (token) {
      results.dvsa.status = "success"
      results.dvsa.message = "DVSA authentication successful"
    }
  } catch (error) {
    results.dvsa.status = "error"
    results.dvsa.message = "DVSA authentication failed"
    results.dvsa.error = error instanceof Error ? error.message : "Unknown error"
  }

  return NextResponse.json({
    success: true,
    results,
    timestamp: new Date().toISOString(),
  })
}
