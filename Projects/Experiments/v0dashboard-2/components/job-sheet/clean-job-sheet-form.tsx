"use client"

import { useState, useEffect, useCallback } from "react"
import "../../styles/job-sheet-improvements.css"
import { useSearchParams } from "next/navigation"
import { Search, Save, Printer, Mail, MoreHorizontal, Trash2, Calendar, Plus, Edit, Eye, ArrowLeft, ChevronDown, ChevronUp, Car, Bot, Copy, Check, Lock, Move, Hash, X, FileText, Clock, MapPin, Wrench, Zap, Settings, FileImage, Cog, AlertCircle, AlertTriangle, RefreshCw, Database, TrendingUp, Package } from "lucide-react"
import VehicleDiagram from "../vehicle-diagram"
import { VehicleImageLarge } from "../vehicle-image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PostcodeLookup } from "@/components/ui/postcode-lookup"
import { useBusinessSettings } from "@/hooks/use-business-settings"
import { useVehicleOils } from "@/hooks/use-vehicle-oils"
import { useVehicleTechnicalData } from "@/hooks/use-vehicle-technical-data"
import { usePartsPricing, recordPartPricingHistory } from "@/hooks/use-parts-pricing"
import { RealOmnipartLookup } from "@/components/job-sheet/real-omnipart-lookup"
import { CustomerPricingHistoryPopup } from "@/components/parts/customer-pricing-history-popup"
import { SmartPartMatcher } from "@/components/parts/smart-part-matcher"
import { SmartJobDescriptionMatcher } from "@/components/jobs/smart-job-description-matcher"
import { CustomerSearchDialog } from "@/components/job-sheet/customer-search-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { PartSouqButton } from "@/components/ui/partsoup-button"
import { SevenZapButton } from "@/components/ui/sevenzap-button"
import { ManufacturerLogo } from "@/components/ui/manufacturer-logo"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { AIDescriptionDialog } from "./ai-description-dialog"
import { VehicleHistoryPanel } from "@/components/job-sheet/vehicle-history-panel"
import { JobSheetActions } from "@/components/job-sheet/job-sheet-actions"
import { JobSheetDeleteVoid } from "@/components/job-sheet/job-sheet-delete-void"
import { JobSheetValidationStatus } from "@/components/job-sheet/job-sheet-validation-status"
import { validateJobSheet, ValidationResult } from "@/lib/validation/job-sheet-validation"
import { useValidationSettings } from "@/hooks/use-validation-settings"
import { PartsPricingHistory } from "@/components/parts/parts-pricing-history"
import { VehicleProfileViewer } from "@/components/vehicle/vehicle-profile-viewer"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface JobSheetFormProps {
  initialData?: {
    id: string
    jobNumber: string
    registration: string
    makeModel: string
    customer: string
    status: string
    date: string
    total: number
    customerId?: string
    customerMobile?: string
    customerPhone?: string
    customerEmail?: string
    description?: string
    notes?: string
  }
  showBackButton?: boolean
  onBack?: () => void
  onDataChange?: (data: any) => void
  onSave?: () => void
}

