"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, FileText, User, Car, Calendar, Printer, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DocumentViewerProps {
  documentId?: string
  initialData?: any
  onDataChange?: (data: any) => void
  onSave?: () => void
}

export function DocumentViewer({ documentId, initialData, onDataChange, onSave }: DocumentViewerProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [documentData, setDocumentData] = useState({
    id: initialData?.id || documentId || '',
    type: initialData?.type || '',
    number: initialData?.number || '',
    date: initialData?.date || '',
    customer: initialData?.customer || '',
    vehicle: initialData?.vehicle || '',
    total: initialData?.total || 0,
    status: initialData?.status || '',
    description: initialData?.description || '',
    lineItems: initialData?.lineItems || []
  })

  useEffect(() => {
    if (documentId && !initialData) {
      loadDocumentData()
    }
  }, [documentId])

  const loadDocumentData = async () => {
    if (!documentId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      const data = await response.json()
      
      if (data.success && data.document) {
        const doc = data.document
        setDocumentData({
          id: doc.id,
          type: doc.type || '',
          number: doc.number || '',
          date: doc.date || '',
          customer: doc.customer || '',
          vehicle: doc.vehicle || '',
          total: doc.total || 0,
          status: doc.status || '',
          description: doc.description || '',
          lineItems: doc.lineItems || []
        })
      }
    } catch (error) {
      console.error('Error loading document:', error)
      toast({
        title: "Error",
        description: "Failed to load document data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleEmail = () => {
    toast({
      title: "Email Feature",
      description: "Email functionality will be implemented soon",
    })
  }

  const handleSave = () => {
    toast({
      title: "Document Saved",
      description: "Document changes have been saved",
    })
    onSave?.()
  }

  if (loading && !documentData.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getDocumentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'invoice':
        return 'bg-green-100 text-green-800'
      case 'estimate':
        return 'bg-blue-100 text-blue-800'
      case 'job sheet':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">
              {documentData.type} {documentData.number}
            </h1>
            <p className="text-gray-500">
              {documentData.customer} - {documentData.vehicle}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Details
              </span>
              <div className="flex gap-2">
                <Badge className={getDocumentTypeColor(documentData.type)}>
                  {documentData.type}
                </Badge>
                {documentData.status && (
                  <Badge className={getStatusColor(documentData.status)}>
                    {documentData.status}
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700">Document Number</h4>
                <p className="text-lg font-mono">{documentData.number}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">Date</h4>
                <p className="text-lg">
                  {documentData.date ? new Date(documentData.date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            
            {documentData.description && (
              <div>
                <h4 className="font-medium text-gray-700">Description</h4>
                <p className="text-gray-600">{documentData.description}</p>
              </div>
            )}

            {/* Line Items */}
            {documentData.lineItems && documentData.lineItems.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Line Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Price</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentData.lineItems.map((item: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 text-sm">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right">£{item.price?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">
                            £{(item.quantity * item.price)?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  £{documentData.total?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Vehicle Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{documentData.customer}</p>
                <p className="text-sm text-gray-600">Customer details would be loaded here</p>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{documentData.vehicle}</p>
                <p className="text-sm text-gray-600">Vehicle details would be loaded here</p>
              </div>
            </CardContent>
          </Card>

          {/* Document Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Document
              </Button>
              <Button variant="outline" className="w-full" onClick={handleEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email to Customer
              </Button>
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Duplicate Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
