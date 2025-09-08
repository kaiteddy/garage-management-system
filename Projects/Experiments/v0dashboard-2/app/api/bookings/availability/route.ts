import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// Helper function to generate time slots
function generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
  const slots: string[] = []
  const start = new Date(`2000-01-01 ${startTime}`)
  const end = new Date(`2000-01-01 ${endTime}`)
  
  let current = new Date(start)
  
  while (current < end) {
    slots.push(current.toTimeString().slice(0, 5))
    current.setMinutes(current.getMinutes() + slotDuration)
  }
  
  return slots
}

// Helper function to check if time is within break periods
function isInBreakPeriod(time: string, breaks: any[]): boolean {
  if (!breaks || breaks.length === 0) return false
  
  const timeDate = new Date(`2000-01-01 ${time}`)
  
  return breaks.some(breakPeriod => {
    const breakStart = new Date(`2000-01-01 ${breakPeriod.start}`)
    const breakEnd = new Date(`2000-01-01 ${breakPeriod.end}`)
    return timeDate >= breakStart && timeDate < breakEnd
  })
}

// GET /api/bookings/availability - Check availability for booking slots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const serviceTypeId = searchParams.get('service_type_id')
    const technicianId = searchParams.get('technician_id')
    const duration = parseInt(searchParams.get('duration') || '60')

    if (!date) {
      return NextResponse.json({
        success: false,
        error: 'Date parameter is required'
      }, { status: 400 })
    }

    // Get workshop settings
    const settings = await sql`
      SELECT setting_key, setting_value 
      FROM workshop_settings 
      WHERE setting_key IN (
        'business_hours_start', 
        'business_hours_end', 
        'lunch_break_start', 
        'lunch_break_end',
        'slot_duration_minutes',
        'max_bookings_per_slot'
      )
    `

    const settingsMap = settings.reduce((acc: any, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {})

    const businessStart = settingsMap.business_hours_start || '08:00'
    const businessEnd = settingsMap.business_hours_end || '17:00'
    const lunchStart = settingsMap.lunch_break_start || '12:00'
    const lunchEnd = settingsMap.lunch_break_end || '13:00'
    const slotDuration = parseInt(settingsMap.slot_duration_minutes || '30')
    const maxBookingsPerSlot = parseInt(settingsMap.max_bookings_per_slot || '3')

    // Get day of week for the requested date
    const requestDate = new Date(date)
    const dayOfWeek = requestDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

    // Get available technicians for the date
    let technicians

    if (technicianId) {
      technicians = await sql`
        SELECT
          t.*,
          ta.availability_type,
          ta.start_time as exception_start,
          ta.end_time as exception_end
        FROM technicians t
        LEFT JOIN technician_availability ta ON t.id = ta.technician_id AND ta.date = ${date}
        WHERE t.is_active = true AND t.id = ${technicianId}
      `
    } else {
      technicians = await sql`
        SELECT
          t.*,
          ta.availability_type,
          ta.start_time as exception_start,
          ta.end_time as exception_end
        FROM technicians t
        LEFT JOIN technician_availability ta ON t.id = ta.technician_id AND ta.date = ${date}
        WHERE t.is_active = true
      `
    }

    // Get existing bookings for the date
    const existingBookings = await sql`
      SELECT 
        b.*,
        st.duration_minutes,
        t.name as technician_name
      FROM bookings b
      LEFT JOIN service_types st ON b.service_type_id = st.id
      LEFT JOIN technicians t ON b.technician_id = t.id
      WHERE b.scheduled_date = ${date}
      AND b.status NOT IN ('cancelled', 'completed')
    `

    // Generate availability for each technician
    const availability = []

    for (const technician of technicians) {
      // Check if technician is available on this day
      if (technician.availability_type === 'unavailable' || 
          technician.availability_type === 'holiday' || 
          technician.availability_type === 'sick') {
        continue
      }

      // Get working hours for this day
      const workingHours = technician.working_hours?.[dayOfWeek]
      if (!workingHours || !workingHours.start || !workingHours.end) {
        continue // Technician doesn't work on this day
      }

      let dayStart = workingHours.start
      let dayEnd = workingHours.end
      const breaks = workingHours.breaks || [{ start: lunchStart, end: lunchEnd }]

      // Override with exception times if available
      if (technician.availability_type === 'available' && 
          technician.exception_start && technician.exception_end) {
        dayStart = technician.exception_start
        dayEnd = technician.exception_end
      }

      // Generate time slots for this technician
      const timeSlots = generateTimeSlots(dayStart, dayEnd, slotDuration)
      
      // Check availability for each slot
      const availableSlots = []

      for (const slot of timeSlots) {
        // Skip if in break period
        if (isInBreakPeriod(slot, breaks)) {
          continue
        }

        // Calculate slot end time
        const slotStart = new Date(`2000-01-01 ${slot}`)
        const slotEnd = new Date(slotStart.getTime() + duration * 60000)
        const slotEndTime = slotEnd.toTimeString().slice(0, 5)

        // Check if slot conflicts with existing bookings
        const conflicts = existingBookings.filter(booking => {
          if (booking.technician_id !== technician.id) return false

          const bookingStart = new Date(`2000-01-01 ${booking.scheduled_start_time}`)
          const bookingEnd = new Date(`2000-01-01 ${booking.scheduled_end_time}`)

          // Check for overlap
          return (slotStart < bookingEnd && slotEnd > bookingStart)
        })

        // Count current bookings in this slot (for concurrent booking limit)
        const concurrentBookings = existingBookings.filter(booking => {
          const bookingStart = new Date(`2000-01-01 ${booking.scheduled_start_time}`)
          const bookingEnd = new Date(`2000-01-01 ${booking.scheduled_end_time}`)
          return (slotStart >= bookingStart && slotStart < bookingEnd)
        }).length

        const isAvailable = conflicts.length === 0 && concurrentBookings < maxBookingsPerSlot

        availableSlots.push({
          time: slot,
          endTime: slotEndTime,
          available: isAvailable,
          conflicts: conflicts.length,
          concurrentBookings,
          reason: !isAvailable ? 
            (conflicts.length > 0 ? 'Technician busy' : 'Slot full') : 
            null
        })
      }

      availability.push({
        technician: {
          id: technician.id,
          name: technician.name,
          email: technician.email
        },
        date,
        workingHours: {
          start: dayStart,
          end: dayEnd,
          breaks
        },
        slots: availableSlots,
        totalSlots: availableSlots.length,
        availableSlots: availableSlots.filter(slot => slot.available).length
      })
    }

    // Get service type details if specified
    let serviceType = null
    if (serviceTypeId) {
      const serviceResult = await sql`
        SELECT * FROM service_types WHERE id = ${serviceTypeId}
      `
      serviceType = serviceResult[0] || null
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        serviceType,
        requestedDuration: duration,
        settings: {
          businessHours: { start: businessStart, end: businessEnd },
          lunchBreak: { start: lunchStart, end: lunchEnd },
          slotDuration,
          maxBookingsPerSlot
        },
        availability,
        summary: {
          totalTechnicians: availability.length,
          totalSlots: availability.reduce((sum, tech) => sum + tech.totalSlots, 0),
          availableSlots: availability.reduce((sum, tech) => sum + tech.availableSlots, 0)
        }
      }
    })

  } catch (error) {
    console.error('❌ [AVAILABILITY] Error checking availability:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
