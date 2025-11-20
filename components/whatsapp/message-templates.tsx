"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Plus,
  Eye,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Edit
} from "lucide-react"
import { toast } from "sonner"

interface MessageTemplate {
  id: string
  name: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT'
  content: string
  variables: string[]
  createdAt: string
  lastModified: string
}

const predefinedTemplates = [
  {
    name: "MOT Reminder",
    category: "UTILITY" as const,
    content: "Hello {{1}}, this is ELI MOTORS LTD.\n\n🚗 Your vehicle {{2}} MOT expires on {{3}}.\n\n📞 Book your MOT test today: 0208 203 6449\n🌐 Online: https://www.elimotors.co.uk\n\nELI MOTORS LTD - Serving Hendon since 1979\nReply STOP to opt out",
    variables: ["customer_name", "registration", "expiry_date"],
    description: "Remind customers about upcoming MOT expiry dates (Twilio format)"
  },
  {
    name: "Service Reminder", 
    category: "UTILITY" as const,
    content: "Hi {{1}}, ELI MOTORS LTD reminder:\n\n🔧 Your {{2}} {{3}} ({{4}}) is due for service.\n\n📞 Call 0208 203 6449 to book\n🌐 https://www.elimotors.co.uk\n\nELI MOTORS LTD - Serving Hendon since 1979\nReply STOP to opt out",
    variables: ["customer_name", "vehicle_make", "vehicle_model", "registration"],
    description: "Remind customers about upcoming service appointments (Twilio format)"
  },
  {
    name: "Appointment Confirmation",
    category: "UTILITY" as const,
    content: "ELI MOTORS LTD - Appointment Confirmed ✅\n\n📅 Date: {{1}}\n🕐 Time: {{2}}\n🔧 Service: {{3}}\n🚗 Vehicle: {{4}}\n\n📍 Address: [Your business address]\n📞 Questions? Call 0208 203 6449\n\nELI MOTORS LTD - Serving Hendon since 1979",
    variables: ["date", "time", "service_type", "registration"],
    description: "Confirm customer appointments (Twilio format)"
  },
  {
    name: "Service Complete",
    category: "UTILITY" as const,
    content: "ELI MOTORS LTD: Your {{service_type}} for {{registration}} is complete. {{additional_notes}} Total: £{{amount}}. Thank you for choosing ELI MOTORS LTD!",
    variables: ["service_type", "registration", "additional_notes", "amount"],
    description: "Notify customers when service is completed"
  },
  {
    name: "Welcome New Customer",
    category: "UTILITY" as const,
    content: "Welcome to ELI MOTORS LTD, {{customer_name}}! We're your trusted MOT and service centre in Hendon since 1979. Save our number and contact us anytime: 0208 203 6449",
    variables: ["customer_name"],
    description: "Welcome message for new customers"
  }
]

