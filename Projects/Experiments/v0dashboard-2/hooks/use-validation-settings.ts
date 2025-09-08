import { useState, useEffect } from 'react'

export interface ValidationSettings {
  // Vehicle Requirements
  vehicle_registration_required_for_print: boolean
  vehicle_registration_required_for_invoice: boolean
  vehicle_make_required_for_print: boolean
  vehicle_make_required_for_invoice: boolean
  vehicle_model_required_for_print: boolean
  vehicle_model_required_for_invoice: boolean
  
  // Customer Requirements
  customer_name_required_for_print: boolean
  customer_name_required_for_invoice: boolean
  customer_contact_required_for_print: boolean
  customer_contact_required_for_invoice: boolean
  customer_address_required_for_print: boolean
  customer_address_required_for_invoice: boolean
  
  // Job Requirements
  mileage_required_for_print: boolean
  mileage_required_for_invoice: boolean
  technician_required_for_print: boolean
  technician_required_for_invoice: boolean
  service_advisor_required_for_print: boolean
  service_advisor_required_for_invoice: boolean
  
  // Job Items Requirements
  items_required_for_print: boolean
  items_required_for_invoice: boolean
  
  // Custom Messages
  print_blocked_message: string
  invoice_blocked_message: string
  
  // Validation Strictness
  show_warnings: boolean
  block_on_warnings: boolean
}

const DEFAULT_SETTINGS: ValidationSettings = {
  vehicle_registration_required_for_print: true,
  vehicle_registration_required_for_invoice: true,
  vehicle_make_required_for_print: false,
  vehicle_make_required_for_invoice: false,
  vehicle_model_required_for_print: false,
  vehicle_model_required_for_invoice: false,
  customer_name_required_for_print: true,
  customer_name_required_for_invoice: true,
  customer_contact_required_for_print: true,
  customer_contact_required_for_invoice: true,
  customer_address_required_for_print: false,
  customer_address_required_for_invoice: true,
  mileage_required_for_print: true,
  mileage_required_for_invoice: true,
  technician_required_for_print: false,
  technician_required_for_invoice: false,
  service_advisor_required_for_print: false,
  service_advisor_required_for_invoice: false,
  items_required_for_print: false,
  items_required_for_invoice: false,
  print_blocked_message: "Please complete all required fields before printing. Check the validation details for specific requirements.",
  invoice_blocked_message: "Please complete all required fields before invoicing. Ensure customer address is complete for proper invoicing.",
  show_warnings: true,
  block_on_warnings: false
}

export function useValidationSettings() {
  const [settings, setSettings] = useState<ValidationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/settings/validation')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
      } else {
        throw new Error(data.error || 'Failed to load validation settings')
      }
    } catch (err) {
      console.error('Error loading validation settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      // Keep using default settings on error
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings: ValidationSettings) => {
    try {
      const response = await fetch('/api/settings/validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      })

      const data = await response.json()

      if (data.success) {
        setSettings(newSettings)
        return { success: true }
      } else {
        throw new Error(data.error || 'Failed to save validation settings')
      }
    } catch (err) {
      console.error('Error saving validation settings:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to save settings' 
      }
    }
  }

  const refreshSettings = () => {
    loadSettings()
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return {
    settings,
    loading,
    error,
    saveSettings,
    refreshSettings
  }
}

// Helper function to get field requirement status
export function getFieldRequirement(
  settings: ValidationSettings,
  field: string,
  action: 'print' | 'invoice'
): boolean {
  const key = `${field}_required_for_${action}` as keyof ValidationSettings
  return settings[key] as boolean
}

// Helper function to get custom messages
export function getValidationMessage(
  settings: ValidationSettings,
  action: 'print' | 'invoice'
): string {
  return action === 'print' 
    ? settings.print_blocked_message 
    : settings.invoice_blocked_message
}
