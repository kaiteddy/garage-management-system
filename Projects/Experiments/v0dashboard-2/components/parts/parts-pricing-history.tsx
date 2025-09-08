"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, TrendingUp, TrendingDown, Clock, DollarSign, BarChart3, History, Lightbulb } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface PartsPricingHistoryProps {
  partNumber?: string
  partName?: string
  onPriceSelect?: (price: number, reasoning: string) => void
  showSuggestions?: boolean
  customerType?: 'retail' | 'trade' | 'warranty' | 'internal'
}

interface PricingHistoryEntry {
  id: number
  part_number: string
  part_name: string
  price_charged: number
  quantity_sold: number
  date_sold: string
  customer_type: string
  job_sheet_number?: string
  vehicle_registration?: string
  notes?: string
}

interface PricingAnalytics {
  part_number: string
  part_name: string
  current_suggested_price?: number
  average_price_30_days?: number
  average_price_90_days?: number
  average_price_all_time?: number
  most_recent_price?: number
  most_recent_sale_date?: string
  highest_price?: number
  lowest_price?: number
  total_sales_count: number
  total_quantity_sold: number
  total_revenue: number
  sales_last_30_days: number
  sales_last_90_days: number
  price_stability_score?: number
}

interface PricingSuggestion {
  part_number: string
  suggested_price: number
  suggestion_type: string
  confidence_score: number
  reasoning: string
  price_range: {
    min: number
    max: number
    recommended: number
  }
  historical_context: {
    last_sold_price?: number
    last_sold_date?: string
    average_price?: number
    sales_frequency?: string
  }
}

export function PartsPricingHistory({ 
  partNumber, 
  partName, 
  onPriceSelect, 
  showSuggestions = true,
  customerType = 'retail'
}: PartsPricingHistoryProps) {
  const [history, setHistory] = useState<PricingHistoryEntry[]>([])
  const [analytics, setAnalytics] = useState<PricingAnalytics | null>(null)
  const [suggestions, setSuggestions] = useState<PricingSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCustomerType, setFilterCustomerType] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    if (partNumber || partName) {
      loadPricingData()
    }
  }, [partNumber, partName, customerType])

  const loadPricingData = async () => {
    if (!partNumber && !partName) return

    setLoading(true)
    try {
      // Load pricing history
      const historyParams = new URLSearchParams({
        action: 'history',
        limit: '50',
        ...(partNumber && { part_number: partNumber }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(filterCustomerType !== 'all' && { customer_type: filterCustomerType })
      })

      const historyResponse = await fetch(`/api/parts-pricing-history?${historyParams}`)
      const historyData = await historyResponse.json()

      if (historyData.success) {
        setHistory(historyData.data.history || [])
      }

      // Load analytics if we have a specific part
      if (partNumber) {
        const analyticsResponse = await fetch(`/api/parts-pricing-history?action=analytics&part_number=${partNumber}`)
        const analyticsData = await analyticsResponse.json()

        if (analyticsData.success) {
          setAnalytics(analyticsData.data)
        }

        // Load pricing suggestions
        if (showSuggestions) {
          const suggestionsParams = new URLSearchParams({
            ...(partNumber && { part_number: partNumber }),
            ...(partName && { part_name: partName }),
            customer_type: customerType
          })

          const suggestionsResponse = await fetch(`/api/parts-pricing-suggestions?${suggestionsParams}`)
          const suggestionsData = await suggestionsResponse.json()

          if (suggestionsData.success) {
            setSuggestions(suggestionsData.data || [])
          }
        }
      }

    } catch (error) {
      console.error('Error loading pricing data:', error)
      toast({
        title: "Error",
        description: "Failed to load pricing data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePriceSelect = (price: number, reasoning: string) => {
    if (onPriceSelect) {
      onPriceSelect(price, reasoning)
      toast({
        title: "Price Applied",
        description: `Applied £${price.toFixed(2)} - ${reasoning}`,
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getCustomerTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'trade': return 'bg-blue-100 text-blue-800'
      case 'warranty': return 'bg-green-100 text-green-800'
      case 'internal': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Prepare chart data
  const chartData = history.slice(0, 10).reverse().map(entry => ({
    date: formatDate(entry.date_sold),
    price: entry.price_charged,
    customer_type: entry.customer_type
  }))

  if (!partNumber && !partName) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Select a part to view pricing history and suggestions
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pricing Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Pricing Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">£{suggestion.suggested_price.toFixed(2)}</span>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.suggestion_type.replace('_', ' ')}
                      </Badge>
                      <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence_score)}`}>
                        {(suggestion.confidence_score * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      Range: £{suggestion.price_range.min} - £{suggestion.price_range.max}
                    </div>
                  </div>
                  <Button
                    onClick={() => handlePriceSelect(suggestion.suggested_price, suggestion.reasoning)}
                    size="sm"
                    className="ml-4"
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Suggested Price</p>
                  <p className="text-lg font-semibold">
                    £{analytics.current_suggested_price?.toFixed(2) || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Price (30d)</p>
                  <p className="text-lg font-semibold">
                    £{analytics.average_price_30_days?.toFixed(2) || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Last Sold</p>
                  <p className="text-lg font-semibold">
                    £{analytics.most_recent_price?.toFixed(2) || 'N/A'}
                  </p>
                  {analytics.most_recent_sale_date && (
                    <p className="text-xs text-gray-500">
                      {formatDate(analytics.most_recent_sale_date)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-lg font-semibold">{analytics.total_sales_count}</p>
                  <p className="text-xs text-gray-500">
                    {analytics.total_quantity_sold} units
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Pricing History
          </CardTitle>
          
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="customer-type">Customer Type</Label>
              <Select value={filterCustomerType} onValueChange={setFilterCustomerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="warranty">Warranty</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadPricingData} disabled={loading}>
                {loading ? 'Loading...' : 'Filter'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="chart">Price Trend</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table">
              {history.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Customer Type</TableHead>
                      <TableHead>Job Sheet</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.date_sold)}</TableCell>
                        <TableCell className="font-semibold">
                          £{entry.price_charged.toFixed(2)}
                        </TableCell>
                        <TableCell>{entry.quantity_sold}</TableCell>
                        <TableCell>
                          <Badge className={getCustomerTypeBadgeColor(entry.customer_type)}>
                            {entry.customer_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.job_sheet_number || 'N/A'}</TableCell>
                        <TableCell>{entry.vehicle_registration || 'N/A'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePriceSelect(
                              entry.price_charged, 
                              `Historical price from ${formatDate(entry.date_sold)}`
                            )}
                          >
                            Use Price
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No pricing history found for this part
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="chart">
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`£${value.toFixed(2)}`, 'Price']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data available for chart
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
