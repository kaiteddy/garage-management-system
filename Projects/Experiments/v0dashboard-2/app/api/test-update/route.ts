import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../../../lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    // Test a direct update using the exact same logic as the repair script
    const testReg = '1431NE'
    const newCustomerId = 'OOTOSBT1OT5N385SB1H9'

    console.log(`Testing direct update: ${testReg} -> ${newCustomerId}`)

    // First check current state
    const before = await sql`
      SELECT registration, customer_id
      FROM vehicles
      WHERE registration = ${testReg}
    `

    console.log('Before update:', before[0])

    // Test a simple direct UPDATE first
    const simpleResult = await sql`
      UPDATE vehicles
      SET customer_id = ${newCustomerId},
          updated_at = NOW()
      WHERE registration = ${testReg}
    `

    console.log('Simple update result:', simpleResult)

    // Check if that worked
    const afterSimple = await sql`
      SELECT registration, customer_id
      FROM vehicles
      WHERE registration = ${testReg}
    `

    console.log('After simple update:', afterSimple[0])

    return NextResponse.json({
      success: true,
      testRegistration: testReg,
      newCustomerId,
      before: before[0],
      afterSimple: afterSimple[0],
      simpleUpdateResult: simpleResult,
      changed: before[0]?.customer_id !== afterSimple[0]?.customer_id
    })

  } catch (error) {
    console.error('Test update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
