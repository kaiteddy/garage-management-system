import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const expiryPeriod = searchParams.get('expiryPeriod') || '30' // Default 30 days
    const includeExpired = searchParams.get('includeExpired') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const sortBy = searchParams.get('sortBy') || 'urgency_score'
    const sortOrder = searchParams.get('sortOrder') || 'DESC'

    const offset = (page - 1) * limit
    const startTime = Date.now()

    console.log(`[UNIFIED-MOT] Loading MOT dashboard - Period: ${expiryPeriod} days, Page: ${page}`)

    // Convert expiry period to days
    let periodDays = 30 // default
    if (expiryPeriod === 'all') {
      periodDays = 365 * 10 // Very large number for "all"
    } else {
      periodDays = parseInt(expiryPeriod) || 30
    }

    // Build comprehensive MOT query with adjustable expiry period
    const motQuery = `
      WITH vehicle_mot_analysis AS (
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
          c.email as customer_email,
          c.address_line1,
          c.city,
          c.postcode,
          ca.total_spent,
          ca.total_documents,
          ca.last_document_date,

          -- Calculate urgency level based on adjustable period
          CASE
            WHEN v.mot_expiry_date IS NULL THEN 'NO_DATA'
            WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '${periodDays} days' THEN 'DUE_SOON'
            ELSE 'VALID'
          END as urgency_level,

          -- Calculate days difference
          CASE
            WHEN v.mot_expiry_date IS NULL THEN NULL
            WHEN v.mot_expiry_date < CURRENT_DATE THEN
              CURRENT_DATE - v.mot_expiry_date
            ELSE
              v.mot_expiry_date - CURRENT_DATE
          END as days_difference,

          -- Calculate urgency score for sorting
          CASE
            WHEN v.mot_expiry_date IS NULL THEN 1
            WHEN v.mot_expiry_date < CURRENT_DATE THEN
              1000 + (CURRENT_DATE - v.mot_expiry_date)
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
              500 + (7 - (v.mot_expiry_date - CURRENT_DATE))
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '${periodDays} days' THEN
              100 + (${periodDays} - (v.mot_expiry_date - CURRENT_DATE))
            ELSE
              (v.mot_expiry_date - CURRENT_DATE)
          END as urgency_score,

          -- Customer value score
          COALESCE(ca.total_spent::numeric, 0) as customer_value

        FROM vehicles v
        LEFT JOIN customers c ON v.owner_id = c.id
        LEFT JOIN customer_activity ca ON v.owner_id = ca.customer_id
        WHERE v.registration IS NOT NULL
          AND v.registration != ''
          AND v.active = true
      )
      SELECT *
      FROM vehicle_mot_analysis
      WHERE (
        ${expiryPeriod === 'all' ?
          "urgency_level IN ('EXPIRED', 'CRITICAL', 'DUE_SOON', 'VALID', 'NO_DATA')" :
          includeExpired ?
            "urgency_level IN ('EXPIRED', 'CRITICAL', 'DUE_SOON', 'NO_DATA')" :
            "urgency_level IN ('CRITICAL', 'DUE_SOON', 'NO_DATA')"
        }
      )
      ORDER BY ${sortBy === 'urgency_score' ? 'urgency_score' :
                sortBy === 'mot_expiry_date' ? 'mot_expiry_date' :
                sortBy === 'customer_value' ? 'customer_value' :
                sortBy === 'registration' ? 'registration' : 'urgency_score'} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `

    console.log(`[UNIFIED-MOT] Executing main query with periodDays: ${periodDays}`)
    const vehicles = await sql.unsafe(motQuery)
    console.log(`[UNIFIED-MOT] Found ${vehicles.length} vehicles`)

    // Get summary statistics
    const summaryQuery = `
      WITH vehicle_summary AS (
        SELECT
          COUNT(*) as total_vehicles,
          COUNT(CASE WHEN mot_expiry_date IS NULL THEN 1 END) as no_data,
          COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired,
          COUNT(CASE WHEN mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND mot_expiry_date >= CURRENT_DATE THEN 1 END) as critical,
          COUNT(CASE WHEN mot_expiry_date <= CURRENT_DATE + INTERVAL '${periodDays} days' AND mot_expiry_date > CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as due_soon,
          COUNT(CASE WHEN mot_expiry_date > CURRENT_DATE + INTERVAL '${periodDays} days' THEN 1 END) as valid,
          COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_customers,
          COALESCE(SUM(CASE WHEN ca.total_spent IS NOT NULL THEN ca.total_spent::numeric ELSE 0 END), 0) as total_customer_value
        FROM vehicles v
        LEFT JOIN customer_activity ca ON v.owner_id = ca.customer_id
        WHERE v.registration IS NOT NULL
          AND v.registration != ''
          AND v.active = true
      )
      SELECT * FROM vehicle_summary
    `

    console.log(`[UNIFIED-MOT] Executing summary query`)
    const summaryResult = await sql.unsafe(summaryQuery)
    const summary = summaryResult[0] || {
      total_vehicles: 0,
      no_data: 0,
      expired: 0,
      critical: 0,
      due_soon: 0,
      valid: 0,
      with_customers: 0,
      total_customer_value: 0
    }
    console.log(`[UNIFIED-MOT] Summary: ${JSON.stringify(summary)}`)

    // Get period-specific breakdown
    const periodBreakdown = await sql`
      SELECT
        '2 weeks' as period,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as count
      FROM vehicles
      WHERE registration IS NOT NULL AND active = true
      UNION ALL
      SELECT
        '1 month' as period,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as count
      FROM vehicles
      WHERE registration IS NOT NULL AND active = true
      UNION ALL
      SELECT
        '3 months' as period,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 1 END) as count
      FROM vehicles
      WHERE registration IS NOT NULL AND active = true
      UNION ALL
      SELECT
        '6 months' as period,
        COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '180 days' THEN 1 END) as count
      FROM vehicles
      WHERE registration IS NOT NULL AND active = true
    `

    const executionTime = Date.now() - startTime
    const totalPages = Math.ceil(parseInt(summary.total_vehicles) / limit)

    return NextResponse.json({
      success: true,
      executionTime: `${executionTime}ms`,
      data: {
        vehicles: vehicles.map(v => ({
          registration: v.registration,
          make: v.make,
          model: v.model,
          year: v.year,
          color: v.color,
          fuelType: v.fuel_type,
          motExpiryDate: v.mot_expiry_date,
          motStatus: v.mot_status,
          motLastChecked: v.mot_last_checked,
          urgencyLevel: v.urgency_level,
          daysDifference: parseInt(v.days_difference || 0),
          urgencyScore: parseInt(v.urgency_score || 0),
          customer: v.owner_id ? {
            id: v.owner_id,
            firstName: v.customer_first_name,
            lastName: v.customer_last_name,
            phone: v.customer_phone,
            email: v.customer_email,
            address: v.address_line1,
            city: v.city,
            postcode: v.postcode,
            totalSpent: parseFloat(v.total_spent || 0),
            totalDocuments: parseInt(v.total_documents || 0),
            lastVisit: v.last_document_date
          } : null,
          customerValue: parseFloat(v.customer_value || 0)
        })),
        summary: {
          totalVehicles: parseInt(summary.total_vehicles),
          noData: parseInt(summary.no_data),
          expired: parseInt(summary.expired),
          critical: parseInt(summary.critical),
          dueSoon: parseInt(summary.due_soon),
          valid: parseInt(summary.valid),
          withCustomers: parseInt(summary.with_customers),
          totalCustomerValue: parseFloat(summary.total_customer_value)
        },
        periodBreakdown: periodBreakdown.map(p => ({
          period: p.period,
          count: parseInt(p.count)
        })),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalVehicles: parseInt(summary.total_vehicles),
          limit: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          expiryPeriod: expiryPeriod,
          periodDays: periodDays,
          includeExpired: includeExpired,
          sortBy: sortBy,
          sortOrder: sortOrder
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[UNIFIED-MOT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load unified MOT dashboard",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
