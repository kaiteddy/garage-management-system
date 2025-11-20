"use client"

import { useState } from "react"
import { format, parseISO, isBefore, isAfter, subYears } from "date-fns"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, CheckCircle, Loader2, Calendar, Gauge, AlertCircle, Info, ChevronDown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import * as Accordion from "@radix-ui/react-accordion"
import { cn } from "@/lib/utils"

type MOTTestResult = {
  completedDate: string
  expiryDate: string | null
  odometerValue: number | null
  odometerUnit: string
  testResult: string
  testNumber: string
  defects: Array<{
    text: string
    type: 'DANGEROUS' | 'MAJOR' | 'MINOR' | 'ADVISORY' | 'FAIL' | 'PASS' | 'USER ENTERED'
    dangerous?: boolean
  }>
}

type MOTCheckResult = {
  registration: string
  make?: string
  model?: string
  yearOfManufacture?: number
  fuelType?: string
  colour?: string
  motStatus?: string
  motExpiryDate?: string
  nextTestDue?: string
  hasOutstandingRecalls?: boolean
  motTests?: MOTTestResult[]
  lastTest?: MOTTestResult
  error?: string
  details?: string
  apiErrors?: string[]
}

export function MOTCheck() {
  const [registration, setRegistration] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MOTCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    if (!registration.trim()) {
      toast({
        title: "Error",
        description: "Please enter a registration number",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/mot-check?registration=${encodeURIComponent(registration.trim().toUpperCase())}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to check MOT status")
      }

      setResult(data)
    } catch (err) {
      console.error("MOT check failed:", err)
      const errorMessage = err instanceof Error ? 
        err.message : 
        typeof err === 'object' && err !== null && 'message' in err ? 
          String(err.message) : 
          "Failed to check MOT status. Please try again later."
      
      setError(errorMessage)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'd MMMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const getMOTStatusBadge = (status?: string, expiryDate?: string) => {
    if (!status) return null;
    
    const now = new Date();
    const isExpired = expiryDate && isBefore(parseISO(expiryDate), now);
    
    if (status.toLowerCase() === 'valid' && !isExpired) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" /> Valid
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="flex items-center">
        <AlertCircle className="h-3 w-3 mr-1" /> {isExpired ? 'Expired' : status}
      </Badge>
    );
  };

  const getTestResultBadge = (result: string) => {
    const lowerResult = result.toLowerCase();
    
    if (lowerResult === 'passed') {
      return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
    } else if (lowerResult === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    } else {
      return <Badge variant="outline">{result}</Badge>;
    }
  };

  const getDefectBadge = (type: string) => {
    const lowerType = type.toLowerCase();
    
    if (lowerType === 'dangerous') {
      return <Badge variant="destructive">Dangerous</Badge>;
    } else if (lowerType === 'major') {
      return <Badge className="bg-amber-500 text-white">Major</Badge>;
    } else if (lowerType === 'minor') {
      return <Badge className="bg-blue-500 text-white">Minor</Badge>;
    } else if (lowerType === 'advisory') {
      return <Badge variant="outline">Advisory</Badge>;
    }
    
    return <Badge variant="outline">{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check MOT Status</CardTitle>
          <CardDescription>Enter a vehicle registration number to check its MOT status and history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number</Label>
              <div className="flex space-x-2">
                <Input
                  id="registration"
                  placeholder="e.g., AB12CDE"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                  disabled={loading}
                  className="uppercase"
                />
                <Button onClick={handleCheck} disabled={loading} className="min-w-[100px]">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Check MOT'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div>
                <p className="font-medium">Checking MOT status for {registration}</p>
                <p className="text-sm text-muted-foreground">This may take a moment...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Vehicle Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">
                    {result.make} {result.model}
                  </CardTitle>
                  <CardDescription className="text-lg font-medium">
                    {result.registration} • {result.yearOfManufacture}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getMOTStatusBadge(result.motStatus, result.motExpiryDate)}
                  {result.hasOutstandingRecalls && (
                    <Badge variant="destructive" className="flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Outstanding Recalls
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Fuel Type</div>
                  <div className="font-medium">{result.fuelType || 'N/A'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Colour</div>
                  <div className="font-medium">{result.colour || 'N/A'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">MOT Status</div>
                  <div className="font-medium">
                    {result.motStatus === 'Valid' ? (
                      <span className="text-green-600">Valid</span>
                    ) : (
                      <span className="text-amber-600">{result.motStatus || 'Not available'}</span>
                    )}
                  </div>
                </div>
                {result.nextTestDue && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Next Test Due</div>
                    <div className="font-medium">{formatDate(result.nextTestDue)}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* MOT History */}
          {result.motTests && Array.isArray(result.motTests) && result.motTests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>MOT History</CardTitle>
                <CardDescription>Previous MOT test results for this vehicle</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion.Root type="multiple" className="space-y-4">
                  {result.motTests.map((test, index) => (
                    <Accordion.Item 
                      key={index} 
                      value={`item-${index}`}
                      className="border rounded-lg overflow-hidden"
                    >
                      <Accordion.Header className="w-full">
                        <Accordion.Trigger className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-sm font-medium">
                              {formatDate(test.completedDate)}
                            </div>
                            {getTestResultBadge(test.testResult)}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      
                      <Accordion.Content className="px-4 pb-4 pt-2">
                        <div className="space-y-4">
                          {/* Test Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Test Date:</span>
                                <span>{formatDate(test.completedDate)}</span>
                              </div>
                              {test.expiryDate && (
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground opacity-0" />
                                  <span className="text-muted-foreground">Expiry Date:</span>
                                  <span>{formatDate(test.expiryDate)}</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Mileage:</span>
                                <span>
                                  {test.odometerValue ? `${test.odometerValue.toLocaleString()} ${test.odometerUnit || 'mi'}` : 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="h-4 w-4" />
                                <span className="text-muted-foreground">Test Number:</span>
                                <span className="font-mono">{test.testNumber || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Defects & Advisories */}
                          {test.defects && test.defects.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium">Defects & Advisories</h4>
                              <div className="space-y-2">
                                {test.defects.map((defect, idx) => (
                                  <div key={idx} className="p-3 border rounded-md bg-muted/10">
                                    <div className="flex items-start justify-between">
                                      <p className="text-sm">{defect.text}</p>
                                      <div className="ml-2">
                                        {getDefectBadge(defect.type)}
                                      </div>
                                    </div>
                                    {defect.dangerous && (
                                      <div className="mt-1 text-xs text-red-600 flex items-center">
                                        <AlertTriangle className="h-3 w-3 mr-1" /> Dangerous defect
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              </CardContent>
            </Card>
          )}

          {/* No MOT History Message */}
          {(!result.motTests || !Array.isArray(result.motTests) || result.motTests.length === 0) && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Info className="h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">No MOT history found</p>
                  <p className="text-sm text-muted-foreground">
                    This vehicle doesn't have any MOT history records.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
