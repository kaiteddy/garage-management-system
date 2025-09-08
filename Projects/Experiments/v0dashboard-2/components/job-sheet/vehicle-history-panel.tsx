'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  History,
  Wrench,
  Calendar,
  Gauge,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Car,
  Users,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface VehicleHistoryPanelProps {
  registration: string
  className?: string
}

interface ServiceRecord {
  id: string
  date: string
  type: string
  docType: string
  docNumber: string
  description: string
  customer: string
  amount: number
  mileage: number
}

interface MOTRecord {
  testDate: string
  expiryDate: string
  result: string
  mileage: number
  testNumber: string
  defects: any[]
  advisories: any[]
}

interface OwnershipChange {
  id: string
  changeType: string
  changeDate: string
  reportedBy: string
  verified: boolean
  previousOwner: string | null
  contactInfo: any
}

interface VehicleHistory {
  services: ServiceRecord[]
  mot: MOTRecord[]
  ownership: OwnershipChange[]
  mileage: Array<{
    date: string
    mileage: number
    docNumber: string
    type: string
  }>
}

export function VehicleHistoryPanel({ registration, className }: VehicleHistoryPanelProps) {
  const [history, setHistory] = useState<VehicleHistory | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("services")

  const fetchHistory = async () => {
    if (!registration) return

    setLoading(true)
    try {
      const response = await fetch(`/api/vehicles/${registration}/history`)
      const data = await response.json()

      if (data.success) {
        setHistory(data.history)
        setSummary(data.summary)
      } else {
        console.error('Failed to fetch vehicle history:', data.error)
      }
    } catch (error) {
      console.error('Error fetching vehicle history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [registration])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getServiceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'service':
        return <Wrench className="h-4 w-4 text-blue-600" />
      case 'mot':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'repair':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'diagnostic':
        return <FileText className="h-4 w-4 text-purple-600" />
      default:
        return <Car className="h-4 w-4 text-gray-600" />
    }
  }

  const getServiceTypeBadge = (type: string) => {
    const colors = {
      service: 'bg-blue-100 text-blue-800',
      mot: 'bg-green-100 text-green-800',
      repair: 'bg-orange-100 text-orange-800',
      diagnostic: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800'
    }
    
    return colors[type.toLowerCase() as keyof typeof colors] || colors.general
  }

  const getMOTResultBadge = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">PASS</Badge>
      case 'fail':
        return <Badge className="bg-red-100 text-red-800">FAIL</Badge>
      case 'advisory':
        return <Badge className="bg-yellow-100 text-yellow-800">ADVISORY</Badge>
      default:
        return <Badge variant="secondary">{result}</Badge>
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading vehicle history...</span>
        </CardContent>
      </Card>
    )
  }

  if (!history) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No History Available</h3>
          <p className="text-sm text-muted-foreground">
            No service history found for {registration}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Vehicle History - {registration}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
        
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.totalServices}</div>
              <div className="text-sm text-muted-foreground">Total Services</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalSpent)}</div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {summary.lastServiceDate ? formatDate(summary.lastServiceDate) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Last Service</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {summary.currentMileage ? summary.currentMileage.toLocaleString() : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Current Mileage</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="services">
              Services ({history.services.length})
            </TabsTrigger>
            <TabsTrigger value="mot">
              MOT ({history.mot.length})
            </TabsTrigger>
            <TabsTrigger value="mileage">
              Mileage
            </TabsTrigger>
            <TabsTrigger value="ownership">
              Ownership
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {history.services.length > 0 ? (
                <div className="space-y-3">
                  {history.services.map((service) => (
                    <Card key={service.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getServiceTypeIcon(service.type)}
                            <div>
                              <div className="font-medium">
                                {service.docType} #{service.docNumber}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(service.date)} • {service.customer}
                              </div>
                              <div className="text-sm mt-1">
                                {service.description}
                              </div>
                              {service.mileage > 0 && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  <Gauge className="h-3 w-3 inline mr-1" />
                                  {service.mileage.toLocaleString()} miles
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getServiceTypeBadge(service.type)}>
                              {service.type}
                            </Badge>
                            <div className="font-medium mt-1">
                              {formatCurrency(service.amount)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No service records found</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="mot" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {history.mot.length > 0 ? (
                <div className="space-y-3">
                  {history.mot.map((mot, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              MOT Test #{mot.testNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Test: {formatDate(mot.testDate)} • 
                              Expires: {formatDate(mot.expiryDate)}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <Gauge className="h-3 w-3 inline mr-1" />
                              {mot.mileage.toLocaleString()} miles
                            </div>
                            {mot.defects.length > 0 && (
                              <div className="text-sm text-red-600 mt-2">
                                {mot.defects.length} defect(s) found
                              </div>
                            )}
                            {mot.advisories.length > 0 && (
                              <div className="text-sm text-yellow-600 mt-1">
                                {mot.advisories.length} advisory item(s)
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {getMOTResultBadge(mot.result)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No MOT records found</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="mileage" className="space-y-4">
            {history.mileage.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history.mileage}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatDate(value)}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} miles`, 'Mileage']}
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="mileage"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No mileage data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ownership" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {history.ownership.length > 0 ? (
                <div className="space-y-3">
                  {history.ownership.map((change) => (
                    <Card key={change.id} className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Users className="h-4 w-4 text-purple-600 mt-1" />
                            <div>
                              <div className="font-medium capitalize">
                                {change.changeType.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(change.changeDate)} • 
                                Reported by {change.reportedBy}
                              </div>
                              {change.previousOwner && (
                                <div className="text-sm mt-1">
                                  Previous owner: {change.previousOwner}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={change.verified ? "default" : "secondary"}>
                              {change.verified ? "Verified" : "Unverified"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No ownership changes recorded</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
