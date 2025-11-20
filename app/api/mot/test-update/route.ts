import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { checkMOTStatus } from "@/lib/mot-api"

export async function POST(request: Request) {
  try {
    const { registration } = await request.json()
    
    if (!registration) {
      return NextResponse.json(
        { success: false, error: "Registration required" },
        { status: 400 }
      )
    }

    console.log(`[TEST-UPDATE] Testing update for: ${registration}`)
    
    // 1. Check current database state
    const beforeUpdate = await sql`
      SELECT registration, mot_status, mot_expiry_date, mot_last_checked
      FROM vehicles 
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration.toUpperCase().replace(/\s/g, "")}
    `

    // 2. Get MOT data from API
    const motResult = await checkMOTStatus(registration)
    
    // 3. Attempt database update
    let updateResult = null
    if (motResult.success && motResult.expiryDate) {
      updateResult = await sql`
        UPDATE vehicles 
        SET 
          mot_expiry_date = ${motResult.expiryDate},
          mot_status = ${motResult.motStatus},
          mot_last_checked = NOW(),
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration.toUpperCase().replace(/\s/g, "")}
        RETURNING registration, mot_status, mot_expiry_date, mot_last_checked
      `
    }

    // 4. Check database state after update
    const afterUpdate = await sql`
      SELECT registration, mot_status, mot_expiry_date, mot_last_checked
      FROM vehicles 
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration.toUpperCase().replace(/\s/g, "")}
    `

    return NextResponse.json({
      success: true,
      registration,
      test: {
        beforeUpdate: beforeUpdate[0] || null,
        motApiResult: {
          success: motResult.success,
          motStatus: motResult.motStatus,
          expiryDate: motResult.expiryDate,
          error: motResult.error
        },
        updateResult: updateResult?.[0] || null,
        afterUpdate: afterUpdate[0] || null,
        updateWorked: beforeUpdate[0]?.mot_expiry_date !== afterUpdate[0]?.mot_expiry_date
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[TEST-UPDATE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test update",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
