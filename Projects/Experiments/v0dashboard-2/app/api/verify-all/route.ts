import { NextResponse } from "next/server"
import { ComprehensiveVerifier } from "@/scripts/comprehensive-verify"

export async function GET() {
  try {
    console.log("[VERIFY-ALL] Starting comprehensive verification...")
    
    const verifier = new ComprehensiveVerifier()
    await verifier.run()
    
    return NextResponse.json({
      success: true,
      message: "Comprehensive verification completed successfully!",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[VERIFY-ALL] Failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Comprehensive verification failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  // Same as GET for convenience
  return GET()
}
