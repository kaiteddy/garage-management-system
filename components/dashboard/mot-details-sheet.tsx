"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Car, AlertTriangle, CheckCircle, RefreshCw, Calendar, Loader2 } from "lucide-react"

// Import shared types
import type { Vehicle } from "@/types/vehicle"

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

interface MOTDetailsSheetProps {
  vehicle: (Vehicle & { motExpiry?: string | null; motStatus?: string }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MOTDetailsSheet({ vehicle, open, onOpenChange }: MOTDetailsSheetProps) {
  const [motData, setMOTData] = useState<MOTTest[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMOTData = async (forceRefresh = false) => {
    if (!vehicle) return

    console.log("🔍 Fetching real MOT data for:", vehicle.registration)
    setLoading(true)
    setError(null)

    try {
      const url = `/api/mot?registration=${encodeURIComponent(vehicle.registration)}${forceRefresh ? "&refresh=true" : ""}`
      const response = await fetch(url)
      const result = await response.json()

      if (result.success && result.data) {
        setMOTData(result.data.motTests || [])
        console.log("✅ Real MOT data received:", result.data)
      } else {
        setError(result.error || "Failed to fetch MOT data from DVSA")
        console.error("❌ MOT API error:", result.error)
      }
    } catch (err) {
      console.error("❌ MOT fetch error:", err)
      setError("Network error fetching MOT data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && vehicle) {
      console.log("📋 MOT Details Sheet opened for:", vehicle.registration)
      fetchMOTData()
    }
  }, [open, vehicle])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A"
    try {
      return new Date(dateStr).toLocaleDateString("en-GB")
    } catch {
      return dateStr
    }
  }

  const getResultBadge = (result: string) => {
    const normalizedResult = result.toLowerCase()
    if (normalizedResult.includes("pass")) {
      return (
        <Badge variant="default" className="bg-green-500">
          PASS
        </Badge>
      )
    } else if (normalizedResult.includes("fail")) {
      return <Badge variant="destructive">FAIL</Badge>
    } else {
      return <Badge variant="secondary">{result}</Badge>
    }
  }

  const getDefectIcon = (defect?: { dangerous?: boolean; advisory?: boolean }) => {
    if (!defect) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    
    if (defect.dangerous) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (defect.advisory) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  }

  if (!vehicle) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            MOT Details - {vehicle.registration}
          </SheetTitle>
          <SheetDescription>Real-time MOT history and test results from DVSA database</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Vehicle Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Vehicle Information</CardTitle>
                <Button variant="outline" size="sm" onClick={() => fetchMOTData(true)} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {loading ? "Loading..." : "Refresh DVSA Data"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Registration</span>
                  <p className="font-mono font-bold text-lg">{vehicle.registration}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Vehicle</span>
                  <p className="font-medium">
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Current MOT Status</span>
                  <Badge
                    variant={vehicle.motStatus === "Valid" ? "default" : "destructive"}
                    className="mt-1 block w-fit"
                  >
                    {vehicle.motStatus}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">MOT Expiry</span>
                  <p className="font-medium">
                    {vehicle.motExpiry ? new Date(vehicle.motExpiry).toLocaleDateString("en-GB") : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MOT History Content */}
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Loading Real MOT Data</h3>
                <p className="text-muted-foreground">Fetching latest information from DVSA...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Real MOT Data</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => fetchMOTData(true)} variant="outline" size="sm" className="bg-white">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : motData && motData.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No MOT Data Found</h3>
                <p className="text-muted-foreground">
                  No MOT test records found for {vehicle.registration} in the DVSA database.
                </p>
              </CardContent>
            </Card>
          ) : motData ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">DVSA MOT Test History</h3>
              {motData.map((test, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5" />
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
                            {Number(test.odometerValue).toLocaleString()} {test.odometerUnit || "miles"}
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
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
