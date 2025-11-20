"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  FileText,
  Calendar,
  User,
  Car,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Download,
  Eye,
  Edit
} from "lucide-react"
import Link from "next/link"

interface JobSheet {
  id: string
  jobNumber: string
  date: string
  registration: string
  makeModel: string
  customer: string
  labour: number
  total: number
  status: 'Open' | 'In Progress' | 'Completed' | 'Invoiced'
  description?: string
}

export default function JobSheetsPage() {
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([])
  const [filteredJobSheets, setFilteredJobSheets] = useState<JobSheet[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('in-progress')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobSheets()
  }, [])

  useEffect(() => {
    filterJobSheets()
  }, [jobSheets, searchTerm, statusFilter, activeTab])

  const fetchJobSheets = async () => {
    try {
      const response = await fetch('/api/job-sheets')
      const data = await response.json()

      if (data.success) {
        setJobSheets(data.jobSheets || [])
      }
    } catch (error) {
      console.error('Error fetching job sheets:', error)
      // Mock data based on the screenshot
      const mockJobSheets: JobSheet[] = [
        {
          id: '99947',
          jobNumber: '99947',
          date: '02/06/2025',
          registration: 'MA51JJK',
          makeModel: 'Ford Transit 350 Limited P/V Ecodue',
          customer: 'Hendon Bagel Bakery',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99946',
          jobNumber: '99946',
          date: '02/06/2025',
          registration: 'FN99VKW',
          makeModel: 'Hyundai Kona Gdi Premium Se',
          customer: 'Mr Gennadi Eduards',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99945',
          jobNumber: '99945',
          date: '02/06/2025',
          registration: 'LO67KWE',
          makeModel: 'Mercedes A-Class A 160 Se Executive',
          customer: 'Mr Eddie',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99944',
          jobNumber: '99944',
          date: '02/06/2025',
          registration: 'BK17JVE',
          makeModel: 'Hyundai I10 Se',
          customer: 'Mr Jamie Jung',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99941',
          jobNumber: '99941',
          date: '02/06/2025',
          registration: 'LS18ZZA',
          makeModel: 'Ford Focus Titanium',
          customer: 'Mrs Lisa Rennie',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99940',
          jobNumber: '99940',
          date: '30/05/2025',
          registration: 'KN67TET',
          makeModel: 'Hyundai I10 Premium Se',
          customer: 'Ms Avital Stonier',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99939',
          jobNumber: '99939',
          date: '30/05/2025',
          registration: 'LJ70PXT',
          makeModel: 'Volvo Xc90 R5 Momentum Awd Mhev',
          customer: 'Ms Avital Stonier',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99935',
          jobNumber: '99935',
          date: '30/05/2025',
          registration: 'TA18OVY',
          makeModel: 'Ford Transit 350 L3 H2 P/V Drw',
          customer: '',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99932',
          jobNumber: '99932',
          date: '29/05/2025',
          registration: 'MW11JPU',
          makeModel: 'Toyota Verso T2 Valvematic',
          customer: 'Dr Schneider',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99930',
          jobNumber: '99930',
          date: '29/05/2025',
          registration: 'SK10MBP',
          makeModel: 'Vauxhall Astra Sri Cdti',
          customer: 'Dr Schneider',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99923',
          jobNumber: '99923',
          date: '28/05/2025',
          registration: 'TY07CVR',
          makeModel: 'Nissan Micra Essential C',
          customer: 'Mr Neville Ramer',
          labour: 5.00,
          total: 763.98,
          status: 'Open'
        },
        {
          id: '99915',
          jobNumber: '99915',
          date: '27/05/2025',
          registration: 'LH18NAL',
          makeModel: 'Volkswagen Polo Se Tsi Dsg',
          customer: 'Mrs Y Mordecai',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99919',
          jobNumber: '99919',
          date: '23/05/2025',
          registration: 'GN95MRV',
          makeModel: 'Fiat Punto By Active Sunroof',
          customer: 'Miss Sabrina Pental',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99900',
          jobNumber: '99900',
          date: '21/05/2025',
          registration: 'MA21JJK',
          makeModel: 'Ford Transit 350 Limited P/V Ecodue',
          customer: 'Hendon Bagel Bakery',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99900',
          jobNumber: '99900',
          date: '31/05/2025',
          registration: 'VN13THK',
          makeModel: 'Hyundai I10 Active',
          customer: 'Miss Daniella Watson',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99895',
          jobNumber: '99895',
          date: '20/05/2025',
          registration: 'ST08XON',
          makeModel: 'Renault Clio Campus Campus 5v',
          customer: 'Miss Esther Liss',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99890',
          jobNumber: '99890',
          date: '19/05/2025',
          registration: 'WP60VZY',
          makeModel: 'Jaguar X-Type Se',
          customer: 'Mr Michal',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99889',
          jobNumber: '99889',
          date: '19/05/2025',
          registration: 'LP19CXZ',
          makeModel: 'Lexus Ux 300h F-Sport',
          customer: 'Mrs Barbara Hausen',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        },
        {
          id: '99883',
          jobNumber: '99883',
          date: '19/05/2025',
          registration: 'WP58LYD',
          makeModel: 'Hyundai Santa Fe Ultimate',
          customer: 'Mrs Ayelet Jay',
          labour: 0.00,
          total: 0.00,
          status: 'Open'
        }
      ]
      setJobSheets(mockJobSheets)
    } finally {
      setLoading(false)
    }
  }

  const filterJobSheets = () => {
    let filtered = jobSheets

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.makeModel.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter from dropdown
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Apply tab-based filter
    if (activeTab === 'in-progress') {
      filtered = filtered.filter(job => job.status.toLowerCase() === 'open' || job.status.toLowerCase() === 'in progress')
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(job => job.status.toLowerCase() === 'completed')
    } else if (activeTab === 'invoiced') {
      filtered = filtered.filter(job => job.status.toLowerCase() === 'invoiced')
    }
    // 'all' tab shows all filtered results

    setFilteredJobSheets(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'in progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'invoiced': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return <FileText className="h-4 w-4" />
      case 'in progress': return <Clock className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'invoiced': return <AlertCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const statusCounts = {
    all: jobSheets.length,
    open: jobSheets.filter(j => j.status.toLowerCase() === 'open').length,
    'in progress': jobSheets.filter(j => j.status.toLowerCase() === 'in progress').length,
    completed: jobSheets.filter(j => j.status.toLowerCase() === 'completed').length,
    invoiced: jobSheets.filter(j => j.status.toLowerCase() === 'invoiced').length
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading job sheets...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Job Sheets</h1>
            <p className="text-gray-600">Manage and track all job sheets and work orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/job-sheet">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Job Sheet
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold">{statusCounts.all}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open</p>
                  <p className="text-2xl font-bold text-blue-600">{statusCounts.open}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">{statusCounts['in progress']}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Invoiced</p>
                  <p className="text-2xl font-bold text-purple-600">{statusCounts.invoiced}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search job sheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
          </select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="in-progress">Jobs In Progress ({statusCounts.open + statusCounts['in progress']})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
          <TabsTrigger value="invoiced">Invoiced ({statusCounts.invoiced})</TabsTrigger>
          <TabsTrigger value="all">All Jobs ({statusCounts.all})</TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Jobs In Progress
              </CardTitle>
              <CardDescription>
                Active job sheets that are currently being worked on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Make & Model</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Labour</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobSheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          {searchTerm || statusFilter !== 'all' ? 'No jobs in progress found matching your criteria.' : 'No jobs in progress found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredJobSheets.map((job, index) => (
                        <TableRow key={`in-progress-${job.id}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{job.jobNumber}</TableCell>
                          <TableCell>{job.date}</TableCell>
                          <TableCell className="font-medium">{job.registration}</TableCell>
                          <TableCell>{job.makeModel}</TableCell>
                          <TableCell>{job.customer || 'No customer assigned'}</TableCell>
                          <TableCell>£{job.labour.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">£{job.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1">{job.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Link href={`/documents/${job.id}`}>
                                <Button size="sm" variant="outline" title="View Job Sheet">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/job-sheet?edit=${job.id}`}>
                                <Button size="sm" variant="outline" title="Edit Job Sheet">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Completed Jobs
              </CardTitle>
              <CardDescription>
                Job sheets that have been completed and are ready for invoicing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredJobSheets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No completed jobs to display
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead>Make & Model</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Labour</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobSheets.map((job, index) => (
                        <TableRow key={`completed-${job.id}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{job.jobNumber}</TableCell>
                          <TableCell>{job.date}</TableCell>
                          <TableCell className="font-medium">{job.registration}</TableCell>
                          <TableCell>{job.makeModel}</TableCell>
                          <TableCell>{job.customer || 'No customer assigned'}</TableCell>
                          <TableCell>£{job.labour.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">£{job.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1">{job.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Link href={`/documents/${job.id}`}>
                                <Button size="sm" variant="outline" title="View Job Sheet">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/job-sheet?edit=${job.id}`}>
                                <Button size="sm" variant="outline" title="Edit Job Sheet">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoiced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Invoiced Jobs
              </CardTitle>
              <CardDescription>
                Job sheets that have been converted to invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredJobSheets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No invoiced jobs to display
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead>Make & Model</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Labour</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobSheets.map((job, index) => (
                        <TableRow key={`invoiced-${job.id}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{job.jobNumber}</TableCell>
                          <TableCell>{job.date}</TableCell>
                          <TableCell className="font-medium">{job.registration}</TableCell>
                          <TableCell>{job.makeModel}</TableCell>
                          <TableCell>{job.customer || 'No customer assigned'}</TableCell>
                          <TableCell>£{job.labour.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">£{job.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1">{job.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Link href={`/documents/${job.id}`}>
                                <Button size="sm" variant="outline" title="View Job Sheet">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/job-sheet?edit=${job.id}`}>
                                <Button size="sm" variant="outline" title="Edit Job Sheet">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Job Sheets
              </CardTitle>
              <CardDescription>
                Complete list of all job sheets in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Make & Model</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Labour</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobSheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          {searchTerm || statusFilter !== 'all' ? 'No job sheets found matching your criteria.' : 'No job sheets found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredJobSheets.map((job, index) => (
                        <TableRow key={`all-${job.id}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{job.jobNumber}</TableCell>
                          <TableCell>{job.date}</TableCell>
                          <TableCell className="font-medium">{job.registration}</TableCell>
                          <TableCell>{job.makeModel}</TableCell>
                          <TableCell>{job.customer || 'No customer assigned'}</TableCell>
                          <TableCell>£{job.labour.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">£{job.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1">{job.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Link href={`/documents/${job.id}`}>
                                <Button size="sm" variant="outline" title="View Job Sheet">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/job-sheet?edit=${job.id}`}>
                                <Button size="sm" variant="outline" title="Edit Job Sheet">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
