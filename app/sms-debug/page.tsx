"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SMSDebugPage() {
  const [diagnostics, setDiagnostics] = useState(null)
  const [testPhone, setTestPhone] = useState("+447950250970") // Your personal number
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sms/diagnose')
      const data = await response.json()
      setDiagnostics(data)
    } catch (error) {
      console.error('Error running diagnostics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fixPhoneConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sms/fix-phone-config', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        alert('Phone configuration updated successfully!')
        runDiagnostics() // Refresh diagnostics
      } else {
        alert(`Failed to fix phone config: ${data.error}`)
      }
    } catch (error) {
      alert('Error fixing phone configuration')
    } finally {
      setLoading(false)
    }
  }

  const testSMS = async () => {
    if (!testPhone) {
      alert('Please enter a phone number')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sms/test-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: testPhone })
      })
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test SMS'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusBadge = (status: string) => {
    if (status?.includes('✅')) return <Badge className="bg-green-500">OK</Badge>
    if (status?.includes('⚠️')) return <Badge className="bg-yellow-500">Warning</Badge>
    if (status?.includes('❌')) return <Badge className="bg-red-500">Error</Badge>
    return <Badge className="bg-gray-500">Unknown</Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SMS System Debug Dashboard</h1>
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? 'Running...' : 'Refresh Diagnostics'}
        </Button>
      </div>

      <Tabs defaultValue="diagnostics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="diagnostics">System Diagnostics</TabsTrigger>
          <TabsTrigger value="test">Test SMS</TabsTrigger>
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-4">
          {diagnostics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Twilio Connection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusBadge(diagnostics.diagnostics?.twilio_connection?.status)}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Database</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusBadge(diagnostics.diagnostics?.database_connection?.status)}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Phone Number</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusBadge(diagnostics.diagnostics?.phone_number_validation?.status)}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Webhook</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusBadge(diagnostics.diagnostics?.webhook_status?.status)}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Configuration Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Twilio Configuration</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Account SID: {diagnostics.diagnostics?.twilio_config?.account_sid}</div>
                      <div>Auth Token: {diagnostics.diagnostics?.twilio_config?.auth_token}</div>
                      <div>Phone Number: {diagnostics.diagnostics?.twilio_config?.phone_number}</div>
                      <div>WhatsApp Number: {diagnostics.diagnostics?.twilio_config?.whatsapp_number}</div>
                    </div>
                  </div>

                  {diagnostics.diagnostics?.phone_number_validation?.status?.includes('❌') && (
                    <Alert>
                      <AlertDescription>
                        Phone number issue detected. 
                        <Button onClick={fixPhoneConfig} className="ml-2" size="sm">
                          Fix Phone Config
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {diagnostics.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {diagnostics.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test SMS Sending</CardTitle>
              <CardDescription>
                Send a test SMS to verify your configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Phone number (+44...)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <Button onClick={testSMS} disabled={loading}>
                  Send Test SMS
                </Button>
              </div>

              {testResult && (
                <Alert className={testResult.success ? "border-green-500" : "border-red-500"}>
                  <AlertDescription>
                    {testResult.success ? (
                      <div>
                        <p className="font-semibold text-green-700">✅ Test SMS sent successfully!</p>
                        <p className="text-sm">Message SID: {testResult.details?.message_sid}</p>
                        <p className="text-sm">Cost: £{testResult.details?.cost}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-red-700">❌ Test SMS failed</p>
                        <p className="text-sm">{testResult.error}</p>
                        {testResult.details?.error_message && (
                          <p className="text-sm">Details: {testResult.details.error_message}</p>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent SMS Errors</CardTitle>
              <CardDescription>
                Last 10 failed SMS attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {diagnostics?.diagnostics?.recent_errors?.length > 0 ? (
                <div className="space-y-2">
                  {diagnostics.diagnostics.recent_errors.map((error, index) => (
                    <div key={index} className="border rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p><strong>Phone:</strong> {error.phone}</p>
                          <p><strong>Error:</strong> {error.error}</p>
                          <p><strong>Type:</strong> {error.type}</p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(error.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent errors found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
