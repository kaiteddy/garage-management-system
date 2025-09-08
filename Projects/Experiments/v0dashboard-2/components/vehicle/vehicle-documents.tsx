"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  ExternalLink,
  Download,
  Eye
} from "lucide-react"

interface Document {
  id: string
  document_type: string
  document_number: string
  document_date: string
  due_date?: string
  total_gross?: number
  total_net?: number
  total_tax?: number
  status: string
  department?: string
  created_at: string
}

interface VehicleDocumentsProps {
  registration: string
}

export function VehicleDocuments({ registration }: VehicleDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [registration])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/documents?vehicle_registration=${encodeURIComponent(registration)}`)
      const data = await response.json()
      
      if (data.success) {
        setDocuments(data.documents || [])
      } else {
        setError(data.error || 'Failed to fetch documents')
      }
    } catch (err) {
      console.error("Error fetching documents:", err)
      setError('Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '£0.00'
    return `£${amount.toFixed(2)}`
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'invoice':
        return <DollarSign className="h-4 w-4" />
      case 'quote':
        return <FileText className="h-4 w-4" />
      case 'job sheet':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>All documents related to this vehicle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading documents...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>All documents related to this vehicle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <FileText className="h-12 w-12 mx-auto mb-4" />
            <p>Error loading documents: {error}</p>
            <Button variant="outline" onClick={fetchDocuments} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>All documents related to this vehicle</CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getDocumentTypeIcon(document.document_type)}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {document.document_type || 'Document'} #{document.document_number}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(document.document_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(document.status)}
                    {document.total_gross && (
                      <span className="font-semibold text-green-600">
                        {formatCurrency(document.total_gross)}
                      </span>
                    )}
                  </div>
                </div>

                {document.due_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {formatDate(document.due_date)}</span>
                  </div>
                )}

                {document.department && (
                  <div className="text-sm text-muted-foreground mb-3">
                    Department: {document.department}
                  </div>
                )}

                {(document.total_net || document.total_tax) && (
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Net:</span>
                      <span className="ml-2 font-medium">{formatCurrency(document.total_net)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="ml-2 font-medium">{formatCurrency(document.total_tax)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-2 font-medium text-green-600">{formatCurrency(document.total_gross)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Created: {formatDate(document.created_at)}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4" />
            <p>No documents found</p>
            <p className="text-sm mt-2">Documents will appear here when available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
