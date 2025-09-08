"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail, Send, TestTube } from "lucide-react"

export function EmailTestPanel() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Test email state
  const [testEmail, setTestEmail] = useState("")

  // Custom email state
  const [customEmail, setCustomEmail] = useState({
    to: "",
    subject: "",
    html: "",
    text: "",
  })

  const sendTestEmail = async () => {
    if (!testEmail) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      })

      const data = await response.json()
      setResult({
        success: data.success,
        message: data.success ? "Test email sent successfully!" : data.error,
      })
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to send test email",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendCustomEmail = async () => {
    if (!customEmail.to || !customEmail.subject || (!customEmail.html && !customEmail.text)) {
      setResult({
        success: false,
        message: "Please fill in all required fields",
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customEmail),
      })

      const data = await response.json()
      setResult({
        success: data.success,
        message: data.success ? "Email sent successfully!" : data.error,
      })

      if (data.success) {
        setCustomEmail({ to: "", subject: "", html: "", text: "" })
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to send email",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMOTReminders = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/mot/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      setResult({
        success: data.success,
        message: data.success ? `Sent ${data.data.sent} reminders, ${data.data.failed} failed` : data.error,
      })
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to send MOT reminders",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Management
          </CardTitle>
          <CardDescription>Test and manage email functionality for your garage system</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="test">Test Email</TabsTrigger>
              <TabsTrigger value="custom">Send Custom</TabsTrigger>
              <TabsTrigger value="reminders">MOT Reminders</TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Test Email Address</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button onClick={sendTestEmail} disabled={isLoading || !testEmail} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                Send Test MOT Reminder
              </Button>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-to">To Email Address</Label>
                <Input
                  id="custom-to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={customEmail.to}
                  onChange={(e) => setCustomEmail((prev) => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-subject">Subject</Label>
                <Input
                  id="custom-subject"
                  placeholder="Email subject"
                  value={customEmail.subject}
                  onChange={(e) => setCustomEmail((prev) => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-html">HTML Content (optional)</Label>
                <Textarea
                  id="custom-html"
                  placeholder="<h1>Hello</h1><p>This is HTML content</p>"
                  value={customEmail.html}
                  onChange={(e) => setCustomEmail((prev) => ({ ...prev, html: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-text">Text Content</Label>
                <Textarea
                  id="custom-text"
                  placeholder="Plain text content"
                  value={customEmail.text}
                  onChange={(e) => setCustomEmail((prev) => ({ ...prev, text: e.target.value }))}
                  rows={4}
                />
              </div>
              <Button onClick={sendCustomEmail} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Custom Email
              </Button>
            </TabsContent>

            <TabsContent value="reminders" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Send MOT reminders to all customers with vehicles due for MOT testing today.
              </div>
              <Button onClick={sendMOTReminders} disabled={isLoading} className="w-full" variant="default">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send MOT Reminders
              </Button>
            </TabsContent>
          </Tabs>

          {result && (
            <Alert className={`mt-4 ${result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
