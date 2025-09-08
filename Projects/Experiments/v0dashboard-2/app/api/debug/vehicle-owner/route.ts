import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')
    
    if (!registration) {
      return NextResponse.json({ error: 'Registration required' }, { status: 400 })
    }

    console.log(`[DEBUG-VEHICLE-OWNER] Checking owner for registration: ${registration}`)

    // Get current vehicle owner from database
    const vehicleData = await sql`
      SELECT 
        v.registration,
        v.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        v.updated_at as vehicle_updated_at
      FROM vehicles v 
      JOIN customers c ON v.customer_id = c.id 
      WHERE v.registration = ${registration}
    `

    console.log(`[DEBUG-VEHICLE-OWNER] Database result:`, vehicleData)

    return NextResponse.json({
      success: true,
      registration,
      data: vehicleData
    })

  } catch (error) {
    console.error('[DEBUG-VEHICLE-OWNER] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
