'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle, CheckCircle } from 'lucide-react'

interface APICostData {
  totalSpend: number
  monthlySpend: number
  budgetUsed: number
  budgetLimit: number
  topAPIs: Array<{
    provider: string
    cost: number
    requests: number
    avgCost: number
  }>
  dailySpend: Array<{
    date: string
    vdg: number
    sws: number
    total: number
  }>
  budgetStatus: Array<{
    provider: string
    spent: number
    budget: number
    percentage: number
    status: 'safe' | 'warning' | 'danger'
  }>
  cacheEfficiency: {
    totalRequests: number
    cacheHits: number
    cacheMisses: number
    costSaved: number
  }
  costBreakdown: Array<{
    provider: string
    value: number
    color: string
  }>
}

const COLORS = {
  VDG: '#8884d8',
  SWS: '#82ca9d',
  DVLA: '#ffc658',
  MOT: '#ff7300'
}

export default function APICostsPage() {
  const [costData, setCostData] = useState<APICostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    fetchCostData()
  }, [timeRange])

  const fetchCostData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/costs/analytics?range=${timeRange}`)
      const data = await response.json()
      setCostData(data)
    } catch (error) {
      console.error('Failed to fetch cost data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading API cost analytics...</div>
        </div>
      </div>
    )
  }

  if (!costData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">Failed to load cost data</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Cost Analytics</h1>
          <p className="text-muted-foreground">Monitor and optimize your API spending</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm ${
                timeRange === range 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{costData.totalSpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              £{costData.monthlySpend.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costData.budgetUsed.toFixed(1)}%</div>
            <Progress value={costData.budgetUsed} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              £{costData.budgetLimit.toFixed(2)} monthly limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Efficiency</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((costData.cacheEfficiency.cacheHits / costData.cacheEfficiency.totalRequests) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              £{costData.cacheEfficiency.costSaved.toFixed(2)} saved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costData.cacheEfficiency.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {costData.cacheEfficiency.cacheHits} from cache
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Provider</CardTitle>
                <CardDescription>Distribution of API costs</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costData.costBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ provider, value }) => `${provider}: £${value.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costData.costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`£${value.toFixed(2)}`, 'Cost']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top APIs Table */}
            <Card>
              <CardHeader>
                <CardTitle>API Usage Summary</CardTitle>
                <CardDescription>Cost and request statistics by provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costData.topAPIs.map((api) => (
                    <div key={api.provider} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{api.provider}</div>
                        <div className="text-sm text-muted-foreground">
                          {api.requests} requests • £{api.avgCost.toFixed(4)} avg
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">£{api.cost.toFixed(2)}</div>
                        <Badge variant={api.cost > 50 ? 'destructive' : api.cost > 20 ? 'default' : 'secondary'}>
                          {api.cost > 50 ? 'High' : api.cost > 20 ? 'Medium' : 'Low'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {costData.budgetStatus.map((budget) => (
              <Card key={budget.provider}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {budget.provider}
                    {budget.status === 'danger' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    {budget.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {budget.status === 'safe' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent: £{budget.spent.toFixed(2)}</span>
                      <span>Budget: £{budget.budget.toFixed(2)}</span>
                    </div>
                    <Progress 
                      value={budget.percentage} 
                      className={`h-2 ${
                        budget.status === 'danger' ? 'bg-red-100' : 
                        budget.status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}
                    />
                    <div className="text-center text-sm font-medium">
                      {budget.percentage.toFixed(1)}% used
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Spending Trends</CardTitle>
              <CardDescription>API costs over time by provider</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={costData.dailySpend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`£${value.toFixed(2)}`, 'Cost']} />
                  <Legend />
                  <Line type="monotone" dataKey="vdg" stroke={COLORS.VDG} name="VDG" />
                  <Line type="monotone" dataKey="sws" stroke={COLORS.SWS} name="SWS" />
                  <Line type="monotone" dataKey="total" stroke="#333" strokeWidth={2} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>How caching is reducing API costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Requests</span>
                    <span className="font-bold">{costData.cacheEfficiency.totalRequests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cache Hits</span>
                    <span className="font-bold text-green-600">{costData.cacheEfficiency.cacheHits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cache Misses</span>
                    <span className="font-bold text-red-600">{costData.cacheEfficiency.cacheMisses}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cost Saved</span>
                    <span className="font-bold text-blue-600">£{costData.cacheEfficiency.costSaved.toFixed(2)}</span>
                  </div>
                  <Progress 
                    value={(costData.cacheEfficiency.cacheHits / costData.cacheEfficiency.totalRequests) * 100} 
                    className="mt-4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Tips</CardTitle>
                <CardDescription>Recommendations to reduce API costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <div className="font-medium">Use VDG for Images</div>
                    <div className="text-sm text-muted-foreground">
                      VDG provides vehicle images at £0.14 vs SWS which doesn't offer images
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                    <div className="font-medium">Leverage Free APIs</div>
                    <div className="text-sm text-muted-foreground">
                      Use DVLA OpenData and MOT History APIs for basic data (FREE)
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <div className="font-medium">Optimize Caching</div>
                    <div className="text-sm text-muted-foreground">
                      Current cache hit rate: {((costData.cacheEfficiency.cacheHits / costData.cacheEfficiency.totalRequests) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
