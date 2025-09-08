import { NextResponse } from "next/server"
import { sql } from '@/lib/database/neon-client'

export async function POST(request: Request) {
  try {
    console.log(`[QUICK-FIX] Starting quick database fix...`)

    // Step 1: Fix LN64XFG connection to Adam Rutstein
    console.log(`[QUICK-FIX] Step 1: Fixing LN64XFG connection...`)
    
    const ln64xfgFix = await sql`
      UPDATE vehicles
      SET 
        customer_id = 'OOTOSBT1OWYUHR1B81UY',
        owner_id = 'OOTOSBT1OWYUHR1B81UY',
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
    `

    // Step 2: Verify the fix
    const verifyLN64XFG = await sql`
      SELECT registration, customer_id, owner_id
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      LIMIT 1
    `

    // Step 3: Update Adam Rutstein's customer info
    console.log(`[QUICK-FIX] Step 2: Updating Adam Rutstein's info...`)
    
    const adamUpdate = await sql`
      UPDATE customers
      SET
        first_name = 'Adam',
        last_name = 'Rutstein',
        phone = '07843275372',
        email = 'adamrutstein@me.com',
        updated_at = NOW()
      WHERE id = 'OOTOSBT1OWYUHR1B81UY'
    `

    // Step 4: Verify Adam's info
    const verifyAdam = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers
      WHERE id = 'OOTOSBT1OWYUHR1B81UY'
      LIMIT 1
    `

    // Step 5: Test the customer lookup API
    console.log(`[QUICK-FIX] Step 3: Testing customer lookup...`)
    
    const testLookup = await sql`
      SELECT 
        v.registration,
        v.customer_id,
        v.owner_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE UPPER(REPLACE(v.registration, ' ', '')) = 'LN64XFG'
      LIMIT 1
    `

    console.log(`[QUICK-FIX] ✅ Quick fix completed successfully`)

    return NextResponse.json({
      success: true,
      message: "Quick fix completed successfully",
      results: {
        ln64xfgFix: {
          rowsUpdated: ln64xfgFix.rowCount,
          verification: verifyLN64XFG[0] || null
        },
        adamUpdate: {
          rowsUpdated: adamUpdate.rowCount,
          verification: verifyAdam[0] || null
        },
        customerLookupTest: testLookup[0] || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[QUICK-FIX] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Quick fix failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Quick Fix API",
    description: "Quickly fixes LN64XFG connection and Adam Rutstein's customer info",
    usage: "POST to this endpoint to execute the quick fix"
  })
}
