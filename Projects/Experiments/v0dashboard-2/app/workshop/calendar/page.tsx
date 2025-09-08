'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import BookingModal from '@/app/components/BookingModal'

interface Booking {
  id: number
  booking_reference: string
  customer_name: string
  vehicle_registration: string
  vehicle_details: string
  service_name: string
  service_color: string
  scheduled_start_time: string
  scheduled_end_time: string
  status: string
  technician_name: string
  bay_name: string
  customer_phone: string
  notes: string
}

interface ServiceType {
  id: number
  name: string
  duration_minutes: number
  price: number
  color: string
}

interface Technician {
  id: number
  name: string
  email: string
  availability_status: string
}

export default function WorkshopCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date, time: string } | null>(null)

  // Generate time slots for the day view
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Get week dates for week view
  const getWeekDates = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday start
    const end = endOfWeek(date, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const weekDates = getWeekDates(currentDate)

  // Fetch data
  const fetchBookings = async (date: string) => {
    try {
      const response = await fetch(`/api/bookings?date=${date}`)
      const data = await response.json()
      if (data.success) {
        setBookings(data.data)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  const fetchServiceTypes = async () => {
    try {
      const response = await fetch('/api/service-types?active_only=true')
      const data = await response.json()
      if (data.success) {
        setServiceTypes(data.data)
      }
    } catch (error) {
      console.error('Error fetching service types:', error)
    }
  }

  const fetchTechnicians = async (date: string) => {
    try {
      const response = await fetch(`/api/technicians?active_only=true&date=${date}`)
      const data = await response.json()
      if (data.success) {
        setTechnicians(data.data)
      }
    } catch (error) {
      console.error('Error fetching technicians:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      await Promise.all([
        fetchBookings(dateStr),
        fetchServiceTypes(),
        fetchTechnicians(dateStr)
      ])
      setLoading(false)
    }
    loadData()
  }, [selectedDate])

  // Filter bookings for a specific date and time
  const getBookingsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return bookings.filter(booking => {
      const bookingDate = booking.scheduled_start_time ? dateStr : null
      const bookingTime = booking.scheduled_start_time
      return bookingDate === dateStr && bookingTime <= time && booking.scheduled_end_time > time
    })
  }

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return bookings.filter(booking => {
      // This would need to be adjusted based on your actual booking date field
      return true // Placeholder
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1))
      setSelectedDate(prev => addDays(prev, direction === 'next' ? 1 : -1))
    } else {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 7 : -7))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading workshop calendar...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Quick Navigation */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Access</h2>
            <div className="flex space-x-2">
              <a
                href="/book-online"
                className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
              >
                🌐 Online Booking
              </a>
              <a
                href="/admin/bookings"
                className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 transition-colors"
              >
                📋 Manage Bookings
              </a>
              <a
                href="/admin/reminders"
                className="inline-flex items-center px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md text-sm hover:bg-orange-200 transition-colors"
              >
                📱 Send Reminders
              </a>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Workshop Calendar
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Workshop Calendar</h1>
          <p className="text-gray-600">Manage bookings and schedule</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded ${viewMode === 'day' ? 'bg-white shadow' : ''}`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded ${viewMode === 'week' ? 'bg-white shadow' : ''}`}
            >
              Week
            </button>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <span className="font-medium min-w-[200px] text-center">
              {viewMode === 'day' 
                ? format(currentDate, 'EEEE, MMMM d, yyyy')
                : `${format(weekDates[0], 'MMM d')} - ${format(weekDates[6], 'MMM d, yyyy')}`
              }
            </span>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
          
          <button
            onClick={() => setShowBookingModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            New Booking
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'week' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Week Header */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-4 bg-gray-50 font-medium">Time</div>
            {weekDates.map(date => (
              <div key={date.toISOString()} className="p-4 bg-gray-50 text-center">
                <div className="font-medium">{format(date, 'EEE')}</div>
                <div className="text-sm text-gray-600">{format(date, 'd')}</div>
              </div>
            ))}
          </div>
          
          {/* Time Slots */}
          <div className="max-h-[600px] overflow-y-auto">
            {timeSlots.map(time => (
              <div key={time} className="grid grid-cols-8 border-b border-gray-100">
                <div className="p-2 text-sm text-gray-600 bg-gray-50 border-r">
                  {time}
                </div>
                {weekDates.map(date => {
                  const slotBookings = getBookingsForSlot(date, time)
                  return (
                    <div
                      key={`${date.toISOString()}-${time}`}
                      className="p-1 min-h-[60px] border-r border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedSlot({ date, time })
                        setShowBookingModal(true)
                      }}
                    >
                      {slotBookings.map(booking => (
                        <div
                          key={booking.id}
                          className={`text-xs p-2 rounded mb-1 border ${getStatusColor(booking.status)}`}
                          style={{ backgroundColor: booking.service_color + '20' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="font-medium">{booking.customer_name}</div>
                          <div>{booking.vehicle_registration}</div>
                          <div>{booking.service_name}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          
          {/* Day view content */}
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No bookings for this day
              </div>
            ) : (
              bookings.map(booking => (
                <div
                  key={booking.id}
                  className={`p-4 rounded-lg border ${getStatusColor(booking.status)}`}
                  style={{ backgroundColor: booking.service_color + '10' }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{booking.customer_name}</h3>
                      <p className="text-sm text-gray-600">{booking.vehicle_registration} - {booking.vehicle_details}</p>
                      <p className="text-sm">{booking.service_name}</p>
                    </div>
                    <div className="text-right text-sm">
                      <div>{booking.scheduled_start_time} - {booking.scheduled_end_time}</div>
                      <div className="text-gray-600">{booking.technician_name}</div>
                      <div className="text-gray-600">{booking.bay_name}</div>
                    </div>
                  </div>
                  {booking.notes && (
                    <p className="text-sm text-gray-600 mt-2">{booking.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">Today's Bookings</h3>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">Active Technicians</h3>
          <p className="text-2xl font-bold">{technicians.filter(t => t.availability_status === 'available').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">In Progress</h3>
          <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'in_progress').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">Completed</h3>
          <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'completed').length}</p>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false)
          setSelectedSlot(null)
        }}
        onBookingCreated={() => {
          // Refresh bookings
          const dateStr = format(selectedDate, 'yyyy-MM-dd')
          fetchBookings(dateStr)
        }}
        selectedDate={selectedSlot?.date || selectedDate}
        selectedTime={selectedSlot?.time || '09:00'}
      />
    </div>
  )
}
