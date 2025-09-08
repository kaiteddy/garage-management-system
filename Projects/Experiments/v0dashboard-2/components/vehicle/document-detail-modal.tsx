"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  Receipt,
  FileText,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  Download,
  ExternalLink,
  Car,
  Settings,
  Activity,
  Package,
  Tool
} from "lucide-react"

interface DocumentDetailModalProps {
  document: any
  isOpen: boolean
  onClose: () => void
}

export function DocumentDetailModal({ document, isOpen, onClose }: DocumentDetailModalProps) {
  if (!document) return null

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return isNaN(num) ? '£0.00' : `£${num.toFixed(2)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {document.type} - Document #{document.documentNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Information
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={document.status === '2' ? 'default' : 'secondary'}>
                    {document.status === '2' ? 'Paid' : `Status: ${document.status}`}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(document.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Document Type</p>
                    <p className="text-sm text-muted-foreground">{document.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Amount</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(document.amount)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Description */}
          {document.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {document.description}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          {document.lineItems && document.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Parts & Services ({document.lineItems.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-center p-3 font-medium w-20">Qty</th>
                        <th className="text-right p-3 font-medium w-24">Unit Price</th>
                        <th className="text-right p-3 font-medium w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {document.lineItems.map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{item.description || 'N/A'}</p>
                              {item.item_type && (
                                <p className="text-xs text-muted-foreground">Type: {item.item_type}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">{item.quantity || '-'}</td>
                          <td className="p-3 text-right">
                            {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {item.total_price ? formatCurrency(item.total_price) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-gray-50">
                        <td colSpan={3} className="p-3 text-right font-bold">Total:</td>
                        <td className="p-3 text-right font-bold text-lg">
                          {formatCurrency(document.amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              Print Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
