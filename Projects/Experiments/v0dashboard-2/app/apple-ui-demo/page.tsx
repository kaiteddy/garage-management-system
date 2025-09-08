"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Car,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  Settings,
  Search,
  Plus,
  ChevronRight
} from 'lucide-react'

export default function AppleUIDemoPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm">← Back</Button>
          <h1 className="text-lg font-semibold">Apple UI Demo</h1>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers, vehicles, or job sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium">New Job Sheet</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">Add Customer</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Car className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-sm font-medium">Vehicle Lookup</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-sm font-medium">Schedule</p>
          </div>
        </div>

        {/* Recent Job Sheets */}
        <div className="px-4 py-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Recent Job Sheets</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-200">
          <div className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">BMW 320D - LX06 XJW</p>
              <p className="text-sm text-gray-500">Anna Reynolds • Job #91258</p>
            </div>
            <div className="text-right">
              <Badge className="bg-green-100 text-green-800 text-xs">Open</Badge>
              <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
            </div>
          </div>

          <div className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <Car className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Ford Focus - EU21 MKX</p>
              <p className="text-sm text-gray-500">John Smith • Job #91259</p>
            </div>
            <div className="text-right">
              <Badge className="bg-orange-100 text-orange-800 text-xs">In Progress</Badge>
              <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
            </div>
          </div>

          <div className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
              <CheckCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Audi A4 - AB12 CDE</p>
              <p className="text-sm text-gray-500">Sarah Johnson • Job #91257</p>
            </div>
            <div className="text-right">
              <Badge className="bg-gray-100 text-gray-800 text-xs">Completed</Badge>
              <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
            </div>
          </div>
        </div>

        {/* Customer Information Card */}
        <div className="px-4 py-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Customer Information</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">YUVAL LANGE</h3>
                <p className="text-sm text-gray-500">Account: REN002</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">07501235220</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">yuval@example.com</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">48 Farm Way, Bushey, WD23 3SY</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Last visit: 2 weeks ago</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                Edit Customer
              </Button>
              <Button variant="outline" className="rounded-lg">
                View History
              </Button>
              <Button variant="ghost" className="text-blue-500 rounded-lg">
                Send Message
              </Button>
            </div>
          </div>
        </div>

        {/* Button Examples */}
        <div className="px-4 py-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Apple-Style Buttons</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-150 active:scale-95">
              Primary Action
            </Button>
            <Button variant="outline" className="rounded-lg transition-all duration-150 active:scale-95">
              Secondary
            </Button>
            <Button variant="destructive" className="rounded-lg transition-all duration-150 active:scale-95">
              Delete
            </Button>
            <Button variant="ghost" className="text-blue-500 rounded-lg transition-all duration-150 active:scale-95">
              Cancel
            </Button>
          </div>
        </div>

        {/* Badge Examples */}
        <div className="px-4 py-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status Badges</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-green-100 text-green-800 rounded-full">Completed</Badge>
            <Badge className="bg-orange-100 text-orange-800 rounded-full">In Progress</Badge>
            <Badge className="bg-red-100 text-red-800 rounded-full">Overdue</Badge>
            <Badge className="bg-blue-100 text-blue-800 rounded-full">Scheduled</Badge>
            <Badge className="bg-gray-100 text-gray-800 rounded-full">Draft</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
