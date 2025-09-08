'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  User, 
  Car, 
  Calendar, 
  DollarSign, 
  Wrench, 
  Package, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface ImportResult {
  success: boolean
  message?: string
  import_results?: {
    document_id: string
    document_imported: boolean
    line_items_imported: number
    document_extra_imported: boolean
  }
  verification?: {
    document_details: any
    line_items_count: number
    line_items: any[]
  }
  error?: string
  details?: string
}

export default function ImportSI80349Page() {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleImport = async () => {
    setImporting(true)
    setResult(null)

    try {
      const response = await fetch('/api/documents/import-si80349', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to import document',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/documents">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Import Document SI80349</h1>
        <p className="text-muted-foreground">
          Import specific job SI80349 for Rebecca Lewis / NG07 LML with complete line items and job details
        </p>
      </div>

      {/* Document Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Preview: SI80349
          </CardTitle>
          <CardDescription>
            This will import the following document and associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                Customer Information
              </div>
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> Rebecca Lewis</div>
                <div><strong>Address:</strong> 8 Station Road, Felsted, Dunmow, Essex CM6 3HB</div>
                <div><strong>Phone:</strong> 07824 862004</div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Car className="h-4 w-4" />
                Vehicle Information
              </div>
              <div className="space-y-2 text-sm">
                <div><strong>Registration:</strong> NG07 LML</div>
                <div><strong>Make/Model:</strong> Toyota Hi-Ace 280 Swb D-4d 120</div>
                <div><strong>Mileage:</strong> 179,235 miles</div>
              </div>
            </div>

            {/* Document Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                Document Details
              </div>
              <div className="space-y-2 text-sm">
                <div><strong>Document Type:</strong> Service Invoice (SI)</div>
                <div><strong>Number:</strong> 80349</div>
                <div><strong>Created:</strong> 21/10/2019</div>
                <div><strong>Issued:</strong> 23/10/2019</div>
                <div><strong>Paid:</strong> 24/10/2019</div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <DollarSign className="h-4 w-4" />
                Financial Summary
              </div>
              <div className="space-y-2 text-sm">
                <div><strong>Net Total:</strong> £316.92</div>
                <div><strong>Tax (VAT):</strong> £63.38</div>
                <div><strong>Gross Total:</strong> £380.30</div>
                <div><Badge variant="default">Paid</Badge></div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Line Items Preview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Package className="h-4 w-4" />
              Line Items to Import
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Labour</span>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Description:</strong> Mechanical Labour</div>
                  <div><strong>Quantity:</strong> 1</div>
                  <div><strong>Unit Price:</strong> £234.00</div>
                  <div><strong>Total:</strong> £280.80 (inc. VAT)</div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Parts</span>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Description:</strong> Fuel Pipe Cyl 4</div>
                  <div><strong>Quantity:</strong> 1</div>
                  <div><strong>Unit Price:</strong> £70.92</div>
                  <div><strong>Total:</strong> £85.10 (inc. VAT)</div>
                </div>
              </Card>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Job Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4" />
              Job Description
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Work Performed:</strong> Investigated Engine Fuel Leak - Found Cylinder 4 Injector Pipe Leaking. 
                Replaced Injector Pipe And Bled Fuel System.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Action */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Document</CardTitle>
          <CardDescription>
            Click the button below to import this document with all associated data into the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleImport} 
            disabled={importing}
            className="w-full md:w-auto"
            size="lg"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing Document...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Import SI80349
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.message || 'Document imported successfully!'}
                  </AlertDescription>
                </Alert>

                {result.import_results && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Document</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        ID: {result.import_results.document_id}
                      </div>
                      <Badge variant="default" className="mt-2">
                        {result.import_results.document_imported ? 'Imported' : 'Failed'}
                      </Badge>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Line Items</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.import_results.line_items_imported} items imported
                      </div>
                      <Badge variant="default" className="mt-2">
                        Imported
                      </Badge>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Job Details</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Work description & notes
                      </div>
                      <Badge variant="default" className="mt-2">
                        {result.import_results.document_extra_imported ? 'Imported' : 'Failed'}
                      </Badge>
                    </Card>
                  </div>
                )}

                {result.verification && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Verification Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(result.verification, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <strong>Import Failed:</strong> {result.error}
                  </div>
                  {result.details && (
                    <div className="mt-2 text-sm">
                      <strong>Details:</strong> {result.details}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
