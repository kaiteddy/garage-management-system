"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTabManager } from '@/components/ui/chrome-tabs'
import { FileText, Users, Car, File } from 'lucide-react'

export function TabDemoButtons() {
  const { openJobSheet, openCustomer, openVehicle, openDocument } = useTabManager()

  const handleOpenJobSheet = () => {
    openJobSheet({
      id: `js-${Date.now()}`,
      jobNumber: `JS${Math.floor(Math.random() * 10000)}`,
      customer: 'John Smith',
      registration: 'AB12 CDE'
    })
  }

  const handleOpenCustomer = () => {
    openCustomer({
      id: `customer-${Date.now()}`,
      name: 'Sarah Johnson',
      phone: '07123 456789'
    })
  }

  const handleOpenVehicle = () => {
    openVehicle({
      registration: `VH${Math.floor(Math.random() * 100)}ABC`,
      make: 'Ford',
      model: 'Focus',
      customer: 'Mike Wilson'
    })
  }

  const handleOpenDocument = () => {
    openDocument({
      id: `doc-${Date.now()}`,
      type: 'Invoice',
      number: `INV${Math.floor(Math.random() * 10000)}`,
      customer: 'Emma Davis'
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tab System Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          Click the buttons below to open different types of tabs. You can have multiple tabs open simultaneously 
          and switch between them using the Chrome-like tab interface at the top.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={handleOpenJobSheet}
            className="flex items-center gap-2 h-12"
            variant="outline"
          >
            <FileText className="h-4 w-4" />
            Open Job Sheet
          </Button>
          
          <Button 
            onClick={handleOpenCustomer}
            className="flex items-center gap-2 h-12"
            variant="outline"
          >
            <Users className="h-4 w-4" />
            Open Customer
          </Button>
          
          <Button 
            onClick={handleOpenVehicle}
            className="flex items-center gap-2 h-12"
            variant="outline"
          >
            <Car className="h-4 w-4" />
            Open Vehicle
          </Button>
          
          <Button 
            onClick={handleOpenDocument}
            className="flex items-center gap-2 h-12"
            variant="outline"
          >
            <File className="h-4 w-4" />
            Open Document
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Tab Features:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Multiple tabs:</strong> Open multiple job sheets, customers, and vehicles simultaneously</li>
            <li>• <strong>Chrome-like interface:</strong> Familiar tab switching with close buttons</li>
            <li>• <strong>Color coding:</strong> Different colors for different tab types</li>
            <li>• <strong>Dirty state tracking:</strong> Orange dot shows unsaved changes</li>
            <li>• <strong>Context menu:</strong> Right-click for additional options</li>
            <li>• <strong>Keyboard shortcuts:</strong> Ctrl+W to close, Ctrl+T for new tab</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
