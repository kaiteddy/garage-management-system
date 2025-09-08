import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// GET /api/technicians - List all technicians
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'
    const date = searchParams.get('date')

    let technicians

    if (date && activeOnly) {
      technicians = await sql`
        SELECT
          t.*,
          CASE
            WHEN ta.availability_type IS NOT NULL THEN ta.availability_type
            ELSE 'available'
          END as availability_status,
          ta.start_time as exception_start,
          ta.end_time as exception_end,
          ta.notes as availability_notes
        FROM technicians t
        LEFT JOIN technician_availability ta ON t.id = ta.technician_id AND ta.date = ${date}
        WHERE t.is_active = true
        ORDER BY t.name ASC
      `
    } else if (date) {
      technicians = await sql`
        SELECT
          t.*,
          CASE
            WHEN ta.availability_type IS NOT NULL THEN ta.availability_type
            ELSE 'available'
          END as availability_status,
          ta.start_time as exception_start,
          ta.end_time as exception_end,
          ta.notes as availability_notes
        FROM technicians t
        LEFT JOIN technician_availability ta ON t.id = ta.technician_id AND ta.date = ${date}
        ORDER BY t.name ASC
      `
    } else if (activeOnly) {
      technicians = await sql`
        SELECT
          t.*,
          'available' as availability_status,
          null as exception_start,
          null as exception_end,
          null as availability_notes
        FROM technicians t
        WHERE t.is_active = true
        ORDER BY t.name ASC
      `
    } else {
      technicians = await sql`
        SELECT
          t.*,
          'available' as availability_status,
          null as exception_start,
          null as exception_end,
          null as availability_notes
        FROM technicians t
        ORDER BY t.name ASC
      `
    }

    // Get booking counts for today if date is provided
    let bookingCounts = []
    if (date) {
      bookingCounts = await sql`
        SELECT 
          technician_id,
          COUNT(*) as booking_count,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_bookings
        FROM bookings 
        WHERE scheduled_date = ${date}
        AND status NOT IN ('cancelled', 'completed')
        GROUP BY technician_id
      `
    }

    // Merge booking counts with technician data
    const technicianData = technicians.map(tech => {
      const bookingData = bookingCounts.find(bc => bc.technician_id === tech.id)
      return {
        ...tech,
        todayBookings: bookingData ? parseInt(bookingData.booking_count) : 0,
        activeBookings: bookingData ? parseInt(bookingData.active_bookings) : 0
      }
    })

    return NextResponse.json({
      success: true,
      data: technicianData
    })

  } catch (error) {
    console.error('❌ [TECHNICIANS] Error fetching technicians:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/technicians - Create new technician
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      hourly_rate = 0.00,
      max_concurrent_jobs = 1,
      working_hours
    } = body

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Technician name is required'
      }, { status: 400 })
    }

    // Default working hours if not provided
    const defaultWorkingHours = {
      monday: { start: "08:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
      tuesday: { start: "08:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
      wednesday: { start: "08:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
      thursday: { start: "08:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
      friday: { start: "08:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
      saturday: { start: "08:00", end: "12:00", breaks: [] },
      sunday: { start: null, end: null, breaks: [] }
    }

    const technician = await sql`
      INSERT INTO technicians (
        name,
        email,
        phone,
        hourly_rate,
        max_concurrent_jobs,
        working_hours
      ) VALUES (
        ${name},
        ${email},
        ${phone},
        ${hourly_rate},
        ${max_concurrent_jobs},
        ${JSON.stringify(working_hours || defaultWorkingHours)}
      )
      RETURNING *
    `

    console.log(`✅ [TECHNICIANS] Created technician: ${name}`)

    return NextResponse.json({
      success: true,
      data: technician[0],
      message: 'Technician created successfully'
    })

  } catch (error) {
    console.error('❌ [TECHNICIANS] Error creating technician:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/technicians - Update technician
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, working_hours, ...updateData } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Technician ID is required'
      }, { status: 400 })
    }

    // Handle working_hours JSON serialization
    const finalUpdateData = {
      ...updateData,
      ...(working_hours && { working_hours: JSON.stringify(working_hours) })
    }

    const technician = await sql`
      UPDATE technicians 
      SET ${sql(finalUpdateData)}
      WHERE id = ${id}
      RETURNING *
    `

    if (technician.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Technician not found'
      }, { status: 404 })
    }

    console.log(`✅ [TECHNICIANS] Updated technician: ${technician[0].name}`)

    return NextResponse.json({
      success: true,
      data: technician[0],
      message: 'Technician updated successfully'
    })

  } catch (error) {
    console.error('❌ [TECHNICIANS] Error updating technician:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
