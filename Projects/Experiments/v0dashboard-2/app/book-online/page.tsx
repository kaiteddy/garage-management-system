'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfDay } from 'date-fns'

interface ServiceType {
  id: number
  name: string
  description: string
  duration_minutes: number
  price: number
  color: string
}

interface AvailableSlot {
  time: string
  endTime: string
  available: boolean
  technician: {
    id: number
    name: string
  }
}

interface BookingFormData {
  service_type_id: string
  scheduled_date: string
  scheduled_start_time: string
  customer_name: string
  customer_email: string
  customer_phone: string
  vehicle_registration: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: string
  notes: string
}

export default function OnlineBooking() {
  const [step, setStep] = useState(1)
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<BookingFormData>({
    service_type_id: '',
    scheduled_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    scheduled_start_time: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    notes: ''
  })

  // Fetch service types on component mount
  useEffect(() => {
    fetchServiceTypes()
  }, [])

  // Fetch availability when service type or date changes
  useEffect(() => {
    if (formData.service_type_id && formData.scheduled_date) {
      fetchAvailability()
    }
  }, [formData.service_type_id, formData.scheduled_date])

  const fetchServiceTypes = async () => {
    try {
      const response = await fetch('/api/service-types?active_only=true')
      const data = await response.json()
      if (data.success) {
        setServiceTypes(data.data)
      }
    } catch (error) {
      console.error('Error fetching service types:', error)
      setError('Failed to load services')
    }
  }

  const fetchAvailability = async () => {
    try {
      setLoading(true)
      const selectedService = serviceTypes.find(s => s.id === parseInt(formData.service_type_id))
      const duration = selectedService?.duration_minutes || 60

      const response = await fetch(
        `/api/bookings/availability?date=${formData.scheduled_date}&duration=${duration}`
      )
      const data = await response.json()
      
      if (data.success) {
        // Flatten all available slots from all technicians
        const allSlots: AvailableSlot[] = []
        data.data.availability.forEach((tech: any) => {
          tech.slots.forEach((slot: any) => {
            if (slot.available) {
              allSlots.push({
                ...slot,
                technician: tech.technician
              })
            }
          })
        })
        setAvailableSlots(allSlots)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      setError('Failed to load available times')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // First, create or find customer and vehicle
      const customerResponse = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: formData.customer_name,
          email: formData.customer_email,
          phone: formData.customer_phone
        })
      })

      const customerData = await customerResponse.json()
      let customerId = customerData.data?.id

      // If customer creation failed, try to find existing customer
      if (!customerId) {
        const searchResponse = await fetch(`/api/customers?search=${encodeURIComponent(formData.customer_email)}`)
        const searchData = await searchResponse.json()
        if (searchData.success && searchData.data.length > 0) {
          customerId = searchData.data[0].id
        }
      }

      if (!customerId) {
        throw new Error('Failed to create or find customer')
      }

      // Create vehicle
      const vehicleResponse = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          registration: formData.vehicle_registration.toUpperCase(),
          make: formData.vehicle_make,
          model: formData.vehicle_model,
          year: parseInt(formData.vehicle_year),
          customer_id: customerId
        })
      })

      const vehicleData = await vehicleResponse.json()
      let vehicleId = vehicleData.data?.id

      // If vehicle creation failed, try to find existing vehicle
      if (!vehicleId) {
        const vehicleSearchResponse = await fetch(`/api/vehicles/${formData.vehicle_registration.toUpperCase()}`)
        const vehicleSearchData = await vehicleSearchResponse.json()
        if (vehicleSearchData.success) {
          vehicleId = vehicleSearchData.data.id
        }
      }

      // Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_type_id: parseInt(formData.service_type_id),
          scheduled_date: formData.scheduled_date,
          scheduled_start_time: formData.scheduled_start_time,
          notes: formData.notes,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          booking_source: 'online'
        })
      })

      const bookingData = await bookingResponse.json()

      if (bookingData.success) {
        setSuccess(`Booking confirmed! Reference: ${bookingData.data.booking_reference}`)
        setStep(4) // Success step
      } else {
        throw new Error(bookingData.error || 'Failed to create booking')
      }

    } catch (error) {
      console.error('Booking error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  const selectedService = serviceTypes.find(s => s.id === parseInt(formData.service_type_id))

  const nextStep = () => {
    if (step === 1 && !formData.service_type_id) {
      setError('Please select a service')
      return
    }
    if (step === 2 && (!formData.scheduled_date || !formData.scheduled_start_time)) {
      setError('Please select a date and time')
      return
    }
    setError('')
    setStep(step + 1)
  }

  const prevStep = () => {
    setError('')
    setStep(step - 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Book Your Service Online</h1>
            <p className="text-gray-600 mt-2">Quick and easy online booking</p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum <= step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 4 && (
                    <div className={`w-12 h-1 ${stepNum < step ? 'bg-blue-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              {success}
            </div>
          )}

          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Service</h2>
              <div className="grid gap-4">
                {serviceTypes.map(service => (
                  <label
                    key={service.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.service_type_id === service.id.toString()
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="service_type_id"
                      value={service.id}
                      checked={formData.service_type_id === service.id.toString()}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <p className="text-sm text-gray-500 mt-1">Duration: {service.duration_minutes} minutes</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">£{service.price}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={nextStep}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date
                </label>
                <input
                  type="date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleInputChange}
                  min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">Loading available times...</div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Times
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot, index) => (
                      <label
                        key={index}
                        className={`p-3 border rounded cursor-pointer text-center transition-colors ${
                          formData.scheduled_start_time === slot.time
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="scheduled_start_time"
                          value={slot.time}
                          checked={formData.scheduled_start_time === slot.time}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="text-sm font-medium">{slot.time}</div>
                        <div className="text-xs text-gray-500">{slot.technician.name}</div>
                      </label>
                    ))}
                  </div>
                  {availableSlots.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No available times for this date. Please select a different date.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={prevStep}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!formData.scheduled_start_time}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Customer & Vehicle Details */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-semibold mb-4">Your Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <h3 className="text-lg font-medium mb-4">Vehicle Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration *
                  </label>
                  <input
                    type="text"
                    name="vehicle_registration"
                    value={formData.vehicle_registration}
                    onChange={handleInputChange}
                    required
                    placeholder="AB12 CDE"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    name="vehicle_year"
                    value={formData.vehicle_year}
                    onChange={handleInputChange}
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    name="vehicle_make"
                    value={formData.vehicle_make}
                    onChange={handleInputChange}
                    placeholder="Ford, BMW, etc."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    name="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={handleInputChange}
                    placeholder="Focus, X5, etc."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any specific requirements or issues..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium mb-2">Booking Summary</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Service:</strong> {selectedService?.name}</p>
                  <p><strong>Date:</strong> {format(new Date(formData.scheduled_date), 'EEEE, MMMM d, yyyy')}</p>
                  <p><strong>Time:</strong> {formData.scheduled_start_time}</p>
                  <p><strong>Duration:</strong> {selectedService?.duration_minutes} minutes</p>
                  <p><strong>Price:</strong> £{selectedService?.price}</p>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-4">Booking Confirmed!</h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-2">Your booking details:</p>
                <div className="text-sm space-y-1">
                  <p><strong>Service:</strong> {selectedService?.name}</p>
                  <p><strong>Date:</strong> {format(new Date(formData.scheduled_date), 'EEEE, MMMM d, yyyy')}</p>
                  <p><strong>Time:</strong> {formData.scheduled_start_time}</p>
                  <p><strong>Vehicle:</strong> {formData.vehicle_registration}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                We'll send you a confirmation email and reminder before your appointment.
              </p>
              <button
                onClick={() => {
                  setStep(1)
                  setFormData({
                    service_type_id: '',
                    scheduled_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
                    scheduled_start_time: '',
                    customer_name: '',
                    customer_email: '',
                    customer_phone: '',
                    vehicle_registration: '',
                    vehicle_make: '',
                    vehicle_model: '',
                    vehicle_year: '',
                    notes: ''
                  })
                  setSuccess('')
                }}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              >
                Book Another Service
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
