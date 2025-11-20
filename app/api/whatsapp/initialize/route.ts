import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST() {
  try {
    console.log("[WHATSAPP-INIT] Initializing WhatsApp database...")
    
    const result = await WhatsAppService.initializeDatabase()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "WhatsApp database initialized successfully",
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error("[WHATSAPP-INIT] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to initialize WhatsApp database"
    }, { status: 500 })
  }
}
