"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Phone,
  Clock,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"

interface MessageTemplate {
  id: string
  name: string
  content: string
  variables: string[]
}

const messageTemplates: MessageTemplate[] = [
  {
    id: "mot_reminder",
    name: "MOT Reminder",
    content: "🚗 *ELI MOTORS LTD* - MOT Reminder\n\nHi {{customerName}},\n\nYour vehicle {{vehicleReg}} MOT expires on *{{motDate}}*.\n\n📅 Book your MOT test today\n📞 Call: *0208 203 6449*\n🌐 Visit: www.elimotors.co.uk\n\n✨ *Serving Hendon since 1979* ✨\n\nReply STOP to opt out.",
    variables: ["customerName", "vehicleReg", "motDate"]
  },
  {
    id: "service_reminder",
    name: "Service Reminder", 
    content: "🔧 *ELI MOTORS LTD* - Service Reminder\n\nHi {{customerName}},\n\nYour {{vehicleMake}} {{vehicleModel}} ({{vehicleReg}}) is due for service.\n\n📞 Call *0208 203 6449* to book\n🌐 www.elimotors.co.uk\n\n✨ *Serving Hendon since 1979* ✨\n\nReply STOP to opt out.",
    variables: ["customerName", "vehicleMake", "vehicleModel", "vehicleReg"]
  },
  {
    id: "custom",
    name: "Custom Message",
    content: "",
    variables: []
  }
]

export function WhatsAppSender() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [customMessage, setCustomMessage] = useState("")
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const currentTemplate = messageTemplates.find(t => t.id === selectedTemplate)

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = messageTemplates.find(t => t.id === templateId)
    if (template) {
      setCustomMessage(template.content)
      // Reset variables
      const newVariables: Record<string, string> = {}
      template.variables.forEach(variable => {
        newVariables[variable] = ""
      })
      setVariables(newVariables)
    }
  }

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [variable]: value
    }))
  }

  const generateMessage = () => {
    if (!currentTemplate) return customMessage

    let message = currentTemplate.content
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    return message
  }

  const sendMessage = async () => {
    if (!phoneNumber || !customMessage) {
      toast.error("Please enter phone number and message")
      return
    }

    setLoading(true)
    setLastResult(null)

    try {
      const finalMessage = selectedTemplate === "custom" ? customMessage : generateMessage()

      // Try WhatsApp first, with automatic SMS fallback
      const response = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: phoneNumber,
          messageType: selectedTemplate || 'custom',
          customerName: variables.customerName || 'Valued Customer',
          vehicleReg: variables.vehicleReg || '',
          motDate: variables.motDate || '',
          customMessage: selectedTemplate === "custom" ? customMessage : undefined,
          preferWhatsApp: true // Try WhatsApp first, fallback to SMS
        })
      })

      const result = await response.json()
      setLastResult(result)

      if (result.success) {
        toast.success("Message sent successfully!")
        // Clear form
        setPhoneNumber("")
        setCustomMessage("")
        setVariables({})
        setSelectedTemplate("")
      } else {
        toast.error(`Failed to send message: ${result.error}`)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      toast.error("Error sending message")
      setLastResult({ success: false, error: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Message Sender
          </CardTitle>
          <CardDescription>
            Send WhatsApp-style messages to customers instantly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone Number */}
          <div>
            <Label htmlFor="phone">Customer Phone Number</Label>
            <Input
              id="phone"
              placeholder="+447123456789"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Include country code (e.g., +44 for UK)
            </p>
          </div>

          {/* Template Selection */}
          <div>
            <Label>Message Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template or create custom message" />
              </SelectTrigger>
              <SelectContent>
                {messageTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Variables */}
          {currentTemplate && currentTemplate.variables.length > 0 && (
            <div className="space-y-3">
              <Label>Template Variables</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentTemplate.variables.map(variable => (
                  <div key={variable}>
                    <Label htmlFor={variable} className="text-sm">
                      {variable.replace(/([A-Z])/g, ' $1').replace(/^./, str => str?.toUpperCase() || '')}
                    </Label>
                    <Input
                      id={variable}
                      placeholder={`Enter ${variable}`}
                      value={variables[variable] || ""}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Preview/Editor */}
          <div>
            <Label htmlFor="message">
              {selectedTemplate === "custom" ? "Custom Message" : "Message Preview"}
            </Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={selectedTemplate === "custom" ? customMessage : generateMessage()}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              readOnly={selectedTemplate !== "custom"}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {selectedTemplate === "custom" 
                ? "Write your custom message" 
                : "This preview shows how your message will look with the current variables"
              }
            </p>
          </div>

          {/* Send Button */}
          <Button 
            onClick={sendMessage}
            disabled={loading || !phoneNumber || !customMessage}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send WhatsApp Message
          </Button>

          {/* Result Display */}
          {lastResult && (
            <Alert className={lastResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                {lastResult.success ? (
                  <div className="space-y-2">
                    <p className="font-medium text-green-800">Message sent successfully!</p>
                    <div className="text-sm text-green-700">
                      <p>Method: {lastResult.delivery_info?.method || 'WhatsApp-style SMS'}</p>
                      <p>To: {lastResult.delivery_info?.to}</p>
                      {lastResult.message_sid && <p>Message ID: {lastResult.message_sid}</p>}
                      {lastResult.cost && <p>Cost: £{lastResult.cost}</p>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-red-800">Failed to send message</p>
                    <p className="text-sm text-red-700">{lastResult.error}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Messages are sent as WhatsApp-style SMS for immediate delivery. 
              They appear professional and include ELI MOTORS LTD branding.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
