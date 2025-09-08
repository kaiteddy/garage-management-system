'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Car,
  Wrench,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  BarChart3,
  Loader2,
  CalendarDays,
  Info
} from "lucide-react"
import { format, isValid, parseISO } from 'date-fns'

interface OverviewData {
  revenue: { current: number; previous: number; change: number }
  jobs: { current: number; previous: number; change: number }
  mots: { current: number; previous: number; change: number }
  customers: { current: number; previous: number; change: number }
  vehicles: { current: number; previous: number; change: number }
}

interface RevenueData {
  summary: {
    totalRevenue: number
    totalJobs: number
    avgJobValue: number
    period: string
  }
  trend: Array<{
    date: string
    revenue: number
    jobs: number
    customers: number
  }>
  breakdown: Array<{
    type: string
    revenue: number
    count: number
    avgValue: number
  }>
  technicians: Array<{
    name: string
    revenue: number
    jobs: number
    avgJobValue: number
  }>
}

interface TransactionData {
  transactions: Array<{
    id: string
    documentNumber: string
    documentType: string
    date: string
    amount: number
    netAmount: number
    taxAmount: number
    vehicleRegistration: string
    vehicleMakeModel: string
    customerName: string
    customerPhone: string
    status: string
  }>
  summary: {
    totalTransactions: number
    totalAmount: number
    avgTransaction: number
    dateRange: string
  }
  summaryByType: Array<{
    type: string
    count: number
    totalAmount: number
    avgAmount: number
    minAmount: number
    maxAmount: number
  }>
  topCustomers: Array<{
    name: string
    transactionCount: number
    totalSpent: number
    avgTransaction: number
    largestTransaction: number
  }>
}

interface AdvancedAnalyticsData {
  comparison: {
    type: string
    label: string
    current: {
      period: string
      transactions: number
      revenue: number
      avgTransaction: number
      uniqueCustomers: number
      uniqueVehicles: number
      activeDays: number
    }
    previous: {
      period: string
      transactions: number
      revenue: number
      avgTransaction: number
      uniqueCustomers: number
      uniqueVehicles: number
      activeDays: number
    }
  }
  dailyTrends: Array<{
    date: string
    dayName: string
    dayOfWeek: number
    transactions: number
    revenue: number
    avgTransaction: number
    uniqueCustomers: number
  }>
  customerAnalysis: Array<{
    name: string
    transactionCount: number
    totalSpent: number
    avgTransaction: number
    vehiclesServiced: number
    customerSegment: string
    valueSegment: string
  }>
  documentTypeAnalysis: Array<{
    type: string
    count: number
    revenue: number
    avgValue: number
    minValue: number
    maxValue: number
    valueStddev: number
  }>
  hourlyPatterns: Array<{
    hour: number
    transactions: number
    revenue: number
    avgTransaction: number
  }>
  insights: string[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL parameters
  const [period, setPeriod] = useState('month')
  const [comparisonType, setComparisonType] = useState<'wow' | 'mom' | 'yoy' | 'custom'>(
    (searchParams.get('comparison') as 'wow' | 'mom' | 'yoy' | 'custom') || 'mom'
  )
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null)
  const [advancedData, setAdvancedData] = useState<AdvancedAnalyticsData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [demoMode, setDemoMode] = useState(false)

