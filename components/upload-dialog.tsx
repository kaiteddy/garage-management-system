"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Plus, CheckCircle, AlertCircle, Download, Link, Loader2, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface UploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
}

export function UploadDialog({ isOpen, onClose, onUploadComplete }: UploadDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [manualRegistration, setManualRegistration] = useState("")
  const [textInput, setTextInput] = useState("")

  const handleDirectCSVImport = async (url: string, name: string) => {
    setUploading(true)
    setUploadResult(null)

    try {
      console.log(`📥 Importing ${name} from URL:`, url)

      // Fetch the CSV file directly
      const csvResponse = await fetch(url)

      if (!csvResponse.ok) {
        throw new Error(`Failed to fetch CSV: ${csvResponse.status} ${csvResponse.statusText}`)
      }

      const csvText = await csvResponse.text()
      console.log(`📄 Fetched ${name}: ${csvText.length} characters`)

      // Send to upload API as plain text
      const response = await fetch("/api/registrations/upload", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText,
      })

      const result = await response.json()
      console.log(`📊 ${name} import result:`, result)

      setUploadResult(result)

      if (result.success) {
        setTimeout(() => {
          onUploadComplete()
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error(`${name} import failed:`, error)
      setUploadResult({
        error: `${name} import failed. Please check the URL and try again.`,
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploading(true)
      setUploadResult(null)

      try {
        console.log(`📁 Processing file: ${file.name} (${file.size} bytes)`)

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/registrations/upload", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()
        console.log("📊 Upload result:", result)

        setUploadResult(result)

        if (result.success) {
          setTimeout(() => {
            onUploadComplete()
            onClose()
          }, 2000)
        }
      } catch (error) {
        console.error("Upload failed:", error)
        setUploadResult({
          error: "Upload failed. Please check your file format and try again.",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      } finally {
        setUploading(false)
      }
    },
    [onUploadComplete, onClose],
  )

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return

    setUploading(true)
    setUploadResult(null)

    try {
      const response = await fetch("/api/registrations/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      })

      const result = await response.json()
      setUploadResult(result)

      if (result.success) {
        setTextInput("")
        setTimeout(() => {
          onUploadComplete()
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error("Text processing failed:", error)
      setUploadResult({ error: "Processing failed. Please try again." })
    } finally {
      setUploading(false)
    }
  }

  const handleManualAdd = async () => {
    if (!manualRegistration.trim()) return

    setUploading(true)
    setUploadResult(null)

    try {
      const response = await fetch("/api/registrations/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrations: [manualRegistration.trim()] }),
      })

      const result = await response.json()
      setUploadResult(result)

      if (result.success) {
        setManualRegistration("")
        setTimeout(() => {
          onUploadComplete()
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error("Manual add failed:", error)
      setUploadResult({ error: "Failed to add registration. Please try again." })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Vehicle Data</DialogTitle>
          <DialogDescription>Add vehicle registrations to start tracking MOT statuses</DialogDescription>
        </DialogHeader>

        {uploadResult && (
          <Card className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {uploadResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium">{uploadResult.success ? "Successfully processed" : "Error"}</p>
                  {uploadResult.success && (
                    <div className="text-sm text-muted-foreground">
                      <p>Found: {uploadResult.found} registrations</p>
                      <p>Added: {uploadResult.added} new registrations</p>
                      <p>Customer records: {uploadResult.customerRecords || 0}</p>
                      {uploadResult.duplicates > 0 && <p>Duplicates: {uploadResult.duplicates}</p>}
                    </div>
                  )}
                  {uploadResult.error && <p className="text-sm text-red-600">{uploadResult.error}</p>}
                  {uploadResult.details?.sampleCustomers && uploadResult.details.sampleCustomers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Sample imported customers:</p>
                      {uploadResult.details.sampleCustomers.slice(0, 3).map((customer: any, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {customer.registration}: {customer.customerName}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="csv">Upload File</TabsTrigger>
            <TabsTrigger value="quick">Quick Import</TabsTrigger>
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Your CSV File
                </CardTitle>
                <CardDescription>
                  Simply choose your CSV file from your computer. The system will automatically detect registrations and
                  customer data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-12 text-center">
                  <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-xl font-medium mb-2">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground mb-6">or click to browse your computer</p>
                  <Input
                    type="file"
                    accept=".csv,.txt,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert("File too large. Please use files smaller than 10MB.")
                          return
                        }
                        handleFileUpload(file)
                      }
                    }}
                    disabled={uploading}
                    className="max-w-sm mx-auto text-center"
                  />
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">✅ Supported Files</h4>
                    <ul className="text-green-700 space-y-1">
                      <li>• CSV files (.csv)</li>
                      <li>• Text files (.txt)</li>
                      <li>• Excel files (.xls, .xlsx)</li>
                      <li>• Any file with registration data</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">🚀 What Happens Next</h4>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Extracts all UK registrations</li>
                      <li>• Imports customer data</li>
                      <li>• Ready for MOT checking</li>
                      <li>• Auto-populates vehicle data</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    July 2024 Database
                  </CardTitle>
                  <CardDescription>Import your latest July MOT database with enhanced customer data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">Includes:</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Work due dates</li>
                        <li>• Customer names & contacts</li>
                        <li>• Vehicle makes</li>
                        <li>• Service types</li>
                        <li>• Last invoiced dates</li>
                      </ul>
                    </div>
                    <Button
                      onClick={() =>
                        handleDirectCSVImport(
                          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/july_mot_database-DNHenbyc9L4yQVc2Tj3GDuxPBhlFV2.csv",
                          "July 2024 Database",
                        )
                      }
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          Import July Database
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-gray-600" />
                    Original Database
                  </CardTitle>
                  <CardDescription>Import your original final_mot_database.csv file</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-800 mb-1">Basic data:</p>
                      <ul className="text-xs text-gray-700 space-y-1">
                        <li>• Vehicle registrations</li>
                        <li>• Customer information</li>
                        <li>• Contact details</li>
                        <li>• Service history</li>
                      </ul>
                    </div>
                    <Button
                      onClick={() =>
                        handleDirectCSVImport(
                          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/final_mot_database-ixsUfyjVlpUkXJNjTyAAB2aB2FewuD.csv",
                          "Original Database",
                        )
                      }
                      disabled={uploading}
                      variant="outline"
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Link className="w-4 h-4 mr-2" />
                          Import Original
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Text Input
                </CardTitle>
                <CardDescription>
                  Paste text containing vehicle registrations. The system will extract valid UK registration plates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste text containing vehicle registrations here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={8}
                  disabled={uploading}
                />
                <Button onClick={handleTextSubmit} disabled={uploading || !textInput.trim()}>
                  {uploading ? "Processing..." : "Extract Registrations"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Manual Entry
                </CardTitle>
                <CardDescription>Add individual vehicle registrations manually.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter registration (e.g., AB12 CDE)"
                    value={manualRegistration}
                    onChange={(e) => setManualRegistration(e.target.value.toUpperCase())}
                    disabled={uploading}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleManualAdd()
                      }
                    }}
                  />
                  <Button onClick={handleManualAdd} disabled={uploading || !manualRegistration.trim()}>
                    {uploading ? "Adding..." : "Add"}
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Supported formats:</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">AB12 CDE</Badge>
                    <Badge variant="outline">A123 BCD</Badge>
                    <Badge variant="outline">ABC 123D</Badge>
                    <Badge variant="outline">1234 AB</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Download CSV Template
                </CardTitle>
                <CardDescription>
                  Download a sample CSV template to see the expected format for bulk uploads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Template includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Vehicle Registration (required)</li>
                    <li>• Customer Name</li>
                    <li>• Phone Number</li>
                    <li>• Email Address</li>
                    <li>• Vehicle Make/Model</li>
                    <li>• Last Service Date</li>
                    <li>• Notes</li>
                  </ul>
                </div>
                <Button
                  onClick={() => {
                    const templateData = [
                      {
                        Registration: "AB12 CDE",
                        "Customer Name": "John Smith",
                        Phone: "07123456789",
                        Email: "john@example.com",
                        "Make/Model": "Ford Focus",
                        "Last Invoiced": "01/01/2024",
                        Notes: "Regular customer",
                      },
                      {
                        Registration: "EF34 GHI",
                        "Customer Name": "Jane Doe",
                        Phone: "07987654321",
                        Email: "jane@example.com",
                        "Make/Model": "Toyota Corolla",
                        "Last Invoiced": "15/02/2024",
                        Notes: "Annual service due",
                      },
                    ]

                    const headers = Object.keys(templateData[0])
                    const csvContent = [
                      headers.join(","),
                      ...templateData.map((row) =>
                        headers
                          .map((header) => {
                            const value = row[header as keyof typeof row]
                            return `"${value}"`
                          })
                          .join(","),
                      ),
                    ].join("\n")

                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                    const link = document.createElement("a")
                    const url = URL.createObjectURL(blob)
                    link.setAttribute("href", url)
                    link.setAttribute("download", "vehicle-data-template.csv")
                    link.style.visibility = "hidden"
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template CSV
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
