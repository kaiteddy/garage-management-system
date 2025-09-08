'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function QuickBookingFAB() {
  const [isOpen, setIsOpen] = useState(false)

  const quickActions = [
    {
      name: 'Book Online',
      href: '/book-online',
      icon: '🌐',
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Customer booking'
    },
    {
      name: 'Workshop Calendar',
      href: '/workshop/calendar',
      icon: '📅',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'View schedule'
    },
    {
      name: 'Manage Bookings',
      href: '/admin/bookings',
      icon: '📋',
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Admin panel'
    },
    {
      name: 'Send Reminders',
      href: '/admin/reminders',
      icon: '📱',
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'Notifications'
    }
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons */}
      {isOpen && (
        <div className="mb-4 space-y-3">
          {quickActions.map((action, index) => (
            <div
              key={action.href}
              className="flex items-center justify-end"
              style={{
                animation: `slideUp 0.3s ease-out ${index * 0.1}s both`
              }}
            >
              <div className="mr-3 bg-white px-3 py-2 rounded-lg shadow-lg border">
                <div className="text-sm font-medium text-gray-900">{action.name}</div>
                <div className="text-xs text-gray-500">{action.description}</div>
              </div>
              <Link
                href={action.href}
                className={`w-12 h-12 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110`}
                onClick={() => setIsOpen(false)}
              >
                <span className="text-lg">{action.icon}</span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg transition-all duration-300 flex items-center justify-center hover:bg-blue-600 ${
          isOpen ? 'rotate-45' : ''
        }`}
      >
        <span className="text-xl">{isOpen ? '✕' : '📅'}</span>
      </button>

      {/* Styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
