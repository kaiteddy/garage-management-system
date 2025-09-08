import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 for performance
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'last_name'
    const sortOrder = searchParams.get('sortOrder') || 'ASC'
    
    const offset = (page - 1) * limit
    const startTime = Date.now()

    console.log(`[CUSTOMERS-FAST] ⚡ Loading page ${page}, limit ${limit}, search: "${search}"`)

    // Build search condition
    let searchCondition = sql``
    let searchParams_sql = []
    
    if (search) {
      searchCondition = sql`
        WHERE (
          first_name ILIKE ${`%${search}%`} OR 
          last_name ILIKE ${`%${search}%`} OR 
          phone ILIKE ${`%${search}%`} OR
          email ILIKE ${`%${search}%`}
        )
      `
    }

    // Get total count for pagination (optimized)
    const countQuery = search 
      ? sql`
          SELECT COUNT(*) as total 
          FROM customers 
          WHERE (
            first_name ILIKE ${`%${search}%`} OR 
            last_name ILIKE ${`%${search}%`} OR 
            phone ILIKE ${`%${search}%`} OR
            email ILIKE ${`%${search}%`}
          )
        `
      : sql`SELECT COUNT(*) as total FROM customers`

    const [countResult] = await countQuery
    const totalCustomers = parseInt(countResult.total)

    // Get customers with optimized query
    const customersQuery = search
      ? sql`
          SELECT 
            id,
            first_name,
            last_name,
            email,
            phone,
            address_line1,
            city,
            postcode,
            last_contact_date,
            contact_preference,
            opt_out,
            created_at
          FROM customers 
          WHERE (
            first_name ILIKE ${`%${search}%`} OR 
            last_name ILIKE ${`%${search}%`} OR 
            phone ILIKE ${`%${search}%`} OR
            email ILIKE ${`%${search}%`}
          )
          ORDER BY ${sql.unsafe(sortBy)} ${sql.unsafe(sortOrder)}
          LIMIT ${limit} OFFSET ${offset}
        `
      : sql`
          SELECT 
            id,
            first_name,
            last_name,
            email,
            phone,
            address_line1,
            city,
            postcode,
            last_contact_date,
            contact_preference,
            opt_out,
            created_at
          FROM customers 
          ORDER BY ${sql.unsafe(sortBy)} ${sql.unsafe(sortOrder)}
          LIMIT ${limit} OFFSET ${offset}
        `

    const customers = await customersQuery

    // Get customer activity for displayed customers (if needed)
    const customerIds = customers.map(c => c.id)
    const customerActivity = customerIds.length > 0 ? await sql`
      SELECT 
        customer_id,
        total_documents,
        total_spent,
        last_document_date
      FROM customer_activity 
      WHERE customer_id = ANY(${customerIds})
    ` : []

    // Merge activity data
    const activityMap = new Map(customerActivity.map(a => [a.customer_id, a]))
    const enrichedCustomers = customers.map(customer => ({
      ...customer,
      activity: activityMap.get(customer.id) || null
    }))

    const executionTime = Date.now() - startTime
    const totalPages = Math.ceil(totalCustomers / limit)

    return NextResponse.json({
      success: true,
      executionTime: `${executionTime}ms`,
      data: {
        customers: enrichedCustomers,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalCustomers: totalCustomers,
          limit: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        search: {
          query: search,
          resultsCount: customers.length
        },
        sorting: {
          sortBy: sortBy,
          sortOrder: sortOrder
        }
      },
      performance: {
        queryTime: `${executionTime}ms`,
        optimized: true,
        indexed: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CUSTOMERS-FAST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
