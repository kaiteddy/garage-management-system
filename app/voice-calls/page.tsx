"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, PhoneCall, Voicemail, Settings } from "lucide-react"

export default function VoiceCallsPage() {
  const [webhookStatus, setWebhookStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const fixVoiceWebhook = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/twilio/fix-voice-webhook', { method: 'POST' })
      const data = await response.json()
      setWebhookStatus(data)

      if (data.success) {
        alert('Voice webhook configuration updated successfully!')
      } else {
        alert(`Failed to fix voice webhook: ${data.error}`)
      }
    } catch (error) {
      alert('Error fixing voice webhook configuration')
    } finally {
      setLoading(false)
    }
  }

  const testVoiceWebhook = async () => {
    try {
      const response = await fetch('/api/twilio/test-voice')
      if (response.ok) {
        alert('Voice webhook is accessible and working!')
      } else {
        alert('Voice webhook test failed')
      }
    } catch (error) {
      alert('Error testing voice webhook')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Phone className="h-8 w-8" />
            Voice Call System
          </h1>
          <p className="text-muted-foreground">ELI MOTORS LTD Professional Phone System</p>
        </div>
        <Button onClick={fixVoiceWebhook} disabled={loading}>
          {loading ? 'Updating...' : 'Fix Voice Webhook'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              Business Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+447488896449</div>
            <div className="text-sm text-muted-foreground">Twilio-powered</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Voicemail className="h-4 w-4" />
              Call Handling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-500">Direct Routing</Badge>
            <div className="text-sm text-muted-foreground mt-1">Amazon Polly voice</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Webhook Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={webhookStatus?.success ? "bg-green-500" : "bg-yellow-500"}>
              {webhookStatus?.success ? "Configured" : "Needs Update"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Call Flow Overview</TabsTrigger>
          <TabsTrigger value="menu">Phone Menu</TabsTrigger>
          <TabsTrigger value="recent">Recent Call</TabsTrigger>
          <TabsTrigger value="test">Test System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Professional Call Handling System</CardTitle>
              <CardDescription>
                Automated phone system for ELI MOTORS LTD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">🎯 Call Flow</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Professional greeting with natural voice</li>
                    <li>Direct connection to main business line</li>
                    <li>45-second timeout before voicemail</li>
                    <li>Voicemail with transcription</li>
                    <li>Special verification code handling</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">📞 Features</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Amazon Polly Amy (natural British voice)</li>
                    <li>Direct routing to +447950250970</li>
                    <li>Caller ID shows +447488896449</li>
                    <li>Automatic voicemail transcription</li>
                    <li>Extended 3-minute recordings</li>
                    <li>Verification code capture</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Experience</CardTitle>
              <CardDescription>
                What callers experience when they call +447488896449
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border rounded p-3">
                  <div className="font-semibold text-blue-600">Professional Greeting</div>
                  <p className="text-sm mt-1">
                    "Hello, you've reached ELI MOTORS LTD, Hendon's trusted MOT centre since 1979. Please hold while we connect you to our team."
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">🎵 Natural Amazon Polly Amy voice</div>
                </div>

                <div className="border rounded p-3">
                  <div className="font-semibold text-green-600">Direct Connection</div>
                  <p className="text-sm mt-1">
                    Call immediately routes to main business line: +447950250970
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">⏱️ 45-second timeout</div>
                </div>

                <div className="border rounded p-3">
                  <div className="font-semibold text-orange-600">Voicemail (if no answer)</div>
                  <p className="text-sm mt-1">
                    "Sorry, our team is currently busy helping other customers. Please leave your name, phone number, and a brief message..."
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">📝 Automatic transcription • 3-minute recording</div>
                </div>

                <div className="border rounded p-3 bg-blue-50">
                  <div className="font-semibold text-blue-600">🔐 Verification Code Support</div>
                  <p className="text-sm mt-1">
                    Special handling for WhatsApp Business verification codes
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">Access: /api/twilio/voice/verification</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Call Analysis</CardTitle>
              <CardDescription>
                Analysis of the phone call attempt detected in logs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>📞 Call Detected:</strong> Someone called +447488896449</p>
                    <p><strong>⚠️ Issue:</strong> Webhook signature validation failed</p>
                    <p><strong>🔧 Status:</strong> Call was rejected (403 Forbidden)</p>
                    <p><strong>✅ Fix Applied:</strong> Webhook validation now allows development calls</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Technical Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Timestamp:</strong> Recent (check logs)</p>
                    <p><strong>Target Number:</strong> +447488896449</p>
                    <p><strong>Error:</strong> Invalid webhook signature</p>
                    <p><strong>Response:</strong> 403 Forbidden</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Resolution</h4>
                  <div className="text-sm space-y-1">
                    <p>✅ Webhook validation relaxed for development</p>
                    <p>✅ Voice webhook URLs updated</p>
                    <p>✅ Professional greeting configured</p>
                    <p>✅ Menu system ready</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Voice System</CardTitle>
              <CardDescription>
                Test the phone system functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={testVoiceWebhook} className="h-20 flex flex-col">
                  <Phone className="h-6 w-6 mb-2" />
                  Test Voice Webhook
                </Button>

                <Button onClick={fixVoiceWebhook} variant="outline" className="h-20 flex flex-col">
                  <Settings className="h-6 w-6 mb-2" />
                  Update Configuration
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>🧪 To Test the Full System:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                      <li>Call +447488896449 from any phone</li>
                      <li>Listen for natural Polly Amy greeting</li>
                      <li>Verify direct connection to +447950250970</li>
                      <li>Test voicemail if no answer (with transcription)</li>
                      <li>For verification codes: use /api/twilio/voice/verification</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              {webhookStatus && (
                <div className="border rounded p-4 bg-gray-50">
                  <h4 className="font-semibold mb-2">Last Configuration Update</h4>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(webhookStatus, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
