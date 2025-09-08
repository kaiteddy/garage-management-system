'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface ReminderData {
  pending24hReminders: number
  pending2hReminders: number
  bookingsFor24hReminder: any[]
  bookingsFor2hReminder: any[]
  reminderStats: any[]
}

export default function RemindersAdmin() {
  const [reminderData, setReminderData] = useState<ReminderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  useEffect(() => {
    fetchReminderData()
  }, [])

  const fetchReminderData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bookings/reminders')
      const data = await response.json()
      
      if (data.success) {
        setReminderData(data.data)
      }
    } catch (error) {
      console.error('Error fetching reminder data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendReminders = async (type: string) => {
    try {
      setSending(true)
      const response = await fetch('/api/bookings/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      const data = await response.json()
      setLastResult(data)
      
      if (data.success) {
        // Refresh data after sending
        await fetchReminderData()
      }
    } catch (error) {
      console.error('Error sending reminders:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading reminder data...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Booking Reminders</h1>
        <button
          onClick={fetchReminderData}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-medium text-gray-600 mb-2">24-Hour Reminders</h3>
          <p className="text-3xl font-bold text-blue-600">{reminderData?.pending24hReminders || 0}</p>
          <p className="text-sm text-gray-500">Due tomorrow</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-medium text-gray-600 mb-2">2-Hour Reminders</h3>
          <p className="text-3xl font-bold text-orange-600">{reminderData?.pending2hReminders || 0}</p>
          <p className="text-sm text-gray-500">Due soon today</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-medium text-gray-600 mb-2">Total Pending</h3>
          <p className="text-3xl font-bold text-red-600">
            {(reminderData?.pending24hReminders || 0) + (reminderData?.pending2hReminders || 0)}
          </p>
          <p className="text-sm text-gray-500">Need reminders</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-medium text-gray-600 mb-2">Last Week</h3>
          <p className="text-3xl font-bold text-green-600">
            {reminderData?.reminderStats?.filter(s => s.status === 'sent').reduce((sum, s) => sum + parseInt(s.count), 0) || 0}
          </p>
          <p className="text-sm text-gray-500">Reminders sent</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Send Reminders</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => sendReminders('24h')}
            disabled={sending || (reminderData?.pending24hReminders || 0) === 0}
            className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : `Send 24-Hour Reminders (${reminderData?.pending24hReminders || 0})`}
          </button>
          
          <button
            onClick={() => sendReminders('2h')}
            disabled={sending || (reminderData?.pending2hReminders || 0) === 0}
            className="bg-orange-500 text-white px-6 py-3 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : `Send 2-Hour Reminders (${reminderData?.pending2hReminders || 0})`}
          </button>
          
          <button
            onClick={() => sendReminders('all')}
            disabled={sending || ((reminderData?.pending24hReminders || 0) + (reminderData?.pending2hReminders || 0)) === 0}
            className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send All Pending Reminders'}
          </button>
        </div>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className={`rounded-lg p-4 mb-8 ${
          lastResult.success ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <h3 className="font-medium mb-2">Last Operation Result</h3>
          <p>{lastResult.message}</p>
          {lastResult.data && (
            <div className="mt-2 text-sm">
              <p>Processed: {lastResult.data.totalProcessed} bookings</p>
              <p>Sent: {lastResult.data.sentCount} reminders</p>
              <p>Errors: {lastResult.data.errorCount}</p>
            </div>
          )}
        </div>
      )}

      {/* Pending 24-Hour Reminders */}
      {reminderData?.bookingsFor24hReminder && reminderData.bookingsFor24hReminder.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Pending 24-Hour Reminders</h2>
            <p className="text-gray-600">Appointments scheduled for tomorrow</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Reference</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Vehicle</th>
                  <th className="text-left py-3 px-4 font-medium">Service</th>
                  <th className="text-left py-3 px-4 font-medium">Time</th>
                  <th className="text-left py-3 px-4 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody>
                {reminderData.bookingsFor24hReminder.map(booking => (
                  <tr key={booking.id} className="border-b">
                    <td className="py-3 px-4 font-medium">{booking.booking_reference}</td>
                    <td className="py-3 px-4">{booking.customer_name}</td>
                    <td className="py-3 px-4">{booking.vehicle_registration}</td>
                    <td className="py-3 px-4">{booking.service_name}</td>
                    <td className="py-3 px-4">{booking.scheduled_start_time}</td>
                    <td className="py-3 px-4">
                      <div className="text-xs">
                        <div>{booking.customer_email_db || booking.customer_email}</div>
                        <div className="text-gray-500">{booking.customer_phone_db || booking.customer_phone}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending 2-Hour Reminders */}
      {reminderData?.bookingsFor2hReminder && reminderData.bookingsFor2hReminder.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Pending 2-Hour Reminders</h2>
            <p className="text-gray-600">Appointments starting within 2 hours</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Reference</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Vehicle</th>
                  <th className="text-left py-3 px-4 font-medium">Service</th>
                  <th className="text-left py-3 px-4 font-medium">Time</th>
                  <th className="text-left py-3 px-4 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody>
                {reminderData.bookingsFor2hReminder.map(booking => (
                  <tr key={booking.id} className="border-b">
                    <td className="py-3 px-4 font-medium">{booking.booking_reference}</td>
                    <td className="py-3 px-4">{booking.customer_name}</td>
                    <td className="py-3 px-4">{booking.vehicle_registration}</td>
                    <td className="py-3 px-4">{booking.service_name}</td>
                    <td className="py-3 px-4">{booking.scheduled_start_time}</td>
                    <td className="py-3 px-4">
                      <div className="text-xs">
                        <div>{booking.customer_email_db || booking.customer_email}</div>
                        <div className="text-gray-500">{booking.customer_phone_db || booking.customer_phone}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reminder Statistics */}
      {reminderData?.reminderStats && reminderData.reminderStats.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Reminder Statistics (Last 7 Days)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {reminderData.reminderStats.map((stat, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4">{stat.reminder_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stat.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {stat.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Setup Instructions</h3>
        <p className="text-yellow-700 mb-4">
          To enable automated reminders, you'll need to integrate with email and SMS services:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-yellow-800">Email Services:</h4>
            <ul className="list-disc list-inside text-yellow-700 mt-1">
              <li>SendGrid</li>
              <li>Mailgun</li>
              <li>AWS SES</li>
              <li>Postmark</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-yellow-800">SMS Services:</h4>
            <ul className="list-disc list-inside text-yellow-700 mt-1">
              <li>Twilio</li>
              <li>AWS SNS</li>
              <li>MessageBird</li>
              <li>Vonage</li>
            </ul>
          </div>
        </div>
        <p className="text-yellow-700 mt-4 text-sm">
          Currently, reminders are logged to the console. Update the sendEmail() and sendSMS() functions 
          in /api/bookings/reminders/route.ts to integrate with your chosen services.
        </p>
      </div>
    </div>
  )
}
