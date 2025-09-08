import { NextResponse } from "next/server"
import { sql } from '@/lib/database/neon-client'

export async function GET() {
  try {
    // Fix LN64XFG connection
    await sql`
      UPDATE vehicles
      SET 
        customer_id = 'OOTOSBT1OWYUHR1B81UY',
        owner_id = 'OOTOSBT1OWYUHR1B81UY',
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
    `

    // Update Adam's info
    await sql`
      UPDATE customers
      SET
        first_name = 'Adam',
        last_name = 'Rutstein',
        phone = '07843275372',
        email = 'adamrutstein@me.com',
        updated_at = NOW()
      WHERE id = 'OOTOSBT1OWYUHR1B81UY'
    `

    return NextResponse.json({
      success: true,
      message: "LN64XFG fixed successfully"
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
