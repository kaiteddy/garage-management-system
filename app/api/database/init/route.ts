import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[DATABASE-INIT] Starting database initialization...")

    const result = await initializeDatabase()

    if (result.success) {
      console.log("[DATABASE-INIT] Database initialization completed successfully")
      return NextResponse.json({
        success: true,
        message: "Database initialized successfully with all tables and indexes!",
      })
    } else {
      console.error("[DATABASE-INIT] Database initialization failed:", result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Database initialization failed",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[DATABASE-INIT] Unexpected error during initialization:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error during initialization",
      },
      { status: 500 },
    )
  }
}
