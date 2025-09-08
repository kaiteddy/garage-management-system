"use client"

import React from 'react'
import { useTabContext } from '@/contexts/tab-context'
import { CleanJobSheetForm } from '@/components/job-sheet/clean-job-sheet-form'
import { CustomerForm } from '@/components/customer/customer-form'
import { VehicleForm } from '@/components/vehicle/vehicle-form'
import { DocumentViewer } from '@/components/document/document-viewer'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Users, Car, File } from 'lucide-react'

interface TabContentManagerProps {
  className?: string
}

export function TabContentManager({ className }: TabContentManagerProps) {
  const { tabs, activeTabId, updateTab } = useTabContext()

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  // If no active tab, don't render anything (let regular page content show)
  if (!activeTab) {
    return null
  }

  const handleDataChange = (newData: any) => {
    updateTab(activeTab.id, {
      data: { ...activeTab.data, ...newData },
      isDirty: true
    })
  }

  const handleSave = () => {
    updateTab(activeTab.id, { isDirty: false })
  }

  const renderTabContent = () => {
    switch (activeTab.type) {
      case 'job-sheet':
        return (
          <CleanJobSheetForm
            key={activeTab.id}
            initialData={activeTab.data}
            showBackButton={false}
            onDataChange={handleDataChange}
            onSave={handleSave}
          />
        )

      case 'customer':
        return (
          <CustomerForm
            key={activeTab.id}
            customerId={activeTab.data?.id}
            initialData={activeTab.data}
            onDataChange={handleDataChange}
            onSave={handleSave}
          />
        )

      case 'vehicle':
        return (
          <VehicleForm
            key={activeTab.id}
            registration={activeTab.data?.registration}
            initialData={activeTab.data}
            onDataChange={handleDataChange}
            onSave={handleSave}
          />
        )

      case 'document':
        return (
          <DocumentViewer
            key={activeTab.id}
            documentId={activeTab.data?.id}
            initialData={activeTab.data}
            onDataChange={handleDataChange}
            onSave={handleSave}
          />
        )

      default:
        return (
          <Card className="m-4">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium">Unknown tab type</h3>
                <p className="text-gray-500">Cannot render content for tab type: {activeTab.type}</p>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className={`flex-1 overflow-hidden ${className}`}>
      {renderTabContent()}
    </div>
  )
}
