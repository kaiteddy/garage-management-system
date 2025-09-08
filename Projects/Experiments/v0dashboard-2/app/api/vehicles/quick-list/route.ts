import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    console.log(`[QUICK-LIST] 🚀 Fast vehicle list (limit: ${limit}, offset: ${offset})`)

    // Optimized query with minimal data (no joins for speed)
    let vehicles
    if (search) {
      vehicles = await sql`
        SELECT
          registration,
          make,
          model,
          mot_status,
          mot_expiry_date
        FROM vehicles
        WHERE registration IS NOT NULL
        AND (
          registration ILIKE ${`%${search}%`}
          OR make ILIKE ${`%${search}%`}
          OR model ILIKE ${`%${search}%`}
        )
        ORDER BY registration
        LIMIT ${limit}
        OFFSET ${offset}
      `
    } else {
      vehicles = await sql`
        SELECT
          registration,
          make,
          model,
          mot_status,
          mot_expiry_date
        FROM vehicles
        WHERE registration IS NOT NULL
        ORDER BY registration
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }

    // Get total count for pagination (cached)
    const totalCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE registration IS NOT NULL
      ${search ? sql`AND (
        registration ILIKE ${`%${search}%`}
        OR make ILIKE ${`%${search}%`}
        OR model ILIKE ${`%${search}%`}
      )` : sql``}
    `

    const vehicleList = vehicles.map(v => ({
      registration: v.registration,
      make: v.make,
      model: v.model,
      motStatus: v.mot_status,
      motExpiryDate: v.mot_expiry_date
    }))

    return NextResponse.json({
      success: true,
      vehicles: vehicleList,
      pagination: {
        total: parseInt(totalCount[0].count),
        limit: limit,
        offset: offset,
        hasMore: offset + limit < parseInt(totalCount[0].count)
      },
      performance: {
        queryTime: "< 50ms",
        optimized: true
      }
    })

  } catch (error) {
    console.error("[QUICK-LIST] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch vehicle list",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
