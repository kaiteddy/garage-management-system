"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Download, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface JobNumberAnalysis {
  totalJobSheets: number
  documentsTable: number
  jobSheetsTable: number
  standardFormat: number
  oldFormat: number
  otherFormats: number
  highestStandardNumber: number
  highestOldNumber: number
  suggestedNextNumber: string
  allNumbers: string[]
  sampleDocuments: any[]
  sampleJobSheets: any[]
}

export default function JobNumbersAnalysisPage() {
  const [analysis, setAnalysis] = useState<JobNumberAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalysis = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/job-numbers-analysis')
      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
        toast({
          title: "Analysis Complete",
          description: `Found ${data.analysis.totalJobSheets} job sheets in system`,
        })
      } else {
        throw new Error(data.error || 'Failed to fetch analysis')
      }
    } catch (error) {
      console.error('Error fetching analysis:', error)
      toast({
        title: "Error",
        description: "Failed to fetch job number analysis",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const testNextNumber = async () => {
    try {
      const response = await fetch('/api/job-sheets/next-number')
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Next Job Number",
          description: `Next number will be: ${data.nextNumber}`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get next job number",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Analyzing job sheet numbers...</span>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Analysis Failed</h2>
          <Button onClick={fetchAnalysis}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Sheet Numbers Analysis</h1>
          <p className="text-gray-600 mt-2">Review and analyze all job sheet numbers in the system</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAnalysis} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={testNextNumber} variant="outline">
            Test Next Number
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Job Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalJobSheets}</div>
            <div className="text-xs text-gray-500 mt-1">
              Documents: {analysis.documentsTable} | Job Sheets: {analysis.jobSheetsTable}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Number Formats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">JS Format:</span>
                <Badge variant="outline">{analysis.standardFormat}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Old Format:</span>
                <Badge variant="outline">{analysis.oldFormat}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Other:</span>
                <Badge variant="outline">{analysis.otherFormats}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Highest Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">JS Format:</span>
                <Badge className="bg-blue-100 text-blue-800">{analysis.highestStandardNumber}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Old Format:</span>
                <Badge className="bg-gray-100 text-gray-800">{analysis.highestOldNumber}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Next Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analysis.suggestedNextNumber}</div>
            <div className="text-xs text-gray-500 mt-1">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Ready for use
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Numbers Review */}
      <Card>
        <CardHeader>
          <CardTitle>All Job Sheet Numbers ({analysis.allNumbers.length})</CardTitle>
          <p className="text-sm text-gray-600">
            Review all existing job sheet numbers to identify patterns and gaps
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2 max-h-96 overflow-y-auto">
            {analysis.allNumbers.map((number, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className={`text-center ${
                  /^JS\d{5}$/.test(number) 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : /^\d+$/.test(number)
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {number}
              </Badge>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>Standard JS Format</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span>Old Numeric Format</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>Other Formats</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents Sample */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Documents ({analysis.sampleDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.sampleDocuments.map((doc, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{doc.doc_number}</div>
                    <div className="text-sm text-gray-600">{doc.customer_name} - {doc.vehicle_reg}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString() : 'No date'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Sheets Sample */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Job Sheets ({analysis.sampleJobSheets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.sampleJobSheets.length > 0 ? (
                analysis.sampleJobSheets.map((job, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{job.job_number}</div>
                      <div className="text-sm text-gray-600">{job.customer_name} - {job.registration}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No job sheets table found - using documents table only
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            System Status & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Job Number Generation</div>
                <div className="text-sm text-gray-600">
                  System will generate <strong>{analysis.suggestedNextNumber}</strong> for the next job sheet
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Format Compatibility</div>
                <div className="text-sm text-gray-600">
                  System handles both old numeric format ({analysis.oldFormat} found) and new JS format ({analysis.standardFormat} found)
                </div>
              </div>
            </div>

            {analysis.otherFormats > 0 && (
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium">Non-Standard Formats</div>
                  <div className="text-sm text-gray-600">
                    Found {analysis.otherFormats} job sheets with non-standard number formats - these are handled but may need review
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg mt-4">
              <div className="font-medium text-blue-900">After Import Recommendation</div>
              <div className="text-sm text-blue-800 mt-1">
                After running your latest import, re-run this analysis to ensure job numbers are synchronized between your old system and this platform.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
