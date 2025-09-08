'use client'

import { useState, useEffect } from 'react'

interface ServiceType {
  id: number
  name: string
  description: string
  duration_minutes: number
  price: number
  color: string
  is_active: boolean
  requires_mot_bay: boolean
  requires_lift: boolean
}

interface Technician {
  id: number
  name: string
  email: string
  phone: string
  hourly_rate: number
  is_active: boolean
  working_hours: any
}

export default function BookingSettings() {
  const [activeTab, setActiveTab] = useState<'services' | 'technicians' | 'settings'>('services')
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [editingService, setEditingService] = useState<ServiceType | null>(null)
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [servicesRes, techniciansRes] = await Promise.all([
        fetch('/api/service-types'),
        fetch('/api/technicians')
      ])

      const [servicesData, techniciansData] = await Promise.all([
        servicesRes.json(),
        techniciansRes.json()
      ])

      if (servicesData.success) setServiceTypes(servicesData.data)
      if (techniciansData.success) setTechnicians(techniciansData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveService = async (service: Partial<ServiceType>) => {
    try {
      const url = '/api/service-types'
      const method = service.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      })

      const data = await response.json()
      if (data.success) {
        fetchData()
        setEditingService(null)
      }
    } catch (error) {
      console.error('Error saving service:', error)
    }
  }

  const saveTechnician = async (technician: Partial<Technician>) => {
    try {
      const url = '/api/technicians'
      const method = technician.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technician)
      })

      const data = await response.json()
      if (data.success) {
        fetchData()
        setEditingTechnician(null)
      }
    } catch (error) {
      console.error('Error saving technician:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading booking settings...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Booking System Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { key: 'services', label: 'Service Types' },
          { key: 'technicians', label: 'Technicians' },
          { key: 'settings', label: 'General Settings' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-t-lg ${
              activeTab === tab.key
                ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Service Types Tab */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Service Types</h2>
            <button
              onClick={() => setEditingService({
                id: 0,
                name: '',
                description: '',
                duration_minutes: 60,
                price: 0,
                color: '#3B82F6',
                is_active: true,
                requires_mot_bay: false,
                requires_lift: false
              })}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add Service Type
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Price</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Requirements</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceTypes.map(service => (
                  <tr key={service.id} className="border-b">
                    <td className="py-2">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded mr-2"
                          style={{ backgroundColor: service.color }}
                        />
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-gray-500 text-xs">{service.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2">{service.duration_minutes} min</td>
                    <td className="py-2">£{service.price}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        service.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="text-xs">
                        {service.requires_mot_bay && <span className="bg-blue-100 text-blue-800 px-1 rounded mr-1">MOT Bay</span>}
                        {service.requires_lift && <span className="bg-purple-100 text-purple-800 px-1 rounded">Lift</span>}
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => setEditingService(service)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Technicians Tab */}
      {activeTab === 'technicians' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Technicians</h2>
            <button
              onClick={() => setEditingTechnician({
                id: 0,
                name: '',
                email: '',
                phone: '',
                hourly_rate: 0,
                is_active: true,
                working_hours: {}
              })}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add Technician
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Contact</th>
                  <th className="text-left py-2">Hourly Rate</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map(technician => (
                  <tr key={technician.id} className="border-b">
                    <td className="py-2">
                      <div className="font-medium">{technician.name}</div>
                    </td>
                    <td className="py-2">
                      <div className="text-xs">
                        <div>{technician.email}</div>
                        <div className="text-gray-500">{technician.phone}</div>
                      </div>
                    </td>
                    <td className="py-2">£{technician.hourly_rate}/hr</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        technician.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {technician.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => setEditingTechnician(technician)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* General Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Business Hours</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Opening Time:</span>
                  <span>08:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Closing Time:</span>
                  <span>17:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Lunch Break:</span>
                  <span>12:00 - 13:00</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Booking Settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Advance Booking Days:</span>
                  <span>30 days</span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Notice:</span>
                  <span>2 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Slot Duration:</span>
                  <span>30 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Edit Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingService.id ? 'Edit Service Type' : 'Add Service Type'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              saveService(editingService)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={editingService.name}
                    onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={editingService.description}
                    onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={editingService.duration_minutes}
                      onChange={(e) => setEditingService({...editingService, duration_minutes: parseInt(e.target.value)})}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingService.price}
                      onChange={(e) => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <input
                    type="color"
                    value={editingService.color}
                    onChange={(e) => setEditingService({...editingService, color: e.target.value})}
                    className="w-full border rounded px-3 py-2 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingService.is_active}
                      onChange={(e) => setEditingService({...editingService, is_active: e.target.checked})}
                      className="mr-2"
                    />
                    Active
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingService.requires_mot_bay}
                      onChange={(e) => setEditingService({...editingService, requires_mot_bay: e.target.checked})}
                      className="mr-2"
                    />
                    Requires MOT Bay
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingService.requires_lift}
                      onChange={(e) => setEditingService({...editingService, requires_lift: e.target.checked})}
                      className="mr-2"
                    />
                    Requires Lift
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technician Edit Modal */}
      {editingTechnician && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTechnician.id ? 'Edit Technician' : 'Add Technician'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              saveTechnician(editingTechnician)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={editingTechnician.name}
                    onChange={(e) => setEditingTechnician({...editingTechnician, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editingTechnician.email}
                    onChange={(e) => setEditingTechnician({...editingTechnician, email: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingTechnician.phone}
                    onChange={(e) => setEditingTechnician({...editingTechnician, phone: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hourly Rate (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTechnician.hourly_rate}
                    onChange={(e) => setEditingTechnician({...editingTechnician, hourly_rate: parseFloat(e.target.value)})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTechnician.is_active}
                      onChange={(e) => setEditingTechnician({...editingTechnician, is_active: e.target.checked})}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTechnician(null)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
