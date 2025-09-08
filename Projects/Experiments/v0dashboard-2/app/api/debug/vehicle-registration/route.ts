import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')
    
    if (!registration) {
      return NextResponse.json({ error: 'Registration required' }, { status: 400 })
    }

    console.log(`[DEBUG-REGISTRATION] Checking registration formats for: ${registration}`)

    // Get all vehicles with similar registration
    const vehicleData = await sql`
      SELECT 
        v.registration,
        v.customer_id,
        c.first_name,
        c.last_name,
        LENGTH(v.registration) as reg_length,
        UPPER(v.registration) as reg_upper,
        UPPER(REPLACE(v.registration, ' ', '')) as reg_no_spaces
      FROM vehicles v 
      JOIN customers c ON v.customer_id = c.id 
      WHERE v.registration ILIKE ${'%' + registration + '%'}
        OR UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
    `

    console.log(`[DEBUG-REGISTRATION] Database result:`, vehicleData)

    return NextResponse.json({
      success: true,
      registration,
      searchTerm: registration,
      data: vehicleData
    })

  } catch (error) {
    console.error('[DEBUG-REGISTRATION] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
