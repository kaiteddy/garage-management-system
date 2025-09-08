"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, 
  Building2, 
  Users, 
  Wrench, 
  Car, 
  MessageSquare, 
  Globe,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface BusinessSettings {
  [key: string]: {
    value: any
    type: string
    category: string
    description: string
  }
}

interface Technician {
  id: number
  name: string
  email: string
  phone: string
  specialization: string
  is_active: boolean
}

interface ServiceBay {
  id: number
  name: string
  description: string
  bay_type: string
  is_active: boolean
}

export default function BusinessSettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>({})
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [serviceBays, setServiceBays] = useState<ServiceBay[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null)
  const [editingServiceBay, setEditingServiceBay] = useState<ServiceBay | null>(null)
  const [newTechnician, setNewTechnician] = useState({ name: '', email: '', phone: '', specialization: '' })
  const [newServiceBay, setNewServiceBay] = useState({ name: '', description: '', bay_type: 'general' })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/business-settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
        setTechnicians(data.technicians)
        setServiceBays(data.serviceBays)
      } else {
        toast.error("Failed to load business settings")
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error("Error loading business settings")
    } finally {
      setLoading(false)
    }
  }

  const initializeSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/business-settings/init', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Business settings initialized successfully")
        await loadSettings()
      } else {
        toast.error("Failed to initialize settings")
      }
    } catch (error) {
      console.error('Error initializing settings:', error)
      toast.error("Error initializing settings")
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = async (key: string, value: any, type: string) => {
    try {
      const response = await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_setting',
          data: { key, value, type }
        })
      })

      const data = await response.json()
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          [key]: { ...prev[key], value }
        }))
        toast.success("Setting updated successfully")
      } else {
        toast.error("Failed to update setting")
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      toast.error("Error updating setting")
    }
  }

  const addTechnician = async () => {
    if (!newTechnician.name.trim()) {
      toast.error("Technician name is required")
      return
    }

    try {
      const response = await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_technician',
          data: newTechnician
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Technician added successfully")
        setNewTechnician({ name: '', email: '', phone: '', specialization: '' })
        await loadSettings()
      } else {
        toast.error("Failed to add technician")
      }
    } catch (error) {
      console.error('Error adding technician:', error)
      toast.error("Error adding technician")
    }
  }

  const updateTechnician = async (technician: Technician) => {
    try {
      const response = await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_technician',
          data: technician
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Technician updated successfully")
        setEditingTechnician(null)
        await loadSettings()
      } else {
        toast.error("Failed to update technician")
      }
    } catch (error) {
      console.error('Error updating technician:', error)
      toast.error("Error updating technician")
    }
  }

  const deleteTechnician = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this technician?")) return

    try {
      const response = await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_technician',
          data: { id }
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Technician deactivated successfully")
        await loadSettings()
      } else {
        toast.error("Failed to deactivate technician")
      }
    } catch (error) {
      console.error('Error deactivating technician:', error)
      toast.error("Error deactivating technician")
    }
  }

  const addServiceBay = async () => {
    if (!newServiceBay.name.trim()) {
      toast.error("Service bay name is required")
      return
    }

    try {
      const response = await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_service_bay',
          data: newServiceBay
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Service bay added successfully")
        setNewServiceBay({ name: '', description: '', bay_type: 'general' })
        await loadSettings()
      } else {
        toast.error("Failed to add service bay")
      }
    } catch (error) {
      console.error('Error adding service bay:', error)
      toast.error("Error adding service bay")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading business settings...</p>
        </div>
      </div>
    )
  }

  if (Object.keys(settings).length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Business Settings</h1>
          <p className="text-muted-foreground mb-6">
            Initialize your business settings to get started
          </p>
          <Button onClick={initializeSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Initialize Settings
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
          <p className="text-muted-foreground">
            Configure your business information, technicians, and system settings
          </p>
        </div>
        <Button onClick={loadSettings} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="technicians" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Technicians
          </TabsTrigger>
          <TabsTrigger value="service-bays" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Service Bays
          </TabsTrigger>
          <TabsTrigger value="mot" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            MOT
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Business Information Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={settings.business_name?.value || ''}
                    onChange={(e) => updateSetting('business_name', e.target.value, 'string')}
                    placeholder="Your Garage Name"
                  />
                </div>
                <div>
                  <Label htmlFor="business_phone">Phone Number</Label>
                  <Input
                    id="business_phone"
                    value={settings.business_phone?.value || ''}
                    onChange={(e) => updateSetting('business_phone', e.target.value, 'string')}
                    placeholder="01234 567890"
                  />
                </div>
                <div>
                  <Label htmlFor="business_email">Email Address</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={settings.business_email?.value || ''}
                    onChange={(e) => updateSetting('business_email', e.target.value, 'string')}
                    placeholder="info@yourgarage.com"
                  />
                </div>
                <div>
                  <Label htmlFor="business_website">Website</Label>
                  <Input
                    id="business_website"
                    value={settings.business_website?.value || ''}
                    onChange={(e) => updateSetting('business_website', e.target.value, 'string')}
                    placeholder="https://yourgarage.com"
                  />
                </div>
                <div>
                  <Label htmlFor="vat_number">VAT Number</Label>
                  <Input
                    id="vat_number"
                    value={settings.vat_number?.value || ''}
                    onChange={(e) => updateSetting('vat_number', e.target.value, 'string')}
                    placeholder="GB123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="company_registration">Company Registration</Label>
                  <Input
                    id="company_registration"
                    value={settings.company_registration?.value || ''}
                    onChange={(e) => updateSetting('company_registration', e.target.value, 'string')}
                    placeholder="12345678"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="business_address">Business Address</Label>
                <Textarea
                  id="business_address"
                  value={settings.business_address?.value || ''}
                  onChange={(e) => updateSetting('business_address', e.target.value, 'text')}
                  placeholder="123 High Street, Your Town, County, AB1 2CD"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technicians Tab */}
        <TabsContent value="technicians">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Technician</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Name *"
                    value={newTechnician.name}
                    onChange={(e) => setNewTechnician({...newTechnician, name: e.target.value})}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newTechnician.email}
                    onChange={(e) => setNewTechnician({...newTechnician, email: e.target.value})}
                  />
                  <Input
                    placeholder="Phone"
                    value={newTechnician.phone}
                    onChange={(e) => setNewTechnician({...newTechnician, phone: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Specialization"
                      value={newTechnician.specialization}
                      onChange={(e) => setNewTechnician({...newTechnician, specialization: e.target.value})}
                    />
                    <Button onClick={addTechnician}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Technicians ({technicians.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {technicians.map((tech) => (
                    <div key={tech.id} className="flex items-center justify-between p-4 border rounded-lg">
                      {editingTechnician?.id === tech.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Input
                            value={editingTechnician.name}
                            onChange={(e) => setEditingTechnician({...editingTechnician, name: e.target.value})}
                          />
                          <Input
                            value={editingTechnician.email}
                            onChange={(e) => setEditingTechnician({...editingTechnician, email: e.target.value})}
                          />
                          <Input
                            value={editingTechnician.phone}
                            onChange={(e) => setEditingTechnician({...editingTechnician, phone: e.target.value})}
                          />
                          <Input
                            value={editingTechnician.specialization}
                            onChange={(e) => setEditingTechnician({...editingTechnician, specialization: e.target.value})}
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-medium">{tech.name}</h3>
                              <p className="text-sm text-muted-foreground">{tech.specialization}</p>
                            </div>
                            {tech.email && (
                              <Badge variant="outline">{tech.email}</Badge>
                            )}
                            {tech.phone && (
                              <Badge variant="outline">{tech.phone}</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {editingTechnician?.id === tech.id ? (
                          <>
                            <Button size="sm" onClick={() => updateTechnician(editingTechnician)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTechnician(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setEditingTechnician(tech)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteTechnician(tech.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Service Bays Tab */}
        <TabsContent value="service-bays">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Service Bay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Bay Name *"
                    value={newServiceBay.name}
                    onChange={(e) => setNewServiceBay({...newServiceBay, name: e.target.value})}
                  />
                  <Input
                    placeholder="Description"
                    value={newServiceBay.description}
                    onChange={(e) => setNewServiceBay({...newServiceBay, description: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 border rounded-md"
                      value={newServiceBay.bay_type}
                      onChange={(e) => setNewServiceBay({...newServiceBay, bay_type: e.target.value})}
                    >
                      <option value="general">General</option>
                      <option value="mot">MOT</option>
                      <option value="service">Service</option>
                      <option value="diagnostic">Diagnostic</option>
                    </select>
                    <Button onClick={addServiceBay}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Service Bays ({serviceBays.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceBays.map((bay) => (
                    <div key={bay.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{bay.name}</h3>
                        <Badge variant="outline">{bay.bay_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{bay.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MOT Settings Tab */}
        <TabsContent value="mot">
          <Card>
            <CardHeader>
              <CardTitle>MOT Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mot_test_fee">MOT Test Fee (£)</Label>
                  <Input
                    id="mot_test_fee"
                    type="number"
                    step="0.01"
                    value={settings.mot_test_fee?.value || ''}
                    onChange={(e) => updateSetting('mot_test_fee', parseFloat(e.target.value), 'decimal')}
                  />
                </div>
                <div>
                  <Label htmlFor="default_mot_reminder">Default Reminder Period</Label>
                  <select
                    id="default_mot_reminder"
                    className="w-full px-3 py-2 border rounded-md"
                    value={settings.default_mot_reminder?.value || ''}
                    onChange={(e) => updateSetting('default_mot_reminder', e.target.value, 'string')}
                  >
                    <option value="2 weeks">2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="3 months">3 months</option>
                    <option value="6 months">6 months</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Enable SMS reminders and notifications</p>
                </div>
                <Switch
                  checked={settings.sms_enabled?.value || false}
                  onCheckedChange={(checked) => updateSetting('sms_enabled', checked, 'boolean')}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Enable email reminders and notifications</p>
                </div>
                <Switch
                  checked={settings.email_enabled?.value || false}
                  onCheckedChange={(checked) => updateSetting('email_enabled', checked, 'boolean')}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>WhatsApp Notifications</Label>
                  <p className="text-sm text-muted-foreground">Enable WhatsApp reminders and notifications</p>
                </div>
                <Switch
                  checked={settings.whatsapp_enabled?.value || false}
                  onCheckedChange={(checked) => updateSetting('whatsapp_enabled', checked, 'boolean')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default_labour_rate">Default Labour Rate (£/hour)</Label>
                  <Input
                    id="default_labour_rate"
                    type="number"
                    step="0.01"
                    value={settings.default_labour_rate?.value || ''}
                    onChange={(e) => updateSetting('default_labour_rate', parseFloat(e.target.value), 'decimal')}
                  />
                </div>
                <div>
                  <Label htmlFor="vat_rate">VAT Rate (%)</Label>
                  <Input
                    id="vat_rate"
                    type="number"
                    step="0.01"
                    value={settings.vat_rate?.value || ''}
                    onChange={(e) => updateSetting('vat_rate', parseFloat(e.target.value), 'decimal')}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_terms_days">Payment Terms (Days)</Label>
                  <Input
                    id="payment_terms_days"
                    type="number"
                    value={settings.payment_terms_days?.value || ''}
                    onChange={(e) => updateSetting('payment_terms_days', parseInt(e.target.value), 'integer')}
                  />
                </div>
                <div>
                  <Label htmlFor="currency_symbol">Currency Symbol</Label>
                  <Input
                    id="currency_symbol"
                    value={settings.currency_symbol?.value || ''}
                    onChange={(e) => updateSetting('currency_symbol', e.target.value, 'string')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
