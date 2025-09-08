"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clipboard, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DataPaste() {
  const [pastedData, setPastedData] = useState("")
  const [dataType, setDataType] = useState("")
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; recordCount?: number } | null>(null)
  const { toast } = useToast()

  const handlePasteData = async () => {
    if (!pastedData.trim() || !dataType) {
      toast({
        title: "Missing Information",
        description: "Please paste your data and select the data type.",
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    setResult(null)

    try {
      const response = await fetch("/api/paste-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: pastedData,
          type: dataType,
        }),
      })

      const result = await response.json()
      setResult(result)

      if (result.success) {
        toast({
          title: "Data Processed Successfully",
          description: `${result.recordCount || 0} records processed and added to the system.`,
        })
        setPastedData("")
        setDataType("")

        // Suggest refresh
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        toast({
          title: "Processing Failed",
          description: result.message || "Failed to process the pasted data.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Paste processing error:", error)
      setResult({
        success: false,
        message: "Failed to process pasted data",
      })
      toast({
        title: "Processing Error",
        description: "An error occurred while processing your data.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const clearData = () => {
    setPastedData("")
    setDataType("")
    setResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clipboard className="h-5 w-5" />
          Paste Your Data Directly
        </CardTitle>
        <CardDescription>
          Copy data from Google Sheets, Excel, or any spreadsheet and paste it here for quick import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="data-type">Data Type</Label>
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger>
              <SelectValue placeholder="Select the type of data you're pasting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customers">Customer Data</SelectItem>
              <SelectItem value="vehicles">Vehicle Data</SelectItem>
              <SelectItem value="appointments">Appointment Data</SelectItem>
              <SelectItem value="reminders">Reminder Data</SelectItem>
              <SelectItem value="jobsheets">Job Sheet Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paste-area">Paste Your Data</Label>
          <Textarea
            id="paste-area"
            placeholder="Paste your CSV data here... (include headers in the first row)"
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePasteData} disabled={processing || !pastedData.trim() || !dataType}>
            {processing ? "Processing..." : "Process Pasted Data"}
          </Button>
          <Button variant="outline" onClick={clearData}>
            Clear
          </Button>
        </div>

        {result && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              result.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {result.success ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <div>
              <div className="font-medium">{result.success ? "Success!" : "Error"}</div>
              <div className="text-xs opacity-75">
                {result.message}
                {result.recordCount && ` (${result.recordCount} records processed)`}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">How to use:</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Open your Google Sheets or Excel file</li>
            <li>Select all data including headers (Ctrl+A or Cmd+A)</li>
            <li>Copy the data (Ctrl+C or Cmd+C)</li>
            <li>Select the appropriate data type above</li>
            <li>Paste the data in the text area and click "Process"</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
