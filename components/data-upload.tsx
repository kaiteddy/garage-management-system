"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Users,
  Car,
  Calendar,
  BellRing,
  Receipt,
  Package,
  FilePlus,
  Loader2,
  FileText,
  List,
  MailCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface UploadResult {
  success: boolean
  dataType: string
  recordCount?: number
  message: string
}

interface FileUploadItem {
  id: keyof UploadedDataTypes
  title: string
  description: string
  icon: React.ElementType
}

interface UploadedDataTypes {
  customers: any[]
  vehicles: any[]
  appointments: any[]
  reminders: any[]
  receipts: any[]
  stock: any[]
  documentExtras: any[]
  documents: any[]
  lineItems: any[]
  reminderTemplates: any[]
}

const fileUploads: FileUploadItem[] = [
  { id: "customers", title: "Customers", description: "Customer details and contacts", icon: Users },
  { id: "vehicles", title: "Vehicles", description: "Vehicle information and specs", icon: Car },
  { id: "appointments", title: "Appointments", description: "Scheduled jobs and bookings", icon: Calendar },
  { id: "documents", title: "Documents", description: "Invoices, quotes, job sheets", icon: FileText },
  { id: "lineItems", title: "Line Items", description: "Parts and labor for documents", icon: List },
  { id: "receipts", title: "Receipts", description: "Financial records and payments", icon: Receipt },
  { id: "stock", title: "Stock / Inventory", description: "Parts and stock levels", icon: Package },
  { id: "reminders", title: "Reminders", description: "MOT and service reminders", icon: BellRing },
  {
    id: "reminderTemplates",
    title: "Reminder Templates",
    description: "Templates for reminders",
    icon: MailCheck,
  },
  {
    id: "documentExtras",
    title: "Document Extras",
    description: "Additional job notes and details",
    icon: FilePlus,
  },
]

export function DataUpload() {
  const [uploading, setUploading] = useState<Partial<Record<keyof UploadedDataTypes, boolean>>>({})
  const [uploadResults, setUploadResults] = useState<Partial<Record<keyof UploadedDataTypes, UploadResult>>>({})
  const { toast } = useToast()

  const handleFileUpload = async (file: File, dataType: keyof UploadedDataTypes) => {
    if (!file) return

    setUploading((prev) => ({ ...prev, [dataType]: true }))

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", dataType)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadResults((prev) => ({
          ...prev,
          [dataType]: {
            success: true,
            dataType: dataType,
            recordCount: result.count,
            message: `${result.count} records loaded.`,
          },
        }))
        toast({
          title: "Upload Successful",
          description: `${file.name} (${dataType}) processed successfully. System data updated.`,
        })
      } else {
        throw new Error(result.error || "Unknown upload error")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload file"
      setUploadResults((prev) => ({
        ...prev,
        [dataType]: { success: false, dataType: dataType, message },
      }))
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setUploading((prev) => ({ ...prev, [dataType]: false }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Your Data Files
        </CardTitle>
        <CardDescription>
          Upload a CSV file for each data type. The system will automatically process and integrate it, overriding any
          previous data for that type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fileUploads.map((item) => (
            <div
              key={item.id}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-6 text-center transition-all",
                uploading[item.id] ? "border-blue-400" : "border-gray-300 hover:border-gray-400",
                uploadResults[item.id]?.success && "border-green-500 bg-green-50",
                uploadResults[item.id]?.success === false && "border-red-500 bg-red-50",
              )}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <item.icon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{item.description}</p>

                {uploading[item.id] ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <label htmlFor={`file-upload-${item.id}`} className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                      <Input
                        id={`file-upload-${item.id}`}
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(e.target.files[0], item.id)
                          }
                        }}
                        disabled={!!uploading[item.id]}
                      />
                    </label>
                  </Button>
                )}

                {uploadResults[item.id] && (
                  <div
                    className={cn(
                      "flex items-center gap-2 mt-4 text-sm",
                      uploadResults[item.id]?.success ? "text-green-700" : "text-red-700",
                    )}
                  >
                    {uploadResults[item.id]?.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>{uploadResults[item.id]?.message}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
