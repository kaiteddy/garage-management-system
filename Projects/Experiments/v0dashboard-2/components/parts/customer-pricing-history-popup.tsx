"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CustomerPricingHistoryEntry {
  id: string
  date_sold: string
  price_charged: number
  quantity_sold: number
  job_sheet_number?: string
  vehicle_registration?: string
  vehicle_make?: string
  vehicle_model?: string
  notes?: string
  technician_name?: string
}

interface CustomerPricingHistoryPopupProps {
  isOpen: boolean
  onClose: () => void
  partName: string
  partNumber?: string
  customerId?: string
  customerName?: string
  currentPrice?: number
  onPriceSelect?: (price: number, reasoning: string) => void
}

export function CustomerPricingHistoryPopup({
  isOpen,
  onClose,
  partName,
  partNumber,
  customerId,
  customerName,
  currentPrice,
  onPriceSelect
}: CustomerPricingHistoryPopupProps) {
  const [history, setHistory] = useState<CustomerPricingHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState<{
    averagePrice: number
    lastPrice: number
    priceVariance: number
    totalServices: number
    firstService: string
    lastService: string
    priceStability: 'stable' | 'increasing' | 'decreasing'
  } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && (partNumber || partName) && customerId) {
      loadCustomerPricingHistory()
    }
  }, [isOpen, partNumber, partName, customerId])

  const loadCustomerPricingHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        action: 'customer-history',
        customer_id: customerId || '',
        ...(partNumber && { part_number: partNumber }),
        ...(partName && { part_name: partName }),
        limit: '10'
      })

      const response = await fetch(`/api/parts-pricing-history?${params}`)
      const data = await response.json()

      if (data.success) {
        const historyData = data.data.history || []
        setHistory(historyData)
        
        // Calculate analytics
        if (historyData.length > 0) {
          const prices = historyData.map((h: CustomerPricingHistoryEntry) => h.price_charged)
          const averagePrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length
          const lastPrice = historyData[0].price_charged // Most recent first
          const firstPrice = historyData[historyData.length - 1].price_charged
          const priceVariance = lastPrice - firstPrice
          
          let priceStability: 'stable' | 'increasing' | 'decreasing' = 'stable'
          if (Math.abs(priceVariance) > averagePrice * 0.1) { // 10% threshold
            priceStability = priceVariance > 0 ? 'increasing' : 'decreasing'
          }

          setAnalytics({
            averagePrice,
            lastPrice,
            priceVariance,
            totalServices: historyData.length,
            firstService: historyData[historyData.length - 1].date_sold,
            lastService: historyData[0].date_sold,
            priceStability
          })
        }
      }
    } catch (error) {
      console.error('Failed to load customer pricing history:', error)
      toast({
        title: "Error",
        description: "Failed to load customer pricing history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getPriceChangeIcon = (currentPrice: number, previousPrice: number) => {
    if (Math.abs(currentPrice - previousPrice) < 0.01) return <Minus className="h-4 w-4 text-gray-500" />
    return currentPrice > previousPrice ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getPriceRecommendation = () => {
    if (!analytics || !currentPrice) return null

    const variance = ((currentPrice - analytics.lastPrice) / analytics.lastPrice) * 100
    
    if (Math.abs(variance) < 5) {
      return {
        type: 'good' as const,
        message: `Consistent with last charge (${Math.abs(variance).toFixed(1)}% difference)`,
        icon: <CheckCircle className="h-4 w-4 text-green-600" />
      }
    } else if (variance > 20) {
      return {
        type: 'warning' as const,
        message: `${variance.toFixed(1)}% higher than last time - customer may notice`,
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />
      }
    } else if (variance < -20) {
      return {
        type: 'info' as const,
        message: `${Math.abs(variance).toFixed(1)}% lower than last time - good value`,
        icon: <TrendingDown className="h-4 w-4 text-blue-600" />
      }
    }
    
    return null
  }

  const recommendation = getPriceRecommendation()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Customer Pricing History: {partName}
          </DialogTitle>
          <div className="text-sm text-gray-600">
            {customerName} • {history.length} previous service{history.length !== 1 ? 's' : ''}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No previous pricing history for this customer</div>
            <Badge variant="outline">First time charging for this part</Badge>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analytics Summary */}
            {analytics && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-sm">Customer Pricing Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Last Charged</div>
                    <div className="font-medium text-lg">£{analytics.lastPrice.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{formatDate(analytics.lastService)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Average Price</div>
                    <div className="font-medium text-lg">£{analytics.averagePrice.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Over {analytics.totalServices} services</div>
                  </div>
                </div>
                
                {/* Price Stability Indicator */}
                <div className="flex items-center gap-2">
                  <Badge variant={
                    analytics.priceStability === 'stable' ? 'default' :
                    analytics.priceStability === 'increasing' ? 'destructive' : 'secondary'
                  }>
                    {analytics.priceStability === 'stable' && 'Stable Pricing'}
                    {analytics.priceStability === 'increasing' && 'Price Increasing'}
                    {analytics.priceStability === 'decreasing' && 'Price Decreasing'}
                  </Badge>
                  {analytics.priceVariance !== 0 && (
                    <span className="text-xs text-gray-600">
                      {analytics.priceVariance > 0 ? '+' : ''}£{analytics.priceVariance.toFixed(2)} trend
                    </span>
                  )}
                </div>

                {/* Current Price Recommendation */}
                {recommendation && (
                  <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                    recommendation.type === 'good' ? 'bg-green-50 text-green-800' :
                    recommendation.type === 'warning' ? 'bg-orange-50 text-orange-800' :
                    'bg-blue-50 text-blue-800'
                  }`}>
                    {recommendation.icon}
                    {recommendation.message}
                  </div>
                )}
              </div>
            )}

            {/* Historical Entries */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Service History</h3>
              {history.map((entry, index) => (
                <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">£{entry.price_charged.toFixed(2)}</span>
                      {index < history.length - 1 && getPriceChangeIcon(entry.price_charged, history[index + 1].price_charged)}
                      <Badge variant="outline" className="text-xs">
                        Qty: {entry.quantity_sold}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(entry.date_sold)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    {entry.job_sheet_number && (
                      <div>Job: {entry.job_sheet_number}</div>
                    )}
                    {entry.vehicle_registration && (
                      <div>Vehicle: {entry.vehicle_registration} ({entry.vehicle_make} {entry.vehicle_model})</div>
                    )}
                    {entry.technician_name && (
                      <div>Technician: {entry.technician_name}</div>
                    )}
                    {entry.notes && (
                      <div className="italic">"{entry.notes}"</div>
                    )}
                  </div>

                  {onPriceSelect && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onPriceSelect(entry.price_charged, `Same as ${formatDate(entry.date_sold)} service`)
                        onClose()
                      }}
                      className="w-full mt-2"
                    >
                      Use This Price (£{entry.price_charged.toFixed(2)})
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            {analytics && onPriceSelect && (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-medium text-sm">Quick Price Options</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onPriceSelect(analytics.lastPrice, "Same as last service")
                      onClose()
                    }}
                  >
                    Last Price: £{analytics.lastPrice.toFixed(2)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onPriceSelect(analytics.averagePrice, "Customer's average price")
                      onClose()
                    }}
                  >
                    Average: £{analytics.averagePrice.toFixed(2)}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
