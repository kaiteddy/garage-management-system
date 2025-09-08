'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onBookingCreated: () => void
  selectedDate?: Date
  selectedTime?: string
}

interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
}

interface Vehicle {
  id: number
  registration: string
  make: string
  model: string
  customer_id: number
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
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  onBookingCreated, 
  selectedDate = new Date(),
  selectedTime = '09:00'
}: BookingModalProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    service_type_id: '',
    technician_id: '',
    scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
    scheduled_start_time: selectedTime,
    notes: '',
    customer_phone: '',
    customer_email: '',
    priority: 'normal'
  })

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  // Update vehicles when customer changes
  useEffect(() => {
    if (formData.customer_id) {
      const customerVehicles = vehicles.filter(v => v.customer_id === parseInt(formData.customer_id))
      if (customerVehicles.length === 1) {
        setFormData(prev => ({ ...prev, vehicle_id: customerVehicles[0].id.toString() }))
      }
    }
  }, [formData.customer_id, vehicles])

  const fetchData = async () => {
    try {
      const [customersRes, vehiclesRes, serviceTypesRes, techniciansRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/vehicles'),
        fetch('/api/service-types?active_only=true'),
        fetch('/api/technicians?active_only=true')
      ])

      const [customersData, vehiclesData, serviceTypesData, techniciansData] = await Promise.all([
        customersRes.json(),
        vehiclesRes.json(),
        serviceTypesRes.json(),
        techniciansRes.json()
      ])

      if (customersData.success) setCustomers(customersData.data)
      if (vehiclesData.success) setVehicles(vehiclesData.data)
      if (serviceTypesData.success) setServiceTypes(serviceTypesData.data)
      if (techniciansData.success) setTechnicians(techniciansData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load form data')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          customer_id: parseInt(formData.customer_id),
          vehicle_id: parseInt(formData.vehicle_id),
          service_type_id: parseInt(formData.service_type_id),
          technician_id: formData.technician_id ? parseInt(formData.technician_id) : null
        })
      })

      const data = await response.json()

      if (data.success) {
        onBookingCreated()
        onClose()
        // Reset form
        setFormData({
          customer_id: '',
          vehicle_id: '',
          service_type_id: '',
          technician_id: '',
          scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
          scheduled_start_time: selectedTime,
          notes: '',
          customer_phone: '',
          customer_email: '',
          priority: 'normal'
        })
      } else {
        setError(data.error || 'Failed to create booking')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const getCustomerVehicles = () => {
    if (!formData.customer_id) return []
    return vehicles.filter(v => v.customer_id === parseInt(formData.customer_id))
  }

  const selectedCustomer = customers.find(c => c.id === parseInt(formData.customer_id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">New Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={handleInputChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.first_name} {customer.last_name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle *
            </label>
            <select
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleInputChange}
              required
              disabled={!formData.customer_id}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select a vehicle</option>
              {getCustomerVehicles().map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type *
            </label>
            <select
              name="service_type_id"
              value={formData.service_type_id}
              onChange={handleInputChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a service</option>
              {serviceTypes.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration_minutes}min - £{service.price}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                name="scheduled_start_time"
                value={formData.scheduled_start_time}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Technician */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Technician
            </label>
            <select
              name="technician_id"
              value={formData.technician_id}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Auto-assign</option>
              {technicians.map(technician => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Info (if different from customer) */}
          {selectedCustomer && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  placeholder={selectedCustomer.phone}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  placeholder={selectedCustomer.email}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special instructions or notes..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
