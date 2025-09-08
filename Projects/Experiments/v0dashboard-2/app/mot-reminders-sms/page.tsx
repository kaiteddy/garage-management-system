"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  MessageSquare, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users,
  Car,
  Phone,
  Calendar,
  RefreshCw,
  TestTube,
  Settings,
  Eye,
  Download,
  ExternalLink
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Vehicle {
  id: string
  registration: string
  make: string
  model: string
  mot_expiry_date: string
  mot_status: string
  customer_name: string
  phone: string
  mobile: string
  days_until_expiry: number
}

interface ReminderHistory {
  id: string
  vehicle_registration: string
  customer_name: string
  phone_number: string
  message_content: string
  status: string
  sent_at: string
  reminder_type: string
}

export default function MOTRemindersSMSPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [reminderType, setReminderType] = useState<'expired' | 'expiring_soon' | 'custom'>('expiring_soon')
  const [customDays, setCustomDays] = useState(30)
  const [messageTemplate, setMessageTemplate] = useState('')
  const [testMode, setTestMode] = useState(true)

  // Default message templates
  const defaultTemplates = {
    expired: "Hi {customerName}, your {make} {model} ({registration}) MOT expired on {motDate}. Please book your MOT test urgently. Contact us to arrange. Reply STOP to opt out.",
    expiring_soon: "Hi {customerName}, your {make} {model} ({registration}) MOT expires on {motDate}. Book your MOT test now to avoid any issues. Contact us to arrange. Reply STOP to opt out.",
    custom: "Hi {customerName}, your {make} {model} ({registration}) MOT expires on {motDate}. Don't forget to book your MOT test. Contact us to arrange. Reply STOP to opt out."
  }

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mot-critical')
      const data = await response.json()
      
      if (data.success) {
        const allVehicles = [
          ...data.categories.expired.map((v: any) => ({ ...v, category: 'expired' })),
          ...data.categories.expiringSoon.map((v: any) => ({ ...v, category: 'expiring_soon' }))
        ]
        setVehicles(allVehicles)
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchReminderHistory = async () => {
    try {
      const response = await fetch('/api/mot-reminders/history')
      const data = await response.json()
      
      if (data.success) {
        setReminderHistory(data.reminders)
      }
    } catch (error) {
      console.error('Error fetching reminder history:', error)
    }
  }

  const setupDatabase = async () => {
    try {
      const response = await fetch('/api/mot-reminders/setup-table', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        console.log('MOT reminders table setup complete')
      }
    } catch (error) {
      console.error('Error setting up database:', error)
    }
  }

  const sendReminders = async () => {
    try {
      setSending(true)
      
      const requestBody = {
        vehicleIds: selectedVehicles.length > 0 ? selectedVehicles : undefined,
        reminderType,
        customDays: reminderType === 'custom' ? customDays : undefined,
        messageTemplate: messageTemplate || defaultTemplates[reminderType],
        testMode
      }

      const response = await fetch('/api/mot-reminders/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: testMode ? "Test Complete" : "Reminders Sent",
          description: `${data.sent} reminders ${testMode ? 'tested' : 'sent'}, ${data.failed} failed`,
        })
        
        // Refresh history
        fetchReminderHistory()
        
        // Clear selections
        setSelectedVehicles([])
      } else {
        throw new Error(data.error || 'Failed to send reminders')
      }
    } catch (error) {
      console.error('Error sending reminders:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reminders",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    )
  }

  const selectAllVehicles = () => {
    const filteredVehicles = getFilteredVehicles()
    const allIds = filteredVehicles.map(v => v.id)
    setSelectedVehicles(allIds)
  }

  const clearSelection = () => {
    setSelectedVehicles([])
  }

  const getFilteredVehicles = () => {
    return vehicles.filter(vehicle => {
      switch (reminderType) {
        case 'expired':
          return vehicle.days_until_expiry < 0
        case 'expiring_soon':
          return vehicle.days_until_expiry >= 0 && vehicle.days_until_expiry <= 30
        case 'custom':
          return vehicle.days_until_expiry >= 0 && vehicle.days_until_expiry <= customDays
        default:
          return true
      }
    })
  }

  useEffect(() => {
    fetchVehicles()
    fetchReminderHistory()
    setupDatabase()
  }, [])

  useEffect(() => {
    setMessageTemplate(defaultTemplates[reminderType])
  }, [reminderType])

  const filteredVehicles = getFilteredVehicles()
  const expiredCount = vehicles.filter(v => v.days_until_expiry < 0).length
  const expiringSoonCount = vehicles.filter(v => v.days_until_expiry >= 0 && v.days_until_expiry <= 30).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MOT SMS Reminders</h1>
          <p className="text-gray-600 mt-2">Send SMS reminders for MOT expiry dates via Twilio</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchVehicles} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              <Car className="h-3 w-3 inline mr-1" />
              Requiring attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Expired MOTs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
            <div className="text-xs text-gray-500 mt-1">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Urgent action needed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringSoonCount}</div>
            <div className="text-xs text-gray-500 mt-1">
              <Clock className="h-3 w-3 inline mr-1" />
              Next 30 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedVehicles.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Ready to send
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Send Reminders</TabsTrigger>
          <TabsTrigger value="history">Reminder History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          {/* Reminder Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Reminder Configuration</CardTitle>
              <CardDescription>Configure and send MOT reminders via SMS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reminder Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Reminder Type</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={reminderType === 'expired' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReminderType('expired')}
                    >
                      Expired
                    </Button>
                    <Button
                      variant={reminderType === 'expiring_soon' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReminderType('expiring_soon')}
                    >
                      Expiring Soon
                    </Button>
                    <Button
                      variant={reminderType === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReminderType('custom')}
                    >
                      Custom
                    </Button>
                  </div>
                </div>

                {reminderType === 'custom' && (
                  <div>
                    <Label htmlFor="customDays">Days Ahead</Label>
                    <Input
                      id="customDays"
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                      min="1"
                      max="365"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="testMode"
                    checked={testMode}
                    onCheckedChange={(checked) => setTestMode(checked as boolean)}
                  />
                  <Label htmlFor="testMode" className="text-sm">
                    Test Mode (don't send actual SMS)
                  </Label>
                </div>
              </div>

              {/* Message Template */}
              <div>
                <Label htmlFor="messageTemplate">Message Template</Label>
                <Textarea
                  id="messageTemplate"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={3}
                  className="mt-2"
                  placeholder="Enter your message template..."
                />
                <div className="text-xs text-gray-500 mt-1">
                  Available placeholders: {'{customerName}'}, {'{registration}'}, {'{make}'}, {'{model}'}, {'{motDate}'}, {'{status}'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={sendReminders} disabled={sending || filteredVehicles.length === 0}>
                  {sending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : testMode ? (
                    <TestTube className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {sending ? 'Sending...' : testMode ? 'Test Reminders' : 'Send Reminders'}
                  {selectedVehicles.length > 0 && ` (${selectedVehicles.length})`}
                </Button>
                
                <Button onClick={selectAllVehicles} variant="outline" disabled={filteredVehicles.length === 0}>
                  Select All ({filteredVehicles.length})
                </Button>
                
                <Button onClick={clearSelection} variant="outline" disabled={selectedVehicles.length === 0}>
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vehicles List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Vehicles ({filteredVehicles.length})
                {selectedVehicles.length > 0 && ` - ${selectedVehicles.length} selected`}
              </CardTitle>
              <CardDescription>
                {reminderType === 'expired' && 'Vehicles with expired MOTs'}
                {reminderType === 'expiring_soon' && 'Vehicles with MOTs expiring in the next 30 days'}
                {reminderType === 'custom' && `Vehicles with MOTs expiring in the next ${customDays} days`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading vehicles...
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No vehicles found matching the selected criteria
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedVehicles.includes(vehicle.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleVehicleSelection(vehicle.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedVehicles.includes(vehicle.id)}
                          onChange={() => toggleVehicleSelection(vehicle.id)}
                        />
                        <div>
                          <div className="font-medium">
                            {vehicle.registration} - {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-sm text-gray-600">
                            {vehicle.customer_name} • {vehicle.phone || vehicle.mobile}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={vehicle.days_until_expiry < 0 ? 'destructive' : 'secondary'}
                        >
                          {vehicle.days_until_expiry < 0
                            ? `Expired ${Math.abs(vehicle.days_until_expiry)} days ago`
                            : `${vehicle.days_until_expiry} days left`
                          }
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          MOT: {new Date(vehicle.mot_expiry_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Reminder History</CardTitle>
              <CardDescription>View previously sent MOT reminders</CardDescription>
            </CardHeader>
            <CardContent>
              {reminderHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No reminders sent yet
                </div>
              ) : (
                <div className="space-y-2">
                  {reminderHistory.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {reminder.vehicle_registration} - {reminder.customer_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {reminder.phone_number} • {new Date(reminder.sent_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={reminder.status === 'sent' ? 'default' : 'destructive'}>
                          {reminder.status}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {reminder.reminder_type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>Configure Twilio settings for SMS reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Twilio Setup Required</span>
                  </div>
                  <p className="text-blue-800 text-sm mb-3">
                    To send SMS reminders, you need to configure your Twilio credentials in the environment variables.
                  </p>
                  <Button variant="outline" onClick={() => window.open('/twilio-config', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Twilio Configuration
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Required Environment Variables</Label>
                    <div className="mt-2 space-y-1 text-sm font-mono bg-gray-50 p-3 rounded">
                      <div>TWILIO_ACCOUNT_SID</div>
                      <div>TWILIO_AUTH_TOKEN</div>
                      <div>TWILIO_PHONE_NUMBER</div>
                    </div>
                  </div>

                  <div>
                    <Label>Message Templates</Label>
                    <div className="mt-2 space-y-2">
                      <Button variant="outline" size="sm" onClick={() => setMessageTemplate(defaultTemplates.expired)}>
                        Load Expired Template
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setMessageTemplate(defaultTemplates.expiring_soon)}>
                        Load Expiring Soon Template
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setMessageTemplate(defaultTemplates.custom)}>
                        Load Custom Template
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
