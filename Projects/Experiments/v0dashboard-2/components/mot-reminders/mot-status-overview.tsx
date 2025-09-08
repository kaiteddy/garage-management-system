"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"

export interface StatusCounts {
  valid?: number
  "due-soon"?: number
  expired?: number
  unknown?: number
  checking?: number
  error?: number
}

interface MOTStatusOverviewProps {
  statusCounts: StatusCounts
  isLoading: boolean
  onRefresh: () => void
}

export function MOTStatusOverview({ statusCounts, isLoading, onRefresh }: MOTStatusOverviewProps) {
  const total = Object.values(statusCounts).reduce((sum, count) => sum + (count || 0), 0)

  const statusItems = [
    {
      key: "valid",
      label: "Valid",
      count: statusCounts.valid || 0,
      variant: "default" as const,
      className: "bg-green-100 text-green-800 hover:bg-green-200",
    },
    {
      key: "due-soon",
      label: "Due Soon",
      count: statusCounts["due-soon"] || 0,
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    },
    {
      key: "expired",
      label: "Expired",
      count: statusCounts.expired || 0,
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 hover:bg-red-200",
    },
    {
      key: "unknown",
      label: "Unknown",
      count: statusCounts.unknown || 0,
      variant: "outline" as const,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    },
    {
      key: "checking",
      label: "Checking",
      count: statusCounts.checking || 0,
      variant: "secondary" as const,
      className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    },
    {
      key: "error",
      label: "Error",
      count: statusCounts.error || 0,
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 hover:bg-red-200",
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">MOT Status Overview</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statusItems.map((item) => (
            <div key={item.key} className="text-center">
              <Badge
                variant={item.variant}
                className={`w-full justify-center py-2 text-lg font-bold ${item.className}`}
              >
                {item.count}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
              {total > 0 && <p className="text-xs text-muted-foreground">{((item.count / total) * 100).toFixed(1)}%</p>}
            </div>
          ))}
        </div>
        {total > 0 && <div className="mt-4 text-center text-sm text-muted-foreground">Total: {total} vehicles</div>}
      </CardContent>
    </Card>
  )
}
