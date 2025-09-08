import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// GET /api/bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id)

    if (isNaN(bookingId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid booking ID'
      }, { status: 400 })
    }

    const booking = await sql`
      SELECT 
        b.*,
        st.name as service_name,
        st.description as service_description,
        st.color as service_color,
        st.duration_minutes,
        st.price as service_price,
        t.name as technician_name,
        t.email as technician_email,
        t.phone as technician_phone,
        wb.name as bay_name,
        wb.description as bay_description,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone_db,
        c.email as customer_email_db,
        c.address as customer_address,
        v.registration as vehicle_registration,
        v.make,
        v.model,
        v.year,
        v.color as vehicle_color,
        v.fuel_type
      FROM bookings b
      LEFT JOIN service_types st ON b.service_type_id = st.id
      LEFT JOIN technicians t ON b.technician_id = t.id
      LEFT JOIN workshop_bays wb ON b.bay_id = wb.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ${bookingId}
    `

    if (booking.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 })
    }

    // Get booking services
    const services = await sql`
      SELECT 
        bs.*,
        st.name as service_name,
        st.description as service_description
      FROM booking_services bs
      LEFT JOIN service_types st ON bs.service_type_id = st.id
      WHERE bs.booking_id = ${bookingId}
    `

    // Get booking reminders
    const reminders = await sql`
      SELECT * FROM booking_reminders 
      WHERE booking_id = ${bookingId}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: {
        ...booking[0],
        services,
        reminders
      }
    })

  } catch (error) {
    console.error('❌ [BOOKING] Error fetching booking:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/bookings/[id] - Update single booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id)
    const body = await request.json()

    if (isNaN(bookingId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid booking ID'
      }, { status: 400 })
    }

    // Remove id from update data if present
    const { id, ...updateData } = body

    // Update booking
    const booking = await sql`
      UPDATE bookings 
      SET ${sql(updateData)}
      WHERE id = ${bookingId}
      RETURNING *
    `

    if (booking.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 })
    }

    console.log(`✅ [BOOKING] Updated booking ${booking[0].booking_reference}`)

    return NextResponse.json({
      success: true,
      data: booking[0],
      message: 'Booking updated successfully'
    })

  } catch (error) {
    console.error('❌ [BOOKING] Error updating booking:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/bookings/[id] - Cancel/Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (isNaN(bookingId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid booking ID'
      }, { status: 400 })
    }

    if (permanent) {
      // Permanently delete booking
      const booking = await sql`
        DELETE FROM bookings 
        WHERE id = ${bookingId}
        RETURNING booking_reference
      `

      if (booking.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Booking not found'
        }, { status: 404 })
      }

      console.log(`🗑️ [BOOKING] Permanently deleted booking ${booking[0].booking_reference}`)

      return NextResponse.json({
        success: true,
        message: 'Booking permanently deleted'
      })
    } else {
      // Cancel booking (soft delete)
      const booking = await sql`
        UPDATE bookings 
        SET status = 'cancelled'
        WHERE id = ${bookingId}
        RETURNING *
      `

      if (booking.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Booking not found'
        }, { status: 404 })
      }

      console.log(`❌ [BOOKING] Cancelled booking ${booking[0].booking_reference}`)

      return NextResponse.json({
        success: true,
        data: booking[0],
        message: 'Booking cancelled successfully'
      })
    }

  } catch (error) {
    console.error('❌ [BOOKING] Error deleting booking:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