  // Custom date range state - only set if we're in custom mode
  const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: searchParams.get('startDate') ? parseISO(searchParams.get('startDate')!) : null,
    end: searchParams.get('endDate') ? parseISO(searchParams.get('endDate')!) : null
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerRange, setDatePickerRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: undefined,
    to: undefined
  })

  const [aiInsights, setAiInsights] = useState<string[]>([])
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Update URL with current state
  const updateURL = (newComparisonType?: string, newStartDate?: string, newEndDate?: string) => {
    const params = new URLSearchParams()
    params.set('comparison', newComparisonType || comparisonType)

    if (newStartDate && newEndDate) {
      params.set('startDate', newStartDate)
      params.set('endDate', newEndDate)
    } else if (customDateRange.start && customDateRange.end) {
      params.set('startDate', format(customDateRange.start, 'yyyy-MM-dd'))
      params.set('endDate', format(customDateRange.end, 'yyyy-MM-dd'))
    }

    router.push(`/analytics?${params.toString()}`, { scroll: false })
  }

  // Load analytics data
  const loadAnalyticsData = async (showRefreshing = false, forceComparisonType?: string) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
        setIsUpdating(true)
      } else {
        setLoading(true)
      }
      setDataError(null)

      // Determine which comparison type to use
      const currentComparisonType = forceComparisonType || comparisonType

      // Build query parameters
      let queryParams = `period=${period}`

      // Add demo mode or custom date range (only for custom comparison type)
      if (demoMode) {
        // Use historical data date (July 26, 2025) as current period for demo
        queryParams += '&startDate=2025-07-26&endDate=2025-07-26'
      } else if (currentComparisonType === 'custom' && customDateRange.start && customDateRange.end) {
        queryParams += `&startDate=${format(customDateRange.start, 'yyyy-MM-dd')}&endDate=${format(customDateRange.end, 'yyyy-MM-dd')}`
      }

      // Load overview data
      const overviewResponse = await fetch(`/api/analytics/overview?${queryParams}`)
      const overviewResult = await overviewResponse.json()

      if (overviewResult.success) {
        console.log('📈 [ANALYTICS] Overview data received:', overviewResult.data)
        console.log('📊 [ANALYTICS] Revenue data:', overviewResult.data.revenue)
        setOverviewData(overviewResult.data)
      } else {
        console.error('❌ [ANALYTICS] Overview API failed:', overviewResult)
      }

      // Load revenue data
      const revenueResponse = await fetch(`/api/analytics/revenue?${queryParams}`)
      const revenueResult = await revenueResponse.json()

      if (revenueResult.success) {
        setRevenueData(revenueResult.data)
      }

      // Load transaction data
      const transactionResponse = await fetch(`/api/analytics/transactions?${queryParams}`)
      const transactionResult = await transactionResponse.json()

      if (transactionResult.success) {
        setTransactionData(transactionResult.data)
      }

      // Build advanced analytics query with custom date range if applicable
      let advancedQuery = `comparison=${currentComparisonType}`
      if (currentComparisonType === 'custom' && customDateRange.start && customDateRange.end) {
        advancedQuery += `&startDate=${format(customDateRange.start, 'yyyy-MM-dd')}&endDate=${format(customDateRange.end, 'yyyy-MM-dd')}`
      } else if (demoMode) {
        // For demo mode, pass the demo date to advanced analytics too
        advancedQuery += `&startDate=2025-07-26&endDate=2025-07-26`
      }

      // Load advanced analytics data with current comparison type
      const advancedResponse = await fetch(`/api/analytics/advanced?${advancedQuery}`)
      const advancedResult = await advancedResponse.json()

      if (advancedResult.success) {
        console.log('🤖 [ANALYTICS] Advanced data received:', advancedResult.data)
        setAdvancedData(advancedResult.data)
        setAiInsights(advancedResult.data.insights)
      } else {
        console.error('❌ [ANALYTICS] Failed to load advanced analytics:', advancedResult)
        setDataError('Failed to load advanced analytics data')
      }

      setLastUpdated(new Date())

    } catch (error) {
      console.error('Error loading analytics data:', error)
      setDataError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setIsUpdating(false)
    }
  }

  // Handle comparison type change
  const handleComparisonTypeChange = async (newType: 'wow' | 'mom' | 'yoy' | 'custom') => {
    console.log('🔄 [ANALYTICS] Comparison type changed to:', newType)
    setComparisonType(newType)

    if (newType === 'custom') {
      setShowDatePicker(true)
    } else {
      console.log('📊 [ANALYTICS] Loading data for comparison type:', newType)
      // Clear custom date range when switching to predefined periods
      setCustomDateRange({ start: null, end: null })
      await loadAnalyticsData(true, newType)
      console.log('✅ [ANALYTICS] Data loading completed for:', newType)
      // Update URL after data is loaded to avoid race conditions
      updateURL(newType)
    }
  }

  // Handle custom date range selection
  const handleDateRangeSelect = async () => {
    if (datePickerRange.from && datePickerRange.to) {
      const newRange = {
        start: datePickerRange.from,
        end: datePickerRange.to
      }
      setCustomDateRange(newRange)
      setShowDatePicker(false)

      const startDate = format(datePickerRange.from, 'yyyy-MM-dd')
      const endDate = format(datePickerRange.to, 'yyyy-MM-dd')
      updateURL('custom', startDate, endDate)

      await loadAnalyticsData(true)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadAnalyticsData()
  }, [])

  // Note: Comparison type changes are handled directly in handleComparisonTypeChange
  // to avoid duplicate API calls and ensure proper state management

  // Auto-refresh every 5 minutes (but not when user is actively changing settings)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isUpdating && !showDatePicker) {
        loadAnalyticsData(true)
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [isUpdating, showDatePicker])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    format = 'number',
    color = 'blue' 
  }: {
    title: string
    value: number
    change: number
    icon: any
    format?: 'currency' | 'number'
    color?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {format === 'currency' ? formatCurrency(value) : value.toLocaleString()}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          {change >= 0 ? (
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
            {formatPercentage(change)}
          </span>
          <span className="ml-1">from last {period}</span>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Loading Analytics Dashboard</h3>
            <p className="text-muted-foreground">Analyzing your business data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI-Powered Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced business intelligence with period comparisons and AI insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {format(lastUpdated, 'HH:mm')}
            {isUpdating && (
              <div className="flex items-center gap-1 ml-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Updating...</span>
              </div>
            )}
          </div>

          {/* Period Comparison Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={comparisonType}
              onValueChange={handleComparisonTypeChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wow">Week over Week</SelectItem>
                <SelectItem value="mom">Month over Month</SelectItem>
                <SelectItem value="yoy">Year over Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {isUpdating && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>

          {/* Custom Date Range Picker */}
          {comparisonType === 'custom' && (
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-48">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {customDateRange.start && customDateRange.end
                    ? `${format(customDateRange.start, 'MMM dd')} - ${format(customDateRange.end, 'MMM dd')}`
                    : 'Select date range'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Select Date Range</Label>
                    <Calendar
                      mode="range"
                      selected={datePickerRange}
                      onSelect={setDatePickerRange}
                      numberOfMonths={2}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleDateRangeSelect}
                      disabled={!datePickerRange.from || !datePickerRange.to}
                    >
                      Apply Range
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDatePicker(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showAdvancedMetrics ? 'Hide' : 'Show'} Advanced
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalyticsData(true)}
            disabled={refreshing || isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {dataError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {dataError}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Status Info */}
      {comparisonType === 'custom' && customDateRange.start && customDateRange.end && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Analyzing data from {format(customDateRange.start, 'MMM dd, yyyy')} to {format(customDateRange.end, 'MMM dd, yyyy')}
            {advancedData && (
              <span className="ml-2">
                • {advancedData.comparison.current.transactions.toLocaleString()} transactions found
                • {formatCurrency(advancedData.comparison.current.revenue)} total revenue
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* AI Insights Banner */}
      {aiInsights.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <TrendingUp className="h-5 w-5" />
              AI-Powered Business Insights
              {advancedData && (
                <Badge variant="secondary" className="ml-2">
                  {advancedData.comparison.label}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {aiInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span className="text-blue-800">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Metrics */}
      {overviewData && (
        <div key={`metrics-${comparisonType}-${lastUpdated.getTime()}`} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Total Revenue"
            value={overviewData.revenue.current}
            change={overviewData.revenue.change}
            icon={DollarSign}
            format="currency"
            color="green"
          />
          <MetricCard
            title="Jobs Completed"
            value={overviewData.jobs.current}
            change={overviewData.jobs.change}
            icon={Wrench}
            color="blue"
          />
          <MetricCard
            title="MOT Tests"
            value={overviewData.mots.current}
            change={overviewData.mots.change}
            icon={CheckCircle}
            color="purple"
          />
          <MetricCard
            title="Active Customers"
            value={overviewData.customers.current}
            change={overviewData.customers.change}
            icon={Users}
            color="orange"
          />
          <MetricCard
            title="Vehicles Serviced"
            value={overviewData.vehicles.current}
            change={overviewData.vehicles.change}
            icon={Car}
            color="indigo"
          />
        </div>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="advanced" className="space-y-4">
        <TabsList>
          <TabsTrigger value="advanced">🤖 AI Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Details</TabsTrigger>
          <TabsTrigger value="parts">Parts & Inventory</TabsTrigger>
          <TabsTrigger value="labour">Labour & Productivity</TabsTrigger>
          <TabsTrigger value="customer">Customer Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends & Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="space-y-4">
          {advancedData && (
            <div className="grid gap-4">
              {/* Period Comparison Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      {advancedData.comparison.label} Comparison
                    </CardTitle>
                    <CardDescription>Performance metrics comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Current Period</div>
                          <div className="font-medium">{advancedData.comparison.current.period}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Previous Period</div>
                          <div className="font-medium">{advancedData.comparison.previous.period}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { label: 'Revenue', current: advancedData.comparison.current.revenue, previous: advancedData.comparison.previous.revenue, format: 'currency' },
                          { label: 'Transactions', current: advancedData.comparison.current.transactions, previous: advancedData.comparison.previous.transactions, format: 'number' },
                          { label: 'Avg Transaction', current: advancedData.comparison.current.avgTransaction, previous: advancedData.comparison.previous.avgTransaction, format: 'currency' },
                          { label: 'Unique Customers', current: advancedData.comparison.current.uniqueCustomers, previous: advancedData.comparison.previous.uniqueCustomers, format: 'number' },
                          { label: 'Unique Vehicles', current: advancedData.comparison.current.uniqueVehicles, previous: advancedData.comparison.previous.uniqueVehicles, format: 'number' }
                        ].map((metric) => {
                          const change = metric.previous > 0 ? ((metric.current - metric.previous) / metric.previous) * 100 : 0
                          return (
                            <div key={metric.label} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{metric.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {metric.format === 'currency' ? formatCurrency(metric.current) : metric.current.toLocaleString()}
                                  vs {metric.format === 'currency' ? formatCurrency(metric.previous) : metric.previous.toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                  <span className="font-bold">{formatPercentage(change)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Performance Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Performance Trends</CardTitle>
                    <CardDescription>Revenue and transaction patterns by day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={advancedData.dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'revenue' ? formatCurrency(value as number) : value,
                            name === 'revenue' ? 'Revenue' : 'Transactions'
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="transactions"
                          stroke="#82ca9d"
                          fill="#82ca9d"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Segmentation Analysis */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Segmentation</CardTitle>
                    <CardDescription>Customer analysis by value and frequency</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {advancedData.customerAnalysis.slice(0, 8).map((customer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="flex gap-2 text-xs">
                              <Badge variant="outline">{customer.valueSegment}</Badge>
                              <Badge variant="secondary">{customer.customerSegment}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(customer.totalSpent)}</div>
                            <div className="text-sm text-muted-foreground">{customer.transactionCount} transactions</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly Performance Patterns */}
                <Card>
                  <CardHeader>
                    <CardTitle>Hourly Performance Patterns</CardTitle>
                    <CardDescription>Revenue distribution throughout the day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={advancedData.hourlyPatterns}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="revenue" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Document Type Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Type Performance Analysis</CardTitle>
                  <CardDescription>Revenue breakdown and statistics by document type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {advancedData.documentTypeAnalysis.map((doc) => (
                      <div key={doc.type} className="p-4 border rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{doc.type}</div>
                          <div className="text-sm text-muted-foreground mb-3">{doc.count.toLocaleString()} documents</div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Total Revenue:</span>
                              <span className="font-bold">{formatCurrency(doc.revenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg Value:</span>
                              <span>{formatCurrency(doc.avgValue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Range:</span>
                              <span>{formatCurrency(doc.minValue)} - {formatCurrency(doc.maxValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {revenueData && (
            <div className="grid gap-4">
              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>
                    Daily revenue performance for {revenueData.summary.period}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? formatCurrency(value as number) : value,
                          name === 'revenue' ? 'Revenue' : name === 'jobs' ? 'Jobs' : 'Customers'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Revenue Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                    <CardDescription>Revenue by service type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={revenueData.breakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ type, revenue }) => `${type}: ${formatCurrency(revenue)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="revenue"
                        >
                          {revenueData.breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Technicians */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technician Performance</CardTitle>
                    <CardDescription>Revenue by technician</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={revenueData.technicians.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="revenue" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {transactionData && (
            <div className="grid gap-4">
              {/* Transaction Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{transactionData.summary.totalTransactions.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">July 25, 2025</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(transactionData.summary.totalAmount)}</div>
                    <p className="text-xs text-muted-foreground">All document types</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(transactionData.summary.avgTransaction)}</div>
                    <p className="text-xs text-muted-foreground">Per transaction</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Document Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{transactionData.summaryByType.length}</div>
                    <p className="text-xs text-muted-foreground">JS, ES, SI, Invoice</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Transaction Breakdown by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Breakdown by Type</CardTitle>
                    <CardDescription>Revenue and count by document type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactionData.summaryByType.map((type, index) => (
                        <div key={type.type} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{type.type}</div>
                            <div className="text-sm text-muted-foreground">{type.count.toLocaleString()} transactions</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(type.totalAmount)}</div>
                            <div className="text-sm text-muted-foreground">Avg: {formatCurrency(type.avgAmount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers by Revenue</CardTitle>
                    <CardDescription>Highest spending customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactionData.topCustomers.slice(0, 5).map((customer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.transactionCount} transactions</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(customer.totalSpent)}</div>
                            <div className="text-sm text-muted-foreground">Avg: {formatCurrency(customer.avgTransaction)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent High-Value Transactions</CardTitle>
                  <CardDescription>Top 20 transactions by value</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Document #</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Customer</th>
                          <th className="text-left p-2">Vehicle</th>
                          <th className="text-right p-2">Amount</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactionData.transactions.slice(0, 20).map((tx) => (
                          <tr key={tx.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{tx.documentNumber}</td>
                            <td className="p-2">
                              <Badge variant="outline">{tx.documentType}</Badge>
                            </td>
                            <td className="p-2">{tx.customerName}</td>
                            <td className="p-2">
                              <div>{tx.vehicleRegistration}</div>
                              <div className="text-xs text-muted-foreground">{tx.vehicleMakeModel}</div>
                            </td>
                            <td className="p-2 text-right font-bold">{formatCurrency(tx.amount)}</td>
                            <td className="p-2">
                              <Badge variant={tx.status === '2' ? 'default' : 'secondary'}>
                                {tx.status === '2' ? 'Completed' : 'Draft'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parts & Inventory Analytics</CardTitle>
              <CardDescription>Coming soon - Parts usage, inventory levels, and supplier performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mr-2" />
                Parts and inventory analytics will be available soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labour" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Labour & Productivity Metrics</CardTitle>
              <CardDescription>Coming soon - Technician performance, labour efficiency, and utilization rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Wrench className="h-8 w-8 mr-2" />
                Labour and productivity analytics will be available soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
              <CardDescription>Coming soon - Customer behavior and retention analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Users className="h-8 w-8 mr-2" />
                Customer analytics will be available soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trends & Forecasts</CardTitle>
              <CardDescription>Coming soon - Predictive analytics and trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mr-2" />
                Trend analysis and forecasting will be available soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
