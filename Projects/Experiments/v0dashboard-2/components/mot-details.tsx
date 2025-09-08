"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  CalendarDays, 
  Car, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Loader2, 
  Fuel, 
  Gauge, 
  Info, 
  CarTaxiFront,
  CalendarCheck
} from "lucide-react"
interface MOTTestResult {
  registration: string
  make: string
  model?: string
  year?: number
  colour?: string
  fuelType?: string
  engineCapacity?: number
  motStatus: string
  motExpiry?: string
  motTestNumber?: string
  lastMileage?: number
  lastMileageDate?: string
  rfrAndComments?: Array<{
    text: string
    type: string
    dangerous?: boolean
  }>
  motTests?: MOTTest[]
  advisoryNoticeCount?: number
  failureDangerousCount?: number
  taxStatus?: string
  taxDueDate?: string
  co2Emissions?: number
  typeApproval?: string
  wheelplan?: string
  monthOfFirstRegistration?: string
  dateOfLastV5CIssued?: string
  markedForExport?: boolean
  source?: string
  timestamp?: string
}

interface MOTTest {
  completedDate: string
  testResult: string
  expiryDate?: string
  odometerValue?: string
  odometerUnit?: string
  motTestNumber?: string
  defects?: Array<{
    text: string
    type: string
    dangerous?: boolean
    advisory?: boolean
  }>
}

interface MOTDetailsProps {
  registration: string
  onClose?: () => void
}

export function MOTDetails({ registration, onClose }: MOTDetailsProps) {
  const [motData, setMOTData] = useState<MOTTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMOTData = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const url = `/api/mot?registration=${encodeURIComponent(registration)}${forceRefresh ? "&refresh=true" : ""}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()

      if (result.success) {
        setMOTData(result.data)
      } else {
        setError(result.error || "Failed to fetch MOT data")
      }
    } catch (err) {
      console.error('Error fetching MOT data:', err)
      setError(err instanceof Error ? err.message : "An error occurred while fetching MOT data")
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchMOTData()
  }, [])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr
    }
  }

  const getResultBadge = (result: string) => {
    const normalizedResult = result.toLowerCase()
    if (normalizedResult.includes("pass") || normalizedResult === 'passed') {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          PASS
        </Badge>
      )
    } else if (normalizedResult.includes("fail") || normalizedResult === 'failed') {
      return <Badge variant="destructive">FAIL</Badge>
    } else {
      return <Badge variant="outline" className="capitalize">{normalizedResult}</Badge>
    }
  }

  const getDefectIcon = (defect: { dangerous?: boolean; advisory?: boolean }) => {
    if (defect.dangerous) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    } else if (defect.advisory) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
    return <AlertTriangle className="h-4 w-4 text-orange-500" />
  }

  // Get the most recent test
  const latestTest = motData?.motTests?.[0]
  const hasActiveMOT = latestTest?.testResult === 'PASSED' && latestTest.expiryDate && new Date(latestTest.expiryDate) > new Date()
  const hasTax = motData?.taxStatus && motData.taxStatus !== 'Untaxed'

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Car className="h-6 w-6" />
              {motData?.make} {motData?.model}
            </CardTitle>
            <CardDescription className="mt-2">
              Registration: {registration} • First used: {motData?.monthOfFirstRegistration || motData?.year || 'N/A'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMOTData(true)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6 space-y-6">
        {/* Vehicle Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarCheck className="h-4 w-4" />
              <span className="text-sm font-medium">MOT Status</span>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveMOT ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium">
                {hasActiveMOT 
                  ? `Valid until ${formatDate(latestTest?.expiryDate)}` 
                  : 'No valid MOT'}
              </span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CarTaxiFront className="h-4 w-4" />
              <span className="text-sm font-medium">Tax Status</span>
            </div>
            <div className="flex items-center gap-2">
              {hasTax ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium">
                {motData?.taxStatus || 'Unknown'}
                {motData?.taxDueDate && ` (Due ${formatDate(motData.taxDueDate)})`}
              </span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">Vehicle Details</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{motData?.fuelType || 'N/A'}</span>
              </div>
              {motData?.engineCapacity && (
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{motData.engineCapacity}cc</span>
                </div>
              )}
              {motData?.colour && (
                <div className="flex items-center gap-2">
                  <div 
                    className="h-4 w-4 rounded-full border" 
                    style={{ backgroundColor: motData.colour.toLowerCase() }}
                    title={motData.colour}
                  />
                  <span className="text-sm capitalize">{motData.colour.toLowerCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading MOT data</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => fetchMOTData()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : loading && !motData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : motData?.motTests && motData.motTests.length > 0 ? (
          <div className="space-y-4">
            {motData.motTests.map((test, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg">Test Date: {formatDate(test.completedDate)}</CardTitle>
                        {test.expiryDate && <CardDescription>Expires: {formatDate(test.expiryDate)}</CardDescription>}
                      </div>
                    </div>
                    {getResultBadge(test.testResult)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {test.motTestNumber && (
                      <div>
                        <span className="font-medium">Test Number:</span>
                        <p className="font-mono">{test.motTestNumber}</p>
                      </div>
                    )}
                    {test.odometerValue && (
                      <div>
                        <span className="font-medium">Mileage:</span>
                        <p>
                          {test.odometerValue} {test.odometerUnit || "miles"}
                        </p>
                      </div>
                    )}
                  </div>

                  {test.defects && test.defects.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Issues Found ({test.defects.length})
                        </h4>
                        <div className="space-y-2">
                          {test.defects.map((defect, defectIndex) => (
                            <div key={defectIndex} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                              {getDefectIcon(defect)}
                              <div className="flex-1">
                                <p className="text-sm">{defect.text}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {defect.type}
                                  </Badge>
                                  {defect.dangerous && (
                                    <Badge variant="destructive" className="text-xs">
                                      Dangerous
                                    </Badge>
                                  )}
                                  {defect.advisory && (
                                    <Badge variant="secondary" className="text-xs">
                                      Advisory
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(!test.defects || test.defects.length === 0) && test.testResult.toLowerCase().includes("pass") && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">No issues found - Clean pass</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Car className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No MOT Records Found</h3>
            <p className="text-muted-foreground">No MOT test records were found for this vehicle.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
