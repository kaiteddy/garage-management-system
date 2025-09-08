"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, DollarSign, Users, Car, Calendar, Download } from "lucide-react"

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedReport, setSelectedReport] = useState("overview")

  const reportData = {
    overview: {
      revenue: 15420.5,
      jobs: 87,
      customers: 45,
      vehicles: 62,
      growth: {
        revenue: 12.5,
        jobs: 8.3,
        customers: 15.2,
        vehicles: 6.7,
      },
    },
    monthly: [
      { month: "Jan", revenue: 12500, jobs: 65, customers: 38 },
      { month: "Feb", revenue: 15420, jobs: 87, customers: 45 },
      { month: "Mar", revenue: 18200, jobs: 95, customers: 52 },
    ],
    topServices: [
      { service: "Annual Service", count: 25, revenue: 4500 },
      { service: "MOT Test", count: 18, revenue: 987 },
      { service: "Brake Service", count: 15, revenue: 3200 },
      { service: "Oil Change", count: 12, revenue: 540 },
      { service: "Diagnostic", count: 8, revenue: 680 },
    ],
    customerAnalysis: [
      { segment: "Regular Customers", count: 28, percentage: 62 },
      { segment: "New Customers", count: 12, percentage: 27 },
      { segment: "Returning Customers", count: 5, percentage: 11 },
    ],
  }

  const periods = [
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="transition-all duration-200 hover:scale-105 bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">£{reportData.overview.revenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 font-medium">
                  +{reportData.overview.growth.revenue}% from last period
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jobs Completed</p>
                <p className="text-3xl font-bold">{reportData.overview.jobs}</p>
                <p className="text-sm text-green-600 font-medium">
                  +{reportData.overview.growth.jobs}% from last period
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                <p className="text-3xl font-bold">{reportData.overview.customers}</p>
                <p className="text-sm text-green-600 font-medium">
                  +{reportData.overview.growth.customers}% from last period
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vehicles Serviced</p>
                <p className="text-3xl font-bold">{reportData.overview.vehicles}</p>
                <p className="text-sm text-green-600 font-medium">
                  +{reportData.overview.growth.vehicles}% from last period
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500">
                <Car className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="services">Service Performance</TabsTrigger>
          <TabsTrigger value="customers">Customer Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends & Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Revenue Trend
                </CardTitle>
                <CardDescription>Revenue performance over the last 3 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.monthly.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{month.month} 2024</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">£{month.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{month.jobs} jobs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue sources for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Service Revenue</span>
                    <span className="font-bold">£12,340</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Parts Revenue</span>
                    <span className="font-bold">£2,580</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>MOT Tests</span>
                    <span className="font-bold">£500</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center font-bold">
                    <span>Total Revenue</span>
                    <span>£15,420</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Performing Services
              </CardTitle>
              <CardDescription>Most popular services by volume and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topServices.map((service, index) => (
                  <div key={service.service} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{service.service}</p>
                        <p className="text-sm text-muted-foreground">{service.count} jobs completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">£{service.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        £{(service.revenue / service.count).toFixed(0)} avg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Segments
                </CardTitle>
                <CardDescription>Customer distribution by engagement level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.customerAnalysis.map((segment) => (
                    <div key={segment.segment} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{segment.segment}</span>
                        <span>{segment.count} customers</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${segment.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground">{segment.percentage}% of total</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Metrics</CardTitle>
                <CardDescription>Key customer performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Customer Value</p>
                    <p className="text-2xl font-bold text-blue-600">£342</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Customer Retention Rate</p>
                    <p className="text-2xl font-bold text-green-600">87%</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Jobs per Customer</p>
                    <p className="text-2xl font-bold text-purple-600">1.9</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Business Trends & Forecasts
              </CardTitle>
              <CardDescription>Predictive analytics and trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Revenue Forecast</h3>
                  <p className="text-2xl font-bold text-green-600">£18,500</p>
                  <p className="text-sm text-muted-foreground">Projected next month</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">+20% growth</Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Peak Season</h3>
                  <p className="text-2xl font-bold text-blue-600">March-May</p>
                  <p className="text-sm text-muted-foreground">Highest demand period</p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">Seasonal trend</Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Service Demand</h3>
                  <p className="text-2xl font-bold text-orange-600">MOT Tests</p>
                  <p className="text-sm text-muted-foreground">Trending upward</p>
                  <Badge className="mt-2 bg-orange-100 text-orange-800">+15% increase</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
