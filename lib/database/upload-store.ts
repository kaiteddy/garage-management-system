interface UploadedData {
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
  jobSheets: any[] // Keep for legacy compatibility
}

// In-memory store for uploaded data
let uploadedData: UploadedData = {
  customers: [],
  vehicles: [],
  appointments: [],
  reminders: [],
  receipts: [],
  stock: [],
  documentExtras: [],
  documents: [],
  lineItems: [],
  reminderTemplates: [],
  jobSheets: [],
}

export function getUploadedData(): UploadedData {
  return uploadedData
}

export function setUploadedData(data: Partial<UploadedData>): void {
  uploadedData = { ...uploadedData, ...data }
  // Invalidate the main data connector cache whenever new data is uploaded
  invalidateDataCache()
}

export function clearUploadedData(): void {
  uploadedData = {
    customers: [],
    vehicles: [],
    appointments: [],
    reminders: [],
    receipts: [],
    stock: [],
    documentExtras: [],
    documents: [],
    lineItems: [],
    reminderTemplates: [],
    jobSheets: [],
  }
  invalidateDataCache()
}

// This function needs to be imported from the connector to avoid circular dependencies
// A better solution would be a dedicated event emitter or state management library.
import { invalidateDataCache } from "./connector"

export async function csvFileToJSON(file: File): Promise<any[]> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((line) => line.trim())

  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const data: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    if (values.length !== headers.length) {
      console.warn(
        `[csvFileToJSON] Skipping malformed row ${i + 1} in ${file.name}: expected ${headers.length} fields, found ${
          values.length
        }`,
      )
      continue
    }

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ""
    })

    data.push(row)
  }

  return data
}