export default function MessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "UTILITY" as const,
    content: "",
    variables: [] as string[]
  })
  const [activeTab, setActiveTab] = useState("predefined")

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map(match => match.replace(/[{}]/g, '')) : []
  }

  const handleContentChange = (content: string) => {
    setNewTemplate({
      ...newTemplate,
      content,
      variables: extractVariables(content)
    })
  }

  const createTemplate = async (templateData: typeof newTemplate) => {
    try {
      const response = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Template created successfully!')
        // Add to templates list
        const newTemplateWithId: MessageTemplate = {
          id: Date.now().toString(),
          ...templateData,
          language: 'en',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
        setTemplates([...templates, newTemplateWithId])
        
        // Reset form
        setNewTemplate({
          name: "",
          category: "UTILITY",
          content: "",
          variables: []
        })
      } else {
        toast.error('Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Error creating template')
    }
  }

  const submitForApproval = async (templateId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/templates/${templateId}/submit`, {
        method: 'POST'
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Template submitted for approval!')
        // Update template status
        setTemplates(templates.map(t => 
          t.id === templateId ? { ...t, status: 'PENDING' } : t
        ))
      } else {
        toast.error('Failed to submit template')
      }
    } catch (error) {
      console.error('Error submitting template:', error)
      toast.error('Error submitting template')
    }
  }

  const previewTemplate = (template: MessageTemplate | typeof newTemplate) => {
    let preview = template.content
    template.variables.forEach(variable => {
      const placeholder = `{{${variable}}}`
      const sampleValue = getSampleValue(variable)
      preview = preview.replace(new RegExp(placeholder, 'g'), sampleValue)
    })
    return preview
  }

  const getSampleValue = (variable: string): string => {
    const samples: Record<string, string> = {
      customer_name: "John Smith",
      registration: "AB12 CDE",
      expiry_date: "15th August 2025",
      vehicle_make: "Ford",
      vehicle_model: "Focus",
      date: "Monday 28th July",
      time: "10:30 AM",
      service_type: "MOT Test",
      amount: "45.00",
      additional_notes: "All checks passed successfully."
    }
    return samples[variable] || `[${variable}]`
  }

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Template copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Message Templates</h2>
          <p className="text-muted-foreground">
            Create and manage message templates for WhatsApp Business API
          </p>
        </div>
        <Badge variant="outline">
          Production Ready
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predefined">Predefined Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Templates</TabsTrigger>
          <TabsTrigger value="approved">Approved Templates</TabsTrigger>
        </TabsList>

        {/* Predefined Templates */}
        <TabsContent value="predefined" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                ELI MOTORS LTD - Predefined Templates
              </CardTitle>
              <CardDescription>
                Ready-to-use templates optimized for your automotive business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {predefinedTemplates.map((template, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{template.category}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyTemplate(template.content)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => createTemplate(template)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Template Content:</Label>
                    <div className="bg-muted p-3 rounded text-sm font-mono">
                      {template.content}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Preview:</Label>
                    <div className="bg-blue-50 p-3 rounded text-sm border-l-4 border-blue-500">
                      {previewTemplate(template)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium">Variables:</Label>
                    {template.variables.map(variable => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Templates */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Template</CardTitle>
              <CardDescription>
                Create your own message templates for specific business needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., MOT Reminder"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newTemplate.category} onValueChange={(value: any) => setNewTemplate({ ...newTemplate, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Template Content</Label>
                <Textarea
                  id="content"
                  value={newTemplate.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter your message template. Use {{variable_name}} for dynamic content."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use double curly braces for variables: {"{{customer_name}}, {{registration}}, etc."}
                </p>
              </div>

              {newTemplate.variables.length > 0 && (
                <div className="space-y-2">
                  <Label>Detected Variables:</Label>
                  <div className="flex flex-wrap gap-2">
                    {newTemplate.variables.map(variable => (
                      <Badge key={variable} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {newTemplate.content && (
                <div className="space-y-2">
                  <Label>Preview:</Label>
                  <div className="bg-blue-50 p-3 rounded text-sm border-l-4 border-blue-500">
                    {previewTemplate(newTemplate)}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => createTemplate(newTemplate)}
                disabled={!newTemplate.name || !newTemplate.content}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>

          {/* Custom Templates List */}
          {templates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Custom Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            template.status === 'APPROVED' ? 'default' :
                            template.status === 'PENDING' ? 'secondary' :
                            template.status === 'REJECTED' ? 'destructive' : 'outline'
                          }>
                            {template.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 2).map(variable => (
                              <Badge key={variable} variant="secondary" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                            {template.variables.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.variables.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                            {template.status === 'DRAFT' && (
                              <Button 
                                size="sm"
                                onClick={() => submitForApproval(template.id)}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Submit
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Approved Templates */}
        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Approved Templates
              </CardTitle>
              <CardDescription>
                Templates approved by WhatsApp and ready for use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approved templates yet.</p>
                <p className="text-sm">Submit templates for approval to see them here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
