'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Car,
  User,
  Briefcase,
  Gauge,
  AlertCircle,
  FileText,
  Printer,
  Receipt
} from "lucide-react"
import { 
  ValidationResult, 
  ValidationError, 
  getValidationSummary, 
  getErrorsByCategory 
} from "@/lib/validation/job-sheet-validation"

interface JobSheetValidationStatusProps {
  validationResult: ValidationResult
  className?: string
  showDetailedView?: boolean
}

export function JobSheetValidationStatus({ 
  validationResult, 
  className,
  showDetailedView = false 
}: JobSheetValidationStatusProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const { errors, warnings, canPrint, canInvoice, isValid } = validationResult
  const errorsByCategory = getErrorsByCategory(errors)
  const warningsByCategory = getErrorsByCategory(warnings)

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vehicle': return <Car className="h-4 w-4" />
      case 'customer': return <User className="h-4 w-4" />
      case 'job': return <Briefcase className="h-4 w-4" />
      case 'mileage': return <Gauge className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'vehicle': return 'Vehicle Information'
      case 'customer': return 'Customer Details'
      case 'job': return 'Job Information'
      case 'mileage': return 'Mileage Recording'
      default: return 'Other'
    }
  }

  const ErrorList = ({ errors, type }: { errors: ValidationError[], type: 'error' | 'warning' }) => (
    <div className="space-y-2">
      {Object.entries(getErrorsByCategory(errors)).map(([category, categoryErrors]) => {
        if (categoryErrors.length === 0) return null
        
        return (
          <Collapsible 
            key={category}
            open={expandedCategories[category]}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <span className="font-medium">{getCategoryTitle(category)}</span>
                  <Badge variant={type === 'error' ? 'destructive' : 'secondary'} className="ml-2">
                    {categoryErrors.length}
                  </Badge>
                </div>
                {expandedCategories[category] ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1">
              {categoryErrors.map((error, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {type === 'error' ? 
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /> :
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  }
                  <span className={type === 'error' ? 'text-red-700' : 'text-yellow-700'}>
                    {error.message}
                  </span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )

  if (showDetailedView) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Sheet Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Summary */}
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">{getValidationSummary(validationResult)}</span>
          </div>

          {/* Action Permissions */}
          <div className="flex gap-2">
            <Badge variant={canPrint ? "default" : "secondary"} className="flex items-center gap-1">
              <Printer className="h-3 w-3" />
              Print: {canPrint ? "Allowed" : "Blocked"}
            </Badge>
            <Badge variant={canInvoice ? "default" : "secondary"} className="flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              Invoice: {canInvoice ? "Allowed" : "Blocked"}
            </Badge>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-2">Errors (Must Fix)</h4>
              <ErrorList errors={errors} type="error" />
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <h4 className="font-medium text-yellow-700 mb-2">Warnings (Recommended)</h4>
              <ErrorList errors={warnings} type="warning" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Compact view for action bars
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center gap-1">
        {isValid ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {errors.length > 0 ? `${errors.length} error${errors.length !== 1 ? 's' : ''}` : 'Complete'}
        </span>
      </div>

      {/* Action Status */}
      <div className="flex gap-1">
        <Badge 
          variant={canPrint ? "default" : "secondary"} 
          className="text-xs px-2 py-0.5"
        >
          Print: {canPrint ? "✓" : "✗"}
        </Badge>
        <Badge 
          variant={canInvoice ? "default" : "secondary"} 
          className="text-xs px-2 py-0.5"
        >
          Invoice: {canInvoice ? "✓" : "✗"}
        </Badge>
      </div>

      {/* Details Dialog */}
      {(errors.length > 0 || warnings.length > 0) && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              Details
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Job Sheet Validation Details</DialogTitle>
              <DialogDescription>
                Review required fields and recommendations before printing or invoicing.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* Summary */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{getValidationSummary(validationResult)}</p>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Errors ({errors.length})
                  </h4>
                  <ErrorList errors={errors} type="error" />
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({warnings.length})
                  </h4>
                  <ErrorList errors={warnings} type="warning" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
