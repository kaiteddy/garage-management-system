'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function WhatsAppTestPage() {
  const [phoneNumber, setPhoneNumber] = useState('+447843275372')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sendTestMessage = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sms/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message || undefined
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to send message' })
    } finally {
      setIsLoading(false)
    }
  }

  const sendSandboxTest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/whatsapp-sandbox-test', {
        method: 'POST'
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to send sandbox test' })
    } finally {
      setIsLoading(false)
    }
  }

  const checkBusinessStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/whatsapp-business-status', {
        method: 'POST'
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to check business status' })
    } finally {
      setIsLoading(false)
    }
  }

  const checkVerificationStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/whatsapp-verification-status')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to check verification status' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Business Testing</h1>
        <p className="text-muted-foreground">
          Test WhatsApp integration for ELI MOTORS LTD
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Message</CardTitle>
              <CardDescription>
                Send a custom WhatsApp message via sandbox
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+447843275372"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message (optional)</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Custom test message..."
                  rows={3}
                />
              </div>
              <Button
                onClick={sendTestMessage}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Test Message'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tests</CardTitle>
              <CardDescription>
                Pre-configured test functions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={sendSandboxTest}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                Send Sandbox Test
              </Button>
              <Button
                onClick={checkBusinessStatus}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                Check Business Status
              </Button>
              <Button
                onClick={checkVerificationStatus}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                🔍 Check Verification Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Sandbox Number:</span>
                <Badge variant="secondary">+14155238886</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Business Number:</span>
                <Badge variant="outline">+447488896449</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Status:</span>
                <Badge variant="secondary">Voice Call In Progress</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Response from WhatsApp API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Error"}
                    </Badge>
                    {result.message_sid && (
                      <Badge variant="secondary">
                        {result.message_sid}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No test results yet. Run a test to see the response.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Setup Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Steps to complete WhatsApp Business verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="mt-1">1</Badge>
              <div>
                <h4 className="font-medium">Register WhatsApp Sender</h4>
                <p className="text-sm text-muted-foreground">
                  Go to <a href="https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders"
                  target="_blank" className="text-blue-600 hover:underline">
                    Twilio Console
                  </a> and register +447488896449 as a WhatsApp Business sender
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="mt-1">2</Badge>
              <div>
                <h4 className="font-medium">Submit Business Documents</h4>
                <p className="text-sm text-muted-foreground">
                  Upload business registration, proof of address, and ID documents
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="mt-1">3</Badge>
              <div>
                <h4 className="font-medium">Wait for Meta Approval</h4>
                <p className="text-sm text-muted-foreground">
                  Business verification typically takes 1-3 business days
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="mt-1">4</Badge>
              <div>
                <h4 className="font-medium">Switch to Production</h4>
                <p className="text-sm text-muted-foreground">
                  Once approved, update environment variables to use whatsapp:+447488896449
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
