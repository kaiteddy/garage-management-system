'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface Booking {
  id: number
  booking_reference: string
  customer_name: string
  customer_phone: string
  customer_email: string
  vehicle_registration: string
  vehicle_details: string
  service_name: string
  service_color: string
  scheduled_date: string
  scheduled_start_time: string
  scheduled_end_time: string
  status: string
  priority: string
  technician_name: string
  bay_name: string
  notes: string
  estimated_cost: number
  booking_source: string
  created_at: string
}

export default function BookingsAdmin() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    technician_id: '',
    search: ''
  })
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [filters])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.status) params.append('status', filters.status)
      if (filters.date) params.append('date', filters.date)
      if (filters.technician_id) params.append('technician_id', filters.technician_id)
      
      const response = await fetch(`/api/bookings?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        let filteredBookings = data.data
        
        // Client-side search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredBookings = filteredBookings.filter((booking: Booking) =>
            booking.customer_name?.toLowerCase().includes(searchLower) ||
            booking.vehicle_registration?.toLowerCase().includes(searchLower) ||
            booking.booking_reference?.toLowerCase().includes(searchLower) ||
            booking.customer_phone?.includes(filters.search)
          )
        }
        
        setBookings(filteredBookings)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (bookingId: number, status: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      const data = await response.json()
      if (data.success) {
        fetchBookings()
      }
    } catch (error) {
      console.error('Error updating booking:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'no_show': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'online': return '🌐'
      case 'phone': return '📞'
      case 'walk_in': return '🚶'
      default: return '📝'
    }
  }

  return (
    <div className="container mx-auto p-6">
      {/* Quick Navigation */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Booking System</h2>
            <div className="flex space-x-2">
              <a
                href="/workshop/calendar"
                className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                📅 Workshop Calendar
              </a>
              <a
                href="/book-online"
                className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
              >
                🌐 Online Booking
              </a>
              <a
                href="/admin/booking-settings"
                className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
              >
                ⚙️ Settings
              </a>
              <a
                href="/admin/reminders"
                className="inline-flex items-center px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md text-sm hover:bg-orange-200 transition-colors"
              >
                📱 Reminders
              </a>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Admin Panel
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => window.open('/workshop/calendar', '_blank')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Calendar View
          </button>
          <button
            onClick={() => window.open('/book-online', '_blank')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Online Booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Name, registration, reference..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({...filters, date: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              value={filters.technician_id}
              onChange={(e) => setFilters({...filters, technician_id: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Technicians</option>
              {/* Would need to fetch technicians list */}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', date: '', technician_id: '', search: '' })}
              className="w-full bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading bookings...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Reference</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Vehicle</th>
                  <th className="text-left py-3 px-4 font-medium">Service</th>
                  <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Technician</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="mr-2">{getSourceIcon(booking.booking_source)}</span>
                        <div>
                          <div className="font-medium">{booking.booking_reference}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(booking.created_at), 'MMM d, HH:mm')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{booking.customer_name}</div>
                        <div className="text-xs text-gray-500">{booking.customer_phone}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{booking.vehicle_registration}</div>
                        <div className="text-xs text-gray-500">{booking.vehicle_details}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded mr-2"
                          style={{ backgroundColor: booking.service_color }}
                        />
                        <div>
                          <div className="font-medium">{booking.service_name}</div>
                          <div className="text-xs text-gray-500">£{booking.estimated_cost}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">
                          {format(new Date(booking.scheduled_date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.scheduled_start_time} - {booking.scheduled_end_time}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                        {booking.priority !== 'normal' && (
                          <span className={`px-2 py-1 rounded text-xs block ${getPriorityColor(booking.priority)}`}>
                            {booking.priority}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{booking.technician_name || 'Unassigned'}</div>
                        <div className="text-xs text-gray-500">{booking.bay_name}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View
                        </button>
                        {booking.status === 'scheduled' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Start
                          </button>
                        )}
                        {booking.status === 'in_progress' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Complete
                          </button>
                        )}
                        {['scheduled', 'in_progress'].includes(booking.status) && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {bookings.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No bookings found matching your criteria
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Booking Details</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Booking Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Reference:</strong> {selectedBooking.booking_reference}</div>
                  <div><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div><strong>Priority:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getPriorityColor(selectedBooking.priority)}`}>
                      {selectedBooking.priority}
                    </span>
                  </div>
                  <div><strong>Source:</strong> {getSourceIcon(selectedBooking.booking_source)} {selectedBooking.booking_source}</div>
                  <div><strong>Created:</strong> {format(new Date(selectedBooking.created_at), 'MMM d, yyyy HH:mm')}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedBooking.customer_name}</div>
                  <div><strong>Phone:</strong> {selectedBooking.customer_phone}</div>
                  <div><strong>Email:</strong> {selectedBooking.customer_email}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Vehicle Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Registration:</strong> {selectedBooking.vehicle_registration}</div>
                  <div><strong>Details:</strong> {selectedBooking.vehicle_details}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Service Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <strong>Service:</strong>
                    <div
                      className="w-3 h-3 rounded ml-2 mr-1"
                      style={{ backgroundColor: selectedBooking.service_color }}
                    />
                    {selectedBooking.service_name}
                  </div>
                  <div><strong>Date:</strong> {format(new Date(selectedBooking.scheduled_date), 'EEEE, MMMM d, yyyy')}</div>
                  <div><strong>Time:</strong> {selectedBooking.scheduled_start_time} - {selectedBooking.scheduled_end_time}</div>
                  <div><strong>Estimated Cost:</strong> £{selectedBooking.estimated_cost}</div>
                  <div><strong>Technician:</strong> {selectedBooking.technician_name || 'Unassigned'}</div>
                  <div><strong>Bay:</strong> {selectedBooking.bay_name || 'Unassigned'}</div>
                </div>
              </div>
            </div>

            {selectedBooking.notes && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Notes</h3>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {selectedBooking.notes}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => window.open(`/workshop/calendar`, '_blank')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View in Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">Total Bookings</h3>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">Scheduled</h3>
          <p className="text-2xl font-bold text-blue-600">
            {bookings.filter(b => b.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">In Progress</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {bookings.filter(b => b.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">Completed</h3>
          <p className="text-2xl font-bold text-green-600">
            {bookings.filter(b => b.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-gray-600">Revenue</h3>
          <p className="text-2xl font-bold text-green-600">
            £{bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.estimated_cost || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
