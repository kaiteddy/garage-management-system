import { NextResponse } from "next/server"
import { testDatabaseConnection } from "@/lib/database/neon-client"

async function safeConnectionTest() {
  try {
    return await testDatabaseConnection()
  } catch (err) {
    console.error("[DATABASE-DEBUG] Connection test error:", err)
    return false
  }
}

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      POSTGRES_URL: process.env.POSTGRES_URL ? "SET" : "MISSING",
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? "SET" : "MISSING",
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? "SET" : "MISSING",
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ? "SET" : "MISSING",
      PGHOST: process.env.PGHOST ? "SET" : "MISSING",
      PGUSER: process.env.PGUSER ? "SET" : "MISSING",
      PGPASSWORD: process.env.PGPASSWORD ? "SET" : "MISSING",
      PGDATABASE: process.env.PGDATABASE ? "SET" : "MISSING",
      NODE_ENV: process.env.NODE_ENV || "unknown",
      VERCEL_ENV: process.env.VERCEL_ENV || "unknown",
    }

    // Determine which database URL is being used
    let selectedUrl = "NONE"
    let urlPreview = "No valid database URL found"

    const candidates = [
      "DATABASE_URL",
      "POSTGRES_URL",
      "POSTGRES_PRISMA_URL",
      "POSTGRES_URL_NON_POOLING",
      "DATABASE_URL_UNPOOLED",
    ]

    for (const candidate of candidates) {
      const value = process.env[candidate]
      if (value && value.trim() && (value.startsWith("postgres://") || value.startsWith("postgresql://"))) {
        selectedUrl = candidate
        urlPreview = value.substring(0, 50) + "..."
        break
      }
    }

    // Test connection only if we discovered a usable database URL.
    let connectionStatus = "Skipped"
    if (selectedUrl !== "NONE") {
      const ok = await safeConnectionTest()
      connectionStatus = ok ? "Connected" : "Failed"
    }

    return NextResponse.json({
      success: true,
      environment_variables: envVars,
      selected_database_url: selectedUrl,
      url_preview: urlPreview,
      connection_status: connectionStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[DATABASE-DEBUG] Debug check failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        environment_variables: {},
        selected_database_url: "ERROR",
        url_preview: "Failed to load",
        connection_status: "Error",
      },
      { status: 500 },
    )
  }
}
