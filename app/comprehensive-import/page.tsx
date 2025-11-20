'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Clock, AlertCircle, Database, FileText, Users, Car, Receipt, Settings } from 'lucide-react'

interface ImportStatus {
  success: boolean
  ready: boolean
  basePath: string
  files: Array<{
    name: string
    present: boolean
    size: number
    sizeFormatted: string
    records: number
    lastModified: string | null
    headers: string[]
  }>
  summary: {
    totalFiles: number
    presentFiles: number
    totalRecords: number
    estimatedImportTime: string
  }
  importPhases: Array<{
    phase: number
    name: string
    description: string
    endpoint: string
    estimatedTime: string
    expectedRecords?: number
  }>
  recommendations: string[]
}

interface ImportResult {
  success: boolean
  phase: number
  completed: boolean
  duration?: number
  results?: any
  nextPhase?: {
    phase: number
    name: string
    description: string
  }
  error?: string
  importComplete?: boolean
}

export default function ComprehensiveImportPage() {
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [phaseResults, setPhaseResults] = useState<ImportResult[]>([])
  const [executing, setExecuting] = useState(false)
  const [confirmClean, setConfirmClean] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/comprehensive-import/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  const executePhase = async (phase: number) => {
    setExecuting(true)
    setCurrentPhase(phase)

    try {
      const response = await fetch('/api/comprehensive-import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phase,
          confirmClean: phase === 1 ? confirmClean : undefined,
          batchSize: 1000,
          testMode: false
        }),
      })

      const result = await response.json()
      setPhaseResults(prev => [...prev, result])

      if (result.success && result.nextPhase) {
        // Auto-advance to next phase after a brief delay
        setTimeout(() => {
          setCurrentPhase(result.nextPhase.phase)
        }, 2000)
      }

    } catch (error) {
      console.error(`Phase ${phase} failed:`, error)
    } finally {
      setExecuting(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.includes('Customer')) return <Users className="h-4 w-4" />
    if (fileName.includes('Vehicle')) return <Car className="h-4 w-4" />
    if (fileName.includes('Document')) return <FileText className="h-4 w-4" />
    if (fileName.includes('Receipt')) return <Receipt className="h-4 w-4" />
    return <Database className="h-4 w-4" />
  }

  const getPhaseIcon = (phase: number) => {
    switch (phase) {
      case 1: return <Settings className="h-5 w-5" />
      case 2: return <Users className="h-5 w-5" />
      case 3: return <FileText className="h-5 w-5" />
      case 4: return <Database className="h-5 w-5" />
      case 5: return <CheckCircle className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const getPhaseStatus = (phase: number) => {
    const result = phaseResults.find(r => r.phase === phase)
    if (result) {
      return result.success ? 'completed' : 'failed'
    }
    if (currentPhase === phase && executing) {
      return 'executing'
    }
    if (currentPhase > phase) {
      return 'completed'
    }
    return 'pending'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Checking import status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load import status. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Data Import</h1>
          <p className="text-muted-foreground">
            Import all business data from Google Drive exports
          </p>
        </div>
        <Badge variant={status.ready ? "default" : "destructive"}>
          {status.ready ? "Ready" : "Not Ready"}
        </Badge>
      </div>

      {/* Import Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
          <CardDescription>
            Fresh exports from Google Drive - {status.summary.totalRecords.toLocaleString()} total records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{status.summary.presentFiles}</div>
              <div className="text-sm text-muted-foreground">Files Ready</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{status.summary.totalRecords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{status.summary.estimatedImportTime}</div>
              <div className="text-sm text-muted-foreground">Estimated Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-muted-foreground">Import Phases</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Status */}
      <Card>
        <CardHeader>
          <CardTitle>Export Files Status</CardTitle>
          <CardDescription>
            Data export files from Google Drive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {status.files.map((file) => (
              <div key={file.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.name)}
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {file.present ? `${file.records.toLocaleString()} records • ${file.sizeFormatted}` : 'File not found'}
                    </div>
                  </div>
                </div>
                <Badge variant={file.present ? "default" : "destructive"}>
                  {file.present ? "Ready" : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Phases */}
      <Card>
        <CardHeader>
          <CardTitle>Import Phases</CardTitle>
          <CardDescription>
            Sequential execution of import phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status.importPhases.map((phase) => {
              const phaseStatus = getPhaseStatus(phase.phase)
              const result = phaseResults.find(r => r.phase === phase.phase)
              
              return (
                <div key={phase.phase} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getPhaseIcon(phase.phase)}
                      <div>
                        <div className="font-medium">Phase {phase.phase}: {phase.name}</div>
                        <div className="text-sm text-muted-foreground">{phase.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        phaseStatus === 'completed' ? 'default' :
                        phaseStatus === 'executing' ? 'secondary' :
                        phaseStatus === 'failed' ? 'destructive' : 'outline'
                      }>
                        {phaseStatus === 'completed' ? 'Completed' :
                         phaseStatus === 'executing' ? 'Executing' :
                         phaseStatus === 'failed' ? 'Failed' : 'Pending'}
                      </Badge>
                      {phaseStatus === 'pending' && currentPhase + 1 === phase.phase && (
                        <Button
                          onClick={() => executePhase(phase.phase)}
                          disabled={executing || !status.ready}
                          size="sm"
                        >
                          {phase.phase === 1 ? 'Start Import' : 'Execute'}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {phaseStatus === 'executing' && (
                    <div className="mt-2">
                      <Progress value={50} className="h-2" />
                      <div className="text-sm text-muted-foreground mt-1">
                        Executing phase {phase.phase}...
                      </div>
                    </div>
                  )}
                  
                  {result && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      {result.success ? (
                        <div className="text-green-600">
                          ✅ Completed in {Math.round((result.duration || 0) / 1000)}s
                        </div>
                      ) : (
                        <div className="text-red-600">
                          ❌ Failed: {result.error}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground mt-1">
                    Estimated time: {phase.estimatedTime}
                    {phase.expectedRecords && ` • ${phase.expectedRecords.toLocaleString()} records`}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Phase 1 Confirmation */}
      {currentPhase === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⚠️ Important: Data Cleanup Confirmation</CardTitle>
            <CardDescription>
              Phase 1 will backup and clear ALL existing data before import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will remove all sample/test data and import your complete business data (~{status.summary.totalRecords.toLocaleString()} records).
                  A backup will be created automatically.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="confirmClean"
                  checked={confirmClean}
                  onChange={(e) => setConfirmClean(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="confirmClean" className="text-sm">
                  I understand this will clear existing data and import fresh business data
                </label>
              </div>
              
              <Button
                onClick={() => executePhase(1)}
                disabled={!confirmClean || executing || !status.ready}
                className="w-full"
              >
                {executing ? 'Starting Import...' : 'Begin Comprehensive Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {status.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="text-sm">{rec}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
