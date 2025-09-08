"use client"

import React from 'react'
import { X, FileText, Users, Car, File, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTabContext, type TabItem } from '@/contexts/tab-context'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const getTabIcon = (type: TabItem['type']) => {
  switch (type) {
    case 'job-sheet':
      return FileText
    case 'customer':
      return Users
    case 'vehicle':
      return Car
    case 'document':
      return File
    default:
      return FileText
  }
}

const getTabColor = (type: TabItem['type']) => {
  switch (type) {
    case 'job-sheet':
      return 'border-blue-500 bg-blue-50 text-blue-900'
    case 'customer':
      return 'border-green-500 bg-green-50 text-green-900'
    case 'vehicle':
      return 'border-orange-500 bg-orange-50 text-orange-900'
    case 'document':
      return 'border-purple-500 bg-purple-50 text-purple-900'
    default:
      return 'border-gray-500 bg-gray-50 text-gray-900'
  }
}

interface ChromeTabProps {
  tab: TabItem
  isActive: boolean
  onActivate: () => void
  onClose: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

function ChromeTab({ tab, isActive, onActivate, onClose, onContextMenu }: ChromeTabProps) {
  const Icon = getTabIcon(tab.type)
  const colorClass = getTabColor(tab.type)

  return (
    <div
      className={cn(
        "group relative flex items-center min-w-0 max-w-[240px] h-8 px-3 border-t-2 cursor-pointer transition-all duration-200 hover:bg-gray-100",
        isActive 
          ? `${colorClass} border-t-2 bg-white shadow-sm` 
          : "border-transparent bg-gray-50 hover:bg-gray-100",
        "rounded-t-lg mx-0.5"
      )}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      title={`${tab.title}${tab.subtitle ? ` - ${tab.subtitle}` : ''}`}
    >
      {/* Tab Icon */}
      <Icon className="h-3 w-3 flex-shrink-0 mr-2" />
      
      {/* Tab Title */}
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-xs font-medium truncate leading-tight">
          {tab.title}
        </span>
        {tab.subtitle && (
          <span className="text-[10px] text-gray-500 truncate leading-tight">
            {tab.subtitle}
          </span>
        )}
      </div>

      {/* Dirty indicator */}
      {tab.isDirty && (
        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1 flex-shrink-0" />
      )}

      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

interface ChromeTabsProps {
  onNewTab?: () => void
  className?: string
}

export function ChromeTabs({ onNewTab, className }: ChromeTabsProps) {
  const { tabs, activeTabId, setActiveTab, closeTab, closeAllTabs, closeOtherTabs } = useTabContext()

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    // Context menu functionality can be added here
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className={cn("flex items-center bg-gray-100 border-b border-gray-200 px-2 py-1", className)}>
      {/* Tab List */}
      <div className="flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-hide">
        <div className="flex items-center space-x-0.5">
          {tabs.map((tab) => (
            <ChromeTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Tab Actions */}
      <div className="flex items-center space-x-1 ml-2">
        {/* New Tab Button */}
        {onNewTab && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-200"
            onClick={onNewTab}
            title="New Tab"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}

        {/* Tab Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200"
              title="Tab Options"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => closeAllTabs()}>
              Close All Tabs
            </DropdownMenuItem>
            {activeTabId && (
              <DropdownMenuItem onClick={() => closeOtherTabs(activeTabId)}>
                Close Other Tabs
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              {tabs.length} tab{tabs.length !== 1 ? 's' : ''} open
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// Hook for easy tab management
export function useTabManager() {
  const { openTab, closeTab, updateTab, getActiveTab } = useTabContext()

  const openJobSheet = (jobSheetData: { id: string; jobNumber: string; customer?: string; registration?: string }) => {
    openTab({
      id: `job-sheet-${jobSheetData.id}`,
      type: 'job-sheet',
      title: `Job ${jobSheetData.jobNumber}`,
      subtitle: jobSheetData.customer || jobSheetData.registration,
      data: jobSheetData
    })
  }

  const openCustomer = (customerData: { id: string; name: string; phone?: string }) => {
    openTab({
      id: `customer-${customerData.id}`,
      type: 'customer',
      title: customerData.name,
      subtitle: customerData.phone,
      data: customerData
    })
  }

  const openVehicle = (vehicleData: { registration: string; make?: string; model?: string; customer?: string }) => {
    openTab({
      id: `vehicle-${vehicleData.registration}`,
      type: 'vehicle',
      title: vehicleData.registration,
      subtitle: vehicleData.make && vehicleData.model ? `${vehicleData.make} ${vehicleData.model}` : vehicleData.customer,
      data: vehicleData
    })
  }

  const openDocument = (documentData: { id: string; type: string; number: string; customer?: string }) => {
    openTab({
      id: `document-${documentData.id}`,
      type: 'document',
      title: `${documentData.type} ${documentData.number}`,
      subtitle: documentData.customer,
      data: documentData
    })
  }

  const markTabDirty = (tabId: string, isDirty: boolean = true) => {
    updateTab(tabId, { isDirty })
  }

  return {
    openJobSheet,
    openCustomer,
    openVehicle,
    openDocument,
    markTabDirty,
    closeTab,
    getActiveTab
  }
}
