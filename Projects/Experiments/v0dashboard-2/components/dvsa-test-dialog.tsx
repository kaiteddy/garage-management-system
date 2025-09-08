"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface DVSATestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TestResult {
  test: string
  status: "pending" | "success" | "error"
  message: string
  duration?: number
}

export function DVSATestDialog({ open, onOpenChange }: DVSATestDialogProps) {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  const runTests = async () => {
    setTesting(true)
    setResults([])

    const tests = [
      { name: "DVSA API Connection", endpoint: "/api/dvsa-test" },
      { name: "Authentication", endpoint: "/api/dvsa-test?test=auth" },
      { name: "Sample MOT Check", endpoint: "/api/dvsa-test?test=mot" },
    ]

    for (const test of tests) {
      const startTime = Date.now()

      setResults((prev) => [
        ...prev,
        {
          test: test.name,
          status: "pending",
          message: "Testing...",
        },
      ])

      try {
        const response = await fetch(test.endpoint)
        const data = await response.json()
        const duration = Date.now() - startTime

        setResults((prev) =>
          prev.map((r) =>
            r.test === test.name
              ? {
                  test: test.name,
                  status: data.success ? "success" : "error",
                  message: data.message || data.error || "Test completed",
                  duration,
                }
              : r,
          ),
        )
      } catch (error) {
        const duration = Date.now() - startTime

        setResults((prev) =>
          prev.map((r) =>
            r.test === test.name
              ? {
                  test: test.name,
                  status: "error",
                  message: error instanceof Error ? error.message : "Test failed",
                  duration,
                }
              : r,
          ),
        )
      }

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    setTesting(false)
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Testing</Badge>
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            Passed
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Failed</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            DVSA Connection Test
          </DialogTitle>
          <DialogDescription>Test the connection to the DVSA MOT API and verify authentication.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {results.length === 0 && !testing && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Click the button below to test the DVSA API connection.</p>
              <Button onClick={runTests}>Start Tests</Button>
            </div>
          )}

          {results.map((result, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(result.status)}
                <div>
                  <div className="font-medium">{result.test}</div>
                  <div className="text-sm text-muted-foreground">{result.message}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.duration && <span className="text-xs text-muted-foreground">{result.duration}ms</span>}
                {getStatusBadge(result.status)}
              </div>
            </div>
          ))}

          {testing && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Running tests...</p>
            </div>
          )}

          {results.length > 0 && !testing && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={runTests}>
                Run Tests Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
