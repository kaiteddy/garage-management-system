'use client'

import { TyrePricingAnalytics } from '@/components/tyre-pricing-analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Wrench, TrendingUp, BarChart3, Target } from 'lucide-react'
import Link from 'next/link'

export default function TyrePricingPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tyre Pricing Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive analysis of tyre pricing based on size, sales history, and market trends
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Wrench className="h-4 w-4 mr-1" />
          MOT Service Analytics
        </Badge>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Size-Based Analysis</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">By Size</div>
            <p className="text-xs text-muted-foreground">
              Analyze pricing patterns for specific tyre sizes like 205/55R16
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Trends</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Trending</div>
            <p className="text-xs text-muted-foreground">
              Track price movements and stability over time
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Smart Recommendations</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">AI-Powered</div>
            <p className="text-xs text-muted-foreground">
              Get intelligent pricing suggestions based on historical data
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Popular Sizes</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Top Sellers</div>
            <p className="text-xs text-muted-foreground">
              Identify most frequently sold tyre sizes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
          <CardDescription>
            Comprehensive tyre pricing intelligence for your MOT service business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">📊 Size-Based Analytics</h4>
              <p className="text-sm text-gray-600">
                Analyze pricing for specific tyre sizes (205/55R16, 225/45R17, etc.) with detailed breakdowns of sales volume, price ranges, and profitability.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">📈 Price Trend Analysis</h4>
              <p className="text-sm text-gray-600">
                Track price movements over time, identify seasonal patterns, and spot opportunities for pricing optimization.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-600">🎯 Smart Pricing Suggestions</h4>
              <p className="text-sm text-gray-600">
                Get AI-powered pricing recommendations based on historical sales data, market trends, and customer type.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">🏆 Popular Size Rankings</h4>
              <p className="text-sm text-gray-600">
                Identify your best-selling tyre sizes to optimize inventory and focus on high-volume products.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-red-600">⚡ Real-Time Integration</h4>
              <p className="text-sm text-gray-600">
                Automatically captures pricing data from job sheets and updates analytics in real-time.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-indigo-600">🔍 Advanced Filtering</h4>
              <p className="text-sm text-gray-600">
                Filter by date ranges, customer types, and specific tyre sizes for targeted analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Component */}
      <TyrePricingAnalytics />

      {/* Integration Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">🔗 Integration with Job Sheets</CardTitle>
          <CardDescription className="text-blue-600">
            This system automatically captures tyre pricing data from your job sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="space-y-3">
            <p className="text-sm">
              <strong>Automatic Data Capture:</strong> When you add tyres to job sheets, the system automatically:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Extracts tyre size information (205/55R16, etc.)</li>
              <li>• Records pricing and customer details</li>
              <li>• Updates analytics and recommendations</li>
              <li>• Tracks price trends over time</li>
            </ul>
            <p className="text-sm">
              <strong>Smart Recognition:</strong> The system recognizes tyre descriptions containing size patterns and automatically categorizes them for analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
