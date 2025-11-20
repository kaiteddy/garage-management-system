"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, Shield, Copy, Play } from "lucide-react"

export default function VerificationCodesPage() {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRecordings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/verification-codes/list')
      if (response.ok) {
        const data = await response.json()
        setRecordings(data.recordings || [])
      }
    } catch (error) {
      console.error('Error fetching recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`Code ${code} copied to clipboard!`)
  }

  const markVerificationRequest = async () => {
    try {
      await fetch('/api/verification-codes/mark-request', { method: 'POST' })
      alert('Verification request marked - system will detect incoming verification calls')
    } catch (error) {
      alert('Error marking verification request')
    }
  }

  useEffect(() => {
    fetchRecordings()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRecordings, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Verification Codes
          </h1>
          <p className="text-muted-foreground">WhatsApp Business & Other Verification Codes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={markVerificationRequest} variant="outline">
            Mark Verification Request
          </Button>
          <Button onClick={fetchRecordings} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Verification Line
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+447488896449</div>
            <div className="text-sm text-muted-foreground">Auto-detects verification calls</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Smart Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-500">Active</Badge>
            <div className="text-sm text-muted-foreground mt-1">Meta/WhatsApp patterns</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordings.length}</div>
            <div className="text-sm text-muted-foreground">Verification recordings</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Codes</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
          <TabsTrigger value="setup">WhatsApp Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Recordings & Codes</CardTitle>
              <CardDescription>
                Automatically captured verification codes from phone calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recordings.length > 0 ? (
                <div className="space-y-4">
                  {recordings.map((recording: any, index) => (
                    <div key={index} className="border rounded p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">
                            {new Date(recording.created_at).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            From: {recording.from_number}
                          </div>
                        </div>
                        <Badge className="bg-blue-500">
                          {recording.potential_codes?.length || 0} codes
                        </Badge>
                      </div>

                      {recording.potential_codes && recording.potential_codes.length > 0 && (
                        <div className="space-y-2">
                          <div className="font-semibold text-green-600">Detected Codes:</div>
                          <div className="flex gap-2 flex-wrap">
                            {recording.potential_codes.map((code: string, codeIndex: number) => (
                              <div key={codeIndex} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2">
                                <span className="font-mono text-lg font-bold text-green-700">{code}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyCode(code)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {recording.transcription_text && (
                        <div className="space-y-1">
                          <div className="font-semibold text-sm">Transcription:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">
                            {recording.transcription_text}
                          </div>
                        </div>
                      )}

                      {recording.recording_url && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(recording.recording_url, '_blank')}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Play Recording
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No verification recordings yet</p>
                  <p className="text-sm">Mark a verification request and wait for Meta to call</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="how-it-works" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How Verification Detection Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">🔍 Smart Detection</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Detects Meta/Facebook phone numbers</li>
                    <li>Recognizes toll-free verification services</li>
                    <li>Monitors for recent verification requests</li>
                    <li>International verification patterns</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">📞 Call Handling</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Records the entire verification call</li>
                    <li>Automatic transcription to text</li>
                    <li>Extracts 6-digit codes automatically</li>
                    <li>Routes to your phone for backup</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>🎯 When Meta calls +447488896449:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                      <li>System detects it's a verification call</li>
                      <li>Records the call with transcription</li>
                      <li>Extracts verification codes automatically</li>
                      <li>Also routes to your phone (+447950250970)</li>
                      <li>Codes appear in this dashboard within minutes</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business Setup</CardTitle>
              <CardDescription>
                How to use this system for WhatsApp Business verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border rounded p-3">
                  <div className="font-semibold text-blue-600">Step 1: Mark Verification Request</div>
                  <p className="text-sm mt-1">
                    Click "Mark Verification Request" before starting WhatsApp Business setup
                  </p>
                </div>

                <div className="border rounded p-3">
                  <div className="font-semibold text-green-600">Step 2: Use Your Twilio Number</div>
                  <p className="text-sm mt-1">
                    Enter +447488896449 as your business phone number in WhatsApp Business setup
                  </p>
                </div>

                <div className="border rounded p-3">
                  <div className="font-semibold text-orange-600">Step 3: Request Voice Verification</div>
                  <p className="text-sm mt-1">
                    Choose "Call me" instead of SMS when WhatsApp asks for verification method
                  </p>
                </div>

                <div className="border rounded p-3">
                  <div className="font-semibold text-purple-600">Step 4: Get Your Code</div>
                  <p className="text-sm mt-1">
                    Meta will call, system records it, and code appears in this dashboard automatically
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <p><strong>💡 Pro Tip:</strong> The system works for any verification service, not just WhatsApp. 
                  It automatically detects and records verification calls from various services.</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
