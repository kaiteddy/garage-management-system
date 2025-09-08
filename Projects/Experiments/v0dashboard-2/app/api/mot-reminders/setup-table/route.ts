import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log('[MOT-REMINDERS-SETUP] Creating mot_reminders table...')

    // Create the mot_reminders table
    await sql`
      CREATE TABLE IF NOT EXISTS mot_reminders (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER,
        customer_id INTEGER,
        phone_number VARCHAR(20) NOT NULL,
        message_content TEXT NOT NULL,
        twilio_sid VARCHAR(100),
        status VARCHAR(20) DEFAULT 'sent',
        reminder_type VARCHAR(20) DEFAULT 'expiring_soon',
        sent_at TIMESTAMP DEFAULT NOW(),
        delivered_at TIMESTAMP,
        failed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_mot_reminders_vehicle_id ON mot_reminders(vehicle_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_mot_reminders_customer_id ON mot_reminders(customer_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_mot_reminders_sent_at ON mot_reminders(sent_at)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_mot_reminders_status ON mot_reminders(status)
    `

    // Check if table was created successfully
    const tableCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mot_reminders'
      ORDER BY ordinal_position
    `

    console.log('[MOT-REMINDERS-SETUP] Table created successfully with columns:', tableCheck.map(c => c.column_name))

    return NextResponse.json({
      success: true,
      message: 'MOT reminders table created successfully',
      columns: tableCheck,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[MOT-REMINDERS-SETUP] Error creating table:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
