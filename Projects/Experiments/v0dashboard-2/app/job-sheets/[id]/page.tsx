"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { CleanJobSheetForm } from "@/components/job-sheet/clean-job-sheet-form"
import { VehicleHistoryPanel } from "@/components/job-sheet/vehicle-history-panel"
import { MOTHistoryVisualization } from "@/components/vehicle/mot-history-visualization"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Car, History, FileText, Activity } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface JobSheetData {
  id: string
  jobNumber: string
  registration: string
  makeModel: string
  customer: string
  status: string
  date: string
  total: number
  customerId?: string
  description?: string
  notes?: string
  customerPhone?: string
  customerEmail?: string
  // Preloaded technical details for instant render
  engineCode?: string
  euroStatus?: string
  tyreSize?: string
  tyrePressureFrontNS?: string
  tyrePressureFrontOS?: string
  tyrePressureRearNS?: string
  tyrePressureRearOS?: string
  timingBeltInterval?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleDerivative?: string
  vehicleYear?: string | number | null
  vehicleColor?: string
}

export default function JobSheetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [jobSheet, setJobSheet] = useState<JobSheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [motHistory, setMotHistory] = useState<any[]>([])
  const [vehicleData, setVehicleData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('job-sheet')

  useEffect(() => {
    if (params.id) {
      loadJobSheet(params.id as string)
    }
  }, [params.id])

  const loadJobSheet = async (jobId: string) => {
    try {
      setLoading(true)
      console.log(`Loading job sheet with ID: ${jobId}`)

      // Get the specific job sheet using the dedicated API endpoint
      const response = await fetch(`/api/job-sheets/${jobId}`)
      const data = await response.json()

      console.log('Job sheet API response:', data)

      if (data.success && data.jobSheet) {
        console.log('Found job sheet:', data.jobSheet)
        setJobSheet(data.jobSheet)
        toast({
          title: "Job Sheet Loaded",
          description: `Loaded job sheet ${data.jobSheet.jobNumber}`,
        })
      } else {
        console.log('Job sheet not found:', data.error)
        toast({
          title: "Job Sheet Not Found",
          description: data.error || "The requested job sheet could not be found.",
          variant: "destructive",
        })
        router.push('/job-sheets')
      }
    } catch (error) {
      console.error('Error loading job sheet:', error)
      toast({
        title: "Error",
        description: "Failed to load job sheet data",
        variant: "destructive",
      })
      router.push('/job-sheets')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading job sheet...</p>
        </div>
      </div>
    )
  }

  if (!jobSheet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Job sheet not found</p>
          <Button onClick={() => router.push('/job-sheets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Sheets
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Job Sheet Form with pre-loaded data and back navigation */}
      <CleanJobSheetForm
        initialData={jobSheet}
        showBackButton={true}
        onBack={() => router.push('/job-sheets')}
      />
    </div>
  )
}
