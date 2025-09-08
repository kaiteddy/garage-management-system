import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[TEST-ENV] Checking environment variables...")
    
    const envVars = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    }
    
    console.log("[TEST-ENV] Environment variables:", {
      TWILIO_ACCOUNT_SID: envVars.TWILIO_ACCOUNT_SID ? `${envVars.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'Missing',
      TWILIO_AUTH_TOKEN: envVars.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing',
      TWILIO_PHONE_NUMBER: envVars.TWILIO_PHONE_NUMBER || 'Missing',
      TWILIO_WHATSAPP_NUMBER: envVars.TWILIO_WHATSAPP_NUMBER || 'Missing',
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: envVars.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? 'Present' : 'Missing',
      NODE_ENV: envVars.NODE_ENV,
      VERCEL: envVars.VERCEL,
      VERCEL_ENV: envVars.VERCEL_ENV
    })
    
    return NextResponse.json({
      success: true,
      environment: {
        TWILIO_ACCOUNT_SID: envVars.TWILIO_ACCOUNT_SID ? `${envVars.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'Missing',
        TWILIO_AUTH_TOKEN: envVars.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing',
        TWILIO_PHONE_NUMBER: envVars.TWILIO_PHONE_NUMBER || 'Missing',
        TWILIO_WHATSAPP_NUMBER: envVars.TWILIO_WHATSAPP_NUMBER || 'Missing',
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: envVars.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? 'Present' : 'Missing',
        NODE_ENV: envVars.NODE_ENV,
        VERCEL: envVars.VERCEL,
        VERCEL_ENV: envVars.VERCEL_ENV
      },
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('TWILIO') || key.includes('WHATSAPP')),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[TEST-ENV] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
