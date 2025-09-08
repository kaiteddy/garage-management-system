"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Upload, AlertCircle, FileText, Database, Shield } from "lucide-react"

interface ImportResult {
  success: boolean
  files_processed: number
  total_records: number
  preserved_connections: number
  new_records: number
  updated_records: number
  errors: string[]
  summary: Record<string, any>
  timestamp: string
}

export default function ImportPage() {
  const [files, setFiles] = useState<Record<string, File>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)

  const requiredFiles = [
    { key: 'appointments', name: 'Appointments.csv', description: 'Customer appointments and bookings' },
    { key: 'customers', name: 'Customers.csv', description: 'Customer contact information' },
    { key: 'document_extras', name: 'Document_Extras.csv', description: 'Additional document charges' },
    { key: 'documents', name: 'Documents.csv', description: 'Invoices, estimates, and service records' },
    { key: 'line_items', name: 'LineItems.csv', description: 'Document line items and services' },
    { key: 'receipts', name: 'Receipts.csv', description: 'Payment receipts' },
    { key: 'reminder_templates', name: 'Reminder_Templates.csv', description: 'MOT reminder templates' },
    { key: 'reminders', name: 'Reminders.csv', description: 'Customer reminders' },
    { key: 'stock', name: 'Stock.csv', description: 'Parts and inventory' },
    { key: 'vehicles', name: 'Vehicles.csv', description: 'Vehicle information' }
  ]

  const handleFileSelect = (key: string, file: File | null) => {
    if (file) {
      setFiles(prev => ({ ...prev, [key]: file }))
    } else {
      setFiles(prev => {
        const newFiles = { ...prev }
        delete newFiles[key]
        return newFiles
      })
    }
  }

  const handleImport = async (useLargeFileHandler = false) => {
    if (Object.keys(files).length === 0) {
      alert('Please select at least one file to import')
      return
    }

    // Check file sizes
    const totalSize = Object.values(files).reduce((sum, file) => sum + file.size, 0)
    const totalSizeMB = totalSize / (1024 * 1024)

    console.log(`Total file size: ${totalSizeMB.toFixed(2)} MB`)

    // Auto-select large file handler for files > 10MB
    const shouldUseLargeHandler = useLargeFileHandler || totalSizeMB > 10

    setImporting(true)
    setProgress(0)
    setResult(null)

    try {
      const formData = new FormData()

      Object.entries(files).forEach(([key, file]) => {
        formData.append(`file_${key}`, file)
      })

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 85))
      }, shouldUseLargeHandler ? 2000 : 500)

      const endpoint = shouldUseLargeHandler ? '/api/import-large-files' : '/api/import-data'
      console.log(`Using ${shouldUseLargeHandler ? 'large file' : 'standard'} import handler`)

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Files too large. Try using the Large File Import option or reduce file sizes.')
        }
        throw new Error(`Import failed with status ${response.status}`)
      }

      const data = await response.json()
      setResult(data)

    } catch (error) {
      console.error('Import error:', error)
      setResult({
        success: false,
        files_processed: 0,
        total_records: 0,
        preserved_connections: 0,
        new_records: 0,
        updated_records: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        summary: {},
        timestamp: new Date().toISOString()
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Import Center</h1>
        <p className="text-muted-foreground">
          Import your garage management data with full data integrity protection
        </p>
      </div>

      {/* Data Integrity Notice */}
      <Alert className="mb-6 border-green-200 bg-green-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Data Integrity Protection:</strong> This import will preserve all existing customer-vehicle
          connections (78.6% of vehicles are already connected). Existing data will not be overridden.
        </AlertDescription>
      </Alert>

      {/* File Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select CSV Files
          </CardTitle>
          <CardDescription>
            Choose the CSV files you want to import. Files will be processed in the correct order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredFiles.map((fileInfo) => (
              <div key={fileInfo.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{fileInfo.name}</h3>
                  {files[fileInfo.key] && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {fileInfo.description}
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(fileInfo.key, e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
                {files[fileInfo.key] && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {files[fileInfo.key].name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>
            {Object.keys(files).length} of {requiredFiles.length} files selected
            {Object.keys(files).length > 0 && (
              <span className="ml-2 text-xs">
                ({(Object.values(files).reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(1)} MB total)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {Object.values(files).reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024
                    ? 'Processing large files...'
                    : 'Importing...'}
                </span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {Object.values(files).reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Large files detected - using chunked processing for optimal performance
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => handleImport(false)}
              disabled={importing || Object.keys(files).length === 0}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : 'Standard Import'}
            </Button>

            <Button
              onClick={() => handleImport(true)}
              disabled={importing || Object.keys(files).length === 0}
              variant="outline"
              className="w-full"
            >
              <Database className="h-4 w-4 mr-2" />
              {importing ? 'Processing...' : 'Large File Import (Chunked)'}
            </Button>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <p><strong>Standard Import:</strong> Best for files under 10MB</p>
            <p><strong>Large File Import:</strong> Optimized for large files with chunked processing</p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Import Results
            </CardTitle>
            <CardDescription>
              Completed at {new Date(result.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{result.files_processed}</div>
                    <div className="text-sm text-blue-600">Files Processed</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.total_records}</div>
                    <div className="text-sm text-green-600">Total Records</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{result.new_records}</div>
                    <div className="text-sm text-purple-600">New Records</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{result.preserved_connections}</div>
                    <div className="text-sm text-orange-600">Preserved Connections</div>
                  </div>
                </div>

                {Object.keys(result.summary).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">File Summary</h4>
                    <div className="space-y-2">
                      {Object.entries(result.summary).map(([fileName, summary]: [string, any]) => (
                        <div key={fileName} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{fileName}</span>
                          <span className="text-sm text-muted-foreground">
                            {summary.processed} processed, {summary.newRecords} new, {summary.updatedRecords} updated
                            {summary.preservedConnections > 0 && `, ${summary.preservedConnections} preserved`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600 font-medium">Import failed</p>
                {result.errors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
