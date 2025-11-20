"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Save, 
  Eye, 
  MessageSquare, 
  Mail, 
  Phone,
  RefreshCw,
  Plus,
  Edit3
} from "lucide-react"
import { toast } from "sonner"

interface MessageTemplate {
  id: number
  template_name: string
  template_type: string
  subject: string
  message_content: string
  variables: Array<{name: string, description: string}>
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [editedSubject, setEditedSubject] = useState("")
  const [previewData, setPreviewData] = useState({
    customer_name: "John Smith",
    vehicle_make: "Ford",
    vehicle_model: "Focus",
    registration: "AB12 CDE",
    expiry_date: "25/07/2025",
    days_until_expiry: "5",
    service_date: "Monday 22nd July",
    service_time: "10:00 AM"
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/message-templates')
      const result = await response.json()
      
      if (result.success) {
        setTemplates(result.templates)
        if (result.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(result.templates[0])
          setEditedContent(result.templates[0].message_content)
          setEditedSubject(result.templates[0].subject || "")
        }
      } else {
        toast.error("Failed to load templates")
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error("Error loading templates")
    } finally {
      setIsLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!selectedTemplate) return
    
    try {
      setIsSaving(true)
      const response = await fetch('/api/message-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_name: selectedTemplate.template_name,
          template_type: selectedTemplate.template_type,
          subject: editedSubject,
          message_content: editedContent,
          variables: selectedTemplate.variables
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success("Template saved successfully!")
        await loadTemplates()
      } else {
        toast.error("Failed to save template")
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error("Error saving template")
    } finally {
      setIsSaving(false)
    }
  }

  const selectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template)
    setEditedContent(template.message_content)
    setEditedSubject(template.subject || "")
  }

  const generatePreview = (content: string) => {
    let preview = content
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      preview = preview.replace(regex, value)
    })
    return preview
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'sms': return <Phone className="h-4 w-4 text-blue-600" />
      case 'email': return <Mail className="h-4 w-4 text-purple-600" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      whatsapp: 'bg-green-100 text-green-800',
      sms: 'bg-blue-100 text-blue-800',
      email: 'bg-purple-100 text-purple-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading templates...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Message Templates</h2>
          <p className="text-muted-foreground">
            Edit and customize your MOT reminder and service message templates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadTemplates} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Template List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Templates</CardTitle>
            <CardDescription>
              Select a template to edit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => selectTemplate(template)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(template.template_type)}
                    <span className="font-medium text-sm">
                      {template.template_name.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <Badge className={getTypeBadge(template.template_type)}>
                    {template.template_type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.subject || template.message_content.substring(0, 50) + '...'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Edit3 className="h-5 w-5" />
              <span>
                {selectedTemplate ? 
                  selectedTemplate.template_name.replace(/_/g, ' ').toUpperCase() : 
                  'Select Template'
                }
              </span>
            </CardTitle>
            <CardDescription>
              Edit your message template. Use variables like {{customer_name}} for dynamic content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject (Optional)</Label>
                  <Input
                    id="subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    placeholder="Message subject or title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Enter your message template..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable.name} variant="outline" className="text-xs">
                        {`{{${variable.name}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={saveTemplate} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Preview</span>
            </CardTitle>
            <CardDescription>
              Preview how your message will look to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <div className="whitespace-pre-wrap font-mono text-sm">
                {generatePreview(editedContent)}
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <strong>Preview uses sample data:</strong> {Object.entries(previewData).map(([key, value]) => 
                `${key}: ${value}`
              ).join(', ')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
