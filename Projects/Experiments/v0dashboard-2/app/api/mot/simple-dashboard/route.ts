import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const expiryPeriod = searchParams.get('expiryPeriod') || '30'
    const includeExpired = searchParams.get('includeExpired') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    
    console.log(`[SIMPLE-MOT] Loading dashboard - Period: ${expiryPeriod}, Page: ${page}`)

    // Convert expiry period to days
    let periodDays = 30
    if (expiryPeriod === 'all') {
      periodDays = 3650 // 10 years
    } else {
      periodDays = parseInt(expiryPeriod) || 30
    }

    const offset = (page - 1) * limit

    // Simple query to get vehicles with MOT data
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
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.city,
        ca.total_spent,
        ca.total_documents,
        
        -- Calculate urgency level
        CASE 
          WHEN v.mot_expiry_date IS NULL THEN 'NO_DATA'
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL ${periodDays + ' days'} THEN 'DUE_SOON'
          ELSE 'VALID'
        END as urgency_level,
        
        -- Calculate days difference
        CASE 
          WHEN v.mot_expiry_date IS NULL THEN 0
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 
            CURRENT_DATE - v.mot_expiry_date
          ELSE 
            v.mot_expiry_date - CURRENT_DATE
        END as days_difference
        
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      LEFT JOIN customer_activity ca ON v.owner_id = ca.customer_id
      WHERE v.registration IS NOT NULL 
        AND v.registration != ''
        AND v.active = true
      ORDER BY 
        CASE 
          WHEN v.mot_expiry_date IS NULL THEN 1
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 1000
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 500
          ELSE v.mot_expiry_date - CURRENT_DATE
        END DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Get summary counts
    const summary = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date IS NULL THEN 1 END) as no_data,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND mot_expiry_date >= CURRENT_DATE THEN 1 END) as critical,
        COUNT(CASE WHEN mot_expiry_date <= CURRENT_DATE + INTERVAL ${periodDays + ' days'} AND mot_expiry_date > CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as due_soon,
        COUNT(CASE WHEN mot_expiry_date > CURRENT_DATE + INTERVAL ${periodDays + ' days'} THEN 1 END) as valid,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_customers,
        COALESCE(SUM(CASE WHEN ca.total_spent IS NOT NULL THEN ca.total_spent::numeric ELSE 0 END), 0) as total_customer_value
      FROM vehicles v
      LEFT JOIN customer_activity ca ON v.owner_id = ca.customer_id
      WHERE v.registration IS NOT NULL 
        AND v.registration != ''
        AND v.active = true
    `

    const summaryData = summary[0] || {
      total_vehicles: 0,
      no_data: 0,
      expired: 0,
      critical: 0,
      due_soon: 0,
      valid: 0,
      with_customers: 0,
      total_customer_value: 0
    }

    // Simple period breakdown
    const periodBreakdown = [
      { period: '2 weeks', count: 0 },
      { period: '1 month', count: 0 },
      { period: '3 months', count: 0 },
      { period: '6 months', count: 0 }
    ]

    const totalPages = Math.ceil(parseInt(summaryData.total_vehicles.toString()) / limit)

    return NextResponse.json({
      success: true,
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
          daysDifference: parseInt(v.days_difference?.toString() || '0'),
          customer: v.owner_id ? {
            id: v.owner_id,
            firstName: v.first_name,
            lastName: v.last_name,
            phone: v.phone,
            email: v.email,
            city: v.city,
            totalSpent: parseFloat(v.total_spent?.toString() || '0'),
            totalDocuments: parseInt(v.total_documents?.toString() || '0')
          } : null
        })),
        summary: {
          totalVehicles: parseInt(summaryData.total_vehicles.toString()),
          noData: parseInt(summaryData.no_data.toString()),
          expired: parseInt(summaryData.expired.toString()),
          critical: parseInt(summaryData.critical.toString()),
          dueSoon: parseInt(summaryData.due_soon.toString()),
          valid: parseInt(summaryData.valid.toString()),
          withCustomers: parseInt(summaryData.with_customers.toString()),
          totalCustomerValue: parseFloat(summaryData.total_customer_value.toString())
        },
        periodBreakdown: periodBreakdown,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalVehicles: parseInt(summaryData.total_vehicles.toString()),
          limit: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          expiryPeriod: expiryPeriod,
          periodDays: periodDays,
          includeExpired: includeExpired,
          sortBy: 'urgency_score',
          sortOrder: 'DESC'
        }
      }
    })

  } catch (error) {
    console.error("[SIMPLE-MOT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load MOT dashboard",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
