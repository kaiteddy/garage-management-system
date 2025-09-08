'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  Settings,
  FileText,
  Receipt,
  Car,
  User,
  Briefcase,
  Gauge,
  AlertCircle,
  Info
} from "lucide-react"

interface ValidationSettings {
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

export default function ValidationSettingsPage() {
  const [settings, setSettings] = useState<ValidationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const { toast } = useToast()

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/validation')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
        setIsDefault(data.isDefault || false)
      } else {
        throw new Error(data.error || 'Failed to load settings')
      }
    } catch (error) {
      console.error('Error loading validation settings:', error)
      toast({
        title: "Error Loading Settings",
        description: "Using default settings. Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (data.success) {
        setIsDefault(false)
        toast({
          title: "Settings Saved",
          description: "Job sheet validation settings have been updated successfully.",
        })
      } else {
        throw new Error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving validation settings:', error)
      toast({
        title: "Error Saving Settings",
        description: "Failed to save validation settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
    toast({
      title: "Settings Reset",
      description: "Validation settings have been reset to defaults. Remember to save your changes.",
    })
  }

  const updateSetting = (key: keyof ValidationSettings, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const RequirementRow = ({ 
    label, 
    printKey, 
    invoiceKey, 
    icon: Icon,
    description 
  }: {
    label: string
    printKey: keyof ValidationSettings
    invoiceKey: keyof ValidationSettings
    icon: any
    description?: string
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-gray-500" />
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3 text-blue-500" />
          <Switch
            checked={settings[printKey] as boolean}
            onCheckedChange={(checked) => updateSetting(printKey, checked)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Receipt className="h-3 w-3 text-green-500" />
          <Switch
            checked={settings[invoiceKey] as boolean}
            onCheckedChange={(checked) => updateSetting(invoiceKey, checked)}
          />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border border-gray-300 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Job Sheet Validation Settings</h1>
          {isDefault && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Using Defaults
            </Badge>
          )}
        </div>
        <p className="text-gray-600">
          Configure which fields are required before printing or invoicing job sheets.
        </p>
      </div>

      {/* Legend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Required for Printing</span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-green-500" />
              <span className="text-sm">Required for Invoicing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Vehicle Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicle Information
            </CardTitle>
            <CardDescription>
              Configure which vehicle details are required for printing and invoicing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <RequirementRow
              label="Vehicle Registration"
              printKey="vehicle_registration_required_for_print"
              invoiceKey="vehicle_registration_required_for_invoice"
              icon={Car}
              description="Vehicle registration number (e.g., AB12 CDE)"
            />
            <Separator />
            <RequirementRow
              label="Vehicle Make"
              printKey="vehicle_make_required_for_print"
              invoiceKey="vehicle_make_required_for_invoice"
              icon={Car}
              description="Vehicle manufacturer (e.g., Ford, BMW)"
            />
            <Separator />
            <RequirementRow
              label="Vehicle Model"
              printKey="vehicle_model_required_for_print"
              invoiceKey="vehicle_model_required_for_invoice"
              icon={Car}
              description="Vehicle model (e.g., Focus, 3 Series)"
            />
          </CardContent>
        </Card>

        {/* Customer Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              Customer Information
            </CardTitle>
            <CardDescription>
              Configure which customer details are required for printing and invoicing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <RequirementRow
              label="Customer Name"
              printKey="customer_name_required_for_print"
              invoiceKey="customer_name_required_for_invoice"
              icon={User}
              description="Customer's full name"
            />
            <Separator />
            <RequirementRow
              label="Contact Information"
              printKey="customer_contact_required_for_print"
              invoiceKey="customer_contact_required_for_invoice"
              icon={User}
              description="At least one: phone, mobile, or email"
            />
            <Separator />
            <RequirementRow
              label="Complete Address"
              printKey="customer_address_required_for_print"
              invoiceKey="customer_address_required_for_invoice"
              icon={User}
              description="House number, road, town, and postcode"
            />
          </CardContent>
        </Card>

        {/* Job Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              Job Information
            </CardTitle>
            <CardDescription>
              Configure which job details are required for printing and invoicing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <RequirementRow
              label="Vehicle Mileage"
              printKey="mileage_required_for_print"
              invoiceKey="mileage_required_for_invoice"
              icon={Gauge}
              description="Current vehicle mileage or 'Not Recorded'"
            />
            <Separator />
            <RequirementRow
              label="Assigned Technician"
              printKey="technician_required_for_print"
              invoiceKey="technician_required_for_invoice"
              icon={Briefcase}
              description="Technician responsible for the work"
            />
            <Separator />
            <RequirementRow
              label="Service Advisor"
              printKey="service_advisor_required_for_print"
              invoiceKey="service_advisor_required_for_invoice"
              icon={Briefcase}
              description="Service advisor handling customer communication"
            />
            <Separator />
            <RequirementRow
              label="Work Items"
              printKey="items_required_for_print"
              invoiceKey="items_required_for_invoice"
              icon={Briefcase}
              description="At least one labour or parts item"
            />
          </CardContent>
        </Card>

        {/* Validation Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Validation Behavior
            </CardTitle>
            <CardDescription>
              Configure how the validation system behaves.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Show Warnings</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Display warnings for recommended but not required fields
                </p>
              </div>
              <Switch
                checked={settings.show_warnings}
                onCheckedChange={(checked) => updateSetting('show_warnings', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Block on Warnings</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Prevent printing/invoicing when warnings are present
                </p>
              </div>
              <Switch
                checked={settings.block_on_warnings}
                onCheckedChange={(checked) => updateSetting('block_on_warnings', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Custom Error Messages
            </CardTitle>
            <CardDescription>
              Customize the messages shown when validation fails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Print Blocked Message</Label>
              <Textarea
                value={settings.print_blocked_message}
                onChange={(e) => updateSetting('print_blocked_message', e.target.value)}
                placeholder="Message shown when printing is blocked..."
                className="mt-2"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Invoice Blocked Message</Label>
              <Textarea
                value={settings.invoice_blocked_message}
                onChange={(e) => updateSetting('invoice_blocked_message', e.target.value)}
                placeholder="Message shown when invoicing is blocked..."
                className="mt-2"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
            {saving ? (
              <div className="animate-spin h-4 w-4 border border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button variant="outline" onClick={resetToDefaults} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  )
}
