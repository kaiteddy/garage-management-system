"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Settings, 
  Key, 
  ExternalLink, 
  Save, 
  TestTube, 
  CheckCircle, 
  AlertCircle,
  Globe,
  CreditCard,
  Phone,
  Mail
} from "lucide-react"
import { toast } from "sonner"

interface PartsCredentials {
  sevenZap: {
    username: string
    password: string
    apiKey: string
    status: 'not-configured' | 'configured' | 'verified'
  }
  partSouq: {
    username: string
    password: string
    apiKey: string
    status: 'not-configured' | 'configured' | 'verified'
  }
  euroCarParts: {
    tradeAccount: string
    apiKey: string
    status: 'not-configured' | 'configured' | 'verified'
  }
  gsfCarParts: {
    tradeAccount: string
    apiKey: string
    status: 'not-configured' | 'configured' | 'verified'
  }
}

export function PartsIntegrationManager() {
  const [credentials, setCredentials] = useState<PartsCredentials>({
    sevenZap: { username: '', password: '', apiKey: '', status: 'not-configured' },
    partSouq: { username: '', password: '', apiKey: '', status: 'not-configured' },
    euroCarParts: { tradeAccount: '', apiKey: '', status: 'not-configured' },
    gsfCarParts: { tradeAccount: '', apiKey: '', status: 'not-configured' }
  })

  const [testing, setTesting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const updateCredential = (service: keyof PartsCredentials, field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        [field]: value,
        status: 'configured' as const
      }
    }))
  }

  const testConnection = async (service: keyof PartsCredentials) => {
    setTesting(service)
    
    try {
      console.log(`🧪 Testing ${service} connection...`)
      
      // Simulate API test - replace with actual test calls
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For demo purposes, randomly succeed or fail
      const success = Math.random() > 0.3
      
      if (success) {
        setCredentials(prev => ({
          ...prev,
          [service]: {
            ...prev[service],
            status: 'verified'
          }
        }))
        toast.success(`${service} connection verified!`)
      } else {
        toast.error(`${service} connection failed - check credentials`)
      }
      
    } catch (error) {
      console.error(`${service} test failed:`, error)
      toast.error(`Failed to test ${service} connection`)
    } finally {
      setTesting(null)
    }
  }

  const saveCredentials = async () => {
    setSaving(true)
    
    try {
      console.log('💾 Saving parts credentials...')
      
      // Save to secure storage/environment variables
      const response = await fetch('/api/parts/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })
      
      if (response.ok) {
        toast.success('Credentials saved successfully')
      } else {
        toast.error('Failed to save credentials')
      }
      
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
      case 'configured':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Configured</Badge>
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Not Set</Badge>
    }
  }

  const openSignupPage = (service: string) => {
    const urls = {
      sevenZap: 'https://7zap.com/register',
      partSouq: 'https://partsouq.com/register',
      euroCarParts: 'https://www.eurocarparts.com/trade-account',
      gsfCarParts: 'https://www.gsfcarparts.com/trade-account'
    }
    
    window.open(urls[service as keyof typeof urls] || '#', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parts Integration Setup
          </CardTitle>
          <CardDescription>
            Configure your parts supplier accounts and API credentials for automated lookups
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="7zap" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="7zap">7Zap</TabsTrigger>
          <TabsTrigger value="partsouq">PartSouq</TabsTrigger>
          <TabsTrigger value="eurocarparts">Euro Car Parts</TabsTrigger>
          <TabsTrigger value="gsfcarparts">GSF Car Parts</TabsTrigger>
        </TabsList>

        {/* 7Zap Configuration */}
        <TabsContent value="7zap">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    7Zap Configuration
                  </CardTitle>
                  <CardDescription>OEM parts catalog with VIN-based search</CardDescription>
                </div>
                {getStatusBadge(credentials.sevenZap.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">7Zap Account Setup:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Visit 7zap.com and create a professional account</li>
                      <li>Contact their support for API access</li>
                      <li>Request VIN lookup and parts catalog permissions</li>
                      <li>Some features may require paid subscription</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="7zap-username">Username/Email</Label>
                  <Input
                    id="7zap-username"
                    value={credentials.sevenZap.username}
                    onChange={(e) => updateCredential('sevenZap', 'username', e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="7zap-password">Password</Label>
                  <Input
                    id="7zap-password"
                    type="password"
                    value={credentials.sevenZap.password}
                    onChange={(e) => updateCredential('sevenZap', 'password', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="7zap-apikey">API Key (if available)</Label>
                  <Input
                    id="7zap-apikey"
                    value={credentials.sevenZap.apiKey}
                    onChange={(e) => updateCredential('sevenZap', 'apiKey', e.target.value)}
                    placeholder="API key from 7zap developer portal"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('sevenZap')}
                  disabled={testing === 'sevenZap' || !credentials.sevenZap.username}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing === 'sevenZap' ? 'Testing...' : 'Test Connection'}
                </Button>
                
                <Button
                  onClick={() => openSignupPage('sevenZap')}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PartSouq Configuration */}
        <TabsContent value="partsouq">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    PartSouq Configuration
                  </CardTitle>
                  <CardDescription>Comprehensive automotive parts marketplace</CardDescription>
                </div>
                {getStatusBadge(credentials.partSouq.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">PartSouq Integration Options:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Free account for basic access</li>
                      <li>Business account for better pricing</li>
                      <li>API access may require business partnership</li>
                      <li>Currently using web scraping as fallback</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partsouq-username">Username/Email</Label>
                  <Input
                    id="partsouq-username"
                    value={credentials.partSouq.username}
                    onChange={(e) => updateCredential('partSouq', 'username', e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partsouq-password">Password</Label>
                  <Input
                    id="partsouq-password"
                    type="password"
                    value={credentials.partSouq.password}
                    onChange={(e) => updateCredential('partSouq', 'password', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="partsouq-apikey">API Key (if available)</Label>
                  <Input
                    id="partsouq-apikey"
                    value={credentials.partSouq.apiKey}
                    onChange={(e) => updateCredential('partSouq', 'apiKey', e.target.value)}
                    placeholder="Business API key"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('partSouq')}
                  disabled={testing === 'partSouq' || !credentials.partSouq.username}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing === 'partSouq' ? 'Testing...' : 'Test Connection'}
                </Button>
                
                <Button
                  onClick={() => openSignupPage('partSouq')}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Euro Car Parts Configuration */}
        <TabsContent value="eurocarparts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Euro Car Parts Configuration
                  </CardTitle>
                  <CardDescription>UK trade parts supplier with API</CardDescription>
                </div>
                {getStatusBadge(credentials.euroCarParts.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Trade Account Benefits:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Trade pricing (typically 20-40% discount)</li>
                      <li>API access for automated ordering</li>
                      <li>Stock level checking</li>
                      <li>Next day delivery options</li>
                      <li>Contact: 0345 758 5058 for trade setup</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ecp-account">Trade Account Number</Label>
                  <Input
                    id="ecp-account"
                    value={credentials.euroCarParts.tradeAccount}
                    onChange={(e) => updateCredential('euroCarParts', 'tradeAccount', e.target.value)}
                    placeholder="ECP123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ecp-apikey">API Key</Label>
                  <Input
                    id="ecp-apikey"
                    value={credentials.euroCarParts.apiKey}
                    onChange={(e) => updateCredential('euroCarParts', 'apiKey', e.target.value)}
                    placeholder="API key from trade portal"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('euroCarParts')}
                  disabled={testing === 'euroCarParts' || !credentials.euroCarParts.tradeAccount}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing === 'euroCarParts' ? 'Testing...' : 'Test Connection'}
                </Button>
                
                <Button
                  onClick={() => openSignupPage('euroCarParts')}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply for Trade
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GSF Car Parts Configuration */}
        <TabsContent value="gsfcarparts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    GSF Car Parts Configuration
                  </CardTitle>
                  <CardDescription>Professional trade parts supplier</CardDescription>
                </div>
                {getStatusBadge(credentials.gsfCarParts.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">GSF Trade Benefits:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Competitive trade pricing</li>
                      <li>Technical support and advice</li>
                      <li>Fast delivery network</li>
                      <li>Professional range of parts</li>
                      <li>Email: trade@gsfcarparts.com for setup</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gsf-account">Trade Account Number</Label>
                  <Input
                    id="gsf-account"
                    value={credentials.gsfCarParts.tradeAccount}
                    onChange={(e) => updateCredential('gsfCarParts', 'tradeAccount', e.target.value)}
                    placeholder="GSF123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gsf-apikey">API Key</Label>
                  <Input
                    id="gsf-apikey"
                    value={credentials.gsfCarParts.apiKey}
                    onChange={(e) => updateCredential('gsfCarParts', 'apiKey', e.target.value)}
                    placeholder="API key from trade portal"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('gsfCarParts')}
                  disabled={testing === 'gsfCarParts' || !credentials.gsfCarParts.tradeAccount}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing === 'gsfCarParts' ? 'Testing...' : 'Test Connection'}
                </Button>
                
                <Button
                  onClick={() => openSignupPage('gsfCarParts')}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply for Trade
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={saveCredentials}
            disabled={saving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Credentials'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
