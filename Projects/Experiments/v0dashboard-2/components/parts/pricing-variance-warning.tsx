"use client"

import { AlertTriangle, TrendingUp, TrendingDown, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface PricingVarianceWarningProps {
  currentPrice: number
  suggestedPrice: number
  variance: number
  severity: 'low' | 'medium' | 'high'
  message: string
  onApplySuggested?: () => void
  showApplyButton?: boolean
  className?: string
}

export function PricingVarianceWarning({
  currentPrice,
  suggestedPrice,
  variance,
  severity,
  message,
  onApplySuggested,
  showApplyButton = true,
  className = ""
}: PricingVarianceWarningProps) {
  
  const getVarianceColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50 text-red-800'
      case 'medium': return 'border-orange-200 bg-orange-50 text-orange-800'
      case 'low': return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      default: return 'border-gray-200 bg-gray-50 text-gray-800'
    }
  }

  const getVarianceIcon = () => {
    if (currentPrice > suggestedPrice) {
      return <TrendingUp className="h-4 w-4" />
    } else {
      return <TrendingDown className="h-4 w-4" />
    }
  }

  const getSeverityIcon = () => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'low': return <Info className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <Alert className={`${getVarianceColor(severity)} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getSeverityIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">Price Variance Warning</span>
            <Badge variant="outline" className="text-xs">
              {formatPercentage(variance)} {currentPrice > suggestedPrice ? 'higher' : 'lower'}
            </Badge>
            {getVarianceIcon()}
          </div>
          
          <AlertDescription className="text-sm mb-3">
            {message}
          </AlertDescription>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium">Current Price:</span>
              <div className="text-lg font-bold">£{currentPrice.toFixed(2)}</div>
            </div>
            <div>
              <span className="font-medium">Suggested Price:</span>
              <div className="text-lg font-bold">£{suggestedPrice.toFixed(2)}</div>
            </div>
          </div>
          
          {showApplyButton && onApplySuggested && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <Button
                size="sm"
                variant="outline"
                onClick={onApplySuggested}
                className="bg-white hover:bg-gray-50"
              >
                Apply Suggested Price (£{suggestedPrice.toFixed(2)})
              </Button>
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}

interface PricingSuggestionCardProps {
  suggestion: {
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
  onApply?: (price: number, reasoning: string) => void
  isRecommended?: boolean
}

export function PricingSuggestionCard({ 
  suggestion, 
  onApply, 
  isRecommended = false 
}: PricingSuggestionCardProps) {
  
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getSuggestionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'historical_average': 'Historical Average',
      'recent_trend': 'Recent Trend',
      'market_rate': 'Market Rate',
      'cost_plus': 'Cost Plus',
      'customer_type': 'Customer Type'
    }
    return labels[type] || type.replace('_', ' ')
  }

  return (
    <div className={`p-4 border rounded-lg ${isRecommended ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      {isRecommended && (
        <div className="flex items-center gap-1 mb-2">
          <Badge className="bg-blue-600 text-white text-xs">Recommended</Badge>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold">£{suggestion.suggested_price.toFixed(2)}</span>
            <Badge variant="outline" className="text-xs">
              {getSuggestionTypeLabel(suggestion.suggestion_type)}
            </Badge>
          </div>
          
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getConfidenceColor(suggestion.confidence_score)}`}>
            {(suggestion.confidence_score * 100).toFixed(0)}% confidence
          </div>
        </div>
        
        {onApply && (
          <Button
            size="sm"
            onClick={() => onApply(suggestion.suggested_price, suggestion.reasoning)}
            className={isRecommended ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Apply
          </Button>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{suggestion.reasoning}</p>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Price Range:</span>
          <span className="font-medium">
            £{suggestion.price_range.min.toFixed(2)} - £{suggestion.price_range.max.toFixed(2)}
          </span>
        </div>
        
        {suggestion.historical_context.last_sold_price && (
          <div className="flex justify-between">
            <span className="text-gray-500">Last Sold:</span>
            <span className="font-medium">
              £{suggestion.historical_context.last_sold_price.toFixed(2)}
              {suggestion.historical_context.last_sold_date && (
                <span className="text-gray-400 ml-1">
                  ({new Date(suggestion.historical_context.last_sold_date).toLocaleDateString()})
                </span>
              )}
            </span>
          </div>
        )}
        
        {suggestion.historical_context.average_price && (
          <div className="flex justify-between">
            <span className="text-gray-500">Average Price:</span>
            <span className="font-medium">£{suggestion.historical_context.average_price.toFixed(2)}</span>
          </div>
        )}
        
        {suggestion.historical_context.sales_frequency && (
          <div className="flex justify-between">
            <span className="text-gray-500">Sales Frequency:</span>
            <span className="font-medium">{suggestion.historical_context.sales_frequency}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface QuickPricingActionsProps {
  suggestions: any[]
  onApplyPrice: (price: number, reasoning: string) => void
  currentPrice?: number
  className?: string
}

export function QuickPricingActions({ 
  suggestions, 
  onApplyPrice, 
  currentPrice,
  className = ""
}: QuickPricingActionsProps) {
  
  if (!suggestions || suggestions.length === 0) {
    return null
  }

  const topSuggestion = suggestions[0]
  const hasVariance = currentPrice && Math.abs(currentPrice - topSuggestion.suggested_price) / topSuggestion.suggested_price > 0.1

  return (
    <div className={`space-y-3 ${className}`}>
      {hasVariance && currentPrice && (
        <PricingVarianceWarning
          currentPrice={currentPrice}
          suggestedPrice={topSuggestion.suggested_price}
          variance={Math.abs(currentPrice - topSuggestion.suggested_price) / topSuggestion.suggested_price}
          severity={Math.abs(currentPrice - topSuggestion.suggested_price) / topSuggestion.suggested_price > 0.3 ? 'high' : 'medium'}
          message={`Current price differs significantly from suggested price based on historical data`}
          onApplySuggested={() => onApplyPrice(topSuggestion.suggested_price, topSuggestion.reasoning)}
        />
      )}
      
      <div className="grid gap-2">
        {suggestions.slice(0, 2).map((suggestion, index) => (
          <PricingSuggestionCard
            key={index}
            suggestion={suggestion}
            onApply={onApplyPrice}
            isRecommended={index === 0}
          />
        ))}
      </div>
    </div>
  )
}
