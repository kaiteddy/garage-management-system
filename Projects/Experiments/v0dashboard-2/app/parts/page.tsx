"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PartsTable } from "@/components/parts-table"

interface Part {
  id: string
  partNumber: string
  description: string
  category: string
  supplier: string
  costPrice: number
  sellPrice: number
  stockLevel: number
  minStock: number
  location: string
  lastOrdered: string
}

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    loadParts()
  }, [])

  const loadParts = async () => {
    // Simulate API call with sample data
    setTimeout(() => {
      const sampleParts: Part[] = [
        {
          id: "1",
          partNumber: "BP001",
          description: "Brake Pads - Front Set",
          category: "Brakes",
          supplier: "Euro Car Parts",
          costPrice: 45.0,
          sellPrice: 80.0,
          stockLevel: 12,
          minStock: 5,
          location: "A1-B2",
          lastOrdered: "2024-01-10",
        },
        {
          id: "2",
          partNumber: "OF002",
          description: "Oil Filter - Standard",
          category: "Filters",
          supplier: "GSF Car Parts",
          costPrice: 8.5,
          sellPrice: 15.0,
          stockLevel: 2,
          minStock: 10,
          location: "B2-C1",
          lastOrdered: "2024-01-05",
        },
        {
          id: "3",
          partNumber: "SP003",
          description: "Spark Plugs - Set of 4",
          category: "Engine",
          supplier: "Motor Factor",
          costPrice: 25.0,
          sellPrice: 45.0,
          stockLevel: 8,
          minStock: 6,
          location: "C1-D3",
          lastOrdered: "2024-01-15",
        },
        {
          id: "4",
          partNumber: "BD004",
          description: "Brake Discs - Front Pair",
          category: "Brakes",
          supplier: "Euro Car Parts",
          costPrice: 85.0,
          sellPrice: 150.0,
          stockLevel: 0,
          minStock: 2,
          location: "A2-B1",
          lastOrdered: "2023-12-20",
        },
      ]
      setParts(sampleParts)
      setLoading(false)
    }, 1000)
  }

  const getStockStatus = (stockLevel: number, minStock: number) => {
    if (stockLevel === 0) return "out-of-stock"
    if (stockLevel <= minStock) return "low-stock"
    return "in-stock"
  }

  const getStockColor = (status: string) => {
    switch (status) {
      case "out-of-stock":
        return "bg-red-100 text-red-800"
      case "low-stock":
        return "bg-orange-100 text-orange-800"
      case "in-stock":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.supplier.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch

    const status = getStockStatus(part.stockLevel, part.minStock)
    return matchesSearch && status === activeTab
  })

  const partStats = {
    total: parts.length,
    inStock: parts.filter((p) => getStockStatus(p.stockLevel, p.minStock) === "in-stock").length,
    lowStock: parts.filter((p) => getStockStatus(p.stockLevel, p.minStock) === "low-stock").length,
    outOfStock: parts.filter((p) => getStockStatus(p.stockLevel, p.minStock) === "out-of-stock").length,
    totalValue: parts.reduce((sum, p) => sum + p.stockLevel * p.costPrice, 0),
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
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Parts Inventory</CardTitle>
          <CardDescription>
            Browse and manage your stock items. The data is sourced from your uploaded Stock.csv file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartsTable
            parts={parts}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </CardContent>
      </Card>
    </div>
  )
}
