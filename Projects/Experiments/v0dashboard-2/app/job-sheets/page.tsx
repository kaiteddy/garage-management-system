"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  Wrench,
  Calendar,
  User,
  Car,
  DollarSign,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Mail,
  Settings,
  Activity,
  Zap,
  Target
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { formatDisplayDate } from "@/lib/date-utils"
import { ContactDropdown } from "@/components/ui/contact-dropdown"

import { useBusinessSettings } from "@/hooks/use-business-settings"

// Status options with colors (matching API expectations)
const statusOptions = [
  { value: "Open", label: "OPEN", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "In Progress", label: "IN PROGRESS", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "Awaiting Parts", label: "AWAITING PARTS", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "Parts Ordered", label: "PARTS ORDERED", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "Ready for Collection", label: "READY FOR COLLECTION", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "Completed", label: "COMPLETED", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "Invoiced", label: "INVOICED", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "On Hold", label: "ON HOLD", color: "bg-gray-100 text-gray-800 border-gray-200" }
]

// Get status color
const getStatusColor = (status: string) => {
  const statusOption = statusOptions.find(option => option.value === status)
  return statusOption ? statusOption.color : "bg-gray-100 text-gray-800 border-gray-200"
}

interface JobSheet {
  id: string
  jobNumber: string
  date: string
  registration: string
  makeModel: string
  customer: string
  labour: number
  total: number
  status: 'Open' | 'In Progress' | 'Completed' | 'Parts Ordered' | 'Awaiting Parts' | 'Ready for Collection' | 'Invoiced' | 'On Hold'
  motBooked?: boolean
  description?: string
  notes?: string
  customerId?: string
  documentId?: string
  type?: string
  customerPhone?: string
  customerMobile?: string
  customerEmail?: string
  customerTwilioPhone?: string
}

