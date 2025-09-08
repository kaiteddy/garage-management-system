import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search') || ''
    const motStatus = searchParams.get('motStatus') || 'all' // all, expired, due_soon, valid
    const sortBy = searchParams.get('sortBy') || 'registration'
    const sortOrder = searchParams.get('sortOrder') || 'ASC'

    const offset = (page - 1) * limit
    const startTime = Date.now()

    console.log(`[VEHICLES-FAST] ⚡ Loading page ${page}, limit ${limit}, search: "${search}", motStatus: ${motStatus}`)

    // Build WHERE conditions
    let whereConditions = [`registration IS NOT NULL`, `registration != ''`]
    let queryParams = []

    // Add search condition
    if (search) {
      whereConditions.push(`(
        registration ILIKE '%${search}%' OR
        make ILIKE '%${search}%' OR
        model ILIKE '%${search}%'
      )`)
    }

    // Add MOT status filter
    if (motStatus === 'expired') {
      whereConditions.push(`mot_expiry_date < CURRENT_DATE`)
    } else if (motStatus === 'due_soon') {
      whereConditions.push(`mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`)
    } else if (motStatus === 'valid') {
      whereConditions.push(`mot_expiry_date > CURRENT_DATE + INTERVAL '30 days'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count (optimized)
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM vehicles
      ${whereClause ? sql.unsafe(whereClause) : sql``}
    `

    if (!countResult || countResult.length === 0) {
      console.error('[VEHICLES-FAST] No count result returned')
      return NextResponse.json({
        success: false,
        error: "Failed to get vehicle count",
        details: "Count query returned no results"
      }, { status: 500 })
    }

    const totalVehicles = parseInt(countResult[0].total || countResult[0].count || '0')

    // Get vehicles with customer info in single query
    const vehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.color,
        v.fuel_type,
        v.mot_expiry_date,
        v.mot_status,
        v.mot_last_checked,
        v.owner_id,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.phone as customer_phone,
        CASE
          WHEN v.mot_expiry_date IS NULL THEN 'UNKNOWN'
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          ELSE 'VALID'
        END as urgency_level
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      ORDER BY ${sql.unsafe(sortBy)} ${sql.unsafe(sortOrder)}
      LIMIT ${limit} OFFSET ${offset}
    `

    const executionTime = Date.now() - startTime
    const totalPages = Math.ceil(totalVehicles / limit)

    // Format response data
    const formattedVehicles = vehicles.map(vehicle => ({
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      fuelType: vehicle.fuel_type,
      motExpiryDate: vehicle.mot_expiry_date,
      motStatus: vehicle.mot_status,
      motLastChecked: vehicle.mot_last_checked,
      urgencyLevel: vehicle.urgency_level,
      customer: vehicle.owner_id ? {
        id: vehicle.owner_id,
        firstName: vehicle.customer_first_name,
        lastName: vehicle.customer_last_name,
        phone: vehicle.customer_phone
      } : null
    }))

    return NextResponse.json({
      success: true,
      executionTime: `${executionTime}ms`,
      data: {
        vehicles: formattedVehicles,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalVehicles: totalVehicles,
          limit: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          search: search,
          motStatus: motStatus,
          resultsCount: vehicles.length
        },
        sorting: {
          sortBy: sortBy,
          sortOrder: sortOrder
        }
      },
      performance: {
        queryTime: `${executionTime}ms`,
        optimized: true,
        singleQuery: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[VEHICLES-FAST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load vehicles",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