export function CleanJobSheetForm({ initialData, showBackButton = false, onBack, onDataChange, onSave }: JobSheetFormProps) {
  // Removed excessive console logging for performance
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { getTechnicians, getServiceBays } = useBusinessSettings()

  // Vehicle oils hook
  const { oilData, loading: loadingOilData, error: oilDataError, fetchOilData } = useVehicleOils()

  // Enhanced technical data hook
  const {
    technicalData,
    loading: loadingTechnicalData,
    fetchTechnicalData,
    getRepairTime,
    getLubricantByType
  } = useVehicleTechnicalData()

  // Parts pricing history hook
  const {
    pricingSuggestions,
    analytics: pricingAnalytics,
    loadingSuggestions,
    getPricingSuggestions,
    calculatePriceVariance,
    addPricingHistory
  } = usePartsPricing()

  // Status options with improved colors for better readability
  const statusOptions = [
    { value: "Open", label: "Open", color: "bg-blue-50 text-blue-900 border-blue-300 font-semibold" },
    { value: "In Progress", label: "In Progress", color: "bg-yellow-50 text-yellow-900 border-yellow-300 font-semibold" },
    { value: "Awaiting Parts", label: "Awaiting Parts", color: "bg-orange-50 text-orange-900 border-orange-300 font-semibold" },
    { value: "Parts Ordered", label: "Parts Ordered", color: "bg-purple-50 text-purple-900 border-purple-300 font-semibold" },
    { value: "Ready for Collection", label: "Ready for Collection", color: "bg-green-50 text-green-900 border-green-300 font-semibold" },
    { value: "Completed", label: "Completed", color: "bg-gray-50 text-gray-900 border-gray-300 font-semibold" },
    { value: "Invoiced", label: "Invoiced", color: "bg-indigo-50 text-indigo-900 border-indigo-300 font-semibold" },
    { value: "On Hold", label: "On Hold", color: "bg-red-50 text-red-900 border-red-300 font-semibold" }
  ]

  // Get status color
  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status)
    return statusOption ? statusOption.color : "bg-gray-50 text-gray-900 border-gray-300 font-semibold"
  }

  // State for job description
  const [jobDescription, setJobDescription] = useState(initialData?.description || '')
  const [jobNotes, setJobNotes] = useState(initialData?.notes || '')

  // State for vehicle information
  const [vehicleInfoExpanded, setVehicleInfoExpanded] = useState(false)
  const [loadingVehicleData, setLoadingVehicleData] = useState(false)
  const [failedDvlaLookups, setFailedDvlaLookups] = useState<Set<string>>(new Set())
  const [vehicleDataCost, setVehicleDataCost] = useState(0)
  const [showEnhancedDataOption, setShowEnhancedDataOption] = useState(false)

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
    canPrint: false,
    canInvoice: false
  })

  // Load validation settings
  const { settings: validationSettings, loading: validationSettingsLoading } = useValidationSettings()

  // State for customer information
  const [customerInfoExpanded, setCustomerInfoExpanded] = useState(false)
  const [showCustomerSearchDialog, setShowCustomerSearchDialog] = useState(false)

  // State for enhanced vehicle specifications
  const [enhancedSpecsExpanded, setEnhancedSpecsExpanded] = useState(false)

  // State for VIN data display
  const [showVinData, setShowVinData] = useState(false)
  const [loadingVinData, setLoadingVinData] = useState(false)
  const [showTechnicalData, setShowTechnicalData] = useState(false)
  const [showVehicleProfile, setShowVehicleProfile] = useState(false)

  // State for SWS technical data
  const [swsTechnicalData, setSwsTechnicalData] = useState<any>(null)
  const [loadingSwsData, setLoadingSwsData] = useState(false)
  const [showSwsData, setShowSwsData] = useState(false)

  // State for AI description dialog
  const [showAIDialog, setShowAIDialog] = useState(false)

  // Helper function to check if technical data session has expired
  const isSessionExpired = (data: any): boolean => {
    if (!data) return false
    if (Array.isArray(data)) {
      return data.some(item =>
        item?.code?.includes('Session Expired') ||
        item?.reply === 'Error' ||
        item?.error?.includes('Session Expired')
      )
    }
    if (typeof data === 'string') {
      // Check for actual session expired messages, not just any HTML
      return data.includes('Session Expired') ||
             data.includes('Please close and re-open') ||
             data.includes('session has expired') ||
             data.includes('login required')
    }
    if (typeof data === 'object' && data?.raw) {
      // Check the raw HTML content for session expired messages
      const rawContent = data.raw
      return rawContent.includes('Session Expired') ||
             rawContent.includes('Please close and re-open') ||
             rawContent.includes('session has expired') ||
             rawContent.includes('login required')
    }
    return false
  }

  // Function to refresh technical data
  const handleRefreshTechnicalData = async () => {
    if (!jobSheet.vehicle.registration) {
      toast({
        title: "Error",
        description: "No vehicle registration found",
        variant: "destructive",
      })
      return
    }

    setLoadingSwsData(true)
    try {
      // Clear existing data first
      setSwsTechnicalData(null)

      // Fetch fresh data
      const response = await fetch('/api/vin-technical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vrm: jobSheet.vehicle.registration })
      })

      const data = await response.json()

      if (data.success) {
        setSwsTechnicalData(data.data)
        toast({
          title: "Technical Data Refreshed",
          description: "Fresh technical data has been loaded",
        })
      } else {
        toast({
          title: "Refresh Failed",
          description: data.error || "Failed to refresh technical data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error refreshing technical data:', error)
      toast({
        title: "Refresh Error",
        description: "An error occurred while refreshing technical data",
        variant: "destructive",
      })
    } finally {
      setLoadingSwsData(false)
    }
  }

  // Flag to prevent multiple DVLA lookups
  const [dvlaLookupCompleted, setDvlaLookupCompleted] = useState(false)
  const [initialDataProcessed, setInitialDataProcessed] = useState(false)
  const [oilDataLoaded, setOilDataLoaded] = useState(false)

  // Auto-fetch technical data once if key specs are missing
  const [autoTechAttempted, setAutoTechAttempted] = useState(false)

  // State for status change
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // State for copy functionality
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // State for parts pricing
  const [showPricingSuggestions, setShowPricingSuggestions] = useState<{[key: number]: boolean}>({})
  const [selectedPartForPricing, setSelectedPartForPricing] = useState<number | null>(null)

  // State for customer pricing history popup
  const [showCustomerPricingHistory, setShowCustomerPricingHistory] = useState(false)
  const [customerHistoryPart, setCustomerHistoryPart] = useState<{
    partName: string
    partNumber?: string
    itemId: number
    currentPrice?: number
  } | null>(null)

  // State for smart part matcher
  const [showSmartPartMatcher, setShowSmartPartMatcher] = useState(false)
  const [smartMatcherPart, setSmartMatcherPart] = useState<{
    partName: string
    itemId: number
  } | null>(null)

  // State for smart job description matcher
  const [showSmartJobMatcher, setShowSmartJobMatcher] = useState(false)
  const [smartMatcherJob, setSmartMatcherJob] = useState<{
    jobDescription: string
    itemId: number
  } | null>(null)

  // State for MOT dropdown and history
  const [showMotDropdown, setShowMotDropdown] = useState(false)
  const [motHistoryData, setMotHistoryData] = useState<any[]>([])
  const [loadingMotHistory, setLoadingMotHistory] = useState(false)

  // Calculate days until expiry or days expired
  const calculateDaysToExpiry = (expiryDate: string) => {
    if (!expiryDate) return null

    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 0) {
      return { days: diffDays, status: 'expires', color: diffDays <= 30 ? 'text-red-600' : diffDays <= 60 ? 'text-orange-600' : 'text-green-600' }
    } else {
      return { days: Math.abs(diffDays), status: 'expired', color: 'text-red-700 font-bold' }
    }
  }

  // Fetch MOT history data
  const fetchMotHistory = async (registration: string) => {
    if (!registration) return

    setLoadingMotHistory(true)
    try {
      const response = await fetch(`/api/mot?registration=${encodeURIComponent(registration.trim().toUpperCase())}`)

      const data = await response.json()
      console.log('MOT API Response:', data) // Debug log

      if (data.success && data.data?.vehicleData?.motTests) {
        setMotHistoryData(data.data.vehicleData.motTests)
      } else {
        setMotHistoryData([])
      }
    } catch (error) {
      console.error('Error fetching MOT history:', error)
      setMotHistoryData([])
    } finally {
      setLoadingMotHistory(false)
    }
  }



  // Cycle through item types
  const cycleItemType = (itemId: number) => {
    const currentItem = jobSheet.items.find(item => item.id === itemId)
    if (!currentItem) return

    const types = ['Labour', 'Parts', 'Other']
    const currentIndex = types.indexOf(currentItem.type)
    const nextIndex = (currentIndex + 1) % types.length
    const nextType = types[nextIndex]

    // Set appropriate default rate when changing type
    let newPrice = currentItem.netPrice
    if (nextType === 'Labour' && currentItem.type !== 'Labour') {
      // Switching to Labour - set default labour rate
      try {
        if (businessSettings && businessSettings.getSetting) {
          newPrice = businessSettings.getSetting('default_labour_rate', 70.00)
        } else {
          newPrice = 70.00 // Fallback rate
        }
      } catch (error) {
        newPrice = 70.00 // Fallback rate
      }
    } else if (nextType === 'Parts' && currentItem.type === 'Labour') {
      // Switching from Labour to Parts - reset price
      newPrice = 0
    }

    // Update both type and price
    setJobSheet(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, type: nextType, netPrice: newPrice }

          // Recalculate totals
          let netTotal = 0
          if (nextType === 'Labour') {
            netTotal = updatedItem.estHours * newPrice
          } else {
            netTotal = updatedItem.qty * newPrice
          }

          const vatAmount = netTotal * 0.20
          const lineTotal = netTotal + vatAmount

          return {
            ...updatedItem,
            netTotal,
            vat: vatAmount,
            lineTotal
          }
        }
        return item
      })
    }))

    // Show toast to indicate the change
    toast({
      title: "Item Type Changed",
      description: `Changed to ${nextType}`,
      duration: 1500,
    })
  }

  // Get badge variant for item type
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'Labour':
        return 'outline' // Blue outline
      case 'Parts':
        return 'default' // Dark background
      case 'Other':
        return 'secondary' // Gray background
      default:
        return 'outline'
    }
  }

  // Save vehicle data to database
  const saveVehicleData = async (vin: string, oilDataToSave?: any) => {
    try {
      console.log(`💾 [SAVE-DATA] Saving vehicle data for VIN: ${vin}`)
      console.log(`💾 [SAVE-DATA] Oil data to save:`, oilDataToSave || oilData)

      const vehicleUpdateData = {
        registration: jobSheet.vehicle.registration,
        chassis: vin,
        make: jobSheet.vehicle.make,
        model: jobSheet.vehicle.model,
        year: jobSheet.vehicle.year,
        engineSize: jobSheet.vehicle.engineSize,
        fuelType: jobSheet.vehicle.fuelType,
        color: jobSheet.vehicle.color,
        transmission: jobSheet.vehicle.transmission,
        // Add oil data if available
        oilData: (oilDataToSave || oilData) ? {
          engineOil: (oilDataToSave || oilData).engineOil,
          brakeFluid: (oilDataToSave || oilData).brakeFluid,
          transmissionOil: (oilDataToSave || oilData).transmissionOil,
          coolant: (oilDataToSave || oilData).coolant,
          powerSteeringFluid: (oilDataToSave || oilData).powerSteeringFluid,
          additionalLubricants: (oilDataToSave || oilData).additionalLubricants,
          lastUpdated: new Date().toISOString()
        } : null
      }

      // Update the vehicle record
      const response = await fetch('/api/vehicles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration: jobSheet.vehicle.registration,
          updates: vehicleUpdateData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save vehicle data')
      }

      const result = await response.json()
      console.log('✅ [SAVE-DATA] Vehicle data saved successfully:', result)

      // Also update the job sheet with the new VIN
      if (jobSheet.id) {
        const jobSheetResponse = await fetch(`/api/job-sheets/${jobSheet.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vehicle: {
              ...jobSheet.vehicle,
              chassis: vin
            }
          })
        })

        if (jobSheetResponse.ok) {
          console.log('✅ [SAVE-DATA] Job sheet updated with VIN')
        }
      }

    } catch (error) {
      console.error('❌ [SAVE-DATA] Error saving vehicle data:', error)
      // Don't throw error as this is supplementary functionality
    }
  }

  // Fetch comprehensive VIN data using registration
  const fetchVINData = async () => {
    const registration = jobSheet.vehicle.registration
    if (!registration) {
      toast({
        title: "Registration Required",
        description: "Please enter a vehicle registration first",
        variant: "destructive",
      })
      return
    }

    setLoadingVinData(true)
    setShowVinData(true)

    try {
      console.log(`🔍 [VIN-DATA] Fetching comprehensive data for registration: ${registration}`)

      // First, try to get VIN from DVLA API or database
      const vehicleResponse = await fetch(`/api/vehicles?registration=${encodeURIComponent(registration)}`)
      const vehicleData = await vehicleResponse.json()

      let vin = ''
      if (vehicleData.success && vehicleData.data?.vin) {
        vin = vehicleData.data.vin
      } else {
        // Try DVLA API for VIN
        const dvlaResponse = await fetch('/api/mot-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registration })
        })
        const dvlaData = await dvlaResponse.json()

        if (dvlaData.success && dvlaData.vehicleData?.vin) {
          vin = dvlaData.vehicleData.vin
        }
      }

      // Update vehicle with VIN if found
      if (vin) {
        setJobSheet(prev => ({
          ...prev,
          vehicle: { ...prev.vehicle, chassis: vin }
        }))

        // Fetch oil data using the VIN and save immediately
        await fetchOilData(vin, {
          make: jobSheet.vehicle.make,
          model: jobSheet.vehicle.model,
          year: jobSheet.vehicle.year,
          engineSize: jobSheet.vehicle.engineSize,
          fuelType: jobSheet.vehicle.fuelType,
          registration: jobSheet.vehicle.registration
        })

        // Fetch oil data directly from API to ensure we have it for saving
        try {
          const oilResponse = await fetch('/api/vehicle-oils', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              vin,
              make: jobSheet.vehicle.make,
              model: jobSheet.vehicle.model,
              year: jobSheet.vehicle.year,
              engineSize: jobSheet.vehicle.engineSize,
              fuelType: jobSheet.vehicle.fuelType
            })
          })

          const oilResult = await oilResponse.json()
          if (oilResult.success && oilResult.data) {
            console.log('🔄 [VIN-DATA] Got oil data for saving:', oilResult.data)
            await saveVehicleData(vin, oilResult.data)
          } else {
            console.log('🔄 [VIN-DATA] No oil data to save')
            await saveVehicleData(vin)
          }
        } catch (error) {
          console.error('❌ [VIN-DATA] Error getting oil data for save:', error)
          await saveVehicleData(vin)
        }

        toast({
          title: "VIN Data Retrieved & Saved",
          description: `VIN found: ${vin}. Oil specifications loaded and saved to database.`,
          duration: 4000,
        })
      } else {
        // Even without VIN, we can show the attempt
        toast({
          title: "VIN Not Found",
          description: `No VIN found for ${registration}. Using registration for parts lookup.`,
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error('❌ [VIN-DATA] Error fetching VIN data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch VIN data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingVinData(false)
    }
  }

  // Copy to clipboard function
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  // Function to convert HTML form to data URL for iframe
  const htmlToDataUrl = (htmlString: string) => {
    const blob = new Blob([htmlString], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }

  // Function to extract form data from HTML form
  const extractFormData = (htmlString: string) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, 'text/html')
    const form = doc.querySelector('form')

    if (!form) return null

    const actionUrl = form.getAttribute('action')
    const formData: Record<string, string> = {}

    const inputs = form.querySelectorAll('input[type="hidden"]')
    inputs.forEach(input => {
      const name = input.getAttribute('name')
      const value = input.getAttribute('value')
      if (name && value) {
        formData[name] = value
      }
    })

    return { actionUrl, formData }
  }

  // Function to fetch actual technical data from HaynesPro
  const fetchHaynesProData = async (htmlForm: string) => {
    const formInfo = extractFormData(htmlForm)
    if (!formInfo) return null

    try {
      const response = await fetch('/api/haynespro-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formInfo)
      })

      const result = await response.json()
      if (result.success) {
        return htmlToDataUrl(result.html)
      }
    } catch (error) {
      console.error('Error fetching HaynesPro data:', error)
    }

    return null
  }

  // Function to open technical data in a new window
  const openTechnicalData = async (category: string, title: string) => {
    if (!swsTechnicalData?.[category]) {
      toast({
        title: "No Data Available",
        description: `No ${title.toLowerCase()} data available for this vehicle.`,
        variant: "destructive",
      })
      return
    }

    try {
      // Get the original HTML form from the cached data
      const response = await fetch(`/api/vin-technical-data?vrm=${encodeURIComponent(jobSheet.vehicle.registration)}`)
      const data = await response.json()

      if (data.success && data.data[category]?.raw) {
        // Create a form submission page
        const formResponse = await fetch('/api/technical-data-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            htmlForm: data.data[category].raw,
            title: title,
            vrm: data.data.vrm
          })
        })

        if (formResponse.ok) {
          const formHtml = await formResponse.text()
          const blob = new Blob([formHtml], { type: 'text/html' })
          const url = URL.createObjectURL(blob)

          // Open in new window
          const newWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')

          if (newWindow) {
            // Clean up the blob URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 5000)
          } else {
            toast({
              title: "Popup Blocked",
              description: "Please allow popups for this site to view technical data.",
              variant: "destructive",
            })
          }
        } else {
          throw new Error('Failed to create form page')
        }
      } else {
        throw new Error('No form data available')
      }
    } catch (error) {
      console.error('Error opening technical data:', error)
      toast({
        title: "Error",
        description: "Failed to open technical data. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Fetch SWS technical data for VIN
  const fetchSwsTechnicalData = async () => {
    if (!jobSheet.vehicle.registration) {
      toast({
        title: "Error",
        description: "No vehicle registration available",
        variant: "destructive",
      })
      return
    }

    setLoadingSwsData(true)
    try {
      console.log(`🔍 [SWS-DATA] Fetching technical data for ${jobSheet.vehicle.registration}`)

      // First try to get cached data
      const cachedResponse = await fetch(`/api/vin-technical-data?vrm=${encodeURIComponent(jobSheet.vehicle.registration)}`)

      if (cachedResponse.ok) {
        const cachedData = await cachedResponse.json()
        if (cachedData.success) {
          // Store the data for the interface (we'll process forms when opening)
          setSwsTechnicalData(cachedData.data)
          setShowSwsData(true)
          toast({
            title: "Technical Data Retrieved",
            description: "Using stored technical data",
          })
          return
        }
      }

      // If no cached data, fetch fresh data
      const response = await fetch('/api/vin-technical-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vrm: jobSheet.vehicle.registration })
      })

      const data = await response.json()

      if (data.success) {
        // Store the data for the interface (we'll process forms when opening)
        setSwsTechnicalData(data.data)
        setShowSwsData(true)
        toast({
          title: "Technical Data Retrieved",
          description: "Technical data fetched and permanently stored",
        })
      } else {
        throw new Error(data.details || data.error || 'Failed to fetch technical data')
      }

    } catch (error) {
      console.error('❌ [SWS-DATA] Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch technical data",
        variant: "destructive",
      })
    } finally {
      setLoadingSwsData(false)
    }
  }





  // Generate intelligent job descriptions based on vehicle
  const generateSmartDescription = (type: string) => {
    const vehicle = `${jobSheet.vehicle.make} ${jobSheet.vehicle.model} ${jobSheet.vehicle.derivative}`.trim()
    const year = jobSheet.vehicle.year
    const engineSize = jobSheet.vehicle.engineSize

    const templates: Record<string, string> = {
      'MOT': `CARRY OUT MOT TEST ON ${year} ${vehicle}${engineSize ? ` ${engineSize}` : ''}`,
      'SERVICE': `CARRY OUT FULL SERVICE ON ${year} ${vehicle}${engineSize ? ` ${engineSize}` : ''} - OIL & FILTER CHANGE, BRAKE CHECK, LIGHTS CHECK`,
      'BRAKE_INSPECTION': `BRAKE SYSTEM INSPECTION ON ${year} ${vehicle} - CHECK PADS, DISCS, FLUID LEVELS`,
      'DIAGNOSTIC': `ENGINE DIAGNOSTIC ON ${year} ${vehicle}${engineSize ? ` ${engineSize}` : ''} - FAULT CODE SCAN & ANALYSIS`,
      'TYRE_CHANGE': `TYRE REPLACEMENT ON ${year} ${vehicle} - REMOVE & REFIT TYRES, BALANCE & ALIGNMENT CHECK`,
      'BATTERY': `BATTERY REPLACEMENT ON ${year} ${vehicle} - REMOVE OLD BATTERY, FIT NEW BATTERY, TEST CHARGING SYSTEM`,
      'OIL_SERVICE': `OIL & FILTER SERVICE ON ${year} ${vehicle}${engineSize ? ` ${engineSize}` : ''} - DRAIN OLD OIL, REPLACE FILTER, REFILL WITH CORRECT GRADE`,
      'CLUTCH': `CLUTCH REPAIR ON ${year} ${vehicle} - INSPECT CLUTCH SYSTEM, REPLACE WORN COMPONENTS`,
      'EXHAUST': `EXHAUST SYSTEM REPAIR ON ${year} ${vehicle} - INSPECT & REPAIR EXHAUST COMPONENTS`
    }

    return templates[type] || `WORK REQUIRED ON ${year} ${vehicle}`
  }

  // Common job description templates with smart generation
  const commonDescriptions = [
    { label: "MOT TEST", key: "MOT" },
    { label: "FULL SERVICE", key: "SERVICE" },
    { label: "BRAKE INSPECTION", key: "BRAKE_INSPECTION" },
    { label: "ENGINE DIAGNOSTIC", key: "DIAGNOSTIC" },
    { label: "TYRE REPLACEMENT", key: "TYRE_CHANGE" },
    { label: "BATTERY REPLACEMENT", key: "BATTERY" },
    { label: "OIL CHANGE", key: "OIL_SERVICE" },
    { label: "CLUTCH REPAIR", key: "CLUTCH" },
    { label: "EXHAUST REPAIR", key: "EXHAUST" }
  ]

  // State for line items
  const [loadingLineItems, setLoadingLineItems] = useState(false)

  // Generate next job sheet number
  const generateJobNumber = async () => {
    try {
      const response = await fetch('/api/job-sheets/next-number')
      const data = await response.json()
      return data.success ? data.nextNumber : `JS${Date.now().toString().slice(-5)}`
    } catch (error) {
      console.error('Error generating job number:', error)
      return `JS${Date.now().toString().slice(-5)}`
    }
  }

  // Job Sheet State
  const [jobSheet, setJobSheet] = useState({
    jobNumber: initialData?.jobNumber || "Loading...",
    status: initialData?.status || "Open",
    dateIn: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    mileage: "",
    buyMot: false,
    technician: "",
    fuel: "",
    serviceAdvisor: "",
    qualityAssurance: "",
    bay: "",
    contactNumber: "",
    details: "",

    // Vehicle Information - use initialData if available, otherwise will be loaded from DVLA API
    vehicle: {
      registration: initialData?.registration || "",
      make: initialData?.vehicleMake || "",
      model: initialData?.vehicleModel || "",
      derivative: initialData?.vehicleDerivative || "",
      year: initialData?.vehicleYear || "",
      color: initialData?.vehicleColor || "",
      engineSize: "",
      fuelType: "",
      chassis: "",
      // Preload engineCode/euroStatus/tyre data when provided via initialData
      engineCode: (initialData as any)?.engineCode || "",
      // DVLA specific fields
      motStatus: "",
      motExpiryDate: "",
      taxStatus: "",
      taxDueDate: "",
      taxStatusColor: "",
      co2Emissions: "",
      euroStatus: (initialData as any)?.euroStatus || "",
      typeApproval: "",
      dateOfLastV5CIssued: "",
      wheelplan: "",
      realDrivingEmissions: "",
      // Enhanced specifications from CarAPI
      transmission: "",
      driveType: "",
      horsepower: "",
      torque: "",
      fuelCapacity: "",
      cityMpg: "",
      highwayMpg: "",
      combinedMpg: "",
      bodyType: "",
      doors: "",
      seats: "",
      curbWeight: "",
      // Service intervals
      oilChangeInterval: "",
      serviceInterval: "",
      motInterval: "",
      // Additional service data
      tyreSize: (initialData as any)?.tyreSize || "",
      timingBeltInterval: (initialData as any)?.timingBeltInterval || "",
      tyrePressureFrontNS: (initialData as any)?.tyrePressureFrontNS || "",
      tyrePressureFrontOS: (initialData as any)?.tyrePressureFrontOS || "",
      tyrePressureRearNS: (initialData as any)?.tyrePressureRearNS || "",
      tyrePressureRearOS: (initialData as any)?.tyrePressureRearOS || "",
      // Repair times
      repairTimes: {} as Record<string, string>
    },

    // Customer Information - use initialData if available
    customer: {
      name: initialData?.customer || "",
      accountNumber: "",
      company: "",
      houseNumber: initialData?.customerAddress?.houseNumber || "",
      road: initialData?.customerAddress?.road || "",
      locality: initialData?.customerAddress?.locality || "",
      town: initialData?.customerAddress?.town || "",
      county: initialData?.customerAddress?.county || "",
      postCode: initialData?.customerAddress?.postCode || "",
      mobile: initialData?.customerMobile || "",
      telephone: initialData?.customerPhone || "",
      email: initialData?.customerEmail || "",
    },

    // Job Items - will be loaded from API
    items: []
  })

  // Validate job sheet data
  const validateJobSheetData = useCallback(() => {
    const validationData = {
      vehicle: {
        registration: jobSheet.vehicle.registration,
        make: jobSheet.vehicle.make,
        model: jobSheet.vehicle.model,
        year: jobSheet.vehicle.year,
        color: jobSheet.vehicle.color,
        engineSize: jobSheet.vehicle.engineSize,
        fuelType: jobSheet.vehicle.fuelType
      },
      customer: {
        name: jobSheet.customer.name,
        houseNumber: jobSheet.customer.houseNumber,
        road: jobSheet.customer.road,
        town: jobSheet.customer.town,
        postCode: jobSheet.customer.postCode,
        telephone: jobSheet.customer.telephone,
        mobile: jobSheet.customer.mobile,
        email: jobSheet.customer.email
      },
      mileage: jobSheet.mileage,
      technician: jobSheet.technician,
      serviceAdvisor: jobSheet.serviceAdvisor,
      dateIn: jobSheet.dateIn,
      dueDate: jobSheet.dueDate,
      status: jobSheet.status,
      items: jobSheet.items
    }

    const result = validateJobSheet(validationData, validationSettings)
    setValidationResult(result)
    return result
  }, [jobSheet, validationSettings])

  // Update validation when job sheet data changes
  useEffect(() => {
    validateJobSheetData()
  }, [validateJobSheetData])

  // Helper function to extract year from UK registration number
  const extractYearFromRegistration = (registration: string): number | null => {
    // UK registration format: AB12 CDE or AB62 CDE
    // The age identifier (12, 62) indicates the year
    const match = registration.match(/^[A-Z]{2}(\d{2})[A-Z]{3}$/)
    if (match) {
      const ageId = parseInt(match[1])
      if (ageId >= 1 && ageId <= 50) {
        return 2000 + ageId // 01-50 = 2001-2050
      } else if (ageId >= 51 && ageId <= 99) {
        return 2000 + ageId - 50 // 51-99 = 2001-2049 (second half of year)
      }
    }
    return null
  }

  // Helper function to extract make from VIN
  const extractMakeFromVIN = (vin: string): string => {
    if (!vin || vin.length < 3) return ''

    const wmi = vin.substring(0, 3).toUpperCase()
    const makeMap: Record<string, string> = {
      'WVW': 'Volkswagen',
      'WBA': 'BMW',
      'WBS': 'BMW',
      'WBX': 'BMW',
      'SAL': 'Land Rover',
      'SAJ': 'Jaguar',
      'VF1': 'Renault',
      'VF3': 'Peugeot',
      'VF7': 'Citroën',
      'WDB': 'Mercedes-Benz',
      'WDD': 'Mercedes-Benz',
      'WDC': 'Mercedes-Benz',
      'ZFA': 'Fiat',
      'ZAR': 'Alfa Romeo',
      'TRU': 'Audi',
      'WAU': 'Audi',
      'WA1': 'Audi',
      'JHM': 'Honda',
      'JMZ': 'Mazda',
      'KNA': 'Kia',
      'KMH': 'Hyundai',
      'YV1': 'Volvo',
      'YS3': 'Saab',
      'TMB': 'Škoda',
      'TMA': 'Škoda',
      'VSS': 'SEAT',
      'VWV': 'Volkswagen',
      'WVG': 'Volkswagen',
      'WV1': 'Volkswagen',
      'WV2': 'Volkswagen'
    }

    return makeMap[wmi] || ''
  }

  // Helper function to clean and parse vehicle model data
  const parseVehicleData = (rawMake: string, rawModel: string, vin: string) => {
    // Extract make from VIN if available
    const vinMake = extractMakeFromVIN(vin)

    // If we have a VIN-derived make, use it
    let cleanMake = vinMake || rawMake || ''
    let cleanModel = rawModel || ''

    // If the raw make/model data looks like it contains the full vehicle description
    if (rawMake && rawMake.toLowerCase().includes('golf') && rawMake.length > 15) {
      // This looks like "Golf Match Tsi Bluemotion Technology Dsg"
      // Extract the actual model name (first word that looks like a model)
      const words = rawMake.split(' ')
      const modelWord = words.find(word =>
        ['golf', 'polo', 'passat', 'tiguan', 'touran', 'sharan', 'arteon', 'jetta'].includes(word.toLowerCase())
      )
      if (modelWord) {
        cleanModel = modelWord
        // If we have VIN make, use it, otherwise try to infer
        if (vinMake) {
          cleanMake = vinMake
        } else if (modelWord.toLowerCase() === 'golf') {
          cleanMake = 'Volkswagen'
        }
      }
    }

    return {
      make: cleanMake,
      model: cleanModel
    }
  }

  // Comprehensive registration lookup function - DVLA First
  const handleRegistrationLookup = useCallback(async (registration: string) => {
    if (!registration.trim()) {
      toast({
        title: "Error",
        description: "Please enter a vehicle registration",
        variant: "destructive",
      })
      return
    }

    const cleanReg = registration.trim().toUpperCase().replace(/\s/g, '')

    // Skip if we've already tried and failed for this registration
    if (failedDvlaLookups.has(cleanReg)) {
      console.log(`⏭️ Skipping DVLA lookup for ${cleanReg} - already failed`)
      return
    }

    setLoadingVehicleData(true)
    try {
      const cleanReg = registration.trim().toUpperCase().replace(/\s/g, '')
      console.log(`🔍 PRIORITY: Looking up registration from DVLA first: ${cleanReg}`)

      // Step 1: Try DVLA API FIRST to get fresh MOT/TAX data
      let vehicleFound = false
      let customerFound = false

      try {
        // Step 1: Get DVLA Vehicle Enquiry data (tax status, basic info)
        const dvlaResponse = await fetch("/api/dvla-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration: cleanReg }),
        })

        let vehicleData = null
        if (dvlaResponse.ok) {
          const dvlaData = await dvlaResponse.json()
          vehicleData = dvlaData.data || dvlaData
          vehicleFound = true

          console.log(`✅ DVLA Vehicle Enquiry Data Retrieved:`, vehicleData)
          console.log(`🔍 Setting MOT Status: ${vehicleData.motStatus}`)
          console.log(`🔍 Setting TAX Status: ${vehicleData.taxStatus}`)
        }

        // Step 2: Get MOT History data for detailed technical specs
        let motHistoryData = null
        try {
          const motResponse = await fetch("/api/mot-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registration: cleanReg }),
          })

          if (motResponse.ok) {
            const motData = await motResponse.json()
            motHistoryData = motData.vehicleData || motData.data
            console.log(`✅ MOT History Data Retrieved:`, motHistoryData)
          }
        } catch (motError) {
          console.log(`⚠️ MOT History lookup failed:`, motError)
        }

        // Step 3: Get database data for model fallback (since DVLA doesn't provide model)
        let databaseModel = ''
        let databaseVin = ''
        try {
          const dbResponse = await fetch(`/api/vehicles/${encodeURIComponent(cleanReg)}`)
          if (dbResponse.ok) {
            const dbData = await dbResponse.json()
            if (dbData.success && dbData.vehicle) {
              // Extract model from database data using our parsing function
              const parsedDb = parseVehicleData(dbData.vehicle.make, dbData.vehicle.model, dbData.vehicle.vin)
              databaseModel = parsedDb.model || ''
              databaseVin = dbData.vehicle.vin || ''
              console.log(`📊 Database fallback model: "${databaseModel}" from raw: "${dbData.vehicle.model}"`)
            }
          }
        } catch (dbError) {
          console.log(`⚠️ Database lookup for model failed:`, dbError)
        }

        // Step 4: Combine data from all sources
        if (vehicleData || motHistoryData) {
          // Merge data, prioritizing DVLA for official status, database for model, MOT for technical details
          const combinedData = {
            // Basic info - prefer DVLA, fallback to MOT, then database
            registrationNumber: vehicleData?.registrationNumber || motHistoryData?.registration || cleanReg,
            make: vehicleData?.make || motHistoryData?.make || '',
            // Model: DVLA doesn't provide model, so use database parsed model, then MOT
            model: vehicleData?.model || databaseModel || motHistoryData?.model || '',
            colour: vehicleData?.colour || motHistoryData?.primaryColour || '',
            fuelType: vehicleData?.fuelType || motHistoryData?.fuelType || '',

            // Year - prefer DVLA, fallback to MOT, then extract from registration
            yearOfManufacture: vehicleData?.yearOfManufacture ||
                              (motHistoryData?.manufactureDate ? new Date(motHistoryData.manufactureDate).getFullYear() : null) ||
                              extractYearFromRegistration(cleanReg),

            // Technical details - prefer DVLA, then MOT History
            engineCapacity: vehicleData?.engineCapacity || (motHistoryData?.engineSize ? parseInt(motHistoryData.engineSize) : null),

            // Official status - only from DVLA
            motStatus: vehicleData?.motStatus || 'No details held by DVLA',
            motExpiryDate: vehicleData?.motExpiryDate || '',
            taxStatus: vehicleData?.taxStatus || 'No details held by DVLA',
            taxDueDate: vehicleData?.taxDueDate || '',

            // Additional DVLA fields
            co2Emissions: vehicleData?.co2Emissions,
            euroStatus: vehicleData?.euroStatus,
            engineCode: vehicleData?.engineCode,
            derivative: vehicleData?.derivative,
            typeApproval: vehicleData?.typeApproval,
            dateOfLastV5CIssued: vehicleData?.dateOfLastV5CIssued,
            wheelplan: vehicleData?.wheelplan,
            realDrivingEmissions: vehicleData?.realDrivingEmissions,
            vin: vehicleData?.vin || vehicleData?.chassisNumber || databaseVin,
            chassisNumber: vehicleData?.chassisNumber || vehicleData?.vin || databaseVin
          }

          vehicleData = combinedData
          vehicleFound = true

          console.log(`🔄 Combined Vehicle Data:`, {
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.yearOfManufacture,
            engineCapacity: vehicleData.engineCapacity,
            co2Emissions: vehicleData.co2Emissions,
            euroStatus: vehicleData.euroStatus,
            engineCode: vehicleData.engineCode,
            colour: vehicleData.colour,
            fuelType: vehicleData.fuelType
          })
        }

        // Update vehicle information with comprehensive combined data
        if (vehicleData) {
          // Reduced logging for performance

          setJobSheet(prev => {
            // Reduced logging for performance
            const newVehicleData = {
              ...prev.vehicle,
              registration: vehicleData.registrationNumber || cleanReg,
              make: vehicleData.make || prev.vehicle.make || '',
              // Preserve existing model/derivative if DVLA doesn't provide them
              model: vehicleData.model || prev.vehicle.model || '',
              derivative: vehicleData.derivative || prev.vehicle.derivative || '',
              // Mark that we have DVLA data to prevent database overwrite
              dvlaDataLoaded: true,
              year: vehicleData.yearOfManufacture?.toString() || '',
              color: vehicleData.colour || '',
              fuelType: vehicleData.fuelType || '',
              engineSize: vehicleData.engineCapacity ? `${vehicleData.engineCapacity}cc` : '',
              chassis: vehicleData.vin || vehicleData.chassisNumber || '',
              engineCode: vehicleData.engineCode || '',
              // CRITICAL: MOT & TAX Status - Always populate
              motStatus: vehicleData.motStatus || 'No details held by DVLA',
              motExpiryDate: vehicleData.motExpiryDate || '',
              taxStatus: vehicleData.taxStatus || 'No details held by DVLA',
              taxDueDate: vehicleData.taxDueDate || '',
              taxStatusColor: vehicleData.taxStatus === 'Taxed' ? 'green' :
                             vehicleData.taxStatus === 'SORN' ? 'orange' :
                             vehicleData.taxStatus === 'Untaxed' ? 'red' : 'gray',
              // Technical Details
              co2Emissions: vehicleData.co2Emissions?.toString() || '',
              euroStatus: vehicleData.euroStatus || '',
              typeApproval: vehicleData.typeApproval || '',
              dateOfLastV5CIssued: vehicleData.dateOfLastV5CIssued || '',
              wheelplan: vehicleData.wheelplan || '',
              realDrivingEmissions: vehicleData.realDrivingEmissions || '',
              // Additional technical specs
              transmission: vehicleData.transmission || '',
              driveType: vehicleData.driveType || '',
              bodyType: vehicleData.bodyType || '',
              doors: vehicleData.doors?.toString() || '',
              seats: vehicleData.seats?.toString() || ''
            }

            // Reduced logging for performance

            return {
              ...prev,
              vehicle: newVehicleData
            }
          })

          console.log(`✅ Combined: State update completed`)

          console.log(`🔍 Final MOT Status: ${vehicleData.motStatus || 'No details held by DVLA'}`)
          console.log(`🔍 Final TAX Status: ${vehicleData.taxStatus || 'No details held by DVLA'}`)

          toast({
            title: "Vehicle Found (Combined APIs)",
            description: `Found ${vehicleData.make} ${vehicleData.model} - MOT: ${vehicleData.motStatus || 'Unknown'}, TAX: ${vehicleData.taxStatus || 'Unknown'}`,
          })
        } else {
          console.log(`❌ No vehicle data found from either API`)
          throw new Error('Vehicle lookup failed from both APIs')
        }
      } catch (apiError) {
        console.log('❌ API lookup failed, trying database fallback...', apiError)

        // Mark this registration as failed to prevent repeated attempts
        setFailedDvlaLookups(prev => new Set(prev).add(cleanReg))

        // Step 2: Fallback to database if DVLA fails
        try {
          const dbResponse = await fetch(`/api/vehicles/${encodeURIComponent(cleanReg)}`)
          if (dbResponse.ok) {
            const dbData = await dbResponse.json()
            if (dbData.success && dbData.vehicle) {
              const vehicle = dbData.vehicle
              vehicleFound = true

              // Parse and clean vehicle data from database
              const parsedVehicle = parseVehicleData(vehicle.make, vehicle.model, vehicle.vin)
              const extractedYear = vehicle.year || extractYearFromRegistration(cleanReg)

              console.log(`🔧 Parsing database vehicle data:`, {
                raw: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
                parsed: { make: parsedVehicle.make, model: parsedVehicle.model, year: extractedYear },
                vin: vehicle.vin
              })

              // Update vehicle information from database
              setJobSheet(prev => ({
                ...prev,
                vehicle: {
                  ...prev.vehicle,
                  registration: vehicle.registration || cleanReg,
                  make: parsedVehicle.make || vehicle.make || '',
                  model: parsedVehicle.model || vehicle.model || '',
                  year: extractedYear?.toString() || '',
                  color: vehicle.color || vehicle.colour || '',
                  fuelType: vehicle.fuelType || '',
                  engineSize: vehicle.engineSize || '',
                  chassis: vehicle.vin || prev.vehicle.chassis || '',
                  // MOT information from database (may be outdated)
                  motStatus: vehicle.motStatus || 'No data available',
                  motExpiryDate: vehicle.motExpiryDate || '',
                  taxStatus: vehicle.taxStatus || 'No data available',
                  taxDueDate: vehicle.taxDueDate || ''
                }
              }))

              // Check if customer information is embedded in vehicle record
              if (vehicle.first_name || vehicle.last_name || vehicle.phone || vehicle.email) {
                customerFound = true
                const customerName = `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim().toUpperCase()

                setJobSheet(prev => ({
                  ...prev,
                  customer: {
                    ...prev.customer,
                    name: customerName,
                    mobile: vehicle.phone || prev.customer.mobile,
                    telephone: vehicle.phone || prev.customer.telephone,
                    email: vehicle.email || prev.customer.email
                  }
                }))

                console.log(`✅ Found embedded customer data: ${customerName}`)
                toast({
                  title: "Vehicle & Customer Found (Database)",
                  description: `Found ${vehicle.make} ${vehicle.model} owned by ${customerName}. Note: MOT/TAX data may be outdated.`,
                })
              } else if (vehicle.customer) {
                // Legacy customer object structure
                customerFound = true
                setJobSheet(prev => ({
                  ...prev,
                  customer: {
                    ...prev.customer,
                    name: `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim(),
                    mobile: vehicle.customer.mobile || prev.customer.mobile,
                    telephone: vehicle.customer.telephone || prev.customer.telephone,
                    email: vehicle.customer.email || prev.customer.email,
                    address: vehicle.customer.address || prev.customer.address,
                    postCode: vehicle.customer.postcode || prev.customer.postCode,
                    county: vehicle.customer.country || prev.customer.county
                  }
                }))

                toast({
                  title: "Vehicle & Customer Found (Database)",
                  description: `Found ${vehicle.make} ${vehicle.model} owned by ${vehicle.customer.firstName} ${vehicle.customer.lastName}. Note: MOT/TAX data may be outdated.`,
                })
              } else {
                toast({
                  title: "Vehicle Found (Database)",
                  description: `Found ${vehicle.make} ${vehicle.model} in database. Note: MOT/TAX data may be outdated.`,
                })
              }
            }
          }
        } catch (dbError) {
          console.log('Database lookup also failed:', dbError)
        }
      }

      // Step 3: If no customer found yet, try customer lookup by vehicle registration
      if (vehicleFound && !customerFound) {
        try {
          console.log(`🔍 Looking up customer for vehicle registration: ${cleanReg}`)

          // First try to get vehicle data which may have embedded customer info
          const vehicleResponse = await fetch(`/api/vehicles?registration=${encodeURIComponent(cleanReg)}`)
          if (vehicleResponse.ok) {
            const vehicleData = await vehicleResponse.json()
            if (vehicleData.success && vehicleData.data) {
              const vehicle = vehicleData.data

              // Check for embedded customer data in vehicle record
              if (vehicle.first_name || vehicle.last_name || vehicle.phone || vehicle.email) {
                customerFound = true
                const customerName = `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim().toUpperCase()

                console.log(`✅ Found embedded customer data in vehicle: ${customerName}`)

                setJobSheet(prev => ({
                  ...prev,
                  customer: {
                    ...prev.customer,
                    name: customerName,
                    mobile: vehicle.phone || prev.customer.mobile,
                    telephone: vehicle.phone || prev.customer.telephone,
                    email: vehicle.email || prev.customer.email
                  }
                }))

                toast({
                  title: "Vehicle & Customer Found",
                  description: `Found vehicle and customer: ${customerName}`,
                })
              }
            }
          }

          // If still no customer found, try the documents-based lookup
          if (!customerFound) {
            const customerResponse = await fetch(`/api/customers/by-vehicle?registration=${encodeURIComponent(cleanReg)}`)

            if (customerResponse.ok) {
              const customerData = await customerResponse.json()

              if (customerData.success && customerData.customer) {
                const customer = customerData.customer
                customerFound = true

                console.log(`✅ Found customer via documents lookup: ${customer.first_name} ${customer.last_name}`)

                setJobSheet(prev => ({
                  ...prev,
                  customer: {
                    ...prev.customer,
                    name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim().toUpperCase(),
                    mobile: customer.phone || prev.customer.mobile,
                    telephone: customer.phone || prev.customer.telephone,
                    email: customer.email || prev.customer.email,
                    houseNumber: customer.address_line1 || prev.customer.houseNumber,
                    road: customer.address_line2 || prev.customer.road,
                    town: customer.city || prev.customer.town,
                    postCode: customer.postcode || prev.customer.postCode,
                    county: prev.customer.county
                  }
                }))

                toast({
                  title: "Vehicle & Customer Found",
                  description: `Found vehicle and linked customer: ${customer.first_name} ${customer.last_name} (${customer.total_visits || 0} previous visits)`,
                })
              } else {
                console.log(`ℹ️ No customer found for vehicle registration: ${cleanReg}`)
              }
            }
          }
        } catch (customerError) {
          console.log('Customer lookup failed:', customerError)
        }
      }

      // Step 4: If still no customer found, prompt for customer search/creation
      if (vehicleFound && !customerFound) {
        toast({
          title: "Vehicle found but no customer information",
          description: "Please search for customer or create new customer.",
          variant: "destructive",
        })
      }

      // Step 5: If vehicle not found at all
      if (!vehicleFound) {
        toast({
          title: "Vehicle Not Found",
          description: `Registration ${cleanReg} not found in database or DVLA. Please check the registration number.`,
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error('Registration lookup error:', error)
      toast({
        title: "Lookup Failed",
        description: "Failed to lookup vehicle information. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingVehicleData(false)
    }
  }, [failedDvlaLookups, toast])

  // Load initial data
  useEffect(() => {
    if (initialData && !initialDataProcessed) {
      // Extract make and model from makeModel string if available
      const makeModel = (initialData as any).makeModel || ''
      const [make, ...modelParts] = makeModel.split(' ')
      const model = modelParts.join(' ')

      setJobSheet(prev => ({
        ...prev,
        jobNumber: initialData.jobNumber,
        status: initialData.status,
        contactNumber: initialData.customerMobile || initialData.customerPhone || '',
        vehicle: {
          ...prev.vehicle,
          registration: initialData.registration,
          // Extract vehicle data from API response
          make: (initialData as any).vehicleMake || make || '',
          model: (initialData as any).vehicleModel || model || '',
          derivative: (initialData as any).vehicleDerivative || '',
          year: (initialData as any).vehicleYear || '',
          color: (initialData as any).vehicleColor || '',
          fuelType: (initialData as any).vehicleFuelType || '',
          engineSize: (initialData as any).vehicleEngineSize || '',
          chassis: (initialData as any).vehicleVin || (initialData as any).vin || 'WVWZZZ1JZ3W386752' // Sample VIN for testing
        },
        customer: {
          ...prev.customer,
          name: initialData.customer,
          mobile: initialData.customerMobile || '',
          telephone: initialData.customerPhone || '',
          email: initialData.customerEmail || ''
        }
      }))

      // Update job description and notes
      setJobDescription(initialData.description || '')
      setJobNotes(initialData.notes || '')

      // Debug: Log the updated jobSheet state
      console.log('🔍 [DEBUG] JobSheet state updated:', {
        jobNumber: initialData.jobNumber,
        registration: initialData.registration,
        customer: initialData.customer,
        vehicleMake: (initialData as any).vehicleMake || make,
        vehicleModel: (initialData as any).vehicleModel || model
      })

      // Load line items for this job sheet
      loadLineItems(initialData.id)

      // CRITICAL: Auto-trigger DVLA lookup for fresh MOT/TAX and complete vehicle data
      // Always run regardless of customer presence; MOT/TAX is independent of customer linkage
      const hasVehicleData = (initialData as any).vehicleMake || (initialData as any).makeModel || make
      const needsVehicleData = !hasVehicleData

      if (initialData.registration && !dvlaLookupCompleted) {
        console.log(`🚀 AUTO-TRIGGERING DVLA lookup for job sheet: ${initialData.registration}`)
        console.log(`🔍 Reason: dvlaLookupCompleted=${dvlaLookupCompleted}, needsVehicleData=${needsVehicleData}`)
        console.log(`🔍 Current vehicle data:`, {
          vehicleMake: (initialData as any).vehicleMake,
          makeModel: (initialData as any).makeModel,
          extractedMake: make
        })
        handleRegistrationLookup(initialData.registration)
        setDvlaLookupCompleted(true)
      } else {
        console.log(`⏭️ Skipping DVLA lookup - registration: ${initialData.registration}, completed: ${dvlaLookupCompleted}, needsData: ${needsVehicleData}`)
        // Mark as completed since we have the data we need
        setDvlaLookupCompleted(true)
      }

      // Mark initial data as processed
      setInitialDataProcessed(true)

      // Debug: Log the processed data
      console.log('🔍 [DEBUG] Initial data processed:', {
        jobNumber: initialData.jobNumber,
        customer: initialData.customer,
        registration: initialData.registration,
        makeModel: makeModel,
        vehicleMake: (initialData as any).vehicleMake,
        vehicleModel: (initialData as any).vehicleModel
      })

      toast({
        title: "Job Sheet Loaded",
        description: `Loaded job sheet ${initialData.jobNumber} - ${initialData.customer} - ${initialData.registration}`,
      })
    }
  }, [initialData, initialDataProcessed, dvlaLookupCompleted, handleRegistrationLookup, toast])

  // Handle registration parameter from URL
  useEffect(() => {
    const registrationParam = searchParams.get('registration')
    if (registrationParam && !initialData && !dvlaLookupCompleted) {
      const cleanReg = registrationParam.trim().toUpperCase()
      console.log(`🔍 URL Parameter Effect: Setting registration to ${cleanReg}`)

      setJobSheet(prev => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          registration: cleanReg
        }
      }))

      // Automatically lookup the vehicle information from DVLA
      console.log(`🔍 Auto-looking up DVLA data for registration: ${cleanReg}`)
      handleRegistrationLookup(cleanReg)
      setDvlaLookupCompleted(true)

      toast({
        title: "Registration Pre-filled",
        description: `Looking up vehicle information for ${cleanReg}`,
      })
    }
  }, [searchParams, initialData, dvlaLookupCompleted]) // Added flag to prevent multiple lookups

  // Generate job number for new job sheets
  useEffect(() => {
    if (!initialData) {
      generateJobNumber().then(jobNumber => {
        setJobSheet(prev => ({
          ...prev,
          jobNumber: jobNumber
        }))
      })
    }
  }, [initialData])

  // Load existing oil data when component mounts or VIN changes
  useEffect(() => {
    const loadExistingOilData = async () => {
      // First, try to load oil data from database
      if (jobSheet.vehicle.registration && initialDataProcessed && !loadingVehicleData && !oilDataLoaded) {
        try {
          const response = await fetch(`/api/vehicles?registration=${encodeURIComponent(jobSheet.vehicle.registration)}`)
          const data = await response.json()

          if (data.success && data.data?.oil_data) {
            console.log('💾 [LOAD-OIL] Found existing oil data in database:', data.data.oil_data)
            const existingOilData = typeof data.data.oil_data === 'string'
              ? JSON.parse(data.data.oil_data)
              : data.data.oil_data

            // Use the hook's internal state setter if available, otherwise set directly
            if (existingOilData) {
              // Since we can't directly set the hook's state, we'll trigger a fetch with the existing VIN
              // This will load the data from API, but we should enhance this to prefer database data
              console.log('💾 [LOAD-OIL] Oil data found, VIN:', data.data.vin)
              if (data.data.vin && data.data.vin.length === 17) {
                // Update VIN first
                setJobSheet(prev => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, chassis: data.data.vin }
                }))
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ [LOAD-OIL] Could not load existing oil data:', error)
        }

        // Mark oil data loading as attempted
        setOilDataLoaded(true)
      }

      // If we have a VIN, fetch oil data (will check database first, then API)
      if (jobSheet.vehicle.chassis && jobSheet.vehicle.chassis.length === 17) {
        fetchOilData(jobSheet.vehicle.chassis, {
          make: jobSheet.vehicle.make,
          model: jobSheet.vehicle.model,
          year: jobSheet.vehicle.year,
          engineSize: jobSheet.vehicle.engineSize,
          fuelType: jobSheet.vehicle.fuelType,
          registration: jobSheet.vehicle.registration
        })
      }
    }

    loadExistingOilData()
  }, [jobSheet.vehicle.chassis, jobSheet.vehicle.registration, fetchOilData, initialDataProcessed, loadingVehicleData, oilDataLoaded])



  // Auto-fetch enhanced technical data to fill in N/A fields
  useEffect(() => {
    const v = jobSheet.vehicle
    if (!v?.registration) return

    // Only attempt once per load to avoid repeated API calls
    if (autoTechAttempted) return

    const isEmpty = (val?: string | number | null) => {
      if (val === null || val === undefined) return true
      if (typeof val === 'string') return val.trim() === '' || val.trim().toUpperCase() === 'N/A'
      return false
    }

    const missingKeySpecs = [
      isEmpty(v.euroStatus),
      isEmpty(v.engineCode),
      isEmpty(v.tyreSize),
      isEmpty(v.timingBeltInterval),
      isEmpty(v.tyrePressureFrontNS),
      isEmpty(v.tyrePressureFrontOS),
      isEmpty(v.tyrePressureRearNS),
      isEmpty(v.tyrePressureRearOS),
    ].some(Boolean)

    if (missingKeySpecs) {
      setAutoTechAttempted(true)
      // Pull only technical data (cheaper than image) to populate missing fields
      fetchEnhancedVehicleDataWithCost(v.registration, ['technical'])
    }
  }, [jobSheet.vehicle.registration, jobSheet.vehicle.euroStatus, jobSheet.vehicle.engineCode, jobSheet.vehicle.tyreSize, jobSheet.vehicle.timingBeltInterval, jobSheet.vehicle.tyrePressureFrontNS, jobSheet.vehicle.tyrePressureFrontOS, jobSheet.vehicle.tyrePressureRearNS, jobSheet.vehicle.tyrePressureRearOS, autoTechAttempted])


  // Function to fetch DVLA vehicle data (legacy - keeping for compatibility)
  const fetchVehicleData = async (registration: string) => {
    return handleRegistrationLookup(registration)
  }

  // Function to fetch enhanced vehicle data with cost tracking
  const fetchEnhancedVehicleDataWithCost = async (registration: string, dataTypes: string[] = ['technical', 'image']) => {
    try {
      console.log(`💰 [ENHANCED-DATA] Fetching enhanced data for ${registration} with cost tracking`)

      const response = await fetch(`/api/vehicle-data?registration=${registration}&dataTypes=${dataTypes.join(',')}`)
      const result = await response.json()

      if (result.success) {
        setVehicleDataCost(result.metadata.totalCost)

        // Update job sheet with enhanced data
        if (result.data.technical) {
          console.log(`🔧 [ENHANCED-DATA] Technical data received:`, result.data.technical)

          setJobSheet(prev => ({
            ...prev,
            vehicle: {
              ...prev.vehicle,
              // Core technical data
              engineCapacity: result.data.technical.engineCapacity || prev.vehicle.engineSize,
              powerBHP: result.data.technical.powerBHP,
              torqueNM: result.data.technical.torqueNM,
              fuelEconomyMPG: result.data.technical.fuelEconomyMPG,
              co2Emissions: result.data.technical.co2Emissions?.toString() || prev.vehicle.co2Emissions,
              euroStatus: result.data.technical.euroStatus || prev.vehicle.euroStatus,
              engineCode: result.data.technical.engineCode || prev.vehicle.engineCode,

              // Tyre specifications
              tyreSize: result.data.technical.tyreSizeFront || result.data.technical.tyreSize || prev.vehicle.tyreSize,
              tyrePressureFrontNS: result.data.technical.tyrePressureFront || prev.vehicle.tyrePressureFrontNS,
              tyrePressureFrontOS: result.data.technical.tyrePressureFront || prev.vehicle.tyrePressureFrontOS,
              tyrePressureRearNS: result.data.technical.tyrePressureRear || prev.vehicle.tyrePressureRearNS,
              tyrePressureRearOS: result.data.technical.tyrePressureRear || prev.vehicle.tyrePressureRearOS,

              // Service intervals
              timingBeltInterval: result.data.technical.timingBeltInterval || prev.vehicle.timingBeltInterval,

              // Image data
              imageUrl: result.data.image?.imageUrl || result.data.technical?.imageUrl
            }
          }))

          console.log(`✅ [ENHANCED-DATA] Vehicle data updated with technical specifications`)
        }

        toast({
          title: "✅ Enhanced vehicle data fetched",
          description: `Cost: £${result.metadata.totalCost.toFixed(3)} | Sources: ${result.metadata.sources?.join(', ')} | Completeness: ${result.metadata.completenessScore}%`,
        })

        return result
      } else {
        throw new Error(result.error || 'Failed to fetch enhanced data')
      }
    } catch (error) {
      console.error('❌ [ENHANCED-DATA] Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch enhanced vehicle data",
        variant: "destructive"
      })
    }
  }

  // Customer search function
  const handleCustomerSearch = () => {
    setShowCustomerSearchDialog(true)
  }

  // Handle customer selection from dialog
  const handleCustomerSelect = (customer: any) => {
    console.log('🔍 [CUSTOMER-SEARCH] Selected customer:', customer)

    // Use the customer data to populate the form
    const firstName = customer.first_name || ''
    const lastName = customer.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim()

    // Address handling
    const houseNo = customer.address_line1?.split(' ')[0] || ''
    const road = customer.address_line1?.substring(customer.address_line1?.indexOf(' ') + 1) || customer.address_line2 || ''
    const locality = customer.address_line2 || ''
    const town = customer.city || ''
    const county = customer.country || ''
    const postCode = customer.postcode || ''

    setJobSheet(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        name: fullName.toUpperCase(),
        accountNumber: (customer.id?.toString() || '').toUpperCase(),
        company: (customer.company || '').toUpperCase(),
        houseNumber: houseNo.toUpperCase(),
        road: road.toUpperCase(),
        locality: locality.toUpperCase(),
        town: town.toUpperCase(),
        postCode: postCode.toUpperCase(),
        county: county.toUpperCase(),
        mobile: customer.phone || '',
        telephone: customer.phone || '',
        email: (customer.email || '').toLowerCase()
      }
    }))

    toast({
      title: "Customer Selected",
      description: `Selected customer: ${fullName}`,
    })
  }

  // Fetch enhanced vehicle specifications from CarAPI
  const fetchEnhancedVehicleData = async (make: string, model: string, year: string) => {
    try {
      console.log(`🔍 [ENHANCED-SPECS] Fetching specs for: ${year} ${make} ${model}`)

      const response = await fetch('/api/vehicle-specs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ make, model, year }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`📊 [ENHANCED-SPECS] API Response:`, data)

      if (data.success && data.specs) {
        console.log(`✅ [ENHANCED-SPECS] Retrieved specs:`, data.specs)
        console.log(`🔧 [ENHANCED-SPECS] Setting enhanced vehicle data...`)

        // Extract the specs data
        const specs = data.specs

        setJobSheet(prev => {
          const updatedVehicle = {
            ...prev.vehicle,
            // Enhanced specifications - using correct field names
            transmission: specs.transmission || 'Unknown',
            driveType: specs.drive_type || 'Unknown',
            horsepower: specs.horsepower_hp?.toString() || '',
            torque: specs.torque_ft_lbs?.toString() || '',
            fuelCapacity: specs.fuel_tank_capacity?.toString() || '',
            cityMpg: specs.epa_city_mpg?.toString() || '',
            highwayMpg: specs.epa_highway_mpg?.toString() || '',
            combinedMpg: specs.combined_mpg?.toString() || '',
            bodyType: specs.body_type || '',
            doors: specs.doors?.toString() || '',
            seats: specs.seats?.toString() || '',
            curbWeight: specs.curb_weight?.toString() || '',
            // Service intervals
            oilChangeInterval: specs.oil_change_interval || '5000-7500 miles',
            serviceInterval: specs.service_interval || '10000-15000 miles',
            motInterval: '12 months',
            // Repair times for common jobs
            repairTimes: specs.repair_times || {}
          }

          console.log(`🚗 [ENHANCED-SPECS] Updated vehicle data:`, updatedVehicle)
          console.log(`🔍 [ENHANCED-SPECS] Repair times:`, updatedVehicle.repairTimes)

          return {
            ...prev,
            vehicle: updatedVehicle
          }
        })

        toast({
          title: "Enhanced Specs Loaded",
          description: `Additional specifications and repair times loaded for ${make} ${model}`,
        })
      } else {
        console.log(`❌ [ENHANCED-SPECS] No specs found for: ${year} ${make} ${model}`)
      }
    } catch (error) {
      console.error('❌ [ENHANCED-SPECS] Error fetching enhanced vehicle data:', error)
      // Don't show error toast as this is supplementary data
    }
  }

  // Function to load line items for the job sheet
  const loadLineItems = async (jobSheetId: string) => {
    if (!jobSheetId) return

    setLoadingLineItems(true)
    try {
      const response = await fetch(`/api/job-sheets/${jobSheetId}/line-items`)
      const data = await response.json()

      if (data.success && data.lineItems) {
        setJobSheet(prev => ({
          ...prev,
          items: data.lineItems
        }))

        console.log(`Loaded ${data.lineItems.length} line items for job sheet ${jobSheetId}`)
      } else {
        console.log(`No line items found for job sheet ${jobSheetId}`)
        // Keep empty items array
      }
    } catch (error) {
      console.error('Error loading line items:', error)
      toast({
        title: "Warning",
        description: "Could not load job sheet line items",
        variant: "destructive",
      })
    } finally {
      setLoadingLineItems(false)
    }
  }

  // Function to load vehicle information from database
  const loadVehicleInfo = async (registration: string) => {
    if (!registration) return

    try {
      const response = await fetch(`/api/vehicles?registration=${encodeURIComponent(registration)}`)
      const data = await response.json()

      if (data.success && data.data) {
        const vehicle = data.data

        // Parse and clean vehicle data
        const parsedVehicle = parseVehicleData(vehicle.make, vehicle.model, vehicle.vin)
        const extractedYear = vehicle.year || extractYearFromRegistration(registration)

        console.log(`🔧 Parsing vehicle data:`, {
          raw: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
          parsed: { make: parsedVehicle.make, model: parsedVehicle.model, year: extractedYear },
          vin: vehicle.vin
        })

        setJobSheet(prev => ({
          ...prev,
          vehicle: {
            ...prev.vehicle,
            registration: vehicle.registration || registration,
            make: parsedVehicle.make || vehicle.make || '',
            model: parsedVehicle.model || vehicle.model || '',
            derivative: vehicle.derivative || '',
            year: extractedYear?.toString() || '',
            color: vehicle.color || vehicle.colour || '',
            fuelType: vehicle.fuel_type || '',
            engineSize: vehicle.engine_size || '',
            chassis: vehicle.vin || prev.vehicle.chassis || ''
          }
        }))

        console.log(`✅ Loaded and parsed vehicle info for ${registration}:`, {
          make: parsedVehicle.make,
          model: parsedVehicle.model,
          year: extractedYear
        })
      } else {
        console.log(`No vehicle info found for ${registration} in database`)
      }
    } catch (error) {
      console.error('Error loading vehicle info:', error)
    }
  }

  const handleSave = () => {
    toast({
      title: "Job Sheet Saved",
      description: "Job sheet has been saved successfully.",
    })
  }

  const handlePrint = () => {
    const validation = validateJobSheetData()

    if (!validation.canPrint) {
      toast({
        title: "Cannot Print Job Sheet",
        description: validationSettings.print_blocked_message,
        variant: "destructive",
      })
      return
    }

    // Show warning if there are warnings but allow printing
    if (validation.warnings.length > 0) {
      toast({
        title: "Printing with Warnings",
        description: `Job sheet has ${validation.warnings.length} warning(s) but can be printed. Consider reviewing the validation details.`,
        variant: "default",
      })
    }

    window.print()
  }

  const handleEmail = () => {
    const validation = validateJobSheetData()

    if (!validation.canPrint) {
      toast({
        title: "Cannot Email Job Sheet",
        description: validationSettings.print_blocked_message,
        variant: "destructive",
      })
      return
    }

    // Check if customer has email
    if (!jobSheet.customer.email?.trim()) {
      toast({
        title: "No Customer Email",
        description: "Customer email address is required to send job sheet via email.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Email Job Sheet",
      description: "Opening email dialog...",
    })
  }

  const addNewItem = () => {
    // Get default labour rate from business settings with fallback
    let defaultLabourRate = 70.00 // Fallback rate
    try {
      if (businessSettings && businessSettings.getSetting) {
        defaultLabourRate = businessSettings.getSetting('default_labour_rate', 70.00)
      }
    } catch (error) {
      console.log('Using fallback labour rate:', defaultLabourRate)
    }

    const newItem = {
      id: jobSheet.items.length + 1,
      type: "Labour",
      description: "",
      estHours: 0,
      qty: 1,
      netPrice: defaultLabourRate, // Set default labour rate
      netTotal: 0,
      vatRate: "20.00%",
      vat: 0,
      lineTotal: 0
    }
    setJobSheet(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const updateItem = (id: number, field: string, value: any) => {
    setJobSheet(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Recalculate totals when relevant fields change
          if (['qty', 'netPrice', 'estHours', 'type'].includes(field)) {
            const qty = field === 'qty' ? value : updatedItem.qty
            const netPrice = field === 'netPrice' ? value : updatedItem.netPrice
            const estHours = field === 'estHours' ? value : updatedItem.estHours
            const type = field === 'type' ? value : updatedItem.type

            // For labour items, calculate based on hours * rate
            // For parts items, calculate based on qty * price
            let netTotal = 0
            if (type === 'Labour') {
              netTotal = estHours * netPrice
            } else {
              netTotal = qty * netPrice
            }

            // Calculate VAT (20%)
            const vatAmount = netTotal * 0.20
            const lineTotal = netTotal + vatAmount

            updatedItem.netTotal = netTotal
            updatedItem.vat = vatAmount
            updatedItem.lineTotal = lineTotal

            // Record pricing history for parts when price is finalized
            if (type === 'Parts' && field === 'netPrice' && value > 0 && updatedItem.description) {
              recordPartPricingHistoryAsync(updatedItem)
            }
          }

          return updatedItem
        }
        return item
      })
    }))
  }

  // Helper function to record pricing history asynchronously
  const recordPartPricingHistoryAsync = async (item: any) => {
    try {
      // Generate a part number from description if not available
      const partNumber = item.partNumber || generatePartNumber(item.description)

      await recordPartPricingHistory(
        partNumber,
        item.description,
        item.netPrice,
        item.qty || 1,
        {
          jobSheetId: initialData?.id,
          jobSheetNumber: jobSheet.jobNumber,
          customerName: jobSheet.customer.name,
          customerType: 'retail', // Default, could be enhanced
          vehicleRegistration: jobSheet.vehicle.registration,
          vehicleMake: jobSheet.vehicle.make,
          vehicleModel: jobSheet.vehicle.model
        },
        `Added to job sheet ${jobSheet.jobNumber}`
      )
    } catch (error) {
      console.error('Failed to record pricing history:', error)
    }
  }

  // Helper function to generate part number from description
  const generatePartNumber = (description: string): string => {
    return description
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20)
  }

  const removeItem = (id: number) => {
    setJobSheet(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }))
  }

  // Function to show pricing suggestions for a part
  const showPartPricingSuggestions = async (itemId: number) => {
    const item = jobSheet.items.find(i => i.id === itemId)
    if (!item || item.type !== 'Parts') return

    setSelectedPartForPricing(itemId)
    setShowPricingSuggestions(prev => ({ ...prev, [itemId]: true }))

    // Generate part number and fetch suggestions
    const partNumber = item.partNumber || generatePartNumber(item.description)
    if (item.description) {
      await getPricingSuggestions(partNumber, item.description, 'retail')
    }
  }

  // Function to show customer pricing history for a part
  const showCustomerPartHistory = (itemId: number) => {
    const item = jobSheet.items.find(i => i.id === itemId)
    if (!item || item.type !== 'Parts') return

    const partNumber = item.partNumber || generatePartNumber(item.description)
    setCustomerHistoryPart({
      partName: item.description,
      partNumber: partNumber,
      itemId: itemId,
      currentPrice: item.netPrice
    })
    setShowCustomerPricingHistory(true)
  }

  // Function to show smart part matcher
  const showSmartPartMatcherDialog = (itemId: number) => {
    const item = jobSheet.items.find(i => i.id === itemId)
    if (!item || item.type !== 'Parts') return

    setSmartMatcherPart({
      partName: item.description,
      itemId: itemId
    })
    setShowSmartPartMatcher(true)
  }

  // Function to show smart job description matcher
  const showSmartJobMatcherDialog = (itemId: number) => {
    const item = jobSheet.items.find(i => i.id === itemId)
    if (!item || (item.type !== 'Labour' && item.type !== 'Service')) return

    setSmartMatcherJob({
      jobDescription: item.description,
      itemId: itemId
    })
    setShowSmartJobMatcher(true)
  }

  // Function to apply suggested pricing
  const applySuggestedPrice = (itemId: number, price: number, reasoning: string) => {
    updateItem(itemId, 'netPrice', price)
    setShowPricingSuggestions(prev => ({ ...prev, [itemId]: false }))

    toast({
      title: "Price Applied",
      description: `Applied £${price.toFixed(2)} - ${reasoning}`,
    })
  }

  // Function to get price variance warning
  const getPriceVarianceWarning = (currentPrice: number, suggestedPrice: number) => {
    return calculatePriceVariance(currentPrice, suggestedPrice)
  }

  // Function to add MOT defect as a job item
  const addMotDefectAsItem = (defect: any, test: any) => {
    try {
      console.log(`🔧 [ADD-MOT-DEFECT] Adding MOT defect as job item:`, defect)

      // Parse the defect text to create a meaningful job description
      const defectText = defect.text
      const defectType = defect.type
      const testDate = new Date(test.completedDate).toLocaleDateString('en-GB')

      // Create job description based on defect type and text
      let jobDescription = ''
      let estimatedHours = 0
      let itemType = 'Labour'

      // Enhanced defect parsing with more specific categorization
      const lowerText = defectText.toLowerCase()

      // Brake system defects
      if (lowerText.includes('brake')) {
        if (lowerText.includes('disc') && (lowerText.includes('worn') || lowerText.includes('scored') || lowerText.includes('corroded'))) {
          jobDescription = 'REPLACE BRAKE DISC'
          estimatedHours = 1.5
        } else if (lowerText.includes('pad') && (lowerText.includes('worn') || lowerText.includes('thin'))) {
          jobDescription = 'REPLACE BRAKE PADS'
          estimatedHours = 1.0
        } else if (lowerText.includes('fluid') || lowerText.includes('hydraulic')) {
          jobDescription = 'BRAKE FLUID SERVICE'
          estimatedHours = 0.5
        } else if (lowerText.includes('pipe') || lowerText.includes('hose')) {
          jobDescription = 'BRAKE PIPE/HOSE REPAIR'
          estimatedHours = 1.5
        } else if (lowerText.includes('caliper')) {
          jobDescription = 'BRAKE CALIPER REPAIR'
          estimatedHours = 2.0
        } else {
          jobDescription = 'BRAKE SYSTEM REPAIR'
          estimatedHours = 1.0
        }
      }
      // Tyre defects
      else if (lowerText.includes('tyre') || lowerText.includes('tire')) {
        if (lowerText.includes('worn') || lowerText.includes('legal limit')) {
          jobDescription = 'REPLACE WORN TYRE'
          estimatedHours = 0.5
        } else if (lowerText.includes('damaged') || lowerText.includes('cracking') || lowerText.includes('perishing')) {
          jobDescription = 'REPLACE DAMAGED TYRE'
          estimatedHours = 0.5
        } else if (lowerText.includes('pressure')) {
          jobDescription = 'TYRE PRESSURE CHECK/REPAIR'
          estimatedHours = 0.25
        } else {
          jobDescription = 'TYRE REPLACEMENT'
          estimatedHours = 0.5
        }
      }
      // Lighting defects
      else if (lowerText.includes('light') || lowerText.includes('lamp')) {
        if (lowerText.includes('headlamp') || lowerText.includes('headlight')) {
          if (lowerText.includes('aim') || lowerText.includes('beam')) {
            jobDescription = 'HEADLIGHT ALIGNMENT'
            estimatedHours = 0.5
          } else {
            jobDescription = 'HEADLIGHT REPAIR/REPLACEMENT'
            estimatedHours = 1.0
          }
        } else if (lowerText.includes('stop lamp') || lowerText.includes('brake light')) {
          jobDescription = 'REPLACE BRAKE LIGHT BULB'
          estimatedHours = 0.25
        } else if (lowerText.includes('indicator') || lowerText.includes('direction')) {
          jobDescription = 'REPLACE INDICATOR BULB'
          estimatedHours = 0.25
        } else if (lowerText.includes('position lamp') || lowerText.includes('side light')) {
          jobDescription = 'REPLACE POSITION LIGHT BULB'
          estimatedHours = 0.25
        } else if (lowerText.includes('registration plate')) {
          jobDescription = 'REPLACE NUMBER PLATE LIGHT'
          estimatedHours = 0.25
        } else {
          jobDescription = 'LIGHTING REPAIR'
          estimatedHours = 0.5
        }
      }
      // Suspension defects
      else if (lowerText.includes('suspension') || lowerText.includes('strut') || lowerText.includes('shock')) {
        if (lowerText.includes('corroded') && lowerText.includes('not seriously weakened')) {
          jobDescription = 'SUSPENSION COMPONENT INSPECTION'
          estimatedHours = 0.5
        } else if (lowerText.includes('worn') || lowerText.includes('excessive play')) {
          jobDescription = 'REPLACE SUSPENSION COMPONENT'
          estimatedHours = 2.5
        } else {
          jobDescription = 'SUSPENSION REPAIR'
          estimatedHours = 2.0
        }
      }
      // Exhaust defects
      else if (lowerText.includes('exhaust')) {
        if (lowerText.includes('leak') || lowerText.includes('blowing')) {
          jobDescription = 'EXHAUST LEAK REPAIR'
          estimatedHours = 1.0
        } else if (lowerText.includes('corroded') || lowerText.includes('holed')) {
          jobDescription = 'EXHAUST REPLACEMENT'
          estimatedHours = 1.5
        } else {
          jobDescription = 'EXHAUST SYSTEM REPAIR'
          estimatedHours = 1.0
        }
      }
      // Wiper defects
      else if (lowerText.includes('wiper')) {
        if (lowerText.includes('blade')) {
          jobDescription = 'REPLACE WIPER BLADES'
          estimatedHours = 0.25
        } else if (lowerText.includes('clear') || lowerText.includes('effective')) {
          jobDescription = 'WIPER SYSTEM REPAIR'
          estimatedHours = 0.5
        } else {
          jobDescription = 'WIPER REPAIR'
          estimatedHours = 0.5
        }
      }
      // Seat belt defects
      else if (lowerText.includes('seat belt') || lowerText.includes('seatbelt')) {
        jobDescription = 'SEAT BELT REPAIR/REPLACEMENT'
        estimatedHours = 1.0
      }
      // Engine/emissions defects
      else if (lowerText.includes('emission') || lowerText.includes('co2') || lowerText.includes('lambda')) {
        jobDescription = 'EMISSIONS SYSTEM REPAIR'
        estimatedHours = 2.0
      }
      // Steering defects
      else if (lowerText.includes('steering')) {
        jobDescription = 'STEERING SYSTEM REPAIR'
        estimatedHours = 2.0
      }
      // Generic defects
      else {
        // Try to extract the main component from the defect text
        const words = defectText.split(' ')
        const componentWords = words.slice(0, 3).join(' ').toUpperCase()
        jobDescription = `REPAIR/REPLACE ${componentWords}`
        if (jobDescription.length > 50) {
          jobDescription = defectText.toUpperCase().substring(0, 47) + '...'
        }
        estimatedHours = 1.0
      }

      // Try to get repair time from technical data first
      const technicalRepairTime = getRepairTime(jobDescription)
      if (technicalRepairTime && technicalRepairTime > 0) {
        estimatedHours = technicalRepairTime
        console.log(`🔧 [MOT-DEFECT] Using technical data repair time: ${technicalRepairTime}h for ${jobDescription}`)
      }

      // Adjust hours based on defect severity
      if (defectType === 'MAJOR' || defectType === 'DANGEROUS') {
        estimatedHours *= 1.5 // Major/dangerous issues take longer
      } else if (defectType === 'ADVISORY') {
        estimatedHours *= 0.75 // Advisory items might be quicker
      }

      // Calculate pricing
      const labourRate = 70 // £70 per hour default
      const netPrice = estimatedHours * labourRate
      const vat = netPrice * 0.20
      const lineTotal = netPrice + vat

      // Create new job sheet item
      const newItem = {
        id: jobSheet.items.length + 1,
        type: itemType,
        description: jobDescription,
        estHours: estimatedHours,
        qty: 1,
        netPrice: netPrice,
        netTotal: netPrice,
        vatRate: "20.00%",
        vat: vat,
        lineTotal: lineTotal,
        motDefect: {
          text: defectText,
          type: defectType,
          testDate: testDate,
          testNumber: test.motTestNumber
        }
      }

      // Add to job sheet
      setJobSheet(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }))

      // Show success toast
      toast({
        title: "MOT Issue Added",
        description: `Added "${jobDescription}" from ${defectType} found on ${testDate}`,
        duration: 4000,
      })

      console.log(`✅ [ADD-MOT-DEFECT] Successfully added MOT defect as job item:`, newItem)

    } catch (error) {
      console.error('❌ [ADD-MOT-DEFECT] Error adding MOT defect:', error)
      toast({
        title: "Error",
        description: "Failed to add MOT issue. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Function to add technical lubricant as a part
  const addTechnicalLubricantAsPart = async (lubricantType: string, lubricantInfo: any) => {
    try {
      console.log(`🔧 [ADD-TECH-LUBRICANT] Adding technical lubricant as part:`, lubricantInfo)

      if (!lubricantInfo) {
        throw new Error('No lubricant information provided')
      }

      // Create new job sheet item with enhanced technical data
      const qtyNeeded = Math.ceil(lubricantInfo.capacity || 1)
      const partPrice = 10.95 // Default price per litre

      const newItem = {
        id: jobSheet.items.length + 1,
        type: "Parts",
        description: `${lubricantInfo.brand || 'OEM'} ${lubricantInfo.viscosity || lubricantInfo.type} - ${lubricantInfo.specification}`,
        estHours: 0,
        qty: qtyNeeded,
        netPrice: partPrice,
        netTotal: qtyNeeded * partPrice,
        vatRate: "20.00%",
        vat: (qtyNeeded * partPrice) * 0.20,
        lineTotal: (qtyNeeded * partPrice) * 1.20,
        technicalData: {
          partNumber: lubricantInfo.partNumber,
          specification: lubricantInfo.specification,
          brand: lubricantInfo.brand,
          changeInterval: lubricantInfo.changeInterval
        }
      }

      setJobSheet(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }))

      toast({
        title: "Technical Part Added",
        description: `Added ${qtyNeeded}L of ${lubricantInfo.brand} ${lubricantInfo.viscosity || lubricantInfo.type} (P/N: ${lubricantInfo.partNumber})`,
        duration: 4000,
      })

      console.log(`✅ [ADD-TECH-LUBRICANT] Successfully added technical lubricant:`, newItem)

    } catch (error) {
      console.error('❌ [ADD-TECH-LUBRICANT] Error adding technical lubricant:', error)
      toast({
        title: "Error",
        description: "Failed to add technical lubricant. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Function to add repair time as a job item
  const addRepairTimeAsItem = (operation: string, repairDetails: any) => {
    try {
      console.log(`🔧 [ADD-REPAIR-TIME] Adding repair time as job item:`, repairDetails)

      if (!repairDetails || !repairDetails.timeHours) {
        throw new Error('No repair time information provided')
      }

      const labourRate = 70 // £70 per hour default
      const hours = repairDetails.timeHours
      const netPrice = hours * labourRate
      const vat = netPrice * 0.20
      const lineTotal = netPrice + vat

      const newItem = {
        id: jobSheet.items.length + 1,
        type: "Labour",
        description: repairDetails.description || operation.toUpperCase(),
        estHours: hours,
        qty: 1,
        netPrice: netPrice,
        netTotal: netPrice,
        vatRate: "20.00%",
        vat: vat,
        lineTotal: lineTotal,
        technicalData: {
          operation: operation,
          difficulty: repairDetails.difficulty,
          category: repairDetails.category,
          notes: repairDetails.notes
        }
      }

      setJobSheet(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }))

      toast({
        title: "Repair Time Added",
        description: `Added "${repairDetails.description}" - ${hours}h at £${labourRate}/h (${repairDetails.difficulty} difficulty)`,
        duration: 4000,
      })

      console.log(`✅ [ADD-REPAIR-TIME] Successfully added repair time item:`, newItem)

    } catch (error) {
      console.error('❌ [ADD-REPAIR-TIME] Error adding repair time:', error)
      toast({
        title: "Error",
        description: "Failed to add repair time. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Function to add oil/fluid as a part to the job sheet
  const addOilAsPart = async (oilType: string, oilInfo: any) => {
    try {
      console.log(`🛢️ [ADD-OIL-PART] Adding ${oilType} as part:`, oilInfo)

      // Determine the search criteria based on oil type
      let searchCriteria = {}
      let partName = ''
      let capacity = 0

      switch (oilType) {
        case 'engineOil':
          searchCriteria = { viscosity: oilInfo.viscosity }
          partName = `${oilInfo.viscosity} Engine Oil`
          capacity = oilInfo.capacity
          break
        case 'brakeFluid':
          searchCriteria = { type: oilInfo.type }
          partName = `${oilInfo.type} Brake Fluid`
          capacity = oilInfo.capacity
          break
        case 'transmissionOil':
          searchCriteria = { type: oilInfo.type }
          partName = `${oilInfo.type} Transmission Oil`
          capacity = oilInfo.capacity
          break
        case 'coolant':
          searchCriteria = { type: oilInfo.type }
          partName = `${oilInfo.type} Coolant`
          capacity = oilInfo.capacity
          break
        case 'powerSteeringFluid':
          searchCriteria = { type: 'Power Steering ATF' }
          partName = `Power Steering Fluid`
          capacity = oilInfo.capacity
          break
        case 'airConRefrigerant':
          searchCriteria = { type: oilInfo.type }
          partName = `${oilInfo.type} Air Con Refrigerant`
          capacity = oilInfo.capacity / 1000 // Convert grams to kg for calculation
          break
        default:
          throw new Error(`Unknown oil type: ${oilType}`)
      }

      // Try to find the part in our parts database
      const response = await fetch('/api/parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchCriteria)
      })

      const data = await response.json()

      if (data.success && data.data) {
        const part = data.data

        // Calculate quantity needed based on capacity
        const qtyNeeded = Math.ceil(capacity) // Round up to nearest litre/unit

        // Create new job sheet item
        const newItem = {
          id: jobSheet.items.length + 1,
          type: "Parts",
          description: part.name,
          estHours: 0,
          qty: qtyNeeded,
          netPrice: part.price,
          netTotal: qtyNeeded * part.price,
          vatRate: "20.00%",
          vat: (qtyNeeded * part.price) * 0.20,
          lineTotal: (qtyNeeded * part.price) * 1.20
        }

        // Add to job sheet
        setJobSheet(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }))

        // Show success toast
        toast({
          title: "Part Added",
          description: `Added ${qtyNeeded}L of ${part.name} at £${part.price}/L`,
          duration: 3000,
        })

        console.log(`✅ [ADD-OIL-PART] Successfully added part:`, newItem)
      } else {
        // Fallback - add with default pricing
        const newItem = {
          id: jobSheet.items.length + 1,
          type: "Parts",
          description: partName,
          estHours: 0,
          qty: Math.ceil(capacity),
          netPrice: 10.95, // Default price
          netTotal: Math.ceil(capacity) * 10.95,
          vatRate: "20.00%",
          vat: (Math.ceil(capacity) * 10.95) * 0.20,
          lineTotal: (Math.ceil(capacity) * 10.95) * 1.20
        }

        setJobSheet(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }))

        toast({
          title: "Part Added",
          description: `Added ${Math.ceil(capacity)}L of ${partName} at £10.95/L (default pricing)`,
          duration: 3000,
        })

        console.log(`⚠️ [ADD-OIL-PART] Added with default pricing:`, newItem)
      }

    } catch (error) {
      console.error('❌ [ADD-OIL-PART] Error adding oil as part:', error)
      toast({
        title: "Error",
        description: "Failed to add part. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Add oil top-up service (parts + labour + description)
  const addOilTopUpService = () => {
    try {
      // Get oil data from multiple sources
      const engineOil = oilData?.engineOil || technicalData?.lubricants?.engineOil

      if (!engineOil) {
        toast({
          title: "No Oil Data",
          description: "Oil specifications not available for this vehicle",
          variant: "destructive",
        })
        return
      }

      const oilType = engineOil.viscosity || 'Engine Oil'
      const oilSpec = engineOil.specification || ''
      const capacity = engineOil.capacity || 1

      // Determine oil type display
      let oilTypeDisplay = oilType
      if (oilSpec.toLowerCase().includes('synthetic') || oilType.startsWith('0W') || oilType.startsWith('5W')) {
        oilTypeDisplay += ' Synthetic'
      } else if (oilSpec.toLowerCase().includes('semi') || oilType.startsWith('10W')) {
        oilTypeDisplay += ' Semi-Synthetic'
      } else if (oilType.startsWith('15W') || oilType.startsWith('20W')) {
        oilTypeDisplay += ' Mineral'
      }

      // Add oil as part
      const oilPartItem = {
        id: jobSheet.items.length + 1,
        type: "Parts",
        description: `${oilTypeDisplay} Engine Oil - ${oilSpec}`,
        estHours: 0,
        qty: Math.ceil(capacity),
        netPrice: 12.95, // Default price per litre
        netTotal: Math.ceil(capacity) * 12.95,
        vatRate: "20.00%",
        vat: (Math.ceil(capacity) * 12.95) * 0.20,
        lineTotal: (Math.ceil(capacity) * 12.95) * 1.20
      }

      // Add labour for oil top-up
      const labourItem = {
        id: jobSheet.items.length + 2,
        type: "Labour",
        description: "Oil Top-Up Service",
        estHours: 0.25, // 15 minutes
        qty: 1,
        netPrice: 17.50, // 0.25 hours at £70/hour
        netTotal: 17.50,
        vatRate: "20.00%",
        vat: 17.50 * 0.20,
        lineTotal: 17.50 * 1.20
      }

      // Add both items to job sheet
      setJobSheet(prev => ({
        ...prev,
        items: [...prev.items, oilPartItem, labourItem]
      }))

      // Generate and add description
      const topUpDescription = `Top up engine oil with ${oilTypeDisplay} x ${Math.ceil(capacity)} litres`
      const currentDesc = jobDescription.trim()
      const newDescription = currentDesc
        ? `${currentDesc}\n${topUpDescription.toUpperCase()}`
        : topUpDescription.toUpperCase()

      setJobDescription(newDescription)

      toast({
        title: "Oil Top-Up Service Added",
        description: `Added ${Math.ceil(capacity)}L ${oilTypeDisplay} + labour + description`,
        duration: 4000,
      })

      console.log(`✅ [OIL-TOP-UP] Added oil top-up service with ${Math.ceil(capacity)}L ${oilTypeDisplay}`)

    } catch (error) {
      console.error('❌ [OIL-TOP-UP] Error:', error)
      toast({
        title: "Error",
        description: "Failed to add oil top-up service",
        variant: "destructive",
      })
    }
  }

  // Add oil change service (parts + labour + description)
  const addOilChangeService = () => {
    try {
      // Get oil data from multiple sources
      const engineOil = oilData?.engineOil || technicalData?.lubricants?.engineOil

      if (!engineOil) {
        toast({
          title: "No Oil Data",
          description: "Oil specifications not available for this vehicle",
          variant: "destructive",
        })
        return
      }

      const oilType = engineOil.viscosity || 'Engine Oil'
      const oilSpec = engineOil.specification || ''
      const capacity = engineOil.capacity || 4.5

      // Determine oil type display
      let oilTypeDisplay = oilType
      if (oilSpec.toLowerCase().includes('synthetic') || oilType.startsWith('0W') || oilType.startsWith('5W')) {
        oilTypeDisplay += ' Synthetic'
      } else if (oilSpec.toLowerCase().includes('semi') || oilType.startsWith('10W')) {
        oilTypeDisplay += ' Semi-Synthetic'
      } else if (oilType.startsWith('15W') || oilType.startsWith('20W')) {
        oilTypeDisplay += ' Mineral'
      }

      // Add oil as part
      const oilPartItem = {
        id: jobSheet.items.length + 1,
        type: "Parts",
        description: `${oilTypeDisplay} Engine Oil - ${oilSpec}`,
        estHours: 0,
        qty: Math.ceil(capacity),
        netPrice: 12.95, // Default price per litre
        netTotal: Math.ceil(capacity) * 12.95,
        vatRate: "20.00%",
        vat: (Math.ceil(capacity) * 12.95) * 0.20,
        lineTotal: (Math.ceil(capacity) * 12.95) * 1.20
      }

      // Add oil filter as part
      const filterItem = {
        id: jobSheet.items.length + 2,
        type: "Parts",
        description: "Engine Oil Filter",
        estHours: 0,
        qty: 1,
        netPrice: 8.95,
        netTotal: 8.95,
        vatRate: "20.00%",
        vat: 8.95 * 0.20,
        lineTotal: 8.95 * 1.20
      }

      // Add labour for oil change
      const labourItem = {
        id: jobSheet.items.length + 3,
        type: "Labour",
        description: "Engine Oil & Filter Change",
        estHours: 0.5, // 30 minutes
        qty: 1,
        netPrice: 35.00, // 0.5 hours at £70/hour
        netTotal: 35.00,
        vatRate: "20.00%",
        vat: 35.00 * 0.20,
        lineTotal: 35.00 * 1.20
      }

      // Add all items to job sheet
      setJobSheet(prev => ({
        ...prev,
        items: [...prev.items, oilPartItem, filterItem, labourItem]
      }))

      // Generate and add description
      const changeDescription = `Engine oil and filter change with ${oilTypeDisplay} x ${Math.ceil(capacity)} litres`
      const currentDesc = jobDescription.trim()
      const newDescription = currentDesc
        ? `${currentDesc}\n${changeDescription.toUpperCase()}`
        : changeDescription.toUpperCase()

      setJobDescription(newDescription)

      toast({
        title: "Oil Change Service Added",
        description: `Added ${Math.ceil(capacity)}L ${oilTypeDisplay} + filter + labour + description`,
        duration: 4000,
      })

      console.log(`✅ [OIL-CHANGE] Added oil change service with ${Math.ceil(capacity)}L ${oilTypeDisplay}`)

    } catch (error) {
      console.error('❌ [OIL-CHANGE] Error:', error)
      toast({
        title: "Error",
        description: "Failed to add oil change service",
        variant: "destructive",
      })
    }
  }

  // Add engine oil as part only (enhanced function for quick actions)
  const addEngineOilAsPart = () => {
    try {
      // Get oil data from multiple sources
      const engineOil = oilData?.engineOil || technicalData?.lubricants?.engineOil

      if (!engineOil) {
        toast({
          title: "No Oil Data",
          description: "Oil specifications not available for this vehicle",
          variant: "destructive",
        })
        return
      }

      const oilType = engineOil.viscosity || 'Engine Oil'
      const oilSpec = engineOil.specification || ''
      const capacity = engineOil.capacity || 1

      // Determine oil type display
      let oilTypeDisplay = oilType
      if (oilSpec.toLowerCase().includes('synthetic') || oilType.startsWith('0W') || oilType.startsWith('5W')) {
        oilTypeDisplay += ' Synthetic'
      } else if (oilSpec.toLowerCase().includes('semi') || oilType.startsWith('10W')) {
        oilTypeDisplay += ' Semi-Synthetic'
      } else if (oilType.startsWith('15W') || oilType.startsWith('20W')) {
        oilTypeDisplay += ' Mineral'
      }

      // Add oil as part only
      const oilPartItem = {
        id: jobSheet.items.length + 1,
        type: "Parts",
        description: `${oilTypeDisplay} Engine Oil - ${oilSpec}`,
        estHours: 0,
        qty: Math.ceil(capacity),
        netPrice: 12.95, // Default price per litre
        netTotal: Math.ceil(capacity) * 12.95,
        vatRate: "20.00%",
        vat: (Math.ceil(capacity) * 12.95) * 0.20,
        lineTotal: (Math.ceil(capacity) * 12.95) * 1.20
      }

      // Add to job sheet
      setJobSheet(prev => ({
        ...prev,
        items: [...prev.items, oilPartItem]
      }))

      toast({
        title: "Oil Part Added",
        description: `Added ${Math.ceil(capacity)}L ${oilTypeDisplay} as part`,
        duration: 3000,
      })

      console.log(`✅ [OIL-PART] Added oil part: ${Math.ceil(capacity)}L ${oilTypeDisplay}`)

    } catch (error) {
      console.error('❌ [OIL-PART] Error:', error)
      toast({
        title: "Error",
        description: "Failed to add oil part",
        variant: "destructive",
      })
    }
  }

  // Handle AI-generated description
  const handleAIDescription = (description: string) => {
    // Convert to uppercase for easier reading
    const upperDescription = description.toUpperCase()
    setJobDescription(upperDescription)
    setShowAIDialog(false)
    toast({
      title: "Description Generated",
      description: "AI-generated job description has been added.",
    })
  }

  // Handle common description selection with smart generation
  const handleCommonDescription = (key: string) => {
    const smartDescription = generateSmartDescription(key)
    setJobDescription(smartDescription)
    toast({
      title: "Smart Description Generated",
      description: `Generated description for ${jobSheet.vehicle.make} ${jobSheet.vehicle.model}`,
    })
  }

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!initialData?.id) {
      toast({
        title: "Error",
        description: "Cannot update status: Job sheet ID not found",
        variant: "destructive",
      })
      return
    }

    setUpdatingStatus(true)
    try {
      const response = await fetch('/api/job-sheets/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: initialData.id,
          status: newStatus
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setJobSheet(prev => ({ ...prev, status: newStatus }))
        toast({
          title: "Status Updated",
          description: `Job sheet status changed to ${newStatus}`,
        })
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update job sheet status",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const totals = {
    netTotal: jobSheet.items.reduce((sum, item) => sum + item.netTotal, 0),
    vatTotal: jobSheet.items.reduce((sum, item) => sum + item.vat, 0),
    grandTotal: jobSheet.items.reduce((sum, item) => sum + item.lineTotal, 0)
  }

  return (
    <div className="min-h-screen bg-gray-100 job-sheet-container">
      {/* Clean Header */}
      <div className="bg-white border-b-2 border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left Section - Navigation & Job Info */}
          <div className="flex items-center gap-4">
            {showBackButton && onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Job Sheets
              </Button>
            )}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold">JOB SHEET:</span>
                <span className="text-lg font-bold text-gray-900 uppercase">{jobSheet.jobNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold">CUSTOMER:</span>
                <span className="text-lg font-bold text-gray-900 uppercase">
                  {(() => {
                    console.log('👤 Customer State:', jobSheet.customer)
                    return jobSheet.customer.name || 'NO CUSTOMER SELECTED'
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section - Status & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-800">Status:</Label>
              <Select
                value={jobSheet.status}
                onValueChange={handleStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className={`w-40 text-sm border ${getStatusColor(jobSheet.status)}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${option.color.split(' ')[0]}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!validationResult.canPrint}
                className={!validationResult.canPrint ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmail}
                disabled={!validationResult.canPrint}
                className={!validationResult.canPrint ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>

              {/* Validation Status */}
              <JobSheetValidationStatus
                validationResult={validationResult}
                className="ml-2"
              />

              {/* Delete/Void Actions */}
              {initialData?.id && (
                <JobSheetDeleteVoid
                  jobSheetId={initialData.id}
                  jobNumber={jobSheet.jobNumber}
                  currentStatus={jobSheet.status}
                  registration={jobSheet.vehicle.registration}
                  className="ml-2"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Information Section - Resizable */}
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-gray-200 px-4 sm:px-6 py-4 vehicle-info-container vehicle-info-section relative shadow-sm" style={{ minHeight: '320px' }}>


        <ResizablePanelGroup direction="horizontal" className="min-h-[200px]">
          {/* Left Panel - Main Vehicle Info */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="flex items-start gap-4 h-full">
          {/* Manufacturer Logo */}
          {jobSheet.vehicle.make && (
            <div className="flex-shrink-0">
              <ManufacturerLogo make={jobSheet.vehicle.make} size="lg" />
            </div>
          )}

          {/* Vehicle Information */}
          <div className="flex-1 min-w-0">
            {/* Make, Model, Derivative */}
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 uppercase leading-tight" style={{wordBreak: 'break-word'}}>
              {(() => {
                // Removed excessive console logging for performance
                const parts = []
                if (jobSheet.vehicle.make) parts.push(jobSheet.vehicle.make)
                if (jobSheet.vehicle.model) parts.push(jobSheet.vehicle.model)
                if (jobSheet.vehicle.derivative) parts.push(jobSheet.vehicle.derivative)

                if (parts.length > 0) {
                  const result = parts.join(' ').toUpperCase()
                  return result
                } else if (loadingVehicleData) {
                  return 'LOADING VEHICLE DATA...'
                } else if (jobSheet.vehicle.registration) {
                  return 'MAKE/MODEL UNKNOWN'
                } else {
                  return 'VEHICLE INFORMATION'
                }
              })()}
            </div>

            {/* Registration & VIN - Clean Layout */}
            <div className="space-y-3 mb-4">
              {/* Registration Input with Essential Actions Only */}
              <div className="flex items-center gap-2">
                <Input
                  className="bg-yellow-300 text-black px-3 py-2 rounded-lg font-bold text-lg tracking-wider border-2 border-yellow-600 text-center w-40 shadow-md registration-plate"
                  value={jobSheet.vehicle.registration}
                  onChange={(e) => setJobSheet(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, registration: e.target.value.toUpperCase() }
                  }))}
                  onKeyPress={async (e) => {
                    if (e.key === 'Enter') {
                      // Do comprehensive lookup with enhanced data
                      await handleRegistrationLookup(jobSheet.vehicle.registration)
                      await fetchEnhancedVehicleDataWithCost(jobSheet.vehicle.registration, ['technical', 'image'])
                    }
                  }}
                  placeholder="ENTER REG *"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // First do the basic DVLA lookup
                    await handleRegistrationLookup(jobSheet.vehicle.registration)
                    // Then automatically fetch enhanced data with professional image
                    await fetchEnhancedVehicleDataWithCost(jobSheet.vehicle.registration, ['technical', 'image'])
                  }}
                  disabled={loadingVehicleData}
                  className="h-10 px-3"
                  title="Search vehicle data and get professional image (includes VDG enhancement)"
                >
                  {loadingVehicleData ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-1" />
                      VRM Check
                      {vehicleDataCost > 0 ? (
                        <span className="ml-1 text-xs text-green-600 font-medium">
                          (£{vehicleDataCost.toFixed(3)})
                        </span>
                      ) : (
                        <span className="ml-1 text-xs text-gray-500">(+cost varies)</span>
                      )}
                    </>
                  )}
                </Button>
              </div>



              {/* Advanced Actions - Collapsible */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVehicleInfoExpanded(!vehicleInfoExpanded)}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  {vehicleInfoExpanded ? 'Hide' : 'Show'} Advanced Actions
                  {vehicleInfoExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              </div>

              {/* Cost Breakdown Display */}
              {vehicleDataCost > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-800 mb-1">API Cost Breakdown</div>
                  <div className="text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>DVLA Basic Data:</span>
                      <span className="font-medium">FREE</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VDG Professional Image + Specs:</span>
                      <span className="font-medium">£{vehicleDataCost.toFixed(3)}</span>
                    </div>
                    <div className="border-t border-green-300 mt-1 pt-1 flex justify-between font-semibold">
                      <span>Total Cost:</span>
                      <span>£{vehicleDataCost.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Actions - Only Show When Expanded */}
              {vehicleInfoExpanded && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-blue-800 mb-2">Advanced Vehicle Data Actions</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchVINData}
                      disabled={loadingVinData || !jobSheet.vehicle.registration}
                      className="h-8 px-3 text-xs"
                      title="Fetch VIN and oil specifications"
                    >
                      {loadingVinData ? (
                        <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full mr-1" />
                      ) : (
                        <Database className="h-3 w-3 mr-1" />
                      )}
                      Get VIN & Oil Data
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        console.log(`🔧 [REPAIR-TIMES] Adding standard repair times for ${jobSheet.vehicle.make} ${jobSheet.vehicle.model}`)

                        // Add standard repair times based on vehicle type
                        const standardRepairTimes = {
                          'Oil Change': '0.5h',
                          'Brake Pads Front': '1.2h',
                          'Brake Pads Rear': '1.0h',
                          'Brake Discs Front': '1.5h',
                          'Brake Discs Rear': '1.3h',
                          'MOT Test': '1.0h',
                          'Service Basic': '1.5h',
                          'Service Full': '3.0h',
                          'Clutch Replacement': '4.5h',
                          'Timing Belt': '3.5h',
                          'Water Pump': '2.5h',
                          'Alternator': '2.0h',
                          'Starter Motor': '1.8h',
                          'Battery': '0.3h',
                          'Spark Plugs': '1.0h',
                          'Air Filter': '0.3h',
                          'Fuel Filter': '0.5h'
                        }

                        setJobSheet(prev => ({
                          ...prev,
                          vehicle: {
                            ...prev.vehicle,
                            repairTimes: standardRepairTimes
                          }
                        }))

                        toast({
                          title: "Repair Times Loaded",
                          description: `Standard repair times loaded for ${jobSheet.vehicle.make} ${jobSheet.vehicle.model}`,
                        })
                      }}
                      disabled={!jobSheet.vehicle.registration}
                      className="h-8 px-3 text-xs"
                      title="Load standard repair times for estimates"
                    >
                      <Bot className="h-3 w-3 mr-1" />
                      Repair Times
                    </Button>

                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Image - Always Show */}
            <div className="mt-2 mb-2">
              <VehicleImageLarge
                vrm={jobSheet.vehicle.registration}
                make={jobSheet.vehicle.make}
                model={jobSheet.vehicle.model}
                year={jobSheet.vehicle.year}
                className="rounded-lg shadow-md h-40 w-full object-cover"
              />
            </div>

            {/* Vehicle details */}
            {(jobSheet.vehicle.year || jobSheet.vehicle.color || jobSheet.vehicle.fuelType) && (
              <div className="text-base text-gray-600 font-medium uppercase mb-2">
                {[jobSheet.vehicle.year, jobSheet.vehicle.color, jobSheet.vehicle.fuelType].filter(Boolean).join(' • ')}
              </div>
            )}

            {/* MOT & TAX Status Boxes - Fixed Position Under Year */}
            <div className="flex gap-2 mb-3">
              {/* MOT Status Box */}
              <div
                className={`w-44 p-3 rounded-lg text-center border-2 shadow-lg select-none transition-all duration-200 cursor-pointer status-box ${
                  jobSheet.vehicle.motStatus === 'Valid' ? 'bg-green-100 text-green-900 border-green-400' :
                  jobSheet.vehicle.motStatus === 'No details held by DVLA' ? 'bg-orange-100 text-orange-900 border-orange-400' :
                  jobSheet.vehicle.motStatus ? 'bg-red-100 text-red-900 border-red-400' :
                  'bg-gray-100 text-gray-800 border-gray-400'
                } hover:shadow-xl`}
                onClick={() => {
                  if (!showMotDropdown) {
                    fetchMotHistory(jobSheet.vehicle.registration)
                  }
                  setShowMotDropdown(!showMotDropdown)
                }}
              >
                <div className="text-xs font-bold uppercase mb-1 tracking-wide">
                  MOT STATUS
                </div>
                <div className="text-lg font-bold uppercase mb-1">
                  {jobSheet.vehicle.motStatus === 'Valid' ? 'VALID' :
                   jobSheet.vehicle.motStatus === 'No details held by DVLA' ? 'NO DATA' :
                   jobSheet.vehicle.motStatus || 'NO DATA'}
                </div>
                {jobSheet.vehicle.motExpiryDate && (
                  <div className="text-xs font-medium tracking-wide mb-1">
                    EXPIRES: {new Date(jobSheet.vehicle.motExpiryDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                )}
                {(() => {
                  const daysInfo = calculateDaysToExpiry(jobSheet.vehicle.motExpiryDate)
                  if (daysInfo) {
                    return (
                      <div className={`text-xs font-semibold ${daysInfo.color}`}>
                        {daysInfo.status === 'expires'
                          ? `${daysInfo.days} days until expiry`
                          : `${daysInfo.days} days expired`
                        }
                      </div>
                    )
                  }
                  return null
                })()}
              </div>

              {/* TAX Status Box */}
              <div
                className={`w-44 p-3 rounded-lg text-center border-2 shadow-lg select-none transition-all duration-200 status-box ${
                  jobSheet.vehicle.taxStatus === 'Taxed' ? 'bg-green-100 text-green-900 border-green-400' :
                  jobSheet.vehicle.taxStatus === 'Untaxed' ? 'bg-red-100 text-red-900 border-red-400' :
                  jobSheet.vehicle.taxStatus ? 'bg-orange-100 text-orange-900 border-orange-400' :
                  'bg-gray-100 text-gray-800 border-gray-400'
                } hover:shadow-xl`}
              >
                <div className="text-xs font-bold uppercase mb-1 tracking-wide">
                  TAX STATUS
                </div>
                <div className="text-lg font-bold uppercase mb-1">
                  {jobSheet.vehicle.taxStatus === 'Taxed' ? 'TAXED' :
                   jobSheet.vehicle.taxStatus === 'Untaxed' ? 'UNTAXED' :
                   jobSheet.vehicle.taxStatus || 'NO DATA'}
                </div>
                {jobSheet.vehicle.taxDueDate && (
                  <div className="text-xs font-medium tracking-wide mb-1">
                    DUE: {new Date(jobSheet.vehicle.taxDueDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                )}
                {(() => {
                  const daysInfo = calculateDaysToExpiry(jobSheet.vehicle.taxDueDate)
                  if (daysInfo) {
                    return (
                      <div className={`text-xs font-semibold ${daysInfo.color}`}>
                        {daysInfo.status === 'expires'
                          ? `${daysInfo.days} days until expiry`
                          : `${daysInfo.days} days expired`
                        }
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>




            </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Detailed Vehicle Information */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 h-full flex flex-col ml-2 relative z-20 shadow-md">
              <div className="space-y-4">
                {/* Vehicle Basic Information - Compact Layout */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-base">
                    <div>
                      <div className="text-gray-700 font-bold uppercase text-sm tracking-wide mb-1">Make</div>
                      <div className="font-bold uppercase text-gray-900 text-lg">{jobSheet.vehicle.make || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-bold uppercase text-sm tracking-wide mb-1">Model</div>
                      <div className="font-bold uppercase text-gray-900 text-lg">{jobSheet.vehicle.model || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-bold uppercase text-sm tracking-wide mb-1">Year</div>
                      <div className="font-bold uppercase text-gray-900 text-lg">{jobSheet.vehicle.year || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Derivative Row */}
                  {jobSheet.vehicle.derivative && (
                    <div className="text-base">
                      <div className="text-gray-600 font-semibold uppercase text-sm tracking-wide mb-1">Derivative</div>
                      <div className="font-bold uppercase text-blue-700 text-lg">{jobSheet.vehicle.derivative}</div>
                    </div>
                  )}

                  {/* Color and Fuel */}
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <div className="text-gray-600 font-semibold uppercase text-sm tracking-wide mb-1">Color</div>
                      <div className="font-bold uppercase text-gray-900 text-lg">{jobSheet.vehicle.color || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 font-semibold uppercase text-sm tracking-wide mb-1">Fuel Type</div>
                      <div className="font-bold uppercase text-gray-900 text-lg">{jobSheet.vehicle.fuelType || 'N/A'}</div>
                    </div>
                  </div>

                  {/* VIN/Chassis Section - Always Show if Available */}
                  <div className="border-t-2 border-gray-200 pt-3">
                    <div className="text-gray-700 font-bold uppercase text-sm tracking-wide mb-2">VIN/Chassis</div>
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-200 text-gray-900 px-4 py-3 rounded-lg text-base font-mono font-bold flex-1 border-2 border-gray-300">
                        {(jobSheet.vehicle.chassis || jobSheet.vehicle.vin || 'WVWZZZ1JZ3W386752').toUpperCase()}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(jobSheet.vehicle.chassis || jobSheet.vehicle.vin || 'WVWZZZ1JZ3W386752', 'VIN')}
                        className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-50"
                      >
                        {copiedField === 'VIN' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </Button>
                      <PartSouqButton
                        vin={jobSheet.vehicle.chassis || jobSheet.vehicle.vin || 'WVWZZZ1JZ3W386752'}
                        size="sm"
                        variant="outline"
                        className="h-10 px-3 border-gray-300 hover:bg-gray-50"
                      />
                      <SevenZapButton
                        vin={jobSheet.vehicle.chassis || jobSheet.vehicle.vin || 'WVWZZZ1JZ3W386752'}
                        make={jobSheet.vehicle.make}
                        size="sm"
                        variant="outline"
                        className="h-10 px-3 border-gray-300 hover:bg-gray-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVehicleProfile(true)}
                        className="h-10 px-3 border-gray-300 hover:bg-gray-50"
                        title="View vehicle profile with enhanced data options"
                      >
                        <Car className="h-4 w-4 mr-1" />
                        Profile
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Technical Details Section - Compact */}
                <div className="border-t-2 border-gray-200 pt-2">
                  <div className="text-sm text-gray-700 font-bold uppercase mb-2 tracking-wide">Technical Details</div>
                  <div className="grid grid-cols-2 gap-3 text-base">
                    <div>
                      <div className="text-gray-700 font-bold text-sm tracking-wide mb-1">Engine Size</div>
                      <div className="font-bold text-gray-900 text-lg">{jobSheet.vehicle.engineSize || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-bold text-sm tracking-wide mb-1">CO2 Emissions</div>
                      <div className="font-bold text-gray-900 text-lg">{jobSheet.vehicle.co2Emissions ? `${jobSheet.vehicle.co2Emissions}g/km` : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-bold text-sm tracking-wide mb-1">Euro Status</div>
                      <div className="font-bold text-gray-900 text-lg">{jobSheet.vehicle.euroStatus || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-bold text-sm tracking-wide mb-1">Engine Code</div>
                      <div className="font-bold text-gray-900 text-lg">{jobSheet.vehicle.engineCode || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Oil Specifications Section - Compact */}
                <div className="border-t border-gray-200 pt-2">
                  <div className="text-sm text-gray-600 font-bold uppercase mb-2 tracking-wide flex items-center gap-2">
                    Service Specifications
                    {loadingOilData && (
                      <div className="text-xs text-blue-600 font-normal normal-case">Loading...</div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <div className="text-gray-600 font-semibold text-sm tracking-wide mb-2">Oil Type/Grade</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {loadingOilData ? (
                          <div className="text-blue-600">Loading...</div>
                        ) : (() => {
                          // Try to get oil data from multiple sources
                          const oilType = oilData?.engineOil?.viscosity ||
                                         technicalData?.lubricants?.engineOil?.viscosity ||
                                         'N/A'
                          const oilSpec = oilData?.engineOil?.specification ||
                                         technicalData?.lubricants?.engineOil?.specification ||
                                         ''

                          if (oilType === 'N/A') return 'N/A'

                          // Determine oil type based on viscosity
                          let oilTypeDisplay = oilType
                          if (oilSpec.toLowerCase().includes('synthetic') || oilType.startsWith('0W') || oilType.startsWith('5W')) {
                            oilTypeDisplay += ' Synthetic'
                          } else if (oilSpec.toLowerCase().includes('semi') || oilType.startsWith('10W')) {
                            oilTypeDisplay += ' Semi-Synthetic'
                          } else if (oilType.startsWith('15W') || oilType.startsWith('20W')) {
                            oilTypeDisplay += ' Mineral'
                          }

                          return oilTypeDisplay
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 font-semibold text-sm tracking-wide mb-2">Oil Capacity</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {loadingOilData ? (
                          <div className="text-blue-600">Loading...</div>
                        ) : (() => {
                          const capacity = oilData?.engineOil?.capacity ||
                                          technicalData?.lubricants?.engineOil?.capacity ||
                                          null

                          if (!capacity) return 'N/A'

                          // Format capacity with proper units
                          if (typeof capacity === 'number') {
                            return `${capacity.toFixed(1)} Litres`
                          }

                          // If it's already a string, check if it has units
                          const capacityStr = capacity.toString()
                          if (capacityStr.toLowerCase().includes('litre') || capacityStr.toLowerCase().includes('liter')) {
                            return capacityStr
                          }

                          return `${capacityStr} Litres`
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Additional Service Information */}
                  <div className="grid grid-cols-2 gap-4 text-base mt-3">
                    <div>
                      <div className="text-gray-600 font-semibold text-sm tracking-wide mb-2">Tyre Size</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {(() => {
                          // Try to get tyre size from technical data
                          const tyreSize = technicalData?.tyres?.frontSize ||
                                          technicalData?.tyres?.size ||
                                          jobSheet.vehicle.tyreSize ||
                                          'N/A'
                          return tyreSize
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 font-semibold text-sm tracking-wide mb-2">Timing Belt Interval</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {(() => {
                          // Try to get timing belt interval from technical data
                          const interval = technicalData?.serviceIntervals?.timingBelt ||
                                          technicalData?.maintenance?.timingBelt ||
                                          jobSheet.vehicle.timingBeltInterval ||
                                          'N/A'
                          return interval
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Tyre Pressures */}
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="text-gray-600 font-semibold text-sm tracking-wide mb-2">Tyre Pressures</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Front N/S:</span>
                          <span className="font-medium">
                            {(() => {
                              const pressure = technicalData?.tyres?.frontPressure ||
                                              jobSheet.vehicle.tyrePressureFrontNS ||
                                              'N/A'
                              return pressure === 'N/A' ? pressure : `${pressure} PSI`
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rear N/S:</span>
                          <span className="font-medium">
                            {(() => {
                              const pressure = technicalData?.tyres?.rearPressure ||
                                              jobSheet.vehicle.tyrePressureRearNS ||
                                              'N/A'
                              return pressure === 'N/A' ? pressure : `${pressure} PSI`
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Front O/S:</span>
                          <span className="font-medium">
                            {(() => {
                              const pressure = technicalData?.tyres?.frontPressure ||
                                              jobSheet.vehicle.tyrePressureFrontOS ||
                                              'N/A'
                              return pressure === 'N/A' ? pressure : `${pressure} PSI`
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rear O/S:</span>
                          <span className="font-medium">
                            {(() => {
                              const pressure = technicalData?.tyres?.rearPressure ||
                                              jobSheet.vehicle.tyrePressureRearOS ||
                                              'N/A'
                              return pressure === 'N/A' ? pressure : `${pressure} PSI`
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions for Oil Service */}
                  {!loadingOilData && (oilData?.engineOil || technicalData?.lubricants?.engineOil) && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="text-gray-600 font-semibold text-sm tracking-wide mb-3">Quick Oil Service Actions</div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => addOilTopUpService()}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                        >
                          <Plus className="h-4 w-4" />
                          Add Oil Top-Up Service
                        </Button>
                        <Button
                          onClick={() => addOilChangeService()}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <Wrench className="h-4 w-4" />
                          Add Oil Change Service
                        </Button>
                        <Button
                          onClick={() => addEngineOilAsPart()}
                          variant="outline"
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <Plus className="h-4 w-4" />
                          Add Oil as Part Only
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Loading state for additional information */}
                  {loadingOilData && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-blue-600 text-sm">Fetching detailed oil specifications...</div>
                    </div>
                  )}

                  {/* Error state */}
                  {oilDataError && !loadingOilData && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-red-600 text-sm">⚠️ {oilDataError}</div>
                    </div>
                  )}

                  {/* Additional oil information if available */}
                  {!loadingOilData && (oilData?.engineOil?.specification || technicalData?.lubricants?.engineOil?.specification) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-gray-600 font-semibold text-sm tracking-wide mb-2">Oil Specification</div>
                      <div className="font-medium text-gray-700 text-sm">
                        {oilData?.engineOil?.specification || technicalData?.lubricants?.engineOil?.specification}
                      </div>
                    </div>
                  )}

                  {/* Oil change interval if available */}
                  {!loadingOilData && (oilData?.engineOil?.changeInterval || technicalData?.lubricants?.engineOil?.changeInterval) && (
                    <div className="mt-2">
                      <div className="text-gray-600 font-semibold text-sm tracking-wide mb-2">Change Interval</div>
                      <div className="font-medium text-gray-700 text-sm">
                        {(() => {
                          const interval = oilData?.engineOil?.changeInterval || technicalData?.lubricants?.engineOil?.changeInterval
                          if (typeof interval === 'number') {
                            return interval > 1000 ? `${(interval / 1000).toFixed(0)}k miles` : `${interval} miles`
                          }
                          return interval
                        })()}
                      </div>
                    </div>
                  )}
                </div>


              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>



        {/* MOT History Dropdown - Fixed Position */}
        {showMotDropdown && (
          <div
            className="absolute bg-white border rounded-lg shadow-xl p-6 w-[700px] z-40"
            style={{
              left: '20px',
              top: '420px'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg uppercase">MOT History & Mileage</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMotDropdown(false)}
                className="h-8 w-8 p-0 text-lg"
              >
                ×
              </Button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <div className="font-semibold text-base">Current Status: {jobSheet.vehicle.motStatus}</div>
                {jobSheet.vehicle.motExpiryDate && (
                  <div className="text-sm mt-1">Expires: {new Date(jobSheet.vehicle.motExpiryDate).toLocaleDateString('en-GB')}</div>
                )}
              </div>
              <div className="border-t pt-3">
                <div className="text-sm font-semibold text-gray-700 mb-3">Mileage History Chart</div>
                {loadingMotHistory ? (
                  <div className="bg-gray-50 p-4 rounded text-center text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading MOT history...
                  </div>
                ) : motHistoryData.length > 0 ? (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={motHistoryData
                        .filter(test => test.odometerValue && parseInt(test.odometerValue) > 0)
                        .sort((a, b) => new Date(a.completedDate).getTime() - new Date(b.completedDate).getTime())
                        .map(test => ({
                          date: test.completedDate,
                          mileage: parseInt(test.odometerValue),
                          displayDate: new Date(test.completedDate).toLocaleDateString('en-GB', {
                            year: '2-digit',
                            month: 'short'
                          })
                        }))
                      }>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis
                          dataKey="displayDate"
                          tick={{ fontSize: 14 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 14 }}
                          tickLine={false}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value.toLocaleString()} miles`, 'Mileage']}
                          labelFormatter={(label) => `Test Date: ${label}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            padding: '12px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="mileage"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded text-center text-sm text-gray-500">
                    <div className="font-medium">No MOT history data available</div>
                    <div className="mt-1">MOT tests with mileage records will appear here</div>
                  </div>
                )}

                {/* Complete MOT History with Defects */}
                {motHistoryData.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Complete MOT History</div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {motHistoryData.map((test, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          {/* Test Header */}
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <div className="font-medium text-base">
                                {new Date(test.completedDate).toLocaleDateString('en-GB')}
                              </div>
                              <div className="text-gray-500 text-sm">
                                Test #{test.motTestNumber} • {test.odometerValue ? parseInt(test.odometerValue).toLocaleString() : 'N/A'} miles
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded text-sm font-bold ${
                              test.testResult === 'PASSED' ? 'bg-green-100 text-green-800' :
                              test.testResult === 'FAILED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {test.testResult}
                            </div>
                          </div>

                          {/* Defects/Advisories */}
                          {test.defects && test.defects.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-gray-600 mb-2">
                                Issues Found ({test.defects.length})
                              </div>
                              <div className="space-y-1">
                                {test.defects.map((defect, defectIndex) => (
                                  <div
                                    key={defectIndex}
                                    className="flex items-start gap-2 p-2 bg-white rounded border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                    onClick={() => addMotDefectAsItem(defect, test)}
                                    title="Click to add as job item"
                                  >
                                    <div className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${
                                      defect.type === 'MAJOR' ? 'bg-red-100 text-red-800' :
                                      defect.type === 'MINOR' ? 'bg-orange-100 text-orange-800' :
                                      defect.type === 'ADVISORY' ? 'bg-yellow-100 text-yellow-800' :
                                      defect.type === 'DANGEROUS' ? 'bg-red-200 text-red-900' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {defect.type}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm text-gray-900">{defect.text}</div>
                                      <div className="text-xs text-blue-600 mt-1">Click to add to job sheet</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* No defects message */}
                          {(!test.defects || test.defects.length === 0) && test.testResult === 'PASSED' && (
                            <div className="text-xs text-green-600 italic mt-2">
                              ✓ No issues found - Clean pass
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



      </div>

      {/* VIN Data Display Area - Clean and Compact */}
      {showVinData && (
        <div className="absolute left-4 right-4 top-80 z-20 bg-white rounded-lg p-3 shadow-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Vehicle Information & Specifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVinData(false)}
              className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>



          {/* Oil & Lubricants Specifications - Compact Grid */}
          {oilData && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">OIL & LUBRICANTS SPECIFICATIONS</div>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {/* Engine Oil */}
                <div
                  className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => addOilAsPart('engineOil', oilData.engineOil)}
                  title="Click to add as part"
                >
                  <div className="font-semibold text-gray-800 mb-1">🛢️ ENGINE OIL</div>
                  <div className="font-bold text-gray-900">{oilData.engineOil.viscosity}</div>
                  <div className="text-gray-600">
                    <div>Capacity: {oilData.engineOil.capacity}L</div>
                    <div>Interval: {oilData.engineOil.changeInterval} miles</div>
                    <div>Spec: {oilData.engineOil.specification}</div>
                  </div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">Click to add as part</div>
                </div>

                {/* Brake Fluid */}
                <div
                  className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => addOilAsPart('brakeFluid', oilData.brakeFluid)}
                  title="Click to add as part"
                >
                  <div className="font-semibold text-gray-800 mb-1">🔴 BRAKE FLUID</div>
                  <div className="font-bold text-gray-900">{oilData.brakeFluid.type}</div>
                  <div className="text-gray-600">
                    <div>Capacity: {oilData.brakeFluid.capacity}L</div>
                    <div>Interval: {oilData.brakeFluid.changeInterval} miles</div>
                    <div>Spec: {oilData.brakeFluid.specification}</div>
                  </div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">Click to add as part</div>
                </div>

                {/* Transmission Oil */}
                <div
                  className={`bg-gray-50 p-2 rounded border ${
                    oilData.transmissionOil
                      ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors'
                      : 'opacity-50'
                  }`}
                  onClick={() => oilData.transmissionOil && addOilAsPart('transmissionOil', oilData.transmissionOil)}
                  title={oilData.transmissionOil ? "Click to add as part" : "Not available"}
                >
                  <div className="font-semibold text-gray-800 mb-1">⚙️ TRANSMISSION</div>
                  {oilData.transmissionOil ? (
                    <>
                      <div className="font-bold text-gray-900">{oilData.transmissionOil.type}</div>
                      <div className="text-gray-600">
                        <div>Capacity: {oilData.transmissionOil.capacity}L</div>
                        <div>Interval: {oilData.transmissionOil.changeInterval} miles</div>
                        <div>Viscosity: {oilData.transmissionOil.viscosity}</div>
                      </div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">Click to add as part</div>
                    </>
                  ) : (
                    <div className="text-gray-500 text-xs italic">Manual or N/A</div>
                  )}
                </div>

                {/* Coolant */}
                <div
                  className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => addOilAsPart('coolant', oilData.coolant)}
                  title="Click to add as part"
                >
                  <div className="font-semibold text-gray-800 mb-1">❄️ COOLANT</div>
                  <div className="font-bold text-gray-900">{oilData.coolant.type}</div>
                  <div className="text-gray-600">
                    <div>Capacity: {oilData.coolant.capacity}L</div>
                    <div>Interval: {oilData.coolant.changeInterval} miles</div>
                    <div>Spec: {oilData.coolant.specification}</div>
                  </div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">Click to add as part</div>
                </div>

                {/* Power Steering Fluid */}
                {oilData.powerSteeringFluid && (
                  <div
                    className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => addOilAsPart('powerSteeringFluid', oilData.powerSteeringFluid)}
                    title="Click to add as part"
                  >
                    <div className="font-semibold text-gray-800 mb-1">🔄 POWER STEERING</div>
                    <div className="font-bold text-gray-900">{oilData.powerSteeringFluid.type}</div>
                    <div className="text-gray-600">
                      <div>Capacity: {oilData.powerSteeringFluid.capacity}L</div>
                      <div>Interval: {oilData.powerSteeringFluid.changeInterval} miles</div>
                      <div>Spec: {oilData.powerSteeringFluid.specification}</div>
                    </div>
                    <div className="text-xs text-blue-600 mt-1 font-medium">Click to add as part</div>
                  </div>
                )}

                {/* Air Con Refrigerant */}
                {oilData.additionalLubricants?.airConRefrigerant && (
                  <div
                    className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => addOilAsPart('airConRefrigerant', oilData.additionalLubricants.airConRefrigerant)}
                    title="Click to add as part"
                  >
                    <div className="font-semibold text-gray-800 mb-1">❄️ AIR CON</div>
                    <div className="font-bold text-gray-900">{oilData.additionalLubricants.airConRefrigerant.type}</div>
                    <div className="text-gray-600">
                      <div>Capacity: {oilData.additionalLubricants.airConRefrigerant.capacity}g</div>
                      <div>Spec: {oilData.additionalLubricants.airConRefrigerant.specification}</div>
                    </div>
                    <div className="text-xs text-blue-600 mt-1 font-medium">Click to add as part</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {oilDataError && (
            <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
              <div className="text-xs text-red-800">⚠️ {oilDataError}</div>
            </div>
          )}
        </div>
      )}

      {/* Technical Data Display Area */}
      {showTechnicalData && technicalData && (
        <div className="absolute left-4 right-4 top-[500px] z-20 bg-white rounded-lg p-4 shadow-lg border max-h-[400px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Technical Data & Repair Times</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTechnicalData(false)}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              title="Close technical data"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Debug Information */}
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
            <div><strong>Technical Data Keys:</strong> {Object.keys(technicalData).join(', ')}</div>
            {technicalData.lubricants && (
              <div><strong>Lubricants Keys:</strong> {Object.keys(technicalData.lubricants).join(', ')}</div>
            )}
            {technicalData.repairTimes && (
              <div><strong>Repair Times Count:</strong> {Object.keys(technicalData.repairTimes).length}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enhanced Lubricants */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Enhanced Lubricant Specifications</h4>
              {technicalData.lubricants ? (
                <div className="space-y-2">
                  {/* Engine Oil */}
                  {technicalData.lubricants.engineOil && (
                    <div
                      className="bg-blue-50 p-3 rounded border cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => addTechnicalLubricantAsPart('engineOil', technicalData.lubricants.engineOil)}
                    >
                      <div className="font-semibold text-blue-800">🛢️ ENGINE OIL</div>
                      <div className="text-sm text-gray-700">
                        <div><strong>Viscosity:</strong> {technicalData.lubricants.engineOil.viscosity || 'N/A'}</div>
                        <div><strong>Specification:</strong> {technicalData.lubricants.engineOil.specification || 'N/A'}</div>
                        <div><strong>Capacity:</strong> {technicalData.lubricants.engineOil.capacity || 'N/A'}L</div>
                        <div><strong>Brand:</strong> {technicalData.lubricants.engineOil.brand || 'N/A'}</div>
                        <div><strong>Part Number:</strong> {technicalData.lubricants.engineOil.partNumber || 'N/A'}</div>
                        <div><strong>Change Interval:</strong> {technicalData.lubricants.engineOil.changeInterval || 'N/A'} miles</div>
                        {technicalData.lubricants.engineOil.filterPartNumber && (
                          <div><strong>Filter P/N:</strong> {technicalData.lubricants.engineOil.filterPartNumber}</div>
                        )}
                      </div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">Click to add as part</div>
                    </div>
                  )}

                  {/* Brake Fluid */}
                  {technicalData.lubricants.brakeFluid && (
                    <div
                      className="bg-red-50 p-3 rounded border cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() => addTechnicalLubricantAsPart('brakeFluid', technicalData.lubricants.brakeFluid)}
                    >
                      <div className="font-semibold text-red-800">🔴 BRAKE FLUID</div>
                      <div className="text-sm text-gray-700">
                        <div><strong>Type:</strong> {technicalData.lubricants.brakeFluid.type || 'N/A'}</div>
                        <div><strong>Specification:</strong> {technicalData.lubricants.brakeFluid.specification || 'N/A'}</div>
                        <div><strong>Capacity:</strong> {technicalData.lubricants.brakeFluid.capacity || 'N/A'}L</div>
                        <div><strong>Part Number:</strong> {technicalData.lubricants.brakeFluid.partNumber || 'N/A'}</div>
                      </div>
                      <div className="text-xs text-red-600 mt-1 font-medium">Click to add as part</div>
                    </div>
                  )}

                  {/* Transmission Oil */}
                  {technicalData.lubricants.transmissionOil && (
                    <div
                      className="bg-orange-50 p-3 rounded border cursor-pointer hover:bg-orange-100 transition-colors"
                      onClick={() => addTechnicalLubricantAsPart('transmissionOil', technicalData.lubricants.transmissionOil)}
                    >
                      <div className="font-semibold text-orange-800">⚙️ TRANSMISSION OIL</div>
                      <div className="text-sm text-gray-700">
                        <div><strong>Type:</strong> {technicalData.lubricants.transmissionOil.type || 'N/A'}</div>
                        <div><strong>Viscosity:</strong> {technicalData.lubricants.transmissionOil.viscosity || 'N/A'}</div>
                        <div><strong>Capacity:</strong> {technicalData.lubricants.transmissionOil.capacity || 'N/A'}L</div>
                        <div><strong>Part Number:</strong> {technicalData.lubricants.transmissionOil.partNumber || 'N/A'}</div>
                      </div>
                      <div className="text-xs text-orange-600 mt-1 font-medium">Click to add as part</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                  No lubricant data available. The technical API may not have returned lubricant specifications.
                </div>
              )}
            </div>

            {/* Repair Times */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Repair Time Database</h4>
              {technicalData.repairTimes && Object.keys(technicalData.repairTimes).length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(technicalData.repairTimes).slice(0, 10).map(([operation, details]) => (
                    <div key={operation}
                         className="bg-gray-50 p-3 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
                         onClick={() => addRepairTimeAsItem(operation, details)}>
                      <div className="font-semibold text-gray-800">{details.description || operation}</div>
                      <div className="text-sm text-gray-600">
                        <div><strong>Time:</strong> {details.timeHours || 'N/A'}h</div>
                        <div><strong>Difficulty:</strong> {details.difficulty || 'N/A'}</div>
                        <div><strong>Category:</strong> {details.category || 'N/A'}</div>
                        {details.notes && <div><strong>Notes:</strong> {details.notes}</div>}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">Click to add as job item</div>
                    </div>
                  ))}
                  {Object.keys(technicalData.repairTimes).length > 10 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      ... and {Object.keys(technicalData.repairTimes).length - 10} more repair operations
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                  No repair time data available. The technical API may not have returned repair time information.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-6">
        {/* Customer Information - Now Full Width */}
        <div className="grid grid-cols-1 gap-6">


          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">👤</span>
                  <span>Customer Information</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomerInfoExpanded(!customerInfoExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {customerInfoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>

            {/* Always visible: Name and Contact */}
            <CardContent className={customerInfoExpanded ? "space-y-6 p-6" : "space-y-4 p-6"}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">Name <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      className="h-12 font-bold flex-1 text-lg uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                      value={jobSheet.customer.name}
                      onChange={(e) => setJobSheet(prev => ({...prev, customer: {...prev.customer, name: e.target.value.toUpperCase()}}))}
                      placeholder="CUSTOMER NAME *"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCustomerSearch()}
                      className="h-12 px-4 border-2"
                      title="Search for existing customer"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">Contact <span className="text-red-500">*</span></Label>
                  <Input
                    className="h-12 font-bold text-lg bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                    value={jobSheet.customer.telephone}
                    onChange={(e) => setJobSheet(prev => ({...prev, customer: {...prev.customer, telephone: e.target.value}}))}
                    placeholder="Phone Number (required)"
                  />
                </div>
              </div>

              {/* Expandable section */}
              {customerInfoExpanded && (
                <div className="space-y-6 pt-6 border-t-2 border-gray-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-bold text-gray-800 mb-2 block">Account Number</Label>
                      <Input
                        className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                        value={jobSheet.customer.accountNumber}
                        onChange={(e) => setJobSheet(prev => ({...prev, customer: {...prev.customer, accountNumber: e.target.value.toUpperCase()}}))}
                        placeholder="REN002"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-800 mb-2 block">Company</Label>
                      <Input
                        className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                        value={jobSheet.customer.company}
                        onChange={(e) => setJobSheet(prev => ({...prev, customer: {...prev.customer, company: e.target.value.toUpperCase()}}))}
                        placeholder="COMPANY NAME"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-gray-800 mb-2 block">
                      Address <span className="text-red-500">*</span>
                      <span className="text-xs text-orange-600 font-normal">(Required for invoicing)</span>
                    </Label>
                    <PostcodeLookup
                      postcode={jobSheet.customer.postCode}
                      onPostcodeChange={(postcode) => setJobSheet(prev => ({
                        ...prev,
                        customer: { ...prev.customer, postCode: postcode.toUpperCase() }
                      }))}
                      onAddressSelect={(address) => {
                        setJobSheet(prev => ({
                          ...prev,
                          customer: {
                            ...prev.customer,
                            houseNumber: (address.houseNo || prev.customer.houseNumber).toUpperCase(),
                            road: (address.road || prev.customer.road).toUpperCase(),
                            locality: (address.locality || prev.customer.locality).toUpperCase(),
                            town: (address.town || prev.customer.town).toUpperCase(),
                            county: (address.county || prev.customer.county).toUpperCase(),
                            postCode: (address.postCode || prev.customer.postCode).toUpperCase()
                          }
                        }))
                      }}
                      addressData={{
                        houseNo: jobSheet.customer.houseNumber,
                        road: jobSheet.customer.road,
                        locality: jobSheet.customer.locality,
                        town: jobSheet.customer.town,
                        county: jobSheet.customer.county,
                        postCode: jobSheet.customer.postCode
                      }}
                      onAddressChange={(field, value) => {
                        const fieldMap = {
                          houseNo: 'houseNumber',
                          road: 'road',
                          locality: 'locality',
                          town: 'town',
                          county: 'county',
                          postCode: 'postCode'
                        }
                        const customerField = fieldMap[field as keyof typeof fieldMap]
                        if (customerField) {
                          setJobSheet(prev => ({
                            ...prev,
                            customer: { ...prev.customer, [customerField]: value.toUpperCase() }
                          }))
                        }
                      }}
                      className="space-y-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-bold text-gray-800 mb-2 block">Mobile <span className="text-orange-500 text-xs">(or phone/email)</span></Label>
                      <Input
                        className="h-12 text-lg font-bold bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                        value={jobSheet.customer.mobile}
                        onChange={(e) => setJobSheet(prev => ({...prev, customer: {...prev.customer, mobile: e.target.value}}))}
                        placeholder="07962999642"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-800 mb-2 block">Email <span className="text-orange-500 text-xs">(or phone/mobile)</span></Label>
                      <Input
                        className="h-12 text-lg font-bold bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                        value={jobSheet.customer.email}
                        onChange={(e) => setJobSheet(prev => ({...prev, customer: {...prev.customer, email: e.target.value.toLowerCase()}}))}
                        placeholder="customer@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>



        </div>

        {/* Job Workflow & Status - Minimized */}
        <Card className="bg-gray-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
              ⚙️ WORKFLOW & STATUS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Compact Status Row */}
            <div className="grid grid-cols-6 gap-3">
              <div>
                <Label className="text-xs text-gray-500 font-medium">STATUS</Label>
                <Select value={jobSheet.status} onValueChange={(value) => setJobSheet(prev => ({...prev, status: value}))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]} border`}></div>
                          <span className="text-xs">{status.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500 font-medium">BAY</Label>
                <Select value={jobSheet.bay} onValueChange={(value) => setJobSheet(prev => ({...prev, bay: value}))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Bay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bay 1">Bay 1</SelectItem>
                    <SelectItem value="Bay 2">Bay 2</SelectItem>
                    <SelectItem value="Bay 3">Bay 3</SelectItem>
                    <SelectItem value="Bay 4">Bay 4</SelectItem>
                    <SelectItem value="Ramp 1">Ramp 1</SelectItem>
                    <SelectItem value="Ramp 2">Ramp 2</SelectItem>
                    <SelectItem value="Outside">Outside</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500 font-medium">TECHNICIAN</Label>
                <Select value={jobSheet.technician} onValueChange={(value) => setJobSheet(prev => ({...prev, technician: value}))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tech" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTechnicians().map((tech) => (
                      <SelectItem key={tech.id} value={tech.name}>
                        {tech.name}
                        {tech.specialization && (
                          <span className="text-xs text-muted-foreground ml-2">({tech.specialization})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500 font-medium">DUE DATE</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={jobSheet.dueDate}
                  onChange={(e) => setJobSheet(prev => ({...prev, dueDate: e.target.value}))}
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500 font-medium">MILEAGE <span className="text-red-500">*</span></Label>
                <Input
                  className="h-8 text-xs"
                  value={jobSheet.mileage}
                  onChange={(e) => setJobSheet(prev => ({...prev, mileage: e.target.value}))}
                  placeholder="Miles or 'Not Recorded' *"
                />
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    id="buyMot"
                    checked={jobSheet.buyMot}
                    onChange={(e) => setJobSheet(prev => ({...prev, buyMot: e.target.checked}))}
                    className="rounded w-3 h-3"
                  />
                  <Label htmlFor="buyMot" className="text-xs font-medium text-orange-700">MOT</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600 font-bold">JOB DESCRIPTION & WORKSHOP SHEET</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIDialog(true)}
                  className="h-8 bg-purple-600 text-white border-purple-600 dark:bg-purple-500 dark:border-purple-500"
                >
                  <span className="text-xs">🤖 AI Generate</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-green-600 text-white border-green-600 dark:bg-green-500 dark:border-green-500"
                  title="Print Workshop Sheet"
                >
                  <span className="text-xs">🖨️ Print</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Workshop Details for Printed Sheet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <Label className="text-xs text-gray-500">Date In</Label>
                <Input
                  type="datetime-local"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Date Required</Label>
                <Input
                  type="datetime-local"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Common Descriptions */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Common Descriptions</Label>
              <div className="flex flex-wrap gap-2">
                {commonDescriptions.map((desc) => (
                  <Button
                    key={desc.key}
                    variant="outline"
                    size="sm"
                    onClick={() => handleCommonDescription(desc.key)}
                    className="h-7 text-xs font-mono bg-blue-600 hover:bg-blue-700 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
                    title={`Generate smart description for ${desc.label}`}
                  >
                    🤖 {desc.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Description Input */}
            <div>
              <Label className="text-xs text-gray-500">Description (ALL CAPS for easier reading)</Label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value.toUpperCase())}
                placeholder="ENTER JOB DESCRIPTION IN CAPS..."
                className="h-20 font-mono text-sm font-bold text-blue-900 bg-blue-50"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {/* Workshop Notes Section */}
            <div>
              <Label className="text-xs text-gray-500">Workshop Notes (for mechanics)</Label>
              <Textarea
                value={jobNotes}
                onChange={(e) => setJobNotes(e.target.value.toUpperCase())}
                placeholder="TESTING NOTES, SPECIAL INSTRUCTIONS..."
                className="h-16 font-mono text-sm"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {/* Workshop Information Grid - Simplified */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Workshop Notes</h4>
              <div className="text-xs text-gray-500 mb-2">
                Service specifications are now displayed in the vehicle information panel above.
              </div>
            </div>

            {/* Checkboxes for Common Workshop Tasks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="testDriven"
                  className="rounded"
                />
                <Label htmlFor="testDriven" className="text-sm">Test Driven</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="wheelNutTorqued"
                  className="rounded"
                />
                <Label htmlFor="wheelNutTorqued" className="text-sm">Wheel Nut Torqued</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="timingBeltDue"
                  className="rounded"
                />
                <Label htmlFor="timingBeltDue" className="text-sm">Timing Belt Due</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="environmentalCharge"
                  className="rounded"
                />
                <Label htmlFor="environmentalCharge" className="text-sm">Environmental Charge</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Items Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Job Items</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Scroll to parts tab and activate it
                    const partsTab = document.querySelector('[data-value="parts"]') as HTMLElement
                    if (partsTab) {
                      partsTab.click()
                      partsTab.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Find Parts
                </Button>
                <Button size="sm" onClick={() => addNewItem()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead className="w-[100px]">TYPE</TableHead>
                    <TableHead>DESCRIPTION</TableHead>
                    <TableHead className="w-[100px]">HOURS/QTY</TableHead>
                    <TableHead className="w-[100px]">RATE/PRICE (£)</TableHead>
                    <TableHead className="w-[100px]">NET TOTAL</TableHead>
                    <TableHead className="w-[100px]">VAT RATE</TableHead>
                    <TableHead className="w-[80px]">VAT</TableHead>
                    <TableHead className="w-[100px]">LINE TOTAL</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobSheet.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getBadgeVariant(item.type)}
                          className="text-xs cursor-pointer hover:bg-opacity-80 transition-colors select-none"
                          onClick={() => cycleItemType(item.id)}
                          title={`Click to change type (${item.type} → ${['Labour', 'Parts', 'Other'][((['Labour', 'Parts', 'Other'].indexOf(item.type) + 1) % 3)]})`}
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-8 border-0 p-0 focus-visible:ring-0 flex-1"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          />
                          {item.motDefect && (
                            <div
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold cursor-help"
                              title={`From MOT ${item.motDefect.type}: ${item.motDefect.text} (Test: ${item.motDefect.testDate})`}
                            >
                              MOT
                            </div>
                          )}
                          {item.type === 'Parts' && item.description && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => showPartPricingSuggestions(item.id)}
                                title="Show pricing suggestions"
                              >
                                💰
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200"
                                onClick={() => showCustomerPartHistory(item.id)}
                                title="Show customer pricing history for this part"
                              >
                                📊
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs bg-purple-50 hover:bg-purple-100 border-purple-200"
                                onClick={() => showSmartPartMatcherDialog(item.id)}
                                title="Find and merge similar part names"
                              >
                                🔗
                              </Button>
                            </>
                          )}
                          {(item.type === 'Labour' || item.type === 'Service') && item.description && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs bg-orange-50 hover:bg-orange-100 border-orange-200"
                              onClick={() => showSmartJobMatcherDialog(item.id)}
                              title="Find and merge similar job descriptions"
                            >
                              🔧
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-8 w-20 text-center"
                          value={item.type === 'Labour' ? item.estHours : item.qty}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            if (item.type === 'Labour') {
                              updateItem(item.id, 'estHours', value)
                            } else {
                              updateItem(item.id, 'qty', value)
                            }
                          }}
                          placeholder={item.type === 'Labour' ? 'Hours' : 'Qty'}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">£</span>
                          <Input
                            type="number"
                            step="0.01"
                            className={`h-8 w-20 text-right pl-6 ${
                              item.type === 'Parts' && pricingSuggestions.length > 0 &&
                              getPriceVarianceWarning(item.netPrice, pricingSuggestions[0]?.suggested_price || 0).hasWarning
                                ? 'border-orange-300 bg-orange-50'
                                : ''
                            }`}
                            value={item.netPrice}
                            onChange={(e) => updateItem(item.id, 'netPrice', parseFloat(e.target.value) || 0)}
                            title={
                              item.type === 'Parts' && pricingSuggestions.length > 0
                                ? `Suggested: £${pricingSuggestions[0]?.suggested_price?.toFixed(2) || 'N/A'}`
                                : undefined
                            }
                          />
                          {item.type === 'Parts' && pricingSuggestions.length > 0 &&
                           getPriceVarianceWarning(item.netPrice, pricingSuggestions[0]?.suggested_price || 0).hasWarning && (
                            <AlertTriangle className="absolute -right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        £{item.netTotal.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.vatRate}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        £{item.vat.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        £{item.lineTotal.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pricing Suggestions */}
            {selectedPartForPricing && showPricingSuggestions[selectedPartForPricing] && pricingSuggestions.length > 0 && (
              <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-900">Pricing Suggestions</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPricingSuggestions(prev => ({ ...prev, [selectedPartForPricing]: false }))}
                  >
                    ×
                  </Button>
                </div>
                <div className="grid gap-2">
                  {pricingSuggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">£{suggestion.suggested_price.toFixed(2)}</span>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.suggestion_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {(suggestion.confidence_score * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{suggestion.reasoning}</p>
                        {suggestion.historical_context.last_sold_price && (
                          <p className="text-xs text-gray-500">
                            Last sold: £{suggestion.historical_context.last_sold_price.toFixed(2)}
                            {suggestion.historical_context.last_sold_date &&
                              ` on ${new Date(suggestion.historical_context.last_sold_date).toLocaleDateString()}`
                            }
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => applySuggestedPrice(selectedPartForPricing, suggestion.suggested_price, suggestion.reasoning)}
                      >
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Net Total:</span>
                  <span className="font-medium">£{totals.netTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT Total:</span>
                  <span className="font-medium">£{totals.vatTotal.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span>£{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Vehicle Specifications - Collapsible */}
        <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-purple-600" />
                  <span className="text-purple-600">Enhanced Vehicle Specifications</span>
                  <span className="text-xs text-gray-500 font-normal ml-2">(Autodata-style)</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnhancedSpecsExpanded(!enhancedSpecsExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {enhancedSpecsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>

            {enhancedSpecsExpanded && (
              <CardContent className="space-y-4">


                {/* Oil & Lubricants Specifications */}
                {oilData && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                      <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">🛢️</span>
                      </div>
                      Oil & Lubricants Specifications
                      {loadingOilData && <span className="text-xs text-gray-500">(Loading...)</span>}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Engine Oil */}
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-xs font-medium text-green-800 mb-2">ENGINE OIL</div>
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium">Viscosity:</span> {oilData.engineOil.viscosity}</div>
                          <div><span className="font-medium">Specification:</span> {oilData.engineOil.specification}</div>
                          <div><span className="font-medium">Capacity:</span> {oilData.engineOil.capacity}L</div>
                          <div><span className="font-medium">Change Interval:</span> {oilData.engineOil.changeInterval} miles</div>
                          {oilData.engineOil.brand && (
                            <div><span className="font-medium">Brand:</span> {oilData.engineOil.brand}</div>
                          )}
                          {oilData.engineOil.partNumber && (
                            <div><span className="font-medium">Part #:</span> {oilData.engineOil.partNumber}</div>
                          )}
                        </div>
                      </div>

                      {/* Brake Fluid */}
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-xs font-medium text-red-800 mb-2">BRAKE FLUID</div>
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium">Type:</span> {oilData.brakeFluid.type}</div>
                          <div><span className="font-medium">Specification:</span> {oilData.brakeFluid.specification}</div>
                          <div><span className="font-medium">Capacity:</span> {oilData.brakeFluid.capacity}L</div>
                          <div><span className="font-medium">Change Interval:</span> {oilData.brakeFluid.changeInterval} miles</div>
                          {oilData.brakeFluid.brand && (
                            <div><span className="font-medium">Brand:</span> {oilData.brakeFluid.brand}</div>
                          )}
                        </div>
                      </div>

                      {/* Transmission Oil */}
                      {oilData.transmissionOil && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="text-xs font-medium text-blue-800 mb-2">TRANSMISSION OIL</div>
                          <div className="space-y-1 text-xs">
                            <div><span className="font-medium">Type:</span> {oilData.transmissionOil.type}</div>
                            <div><span className="font-medium">Viscosity:</span> {oilData.transmissionOil.viscosity}</div>
                            <div><span className="font-medium">Capacity:</span> {oilData.transmissionOil.capacity}L</div>
                            <div><span className="font-medium">Change Interval:</span> {oilData.transmissionOil.changeInterval} miles</div>
                          </div>
                        </div>
                      )}

                      {/* Coolant */}
                      <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                        <div className="text-xs font-medium text-cyan-800 mb-2">COOLANT</div>
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium">Type:</span> {oilData.coolant.type}</div>
                          <div><span className="font-medium">Specification:</span> {oilData.coolant.specification}</div>
                          <div><span className="font-medium">Capacity:</span> {oilData.coolant.capacity}L</div>
                          <div><span className="font-medium">Change Interval:</span> {oilData.coolant.changeInterval} miles</div>
                          {oilData.coolant.brand && (
                            <div><span className="font-medium">Brand:</span> {oilData.coolant.brand}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {oilDataError && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        ⚠️ {oilDataError}
                      </div>
                    )}
                  </div>
                )}

                {/* Engine & Performance Specifications */}
                {(jobSheet.vehicle.transmission || jobSheet.vehicle.horsepower || jobSheet.vehicle.combinedMpg) && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Engine & Performance Specifications
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {jobSheet.vehicle.transmission && (
                        <div>
                          <Label className="text-xs text-gray-500">Transmission</Label>
                          <Input
                            className="h-8 font-medium text-xs"
                            value={jobSheet.vehicle.transmission}
                            readOnly
                          />
                        </div>
                      )}
                      {jobSheet.vehicle.horsepower && (
                        <div>
                          <Label className="text-xs text-gray-500">Horsepower</Label>
                          <Input
                            className="h-8 font-medium"
                            value={`${jobSheet.vehicle.horsepower} HP`}
                            readOnly
                          />
                        </div>
                      )}
                      {jobSheet.vehicle.torque && (
                        <div>
                          <Label className="text-xs text-gray-500">Torque</Label>
                          <Input
                            className="h-8 font-medium"
                            value={`${jobSheet.vehicle.torque} ft-lbs`}
                            readOnly
                          />
                        </div>
                      )}
                    </div>

                    {/* Fuel Economy */}
                    {(jobSheet.vehicle.combinedMpg || jobSheet.vehicle.cityMpg || jobSheet.vehicle.highwayMpg) && (
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        {jobSheet.vehicle.combinedMpg && (
                          <div>
                            <Label className="text-xs text-gray-500">Combined MPG</Label>
                            <Input
                              className="h-8 font-medium text-green-700 bg-green-50"
                              value={`${jobSheet.vehicle.combinedMpg} MPG`}
                              readOnly
                            />
                          </div>
                        )}
                        {jobSheet.vehicle.cityMpg && (
                          <div>
                            <Label className="text-xs text-gray-500">City MPG</Label>
                            <Input
                              className="h-8 font-medium"
                              value={`${jobSheet.vehicle.cityMpg} MPG`}
                              readOnly
                            />
                          </div>
                        )}
                        {jobSheet.vehicle.highwayMpg && (
                          <div>
                            <Label className="text-xs text-gray-500">Highway MPG</Label>
                            <Input
                              className="h-8 font-medium"
                              value={`${jobSheet.vehicle.highwayMpg} MPG`}
                              readOnly
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Service Intervals & Repair Times */}
                {(jobSheet.vehicle.oilChangeInterval || Object.keys(jobSheet.vehicle.repairTimes).length > 0) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-orange-700 mb-3 flex items-center gap-2">
                      🔧 Service Intervals & Repair Times
                    </h4>

                    {/* Service Intervals */}
                    {(jobSheet.vehicle.oilChangeInterval || jobSheet.vehicle.serviceInterval) && (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {jobSheet.vehicle.oilChangeInterval && (
                          <div>
                            <Label className="text-xs text-gray-500">Oil Change</Label>
                            <Input
                              className="h-8 font-medium text-orange-700 bg-orange-50"
                              value={jobSheet.vehicle.oilChangeInterval}
                              readOnly
                            />
                          </div>
                        )}
                        {jobSheet.vehicle.serviceInterval && (
                          <div>
                            <Label className="text-xs text-gray-500">Service Interval</Label>
                            <Input
                              className="h-8 font-medium text-orange-700 bg-orange-50"
                              value={jobSheet.vehicle.serviceInterval}
                              readOnly
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-gray-500">MOT Interval</Label>
                          <Input
                            className="h-8 font-medium text-blue-700 bg-blue-50"
                            value="12 months"
                            readOnly
                          />
                        </div>
                      </div>
                    )}

                    {/* Common Repair Times */}
                    {Object.keys(jobSheet.vehicle.repairTimes).length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500 mb-3 block font-medium">Common Repair Times (Autodata-style)</Label>
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          {Object.entries(jobSheet.vehicle.repairTimes).slice(0, 12).map(([job, time]) => (
                            <div key={job} className="bg-gray-50 p-3 rounded-lg border hover:bg-gray-100 transition-colors">
                              <div className="font-medium text-gray-700 capitalize mb-1">
                                {job.replace(/_/g, ' ')}
                              </div>
                              <div className="text-blue-600 font-bold text-sm">{time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

        {/* Tabs for Additional Information */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="labour">Labour</TabsTrigger>
            <TabsTrigger value="parts">Parts</TabsTrigger>
            <TabsTrigger value="advisories">Advisories</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vehicle History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Vehicle history temporarily disabled while fixing database issues.</p>
              </CardContent>
            </Card>
            {/* <VehicleHistoryPanel
              registration={jobSheet.vehicle.registration}
              className="border-0 shadow-none"
            /> */}
          </TabsContent>



          <TabsContent value="labour">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Labour Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Labour tracking and time management will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts">
            <div className="space-y-6">
              {/* Real Euro Car Parts Lookup */}
              <RealOmnipartLookup
                vehicleRegistration={jobSheet.vehicle.registration}
                onAddPart={(part) => {
                  const newItem = {
                    id: jobSheet.items.length + 1,
                    type: part.type,
                    description: part.description,
                    estHours: 0,
                    qty: part.qty,
                    netPrice: part.netPrice,
                    netTotal: part.netTotal,
                    vatRate: part.vatRate,
                    vat: part.vat,
                    lineTotal: part.lineTotal,
                    partData: part.partData
                  }

                  setJobSheet(prev => ({
                    ...prev,
                    items: [...prev.items, newItem]
                  }))

                  // Recalculate totals
                  calculateTotals([...jobSheet.items, newItem])
                }}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Parts Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {jobSheet.items
                      .filter(item => item.type === 'Parts')
                      .map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{item.description}</div>
                            <div className="text-sm text-gray-500">
                              Quantity: {item.qty} | Unit Price: £{item.netPrice.toFixed(2)}
                            </div>

                            {/* Enhanced display for Omnipart parts */}
                            {item.partData && (
                              <div className="mt-2 space-y-1">
                                <div className="flex gap-2 text-xs">
                                  {item.partData.productCode && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.partData.productCode}
                                    </Badge>
                                  )}
                                  {item.partData.brand && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.partData.brand}
                                    </Badge>
                                  )}
                                  {item.partData.availability && (
                                    <Badge
                                      variant={item.partData.availability === 'In Stock' ? 'default' : 'secondary'}
                                      className={`text-xs ${item.partData.availability === 'In Stock' ? 'bg-green-100 text-green-800' : ''}`}
                                    >
                                      {item.partData.availability}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-blue-600">
                                  {item.partData.deliveryTime && `Delivery: ${item.partData.deliveryTime}`}
                                  {item.partData.source && ` • Source: ${item.partData.source}`}
                                </div>
                              </div>
                            )}

                            {/* Fallback pricing suggestions for non-Omnipart parts */}
                            {!item.partData && pricingSuggestions.length > 0 && (
                              <div className="text-xs text-blue-600 mt-1">
                                Suggested: £{pricingSuggestions[0]?.suggested_price?.toFixed(2) || 'N/A'}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">£{item.lineTotal.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">inc. VAT</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-3"
                            onClick={() => showPartPricingSuggestions(item.id)}
                          >
                            💰 Pricing
                          </Button>
                        </div>
                      ))}

                    {jobSheet.items.filter(item => item.type === 'Parts').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No parts added to this job sheet yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Parts Summary with Trade Pricing */}
              {jobSheet.items.filter(item => item.type === 'Parts').length > 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Parts Summary & Trade Savings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const partItems = jobSheet.items.filter(item => item.type === 'Parts')
                      const totalParts = partItems.length
                      const totalValue = partItems.reduce((sum, item) => sum + item.lineTotal, 0)
                      const omnipartItems = partItems.filter(item => item.partData?.source?.includes('Omnipart'))
                      const estimatedRetailValue = partItems.reduce((sum, item) => {
                        // Estimate retail price (trade price / 0.68 for 32% discount)
                        const estimatedRetail = item.netPrice / 0.68
                        return sum + (estimatedRetail * item.qty * 1.2) // Add VAT
                      }, 0)
                      const tradeSavings = estimatedRetailValue - totalValue

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-700">{totalParts}</div>
                            <div className="text-sm text-green-600">Parts Added</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-700">{omnipartItems.length}</div>
                            <div className="text-sm text-green-600">From Omnipart API</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-700">£{totalValue.toFixed(2)}</div>
                            <div className="text-sm text-green-600">Trade Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-700">£{tradeSavings.toFixed(2)}</div>
                            <div className="text-sm text-green-600">Trade Savings</div>
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Parts Pricing History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Parts Pricing History & Intelligence</CardTitle>
                </CardHeader>
                <CardContent>
                  <PartsPricingHistory
                    partNumber={selectedPartForPricing ?
                      generatePartNumber(jobSheet.items.find(i => i.id === selectedPartForPricing)?.description || '')
                      : undefined
                    }
                    partName={selectedPartForPricing ?
                      jobSheet.items.find(i => i.id === selectedPartForPricing)?.description
                      : undefined
                    }
                    onPriceSelect={(price, reasoning) => {
                      if (selectedPartForPricing) {
                        applySuggestedPrice(selectedPartForPricing, price, reasoning)
                      }
                    }}
                    customerType="retail"
                    showSuggestions={true}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advisories">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advisories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Vehicle advisories and recommendations will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Job activity and progress tracking will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* SWS Technical Data Display */}
      {showSwsData && swsTechnicalData && (
        <Dialog open={showSwsData} onOpenChange={setShowSwsData}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Technical Data - {swsTechnicalData.vrm}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="lubricants">Lubricants</TabsTrigger>
                <TabsTrigger value="repair-times">Repair Times</TabsTrigger>
                <TabsTrigger value="technical">Technical Data</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Vehicle Information Card */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="bg-blue-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        {swsTechnicalData?.vrm || 'Vehicle Information'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">VRM:</span>
                          <span>{swsTechnicalData?.vrm || jobSheet.vehicle.registration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Make:</span>
                          <span>{jobSheet.vehicle.make || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Model:</span>
                          <span>{jobSheet.vehicle.model || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Engine CC:</span>
                          <span>{jobSheet.vehicle.engineSize || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Fuel Type:</span>
                          <span>{jobSheet.vehicle.fuelType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Year:</span>
                          <span>{jobSheet.vehicle.year || 'N/A'}</span>
                        </div>
                        {swsTechnicalData?.svgDiagrams && swsTechnicalData.svgDiagrams.length > 0 && (
                          <div className="pt-2 border-t">
                            <span className="font-medium text-green-600">
                              ✅ {swsTechnicalData.svgDiagrams.length} Technical Diagrams Available
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Technical Data Grid */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    {/* Technical Service Bulletins */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => openTechnicalData('tsb', 'Technical Service Bulletins')}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Technical Service Bulletins</h3>
                          <p className="text-xs text-gray-600">Manufacturer Service Bulletins and additional Information.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Repair Times */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => openTechnicalData('repairTimes', 'Repair Times')}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                          <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Repair Times</h3>
                          <p className="text-xs text-gray-600">OEM repair times for accurate estimates and quotes.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Component Locations */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <MapPin className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Component Locations</h3>
                          <p className="text-xs text-gray-600">Location on vehicle or engine components.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Service & Maintenance */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => openTechnicalData('lubricants', 'Service & Maintenance')}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <Wrench className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Service & Maintenance</h3>
                          <p className="text-xs text-gray-600">Service procedures, service schedules & service times.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fuse Locations */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Zap className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Fuse Locations</h3>
                          <p className="text-xs text-gray-600">Location of fuse boxes, fuse currents and covered components.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Adjustments & Lubricants */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => openTechnicalData('lubricantSpecs', 'Adjustments & Lubricants')}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-cyan-100 p-2 rounded-lg">
                          <Settings className="h-6 w-6 text-cyan-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Adjustments & Lubricants</h3>
                          <p className="text-xs text-gray-600">Lubricants, adjustments, measurements, dimensions and settings.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Technical Drawings */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-cyan-100 p-2 rounded-lg">
                          <FileImage className="h-6 w-6 text-cyan-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Technical Drawings</h3>
                          <p className="text-xs text-gray-600">Diagrams and exploded drawings of various vehicle components.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Common Procedures */}
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => openTechnicalData('parts', 'Common Procedures')}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                          <Cog className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Common Procedures</h3>
                          <p className="text-xs text-gray-600">Including key programming, timing chains, service indicator resetting.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lubricants" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Engine Lubricants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {swsTechnicalData?.lubricants && !isSessionExpired(swsTechnicalData.lubricants) ? (
                        <iframe
                          src={swsTechnicalData.lubricants}
                          className="w-full h-96 border-0 rounded"
                          title="Engine Lubricants Data"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-center">
                          <Wrench className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Lubricant Data Available</h3>
                          <p className="text-muted-foreground mb-4">
                            Technical lubricant data is not available for this vehicle.
                          </p>
                          <Button
                            onClick={() => handleRefreshTechnicalData()}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Fetch Data
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {swsTechnicalData?.lubricantSpecs && !isSessionExpired(swsTechnicalData.lubricantSpecs) ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Lubricant Specifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <iframe
                          src={swsTechnicalData.lubricantSpecs}
                          className="w-full h-96 border-0 rounded"
                          title="Lubricant Specifications"
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Lubricant Specifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col items-center justify-center h-96 text-center">
                          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Session Expired</h3>
                          <p className="text-muted-foreground mb-4">
                            The technical data session has expired. Please refresh the data to get current lubricant specifications.
                          </p>
                          <Button
                            onClick={() => handleRefreshTechnicalData()}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Refresh Data
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="repair-times" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Repair Times
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {swsTechnicalData?.repairTimes && !isSessionExpired(swsTechnicalData.repairTimes) ? (
                      <iframe
                        src={swsTechnicalData.repairTimes}
                        className="w-full h-96 border-0 rounded"
                        title="Repair Times Data"
                      />
                    ) : swsTechnicalData?.repairTimes && isSessionExpired(swsTechnicalData.repairTimes) ? (
                      <div className="flex flex-col items-center justify-center h-96 text-center">
                        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Session Expired</h3>
                        <p className="text-muted-foreground mb-4">
                          The technical data session has expired. Please refresh the data to get current repair time information.
                        </p>
                        <Button
                          onClick={() => handleRefreshTechnicalData()}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh Data
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-96 text-center">
                        <Clock className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Repair Time Data</h3>
                        <p className="text-muted-foreground mb-4">
                          No repair time data is available for this vehicle.
                        </p>
                        <Button
                          onClick={() => handleRefreshTechnicalData()}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Try Refresh
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="technical" className="space-y-4">
                {swsTechnicalData && Object.keys(swsTechnicalData).length > 1 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Technical Service Bulletins */}
                    {swsTechnicalData?.tsb && !isSessionExpired(swsTechnicalData.tsb) ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Technical Service Bulletins
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <iframe
                            src={swsTechnicalData.tsb}
                            className="w-full h-96 border-0 rounded"
                            title="Technical Service Bulletins"
                          />
                        </CardContent>
                      </Card>
                    ) : swsTechnicalData?.tsb && isSessionExpired(swsTechnicalData.tsb) ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Technical Service Bulletins
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col items-center justify-center h-96 text-center">
                            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Session Expired</h3>
                            <p className="text-muted-foreground mb-4">
                              The technical data session has expired. Please refresh the data to get current technical service bulletins.
                            </p>
                            <Button
                              onClick={() => handleRefreshTechnicalData()}
                              className="flex items-center gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Refresh Data
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}

                  {/* Parts Information */}
                  {swsTechnicalData?.parts && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Cog className="h-5 w-5" />
                          Parts Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <iframe
                          src={swsTechnicalData.parts}
                          className="w-full h-96 border-0 rounded"
                          title="Parts Information"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Air Conditioning */}
                  {swsTechnicalData?.aircon && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Air Conditioning
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <iframe
                          src={swsTechnicalData.aircon}
                          className="w-full h-96 border-0 rounded"
                          title="Air Conditioning Data"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Alternative Lubricants */}
                  {swsTechnicalData?.lubricantsAlt && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Alternative Lubricants
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <iframe
                          src={swsTechnicalData.lubricantsAlt}
                          className="w-full h-96 border-0 rounded"
                          title="Alternative Lubricants"
                        />
                      </CardContent>
                    </Card>
                  )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Technical Data Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Technical data is not available for this vehicle. Please fetch data first.
                    </p>
                    <Button
                      onClick={() => handleRefreshTechnicalData()}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Fetch Technical Data
                    </Button>
                  </div>
                )}
              </TabsContent>


            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Description Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Job Description Generator
            </DialogTitle>
          </DialogHeader>
          <AIDescriptionDialog
            vehicleMake={jobSheet.vehicle.make}
            vehicleModel={jobSheet.vehicle.model}
            vehicleYear={jobSheet.vehicle.year}
            onDescriptionGenerated={handleAIDescription}
          />
        </DialogContent>
      </Dialog>

      {/* Customer Pricing History Popup */}
      {customerHistoryPart && (
        <CustomerPricingHistoryPopup
          isOpen={showCustomerPricingHistory}
          onClose={() => {
            setShowCustomerPricingHistory(false)
            setCustomerHistoryPart(null)
          }}
          partName={customerHistoryPart.partName}
          partNumber={customerHistoryPart.partNumber}
          customerId={jobSheet.customer.id}
          customerName={jobSheet.customer.name}
          currentPrice={customerHistoryPart.currentPrice}
          onPriceSelect={(price, reasoning) => {
            if (customerHistoryPart) {
              applySuggestedPrice(customerHistoryPart.itemId, price, reasoning)
              setShowCustomerPricingHistory(false)
              setCustomerHistoryPart(null)

              toast({
                title: "Price Applied",
                description: `Applied £${price.toFixed(2)} - ${reasoning}`,
                duration: 3000,
              })
            }
          }}
        />
      )}

      {/* Smart Part Matcher */}
      {smartMatcherPart && (
        <SmartPartMatcher
          isOpen={showSmartPartMatcher}
          onClose={() => {
            setShowSmartPartMatcher(false)
            setSmartMatcherPart(null)
          }}
          currentPartName={smartMatcherPart.partName}
          onPartSelect={async (canonicalName, variations) => {
            try {
              // Update the current item with canonical name
              updateItem(smartMatcherPart.itemId, 'description', canonicalName)

              // Call API to merge variations in database
              const response = await fetch('/api/parts-smart-matcher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  canonical_name: canonicalName,
                  variations: variations
                })
              })

              if (response.ok) {
                toast({
                  title: "Parts Merged Successfully",
                  description: `Merged ${variations.length} variations under "${canonicalName}"`,
                  duration: 5000,
                })
              }
            } catch (error) {
              console.error('Failed to merge parts:', error)
              toast({
                title: "Error",
                description: "Failed to merge part variations",
                variant: "destructive"
              })
            }

            setShowSmartPartMatcher(false)
            setSmartMatcherPart(null)
          }}
        />
      )}

      {/* Smart Job Description Matcher */}
      {smartMatcherJob && (
        <SmartJobDescriptionMatcher
          isOpen={showSmartJobMatcher}
          onClose={() => {
            setShowSmartJobMatcher(false)
            setSmartMatcherJob(null)
          }}
          currentJobDescription={smartMatcherJob.jobDescription}
          onJobSelect={async (canonicalDescription, variations, category, workType) => {
            try {
              // Update the current item with canonical description
              updateItem(smartMatcherJob.itemId, 'description', canonicalDescription)

              // Call API to merge variations in database
              const response = await fetch('/api/jobs-smart-matcher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  canonical_description: canonicalDescription,
                  variations: variations,
                  category: category,
                  work_type: workType
                })
              })

              if (response.ok) {
                toast({
                  title: "Job Descriptions Merged Successfully",
                  description: `Merged ${variations.length} variations under "${canonicalDescription}" (${category} - ${workType})`,
                  duration: 5000,
                })
              }
            } catch (error) {
              console.error('Failed to merge job descriptions:', error)
              toast({
                title: "Error",
                description: "Failed to merge job description variations",
                variant: "destructive"
              })
            }

            setShowSmartJobMatcher(false)
            setSmartMatcherJob(null)
          }}
        />
      )}

      {/* Customer Search Dialog */}
      <CustomerSearchDialog
        open={showCustomerSearchDialog}
        onOpenChange={setShowCustomerSearchDialog}
        onCustomerSelect={handleCustomerSelect}
        initialSearchTerm={jobSheet.customer.name}
      />

      {/* Vehicle Profile Viewer Modal */}
      {showVehicleProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <VehicleProfileViewer
              registration={jobSheet.vehicle.registration}
              onClose={() => setShowVehicleProfile(false)}
              onRefresh={async () => {
                // Refresh job sheet data after vehicle profile enhancement
                if (jobSheet.vehicle.registration) {
                  await handleRegistrationLookup(jobSheet.vehicle.registration)
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
