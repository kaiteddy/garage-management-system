'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Edit, 
  Trash2, 
  UserCheck, 
  CheckCircle, 
  Clock, 
  User,
  Monitor,
  MapPin
} from 'lucide-react'

interface AuditEntry {
  id: string
  jobSheetId: string
  action: string
  tableName: string
  recordId: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  changeReason?: string
  userId?: string
  userName: string
  userRole?: string
  changedAt: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

interface AuditTrailProps {
  jobSheetId: string
  className?: string
}

export function AuditTrail({ jobSheetId, className = '' }: AuditTrailProps) {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAuditTrail()
  }, [jobSheetId])

  const fetchAuditTrail = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/job-sheets/audit?jobSheetId=${jobSheetId}`)
      const result = await response.json()

      if (result.success) {
        setAuditEntries(result.auditTrail)
      } else {
        setError(result.error || 'Failed to load audit trail')
      }
    } catch (err) {
      console.error('Error fetching audit trail:', err)
      setError('Failed to load audit trail')
    } finally {
      setIsLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-600" />
      case 'update':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'authorize':
        return <UserCheck className="h-4 w-4 text-purple-600" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      create: "default",
      update: "secondary", 
      delete: "destructive",
      authorize: "outline",
      complete: "default"
    }
    
    return (
      <Badge variant={variants[action.toLowerCase()] || "outline"} className="text-xs">
        {action.toUpperCase()}
      </Badge>
    )
  }

  const formatFieldChange = (entry: AuditEntry) => {
    if (!entry.fieldName || entry.fieldName === 'record_change') {
      return null
    }

    return (
      <div className="mt-2 text-sm">
        <div className="font-medium text-gray-700">Field: {entry.fieldName}</div>
        {entry.oldValue && (
          <div className="text-red-600">
            <span className="font-medium">From:</span> {entry.oldValue}
          </div>
        )}
        {entry.newValue && (
          <div className="text-green-600">
            <span className="font-medium">To:</span> {entry.newValue}
          </div>
        )}
      </div>
    )
  }

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Browser'
    
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown Browser'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading audit trail...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-center py-8">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Audit Trail
          <Badge variant="outline" className="ml-auto">
            {auditEntries.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditEntries.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No audit entries found for this job sheet.
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {auditEntries.map((entry, index) => (
                <div key={entry.id}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(entry.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionBadge(entry.action)}
                        <span className="text-sm font-medium text-gray-900">
                          {entry.tableName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(entry.changedAt), 'dd/MM/yyyy HH:mm:ss')}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{entry.userName}</span>
                          {entry.userRole && (
                            <Badge variant="outline" className="text-xs">
                              {entry.userRole}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {entry.changeReason && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Reason:</span> {entry.changeReason}
                        </div>
                      )}

                      {formatFieldChange(entry)}

                      {/* Technical Details */}
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {entry.ipAddress && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>IP: {entry.ipAddress}</span>
                          </div>
                        )}
                        {entry.userAgent && (
                          <div className="flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            <span>Browser: {getBrowserInfo(entry.userAgent)}</span>
                          </div>
                        )}
                        <div className="text-gray-400">
                          Record ID: {entry.recordId}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < auditEntries.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
