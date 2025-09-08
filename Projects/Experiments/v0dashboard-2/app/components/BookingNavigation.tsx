'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  name: string
  href: string
  icon: string
  description: string
  category: 'customer' | 'staff' | 'admin'
}

const navigationItems: NavItem[] = [
  // Customer-facing
  {
    name: 'Book Online',
    href: '/book-online',
    icon: '🌐',
    description: 'Customer online booking',
    category: 'customer'
  },
  
  // Staff interfaces
  {
    name: 'Workshop Calendar',
    href: '/workshop/calendar',
    icon: '📅',
    description: 'Daily workshop schedule',
    category: 'staff'
  },
  
  // Admin interfaces
  {
    name: 'Booking Management',
    href: '/admin/bookings',
    icon: '📋',
    description: 'Manage all bookings',
    category: 'admin'
  },
  {
    name: 'Booking Settings',
    href: '/admin/booking-settings',
    icon: '⚙️',
    description: 'Services & technicians',
    category: 'admin'
  },
  {
    name: 'Reminder System',
    href: '/admin/reminders',
    icon: '📱',
    description: 'Automated notifications',
    category: 'admin'
  },
  {
    name: 'Vehicle Images',
    href: '/admin/vehicle-images',
    icon: '🚗',
    description: 'AI image management',
    category: 'admin'
  },
  {
    name: 'Vehicle Data Dashboard',
    href: '/vehicle-data-dashboard',
    icon: '📊',
    description: 'Data completeness & costs',
    category: 'admin'
  },
  {
    name: 'API Cost Analytics',
    href: '/api-costs',
    icon: '💰',
    description: 'Monitor API spending',
    category: 'admin'
  },
  
  // Additional useful links
  {
    name: 'Test Vehicle Images',
    href: '/test-vehicle-images',
    icon: '🧪',
    description: 'Test image system',
    category: 'admin'
  },
  {
    name: 'MOT Dashboard',
    href: '/mot-dashboard',
    icon: '🔍',
    description: 'MOT management',
    category: 'staff'
  }
]

export default function BookingNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'customer': return 'bg-green-100 text-green-800'
      case 'staff': return 'bg-blue-100 text-blue-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'customer': return 'Customer Services'
      case 'staff': return 'Staff Tools'
      case 'admin': return 'Administration'
      default: return 'Other'
    }
  }

  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors md:hidden"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Desktop Navigation Bar */}
      <nav className="hidden md:block bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                🚗 Garage Manager
              </Link>
              
              {/* Quick Access Menu */}
              <div className="flex items-center space-x-6">
                <Link
                  href="/book-online"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/book-online'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>🌐</span>
                  <span>Book Online</span>
                </Link>
                
                <Link
                  href="/workshop/calendar"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/workshop/calendar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>📅</span>
                  <span>Calendar</span>
                </Link>
                
                <Link
                  href="/admin/bookings"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/admin/bookings'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>📋</span>
                  <span>Bookings</span>
                </Link>
              </div>
            </div>

            {/* Desktop Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <span>☰</span>
              <span>All Features</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Navigation Menu</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category)}`}>
                    {getCategoryTitle(category)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`block p-3 rounded-lg border transition-colors ${
                        pathname === item.href
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">{item.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                        {pathname === item.href && (
                          <span className="text-blue-500">●</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gray-50 border-t">
            <div className="text-center">
              <p className="text-sm text-gray-600">Garage Management System</p>
              <p className="text-xs text-gray-500 mt-1">Complete booking solution</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
