"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle, Search, MessageCircle, Book, Video, Mail, Phone, ExternalLink } from "lucide-react"

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
    priority: "medium",
  })

  const faqItems = [
    {
      id: "1",
      question: "How do I add a new customer?",
      answer:
        "To add a new customer, navigate to the Customers page and click the 'Add Customer' button. Fill in the required information including name, contact details, and address.",
      category: "customers",
    },
    {
      id: "2",
      question: "How do I check MOT status for a vehicle?",
      answer:
        "Go to the Vehicles page, find the vehicle you want to check, and click the 'Check MOT' button. This will retrieve the latest MOT information from the DVSA database.",
      category: "mot",
    },
    {
      id: "3",
      question: "How do I create an invoice?",
      answer:
        "Navigate to the Invoices page and click 'New Invoice'. Select the customer and vehicle, add service items, and the system will automatically calculate totals including VAT.",
      category: "invoices",
    },
    {
      id: "4",
      question: "How do I import customer data?",
      answer:
        "Use the Data Import page to upload CSV files containing customer, vehicle, or job data. The system supports various formats and will guide you through the mapping process.",
      category: "import",
    },
    {
      id: "5",
      question: "How do I set up MOT reminders?",
      answer:
        "MOT reminders are automatically configured based on vehicle MOT expiry dates. You can customize reminder timing in the Settings page under Notifications.",
      category: "reminders",
    },
  ]

  const tutorials = [
    {
      title: "Getting Started with GarageManager",
      description: "Complete walkthrough of setting up your garage management system",
      duration: "15 min",
      type: "video",
    },
    {
      title: "Managing Customer Records",
      description: "Learn how to add, edit, and organize customer information",
      duration: "8 min",
      type: "video",
    },
    {
      title: "Creating and Sending Invoices",
      description: "Step-by-step guide to invoice creation and management",
      duration: "12 min",
      type: "video",
    },
    {
      title: "Setting Up MOT Reminders",
      description: "Configure automatic MOT reminder notifications",
      duration: "6 min",
      type: "guide",
    },
  ]

  const filteredFAQs = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Support request submitted:", supportForm)
    // Handle support form submission
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">Get help with using GarageManager Pro</p>
        </div>
      </div>

      {/* Quick Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search for help articles, tutorials, or FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 text-lg h-12"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="faq" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="contact">Contact Support</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>Find answers to common questions about GarageManager Pro</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredFAQs.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <span>{item.question}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {filteredFAQs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No FAQ items found matching your search.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutorials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Tutorials & Guides
              </CardTitle>
              <CardDescription>Step-by-step tutorials to help you master GarageManager Pro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tutorials.map((tutorial, index) => (
                  <div key={index} className="p-4 border rounded-lg transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {tutorial.type === "video" ? (
                          <Video className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Book className="h-5 w-5 text-green-600" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {tutorial.duration}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">{tutorial.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{tutorial.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="transition-all duration-200 hover:scale-105 bg-transparent"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Watch Tutorial
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Submit Support Request
                </CardTitle>
                <CardDescription>Can't find what you're looking for? Contact our support team</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief description of your issue"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      value={supportForm.message}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Please provide detailed information about your issue..."
                      rows={5}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full transition-all duration-200 hover:scale-105">
                    Submit Support Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Get in touch with our support team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-muted-foreground">support@garagemanager.com</p>
                      <p className="text-xs text-muted-foreground">Response within 24 hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Phone Support</p>
                      <p className="text-sm text-muted-foreground">0800 123 4567</p>
                      <p className="text-xs text-muted-foreground">Mon-Fri 9AM-5PM GMT</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Support Hours</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Monday - Friday: 9:00 AM - 5:00 PM GMT</p>
                    <p>Saturday: 10:00 AM - 2:00 PM GMT</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Additional Resources
              </CardTitle>
              <CardDescription>Documentation, guides, and useful links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">User Manual</h3>
                  <p className="text-sm text-muted-foreground mb-3">Complete documentation for all features</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Download PDF
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">API Documentation</h3>
                  <p className="text-sm text-muted-foreground mb-3">Integration guides for developers</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Docs
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Release Notes</h3>
                  <p className="text-sm text-muted-foreground mb-3">Latest updates and new features</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Changes
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Community Forum</h3>
                  <p className="text-sm text-muted-foreground mb-3">Connect with other users</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Join Forum
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Feature Requests</h3>
                  <p className="text-sm text-muted-foreground mb-3">Suggest new features</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Submit Idea
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">System Status</h3>
                  <p className="text-sm text-muted-foreground mb-3">Check service availability</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
