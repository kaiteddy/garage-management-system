"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface TabItem {
  id: string
  type: 'job-sheet' | 'customer' | 'vehicle' | 'document'
  title: string
  subtitle?: string
  data?: any
  isActive?: boolean
  isDirty?: boolean // Has unsaved changes
}

interface TabContextType {
  tabs: TabItem[]
  activeTabId: string | null
  openTab: (tab: Omit<TabItem, 'isActive'>) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<TabItem>) => void
  closeAllTabs: () => void
  closeOtherTabs: (keepTabId: string) => void
  getActiveTab: () => TabItem | null
}

const TabContext = createContext<TabContextType | undefined>(undefined)

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const openTab = useCallback((newTab: Omit<TabItem, 'isActive'>) => {
    setTabs(prevTabs => {
      // Check if tab already exists
      const existingTab = prevTabs.find(tab => tab.id === newTab.id)
      if (existingTab) {
        // Tab exists, just activate it
        setActiveTabId(newTab.id)
        return prevTabs.map(tab => ({
          ...tab,
          isActive: tab.id === newTab.id
        }))
      }

      // Create new tab
      const tabWithActive = { ...newTab, isActive: true }
      setActiveTabId(newTab.id)

      return [
        ...prevTabs.map(tab => ({ ...tab, isActive: false })),
        tabWithActive
      ]
    })
  }, [])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(tab => tab.id === tabId)
      if (tabIndex === -1) return prevTabs

      const newTabs = prevTabs.filter(tab => tab.id !== tabId)

      // If we're closing the active tab, activate another one
      if (activeTabId === tabId && newTabs.length > 0) {
        // Activate the tab to the right, or the last tab if we closed the rightmost
        const newActiveIndex = tabIndex < newTabs.length ? tabIndex : newTabs.length - 1
        const newActiveTab = newTabs[newActiveIndex]
        if (newActiveTab) {
          setActiveTabId(newActiveTab.id)
          newTabs[newActiveIndex] = { ...newActiveTab, isActive: true }
        }
      } else if (newTabs.length === 0) {
        setActiveTabId(null)
      }

      return newTabs
    })
  }, [activeTabId])

  const setActiveTab = useCallback((tabId: string) => {
    setTabs(prevTabs =>
      prevTabs.map(tab => ({
        ...tab,
        isActive: tab.id === tabId
      }))
    )
    setActiveTabId(tabId)
  }, [])

  const updateTab = useCallback((tabId: string, updates: Partial<TabItem>) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    )
  }, [])

  const closeAllTabs = useCallback(() => {
    setTabs([])
    setActiveTabId(null)
  }, [])

  const closeOtherTabs = useCallback((keepTabId: string) => {
    setTabs(prevTabs => {
      const tabToKeep = prevTabs.find(tab => tab.id === keepTabId)
      if (!tabToKeep) return prevTabs

      setActiveTabId(keepTabId)
      return [{ ...tabToKeep, isActive: true }]
    })
  }, [])

  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.id === activeTabId) || null
  }, [tabs, activeTabId])

  const value: TabContextType = {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab,
    updateTab,
    closeAllTabs,
    closeOtherTabs,
    getActiveTab
  }

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  )
}

export function useTabContext() {
  const context = useContext(TabContext)
  if (context === undefined) {
    throw new Error('useTabContext must be used within a TabProvider')
  }
  return context
}

// Optional hook that returns null if no provider
export function useTabContextOptional() {
  const context = useContext(TabContext)
  return context || null
}
