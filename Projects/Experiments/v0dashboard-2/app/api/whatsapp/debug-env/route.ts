import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    whatsapp_token_exists: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    whatsapp_token_value: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? 'SET' : 'NOT_SET',
    twilio_token_exists: !!process.env.TWILIO_WEBHOOK_VERIFY_TOKEN,
    twilio_token_value: process.env.TWILIO_WEBHOOK_VERIFY_TOKEN ? 'SET' : 'NOT_SET',
    all_env_keys: Object.keys(process.env).filter(key => 
      key.includes('WHATSAPP') || key.includes('TWILIO')
    ).sort()
  })
}
