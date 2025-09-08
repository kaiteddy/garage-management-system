import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// Generate unique booking reference
function generateBookingReference(): string {
  const prefix = 'BK'
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

// GET /api/bookings - List bookings with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const technicianId = searchParams.get('technician_id')
    const customerId = searchParams.get('customer_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = `
      SELECT 
        b.*,
        st.name as service_name,
        st.color as service_color,
        st.duration_minutes,
        t.name as technician_name,
        wb.name as bay_name,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone_db,
        c.email as customer_email_db,
        v.registration as vehicle_registration,
        v.make || ' ' || v.model as vehicle_details
      FROM bookings b
      LEFT JOIN service_types st ON b.service_type_id = st.id
      LEFT JOIN technicians t ON b.technician_id = t.id
      LEFT JOIN workshop_bays wb ON b.bay_id = wb.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (date) {
      query += ` AND b.scheduled_date = $${paramIndex}`
      params.push(date)
      paramIndex++
    }

    if (status) {
      query += ` AND b.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (technicianId) {
      query += ` AND b.technician_id = $${paramIndex}`
      params.push(parseInt(technicianId))
      paramIndex++
    }

    if (customerId) {
      query += ` AND b.customer_id = $${paramIndex}`
      params.push(parseInt(customerId))
      paramIndex++
    }

    query += ` ORDER BY b.scheduled_date DESC, b.scheduled_start_time DESC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const bookings = await sql.unsafe(query, params)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      WHERE 1=1
    `
    const countParams: any[] = []
    let countParamIndex = 1

    if (date) {
      countQuery += ` AND b.scheduled_date = $${countParamIndex}`
      countParams.push(date)
      countParamIndex++
    }

    if (status) {
      countQuery += ` AND b.status = $${countParamIndex}`
      countParams.push(status)
      countParamIndex++
    }

    if (technicianId) {
      countQuery += ` AND b.technician_id = $${countParamIndex}`
      countParams.push(parseInt(technicianId))
      countParamIndex++
    }

    if (customerId) {
      countQuery += ` AND b.customer_id = $${countParamIndex}`
      countParams.push(parseInt(customerId))
      countParamIndex++
    }

    const totalResult = await sql.unsafe(countQuery, countParams)
    const total = parseInt(totalResult[0].total)

    return NextResponse.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('❌ [BOOKINGS] Error fetching bookings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/bookings - Create new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customer_id,
      vehicle_id,
      service_type_id,
      technician_id,
      bay_id,
      scheduled_date,
      scheduled_start_time,
      scheduled_end_time,
      notes,
      customer_phone,
      customer_email,
      priority = 'normal',
      booking_source = 'manual'
    } = body

    // Validate required fields
    if (!service_type_id || !scheduled_date || !scheduled_start_time) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: service_type_id, scheduled_date, scheduled_start_time'
      }, { status: 400 })
    }

    // Generate booking reference
    const bookingReference = generateBookingReference()

    // Get service details for estimated cost
    const serviceType = await sql`
      SELECT price, duration_minutes FROM service_types WHERE id = ${service_type_id}
    `

    if (serviceType.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid service type'
      }, { status: 400 })
    }

    const estimatedCost = serviceType[0].price

    // Calculate end time if not provided
    let endTime = scheduled_end_time
    if (!endTime) {
      const startTime = new Date(`2000-01-01 ${scheduled_start_time}`)
      startTime.setMinutes(startTime.getMinutes() + serviceType[0].duration_minutes)
      endTime = startTime.toTimeString().slice(0, 5)
    }

    // Insert booking
    const booking = await sql`
      INSERT INTO bookings (
        booking_reference,
        customer_id,
        vehicle_id,
        service_type_id,
        technician_id,
        bay_id,
        scheduled_date,
        scheduled_start_time,
        scheduled_end_time,
        notes,
        customer_phone,
        customer_email,
        estimated_cost,
        priority,
        booking_source,
        status
      ) VALUES (
        ${bookingReference},
        ${customer_id},
        ${vehicle_id},
        ${service_type_id},
        ${technician_id},
        ${bay_id},
        ${scheduled_date},
        ${scheduled_start_time},
        ${endTime},
        ${notes},
        ${customer_phone},
        ${customer_email},
        ${estimatedCost},
        ${priority},
        ${booking_source},
        'scheduled'
      )
      RETURNING *
    `

    console.log(`✅ [BOOKINGS] Created booking ${bookingReference}`)

    return NextResponse.json({
      success: true,
      data: booking[0],
      message: `Booking ${bookingReference} created successfully`
    })

  } catch (error) {
    console.error('❌ [BOOKINGS] Error creating booking:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/bookings - Update booking (bulk update)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookings } = body

    if (!Array.isArray(bookings)) {
      return NextResponse.json({
        success: false,
        error: 'Expected array of bookings'
      }, { status: 400 })
    }

    const updatedBookings = []

    for (const booking of bookings) {
      const { id, ...updateData } = booking
      
      if (!id) {
        continue
      }

      const result = await sql`
        UPDATE bookings 
        SET ${sql(updateData)}
        WHERE id = ${id}
        RETURNING *
      `

      if (result.length > 0) {
        updatedBookings.push(result[0])
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedBookings,
      message: `Updated ${updatedBookings.length} bookings`
    })

  } catch (error) {
    console.error('❌ [BOOKINGS] Error updating bookings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
