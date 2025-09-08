"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Quote, Search, Plus, Calendar, DollarSign, User, Car } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuoteItem {
  id: string
  quoteNumber: string
  customerName: string
  vehicleReg: string
  description: string
  status: "draft" | "sent" | "accepted" | "rejected" | "expired"
  totalAmount: number
  validUntil: string
  createdDate: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    // Simulate API call with sample data
    setTimeout(() => {
      const sampleQuotes: QuoteItem[] = [
        {
          id: "1",
          quoteNumber: "QUO-2024-001",
          customerName: "John Smith",
          vehicleReg: "AB12 CDE",
          description: "Annual service package",
          status: "sent",
          totalAmount: 285.0,
          validUntil: "2024-02-15",
          createdDate: "2024-01-15",
          items: [
            { description: "Oil change", quantity: 1, unitPrice: 45.0, total: 45.0 },
            { description: "Filter replacement", quantity: 2, unitPrice: 25.0, total: 50.0 },
            { description: "Labour", quantity: 3, unitPrice: 60.0, total: 180.0 },
          ],
        },
        {
          id: "2",
          quoteNumber: "QUO-2024-002",
          customerName: "Sarah Johnson",
          vehicleReg: "FG34 HIJ",
          description: "Brake system overhaul",
          status: "accepted",
          totalAmount: 420.0,
          validUntil: "2024-02-20",
          createdDate: "2024-01-12",
          items: [
            { description: "Brake pads (front)", quantity: 1, unitPrice: 80.0, total: 80.0 },
            { description: "Brake discs (front)", quantity: 2, unitPrice: 120.0, total: 240.0 },
            { description: "Labour", quantity: 2, unitPrice: 50.0, total: 100.0 },
          ],
        },
        {
          id: "3",
          quoteNumber: "QUO-2024-003",
          customerName: "Mike Wilson",
          vehicleReg: "KL56 MNO",
          description: "Engine diagnostic and repair",
          status: "draft",
          totalAmount: 650.0,
          validUntil: "2024-02-25",
          createdDate: "2024-01-18",
          items: [
            { description: "Diagnostic fee", quantity: 1, unitPrice: 85.0, total: 85.0 },
            { description: "Spark plugs", quantity: 4, unitPrice: 15.0, total: 60.0 },
            { description: "Labour", quantity: 8, unitPrice: 60.0, total: 480.0 },
          ],
        },
      ]
      setQuotes(sampleQuotes)
      setLoading(false)
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "expired":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.vehicleReg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.description.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch
    return matchesSearch && quote.status === activeTab
  })

  const quoteStats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "draft").length,
    sent: quotes.filter((q) => q.status === "sent").length,
    accepted: quotes.filter((q) => q.status === "accepted").length,
    rejected: quotes.filter((q) => q.status === "rejected").length,
    totalValue: quotes.reduce((sum, q) => sum + q.totalAmount, 0),
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground">Create and manage customer quotes</p>
        </div>
        <Button className="transition-all duration-200 hover:scale-105">
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Quote Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
              <p className="text-2xl font-bold">{quoteStats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Draft</p>
              <p className="text-2xl font-bold text-gray-600">{quoteStats.draft}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold text-blue-600">{quoteStats.sent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{quoteStats.accepted}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{quoteStats.rejected}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold text-green-600">£{quoteStats.totalValue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Quote className="h-5 w-5" />
            Customer Quotes
          </CardTitle>
          <CardDescription>Manage all customer quotes and proposals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Quotes ({quoteStats.total})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({quoteStats.draft})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({quoteStats.sent})</TabsTrigger>
                <TabsTrigger value="accepted">Accepted ({quoteStats.accepted})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({quoteStats.rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No quotes found matching your search." : "No quotes found."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredQuotes.map((quote) => (
                          <TableRow key={quote.id} className="transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {quote.customerName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {quote.vehicleReg}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{quote.description}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", getStatusColor(quote.status))}>
                                {quote.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />£{quote.totalAmount.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(quote.validUntil).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
