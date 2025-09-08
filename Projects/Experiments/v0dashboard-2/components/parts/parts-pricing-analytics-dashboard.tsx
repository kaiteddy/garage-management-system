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
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Calendar,
  Package,
  Users,
  AlertTriangle,
  Target,
  Activity
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Area,
  AreaChart
} from 'recharts'

interface PartsPricingAnalyticsDashboardProps {
  className?: string
}

interface AnalyticsData {
  overview: {
    totalParts: number
    totalRevenue: number
    averagePrice: number
    totalSales: number
    topSellingPart: string
    mostProfitablePart: string
  }
  trends: {
    dailySales: Array<{ date: string; sales: number; revenue: number }>
    monthlyTrends: Array<{ month: string; avgPrice: number; volume: number }>
  }
  topParts: Array<{
    part_number: string
    part_name: string
    total_sales: number
    total_revenue: number
    avg_price: number
    price_stability: number
  }>
  priceVariances: Array<{
    part_number: string
    part_name: string
    current_price: number
    suggested_price: number
    variance_percentage: number
    last_sold: string
  }>
}

export function PartsPricingAnalyticsDashboard({ className = "" }: PartsPricingAnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState('30')
  const [selectedMetric, setSelectedMetric] = useState('revenue')
  const { toast } = useToast()

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      // This would typically call multiple API endpoints
      // For now, we'll simulate the data structure
      
      const mockData: AnalyticsData = {
        overview: {
          totalParts: 156,
          totalRevenue: 12450.75,
          averagePrice: 28.95,
          totalSales: 430,
          topSellingPart: "5W-30 Synthetic Engine Oil",
          mostProfitablePart: "Front Brake Pads"
        },
        trends: {
          dailySales: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
            sales: Math.floor(Math.random() * 20) + 5,
            revenue: Math.floor(Math.random() * 500) + 200
          })),
          monthlyTrends: [
            { month: 'Jan', avgPrice: 25.50, volume: 120 },
            { month: 'Feb', avgPrice: 26.20, volume: 135 },
            { month: 'Mar', avgPrice: 27.80, volume: 145 },
            { month: 'Apr', avgPrice: 28.95, volume: 160 },
          ]
        },
        topParts: [
          {
            part_number: 'OIL-5W30-5L',
            part_name: '5W-30 Synthetic Engine Oil 5L',
            total_sales: 45,
            total_revenue: 2925.75,
            avg_price: 65.02,
            price_stability: 0.92
          },
          {
            part_number: 'BRAKE-PAD-FRONT',
            part_name: 'Front Brake Pads',
            total_sales: 28,
            total_revenue: 2518.60,
            avg_price: 89.95,
            price_stability: 0.88
          },
          {
            part_number: 'FILTER-OIL-001',
            part_name: 'Engine Oil Filter',
            total_sales: 52,
            total_revenue: 673.40,
            avg_price: 12.95,
            price_stability: 0.95
          }
        ],
        priceVariances: [
          {
            part_number: 'SPARK-PLUG-NGK',
            part_name: 'NGK Spark Plugs',
            current_price: 45.00,
            suggested_price: 38.50,
            variance_percentage: 16.9,
            last_sold: '2024-01-15'
          }
        ]
      }

      setAnalyticsData(mockData)
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  const getStabilityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50'
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-8 text-gray-500">
          No analytics data available
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Parts Pricing Analytics</h2>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalyticsData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Parts</p>
                <p className="text-2xl font-bold">{analyticsData.overview.totalParts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analyticsData.overview.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Average Price</p>
                <p className="text-2xl font-bold">{formatCurrency(analyticsData.overview.averagePrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold">{analyticsData.overview.totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Sales Trends</TabsTrigger>
          <TabsTrigger value="parts">Top Parts</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Price Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales & Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.trends.dailySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="sales"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Price & Volume Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.trends.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgPrice" fill="#8884d8" />
                      <Bar dataKey="volume" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parts">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Price Stability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.topParts.map((part) => (
                    <TableRow key={part.part_number}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{part.part_name}</div>
                          <div className="text-sm text-gray-500">{part.part_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>{part.total_sales}</TableCell>
                      <TableCell>{formatCurrency(part.total_revenue)}</TableCell>
                      <TableCell>{formatCurrency(part.avg_price)}</TableCell>
                      <TableCell>
                        <Badge className={getStabilityColor(part.price_stability)}>
                          {formatPercentage(part.price_stability * 100)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Price Distribution Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Price distribution charts will be displayed here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Price Variance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.priceVariances.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.priceVariances.map((variance, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{variance.part_name}</h4>
                          <p className="text-sm text-gray-600">{variance.part_number}</p>
                        </div>
                        <Badge variant="outline" className="text-orange-600">
                          {formatPercentage(variance.variance_percentage)} variance
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Current:</span>
                          <div className="font-medium">{formatCurrency(variance.current_price)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Suggested:</span>
                          <div className="font-medium">{formatCurrency(variance.suggested_price)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Sold:</span>
                          <div className="font-medium">{new Date(variance.last_sold).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No price variance alerts at this time
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
