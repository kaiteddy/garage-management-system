'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Download, 
  Eye,
  Edit,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { JobSheetTemplate } from '@/components/job-sheet/job-sheet-template'
import { AuditTrail } from '@/components/job-sheet/audit-trail'

// Mock data for demonstration - this would come from your API
const mockJobSheetDetail = {
  id: '1',
  jobNumber: 'ELI-20250116-001',
  customerName: 'ADAM RUTSTEIN',
  customerPhone: '07843275372',
  customerEmail: 'adam@example.com',
  customerAddress: '123 Main Street, London, SW1A 1AA',
  vehicleRegistration: 'LN64XFG',
  vehicleMake: 'AUDI',
  vehicleModel: 'A3',
  vehicleYear: 2014,
  vehicleDerivative: 'SPORT',
  vehicleColor: 'Silver',
  vehicleVin: 'WAUZZZ8V4EA123456',
  odometerReading: 85000,
  odometerUnit: 'miles',
  jobType: 'service',
  jobDescription: 'Annual service and MOT preparation',
  workRequested: 'Full service, oil change, brake inspection, and general safety check',
  workPerformed: 'Completed full service including oil and filter change, brake pad replacement, and safety inspection. All systems checked and working correctly.',
  dateCreated: new Date('2025-01-16T09:00:00'),
  datePromised: new Date('2025-01-16T17:00:00'),
  dateStarted: new Date('2025-01-16T09:30:00'),
  dateCompleted: new Date('2025-01-16T15:45:00'),
  status: 'completed',
  customerAuthorizationSignature: undefined,
  customerAuthorizationDate: new Date('2025-01-16T09:15:00'),
  customerAuthorizationMethod: 'written',
  primaryTechnicianName: 'John Smith',
  technicianSignature: undefined,
  technicianCompletionDate: new Date('2025-01-16T15:45:00'),
  laborHours: 3.5,
  laborRate: 45.00,
  laborTotal: 157.50,
  partsTotal: 68.00,
  subtotal: 225.50,
  vatRate: 20.00,
  vatAmount: 45.10,
  totalAmount: 270.60,
  specialInstructions: 'Customer requested premium oil',
  warrantyPeriod: 90,
  warrantyNotes: 'Standard warranty applies to parts and labor as per manufacturer specifications.'
}

const mockLineItems = [
  {
    lineNumber: 1,
    itemType: 'labor',
    description: 'Full Service Labor',
    laborHours: 3.5,
    laborRate: 45.00,
    quantity: 1,
    unitPrice: 157.50,
    lineTotal: 157.50
  },
  {
    lineNumber: 2,
    itemType: 'part',
    description: 'Engine Oil Filter',
    partNumber: 'OF-123456',
    partBrand: 'OEM',
    partCondition: 'new',
    quantity: 1,
    unitPrice: 18.00,
    lineTotal: 18.00
  },
  {
    lineNumber: 3,
    itemType: 'part',
    description: 'Premium Engine Oil (5L)',
    partNumber: 'EO-789012',
    partBrand: 'Castrol',
    partCondition: 'new',
    quantity: 1,
    unitPrice: 50.00,
    lineTotal: 50.00
  }
]

export default function EnhancedJobSheetPage() {
  const [activeTab, setActiveTab] = useState('template')

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Job Sheet ${mockJobSheetDetail.jobNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .print-content { max-width: 210mm; margin: 0 auto; }
              @media print {
                body { margin: 0; padding: 0; }
                .print-content { max-width: none; }
              }
            </style>
          </head>
          <body>
            <div class="print-content">
              ${document.querySelector('.job-sheet-template')?.innerHTML || ''}
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleDownloadPDF = async () => {
    // This would integrate with a PDF generation service
    console.log('Downloading PDF for job sheet:', mockJobSheetDetail.jobNumber)
    // Implementation would go here
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/job-sheets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job Sheets
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Job Sheet {mockJobSheetDetail.jobNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Professional automotive service documentation with comprehensive audit trail
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Status and Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                £{mockJobSheetDetail.totalAmount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Badge variant="default" className="bg-green-600">
                  {mockJobSheetDetail.status.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mt-1">Status</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 uppercase">
                {mockJobSheetDetail.customerName}
              </div>
              <div className="text-sm text-gray-600">Customer</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 uppercase">
                {mockJobSheetDetail.vehicleRegistration}
              </div>
              <div className="text-sm text-gray-600">
                {mockJobSheetDetail.vehicleMake} {mockJobSheetDetail.vehicleModel}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="template" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Job Sheet Template
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Job Sheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Professional Job Sheet Template
              </CardTitle>
              <p className="text-sm text-gray-600">
                Industry-standard automotive service documentation with all required legal and business information.
              </p>
            </CardHeader>
            <CardContent>
              <div className="job-sheet-template">
                <JobSheetTemplate 
                  jobSheet={mockJobSheetDetail}
                  lineItems={mockLineItems}
                  isPrintView={false}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AuditTrail jobSheetId={mockJobSheetDetail.id} />
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Audit Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Changes:</span>
                    <Badge variant="outline">12</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Modified:</span>
                    <span className="text-sm font-medium">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Modified By:</span>
                    <span className="text-sm font-medium">John Smith</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm font-medium">
                      {mockJobSheetDetail.dateCreated.toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Customer Authorization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Work Documentation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Pricing Breakdown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Technician Signature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Audit Trail Complete</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit Job Sheet</CardTitle>
              <p className="text-sm text-gray-600">
                All changes will be logged in the audit trail with timestamps and user information.
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Edit className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Job sheet editing interface would be integrated here.</p>
                <p className="text-sm mt-2">
                  This would use the existing JobSheetForm component with pre-populated data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