export default function JobSheetsPage() {
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [updatingTechnician, setUpdatingTechnician] = useState<string | null>(null)
  const [activeJobs, setActiveJobs] = useState(0)
  const router = useRouter()
  const loadingRef = useRef(false)
  const { getTechnicians, getServiceBays } = useBusinessSettings()

  // Function to open job sheet - navigate to the specific job sheet page
  const openJobSheetTab = (job: JobSheet) => {
    console.log('🚀 Opening job sheet:', job.id, job.jobNumber)

    // Prevent navigation if currently loading
    if (loadingRef.current) {
      console.log('⚠️ Currently loading, skipping navigation')
      return
    }

    try {
      const url = `/job-sheets/${job.id}`
      console.log('🚀 Navigating to:', url)
      router.push(url)
    } catch (error) {
      console.error('❌ Navigation error:', error)
      toast({
        title: "Navigation Error",
        description: "Failed to open job sheet",
        variant: "destructive"
      })
    }
  }

  const loadJobSheets = async (searchQuery = '', statusQuery = 'all', pageNum = 1) => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current) {
      console.log('[JOB-SHEETS-PAGE] Already loading, skipping...')
      return
    }
    loadingRef.current = true

    try {
      console.log('[JOB-SHEETS-PAGE] Loading job sheets...', { searchQuery, statusQuery, pageNum })
      setLoading(pageNum === 1)
      const params = new URLSearchParams({
        limit: '20',
        page: pageNum.toString()
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (statusQuery !== 'all') {
        params.append('status', statusQuery)
      }

      const response = await fetch(`/api/job-sheets?${params}`)
      const data = await response.json()
      console.log('[JOB-SHEETS-PAGE] API Response:', data)

      if (data.success) {
        // Validate and clean the data before setting state
        const cleanJobSheets = (data.jobSheets || []).map((sheet: any) => ({
          ...sheet,
          id: sheet.id || 'unknown',
          jobNumber: sheet.document_number || sheet.jobNumber || 'N/A',
          date: sheet.date || new Date().toLocaleDateString('en-GB'),
          customer: (sheet.customer || 'NO CUSTOMER ASSIGNED').toUpperCase(),
          makeModel: (sheet.vehicleMakeModel || sheet.makeModel || 'UNKNOWN VEHICLE').toUpperCase(),
          registration: sheet.vehicle_registration || sheet.registration || 'N/A',
          status: sheet.status || 'OPEN',
          motBooked: sheet.motBooked || false,
          customerPhone: sheet.customerPhone || '',
          customerMobile: sheet.customerMobile || '',
          customerEmail: sheet.customerEmail || '',
          customerTwilioPhone: sheet.customerTwilioPhone || '',
          labour: sheet.labour || 0,
          total: sheet.total || 0,
          description: sheet.description || '',
          notes: sheet.notes || '',
          customerId: sheet.customerId || null,
          documentId: sheet.documentId || null,
          type: sheet.type || ''
        }))

        setJobSheets(cleanJobSheets)
        setTotal(data.count || 0)
        setTotalPages(Math.ceil((data.count || 0) / 20))
        setPage(pageNum)

        // Calculate active jobs (Open, In Progress, Awaiting Parts, Parts Ordered)
        const activeStatuses = ['Open', 'In Progress', 'Awaiting Parts', 'Parts Ordered']
        const activeCount = cleanJobSheets.filter(job => activeStatuses.includes(job.status)).length
        setActiveJobs(activeCount)
      } else {
        console.error('Failed to load job sheets:', data.error)
        toast({
          title: "Error",
          description: "Failed to load job sheets",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading job sheets:', error)
      toast({
        title: "Error",
        description: "Failed to load job sheets",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    loadJobSheets()
  }, [])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (value.length === 0 || value.length >= 2) {
      loadJobSheets(value, statusFilter, 1)
    }
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    loadJobSheets(searchTerm, value, 1)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadJobSheets(searchTerm, statusFilter, page)
  }

  const handlePageChange = (newPage: number) => {
    loadJobSheets(searchTerm, statusFilter, newPage)
  }

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    setUpdatingStatus(jobId)
    try {
      const response = await fetch('/api/job-sheets/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: jobId,
          status: newStatus
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update the job sheet in the local state
        setJobSheets(prevJobSheets =>
          prevJobSheets.map(job =>
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        )
        toast({
          title: "Status Updated",
          description: `Job sheet status changed to ${newStatus}`,
        })
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update job sheet status",
        variant: "destructive"
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleTechnicianChange = async (jobId: string, newTechnician: string) => {
    setUpdatingTechnician(jobId)
    try {
      const response = await fetch('/api/job-sheets/technician', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: jobId,
          technician: newTechnician
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update the job sheet in the local state
        setJobSheets(prevJobSheets =>
          prevJobSheets.map(job =>
            job.id === jobId ? { ...job, technician: newTechnician } : job
          )
        )
        toast({
          title: "Technician Updated",
          description: `Technician changed to ${newTechnician}`,
        })
      } else {
        throw new Error(data.error || 'Failed to update technician')
      }
    } catch (error) {
      console.error('Error updating technician:', error)
      toast({
        title: "Error",
        description: "Failed to update technician",
        variant: "destructive"
      })
    } finally {
      setUpdatingTechnician(null)
    }
  }

  const handleDeleteJob = async (jobId: string, jobNumber: string) => {
    if (!confirm(`Are you sure you want to delete job sheet ${jobNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/job-sheets/${jobId}?action=delete`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Job Sheet Deleted",
          description: `Job sheet ${jobNumber} has been permanently deleted.`,
        })
        // Refresh the job sheets list
        await loadJobSheets(searchTerm, statusFilter, page)
      } else {
        throw new Error(result.error || 'Failed to delete job sheet')
      }

    } catch (error) {
      console.error('Error deleting job sheet:', error)
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete job sheet. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open': return <AlertCircle className="h-3 w-3" />
      case 'In Progress': return <Clock className="h-3 w-3" />
      case 'Awaiting Parts': return <Wrench className="h-3 w-3" />
      case 'Parts Ordered': return <Wrench className="h-3 w-3" />
      case 'Ready for Collection': return <User className="h-3 w-3" />
      case 'Completed': return <CheckCircle className="h-3 w-3" />
      case 'Invoiced': return <CheckCircle className="h-3 w-3" />
      case 'On Hold': return <AlertCircle className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0)
  }

  const getDetailsBadge = (status: string) => {
    const details = {
      'Open': 'Overdue',
      'In Progress': 'A Point Ramp',
      'Completed': 'Complete',
      'Invoiced': 'Complete'
    }
    return details[status as keyof typeof details] || 'Overdue'
  }

  const getTechnicianBadge = (id: string) => {
    try {
      const technicians = getTechnicians()
      if (!technicians || technicians.length === 0) {
        return 'No Technician'
      }
      const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      return technicians[hash % technicians.length]?.name || 'Unassigned'
    } catch (error) {
      console.error('Error getting technician badge:', error)
      return 'No Technician'
    }
  }

  const getBayBadge = (id: string) => {
    try {
      const bays = getServiceBays()
      if (!bays || bays.length === 0) {
        return 'No Bay'
      }
      const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      return bays[hash % bays.length]?.name || 'Unassigned'
    } catch (error) {
      console.error('Error getting bay badge:', error)
      return 'No Bay'
    }
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wrench className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">Job Sheets</h1>
            </div>
            <div className="flex items-center gap-4 text-blue-100">
              {activeJobs > 0 && (
                <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full">
                  <Activity className="h-4 w-4" />
                  <span className="font-semibold">{activeJobs} Active Jobs</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{total.toLocaleString()} Total Job Sheets</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => router.push('/job-sheet')}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Job Sheet
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search jobsheets"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL STATUSES</SelectItem>
                <SelectItem value="Open">OPEN</SelectItem>
                <SelectItem value="In Progress">IN PROGRESS</SelectItem>
                <SelectItem value="Awaiting Parts">AWAITING PARTS</SelectItem>
                <SelectItem value="Parts Ordered">PARTS ORDERED</SelectItem>
                <SelectItem value="Ready for Collection">READY FOR COLLECTION</SelectItem>
                <SelectItem value="Completed">COMPLETED</SelectItem>
                <SelectItem value="Invoiced">INVOICED</SelectItem>
                <SelectItem value="On Hold">ON HOLD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Job Sheet Creation */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-6 rounded-xl mb-6">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Quick Create Job Sheet</h3>
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 h-5 w-5" />
                    <Input
                      placeholder="Enter vehicle registration (e.g. AB12 CDE)"
                      className="pl-12 h-12 bg-white border-green-200 focus:border-green-400 text-lg"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const registration = (e.target as HTMLInputElement).value.trim().toUpperCase()
                          if (registration) {
                            router.push(`/job-sheet?registration=${encodeURIComponent(registration)}`)
                          }
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder*="registration"]') as HTMLInputElement
                      const registration = input?.value.trim().toUpperCase()
                      if (registration) {
                        router.push(`/job-sheet?registration=${encodeURIComponent(registration)}`)
                      } else {
                        router.push('/job-sheet')
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 h-12 px-6 font-semibold"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Job Sheet
                  </Button>
                </div>
              </div>
              <div className="bg-white/60 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <p className="font-semibold text-green-800">Quick Tips</p>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>• Enter registration and press Enter</p>
                  <p>• Vehicle details auto-populate from DVLA</p>
                  <p>• Customer info loads automatically</p>
                </div>
              </div>
            </div>
          </div>

          {/* Job Sheets Table */}
          <div className="rounded-lg border overflow-x-auto bg-white shadow-sm">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[100px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Job Number</TableHead>
                  <TableHead className="w-[140px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Registration</TableHead>

                  <TableHead className="w-[350px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Vehicle</TableHead>
                  <TableHead className="w-[160px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Customer</TableHead>
                  <TableHead className="w-[240px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Contact</TableHead>
                  <TableHead className="w-[160px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Status</TableHead>
                  <TableHead className="w-[80px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>MOT</TableHead>
                  <TableHead className="w-[120px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Bay</TableHead>
                  <TableHead className="w-[160px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Technician</TableHead>
                  <TableHead className="w-[120px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Date In</TableHead>
                  <TableHead className="w-[120px] py-6 text-left text-gray-600" style={{letterSpacing: '0.009em', fontWeight: '590', fontSize: '12px', textTransform: 'uppercase'}}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Loading job sheets...</p>
                    </TableCell>
                  </TableRow>
                ) : jobSheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' ? "No job sheets match your search." : "No job sheets found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  jobSheets.map((job) => (
                    <TableRow
                      key={job.id}
                      className="hover:bg-gray-50 transition-colors border-b"
                    >
                      <TableCell className="font-medium py-6 align-middle">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                            {job.jobNumber}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-blue-100"
                            onClick={() => openJobSheetTab(job)}
                            title="Open job sheet"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium py-6 align-middle">
                        <div className="flex items-center">
                          <span
                            className="bg-yellow-200 px-3 py-2 rounded text-sm font-bold text-center cursor-pointer select-all whitespace-nowrap"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(job.registration || '')
                            }}
                            title="Click to copy registration"
                          >
                            {job.registration || 'N/A'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[350px] py-6 align-middle">
                        <div className="font-medium text-gray-900" title={job.makeModel} style={{letterSpacing: '-0.003em', fontWeight: '590', fontSize: '14px', lineHeight: '1.2'}}>
                          {job.makeModel}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[160px] py-6 align-middle">
                        <div className="truncate text-gray-900" title={job.customer || 'No customer assigned'} style={{letterSpacing: '-0.003em', fontWeight: '400', fontSize: '14px'}}>
                          {job.customer || 'No customer assigned'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[240px] py-6 align-middle">
                        <ContactDropdown
                          contactInfo={{
                            customerPhone: job.customerPhone,
                            customerMobile: job.customerMobile,
                            customerTwilioPhone: job.customerTwilioPhone,
                            customerEmail: job.customerEmail
                          }}
                          customerName={job.customer}
                        />
                      </TableCell>
                      <TableCell className="py-6 align-middle">
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={job.status}
                            onValueChange={(newStatus) => handleStatusChange(job.id, newStatus)}
                            disabled={updatingStatus === job.id}
                          >
                            <SelectTrigger className={`w-48 text-xs border ${getStatusColor(job.status)} ${updatingStatus === job.id ? 'opacity-50' : ''} whitespace-nowrap`}>
                              <div className="flex items-center gap-1.5">
                                {updatingStatus === job.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  getStatusIcon(job.status)
                                )}
                                <SelectValue className="truncate" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${option.color.split(' ')[0]}`} />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 align-middle">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={job.motBooked || false}
                            readOnly
                            className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-6 align-middle">
                        <div className="flex items-center">
                          <Badge variant="outline" className="text-xs whitespace-nowrap px-2 py-1">
                            {getBayBadge(job.id)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center">
                          <Select
                            value={getTechnicianBadge(job.id)}
                            onValueChange={(newTechnician) => handleTechnicianChange(job.id, newTechnician)}
                            disabled={updatingTechnician === job.id}
                          >
                            <SelectTrigger className="w-36 text-xs border border-gray-200 bg-white">
                              <SelectValue placeholder="Select tech" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">No Technician</SelectItem>
                              {getTechnicians().map((tech) => (
                                <SelectItem key={tech.id} value={tech.name}>
                                  {tech.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap py-6 align-middle">
                        <div className="flex items-center" style={{letterSpacing: '-0.003em', fontWeight: '400', fontSize: '14px'}}>
                          {job.date}
                        </div>
                      </TableCell>
                      <TableCell className="py-6 align-middle">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openJobSheetTab(job)}
                            className="h-8 w-8 p-0 hover:bg-blue-50"
                            title="View/Edit Job Sheet"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          {(job.status === 'Open' || job.status === 'Voided' || job.status === 'Cancelled') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteJob(job.id, job.jobNumber)}
                              className="h-8 w-8 p-0 hover:bg-red-50"
                              title="Delete Job Sheet"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {total > 0 ? `1 to 20 of ${total.toLocaleString()}` : '0 results'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Page 1 of {totalPages}</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
