'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTyrePricing, TyrePricingData, PopularSizeData } from '@/hooks/use-tyre-pricing'
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Search, Calendar, BarChart3 } from 'lucide-react'

interface TyrePricingAnalyticsProps {
  className?: string
}

export function TyrePricingAnalytics({ className }: TyrePricingAnalyticsProps) {
  const {
    analysisData,
    sizeSpecificData,
    popularSizes,
    trends,
    loading,
    loadingAnalysis,
    loadingSizeSpecific,
    loadingPopularSizes,
    loadingTrends,
    error,
    getTyreAnalysis,
    getSizeSpecificAnalysis,
    getPopularSizes,
    getPriceTrends,
    formatTyreSize,
    getPriceStabilityColor,
    calculatePriceVariance
  } = useTyrePricing()

  // State for filters
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [activeTab, setActiveTab] = useState('overview')

  // Load initial data
  useEffect(() => {
    getTyreAnalysis()
    getPopularSizes()
  }, [getTyreAnalysis, getPopularSizes])

  // Handle size-specific analysis
  const handleSizeAnalysis = async () => {
    if (!selectedSize) return
    await getSizeSpecificAnalysis(selectedSize, { dateFrom, dateTo })
    setActiveTab('size-specific')
  }

  // Handle trends analysis
  const handleTrendsAnalysis = async () => {
    await getPriceTrends(selectedSize || undefined, { dateFrom, dateTo })
    setActiveTab('trends')
  }

  // Format currency
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`

  // Get stability icon
  const getStabilityIcon = (stability: string) => {
    switch (stability) {
      case 'trending_up': return <TrendingUp className="h-4 w-4 text-blue-600" />
      case 'trending_down': return <TrendingDown className="h-4 w-4 text-orange-600" />
      case 'volatile': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-green-600" />
    }
  }

  // Get stability badge variant
  const getStabilityBadge = (stability: string) => {
    switch (stability) {
      case 'stable': return 'default'
      case 'volatile': return 'destructive'
      case 'trending_up': return 'secondary'
      case 'trending_down': return 'outline'
      default: return 'default'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tyre Pricing Analytics</h2>
          <p className="text-muted-foreground">
            Analyze tyre pricing patterns based on size and historical sales data
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-2 md:space-y-0">
          <Input
            placeholder="Tyre size (e.g., 205/55R16)"
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="w-full md:w-48"
          />
          <Input
            type="date"
            placeholder="From date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full md:w-40"
          />
          <Input
            type="date"
            placeholder="To date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full md:w-40"
          />
          <Button onClick={handleSizeAnalysis} disabled={!selectedSize || loadingSizeSpecific}>
            {loadingSizeSpecific ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Analyze Size
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="popular">Popular Sizes</TabsTrigger>
          <TabsTrigger value="size-specific">Size Analysis</TabsTrigger>
          <TabsTrigger value="trends">Price Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {loadingAnalysis ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading tyre analysis...</span>
              </CardContent>
            </Card>
          ) : analysisData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sizes</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysisData.analysis.totalSizes}</div>
                    <p className="text-xs text-muted-foreground">Different tyre sizes sold</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analysisData.analysis.totalTyreRevenue)}</div>
                    <p className="text-xs text-muted-foreground">From {analysisData.analysis.totalTyresSold} tyres sold</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analysisData.analysis.averagePriceAcrossAllSizes)}</div>
                    <p className="text-xs text-muted-foreground">Across all sizes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
                    <Badge variant="secondary">{analysisData.analysis.mostPopularSize}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">Highest Value</div>
                    <div className="text-lg font-bold">{analysisData.analysis.highestValueSize}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Tyre Sizes Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Tyre Sizes by Sales</CardTitle>
                  <CardDescription>Most frequently sold tyre sizes with pricing analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Size</th>
                          <th className="text-left p-2 font-medium">Sales Count</th>
                          <th className="text-left p-2 font-medium">Avg Price</th>
                          <th className="text-left p-2 font-medium">Price Range</th>
                          <th className="text-left p-2 font-medium">Stability</th>
                          <th className="text-left p-2 font-medium">Recommended</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.tyres.slice(0, 10).map((tyre: TyrePricingData, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div className="font-medium">{formatTyreSize(tyre.size)}</div>
                              <div className="text-xs text-gray-500">{tyre.width}mm width</div>
                            </td>
                            <td className="p-2">
                              <div className="font-medium">{tyre.salesCount}</div>
                              <div className="text-xs text-gray-500">{tyre.totalQuantity} units</div>
                            </td>
                            <td className="p-2">
                              <div className="font-medium">{formatCurrency(tyre.averagePrice)}</div>
                            </td>
                            <td className="p-2">
                              <div className="text-sm">
                                {formatCurrency(tyre.minPrice)} - {formatCurrency(tyre.maxPrice)}
                              </div>
                              <div className="text-xs text-gray-500">Range: {formatCurrency(tyre.priceRange)}</div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center space-x-1">
                                {getStabilityIcon(tyre.priceStability)}
                                <Badge variant={getStabilityBadge(tyre.priceStability)} className="text-xs">
                                  {tyre.priceStability.replace('_', ' ')}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="font-medium text-green-600">{formatCurrency(tyre.recommendedPrice)}</div>
                              <div className="text-xs text-gray-500">+10% buffer</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tyre data available</p>
                  <Button onClick={() => getTyreAnalysis()} className="mt-2">
                    Load Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Popular Sizes Tab */}
        <TabsContent value="popular" className="space-y-4">
          {loadingPopularSizes ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading popular sizes...</span>
              </CardContent>
            </Card>
          ) : popularSizes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Most Popular Tyre Sizes</CardTitle>
                <CardDescription>Ranked by sales frequency and volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {popularSizes.map((size: PopularSizeData, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{formatTyreSize(size.size)}</h3>
                          <Badge variant="secondary">#{index + 1}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sales:</span>
                            <span className="font-medium">{size.salesCount} transactions</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Quantity:</span>
                            <span className="font-medium">{size.totalQuantity} units</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Price:</span>
                            <span className="font-medium">{formatCurrency(size.averagePrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Range:</span>
                            <span className="font-medium">{formatCurrency(size.priceRange)}</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => {
                            setSelectedSize(size.size)
                            handleSizeAnalysis()
                          }}
                        >
                          Analyze This Size
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No popular sizes data available</p>
                  <Button onClick={() => getPopularSizes()} className="mt-2">
                    Load Popular Sizes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Size-Specific Analysis Tab */}
        <TabsContent value="size-specific" className="space-y-4">
          {loadingSizeSpecific ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading size-specific analysis...</span>
              </CardContent>
            </Card>
          ) : sizeSpecificData ? (
            <Card>
              <CardHeader>
                <CardTitle>Analysis for {formatTyreSize(sizeSpecificData.size)}</CardTitle>
                <CardDescription>Detailed pricing and sales analysis for this specific size</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{sizeSpecificData.totalSales}</div>
                    <div className="text-sm text-blue-600">Total Sales</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(sizeSpecificData.averagePrice)}</div>
                    <div className="text-sm text-green-600">Average Price</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{sizeSpecificData.totalQuantity}</div>
                    <div className="text-sm text-purple-600">Units Sold</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(sizeSpecificData.totalRevenue)}</div>
                    <div className="text-sm text-orange-600">Total Revenue</div>
                  </div>
                </div>

                {/* Price Analysis */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Price Analysis</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Minimum Price:</span>
                        <span className="font-medium">{formatCurrency(sizeSpecificData.minPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Maximum Price:</span>
                        <span className="font-medium">{formatCurrency(sizeSpecificData.maxPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price Range:</span>
                        <span className="font-medium">{formatCurrency(sizeSpecificData.priceRange)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recommended Price:</span>
                        <span className="font-medium text-green-600">{formatCurrency(sizeSpecificData.recommendedPrice)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Market Insights</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span>Price Stability:</span>
                        {getStabilityIcon(sizeSpecificData.priceStability)}
                        <Badge variant={getStabilityBadge(sizeSpecificData.priceStability)}>
                          {sizeSpecificData.priceStability.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Sold:</span>
                        <span className="font-medium">
                          {new Date(sizeSpecificData.lastSold).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span>Vehicle Types:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {sizeSpecificData.vehicleTypes.slice(0, 3).map((vehicle: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {vehicle}
                            </Badge>
                          ))}
                          {sizeSpecificData.vehicleTypes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{sizeSpecificData.vehicleTypes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a tyre size to view detailed analysis</p>
                  <p className="text-sm text-gray-400 mt-1">Enter a size like "205/55R16" and click "Analyze Size"</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Price Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Price Trends</h3>
              <p className="text-sm text-gray-600">Monthly pricing trends over time</p>
            </div>
            <Button onClick={handleTrendsAnalysis} disabled={loadingTrends}>
              {loadingTrends ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Load Trends
            </Button>
          </div>

          {loadingTrends ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading price trends...</span>
              </CardContent>
            </Card>
          ) : trends.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Price Trends</CardTitle>
                <CardDescription>
                  {selectedSize ? `For ${formatTyreSize(selectedSize)}` : 'All tyre sizes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Month</th>
                        <th className="text-left p-2 font-medium">Avg Price</th>
                        <th className="text-left p-2 font-medium">Units Sold</th>
                        <th className="text-left p-2 font-medium">Revenue</th>
                        <th className="text-left p-2 font-medium">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.map((trend, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">
                            {new Date(trend.month + '-01').toLocaleDateString('en-GB', { 
                              year: 'numeric', 
                              month: 'long' 
                            })}
                          </td>
                          <td className="p-2">{formatCurrency(trend.averagePrice)}</td>
                          <td className="p-2">{trend.totalSales}</td>
                          <td className="p-2">{formatCurrency(trend.totalRevenue)}</td>
                          <td className="p-2">{trend.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No trend data available</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Load Trends" to analyze pricing patterns</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
