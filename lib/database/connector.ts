import type {
  RawCustomer,
  RawVehicle,
  RawAppointment,
  RawReminder,
  RawReminderTemplate,
  RawStockItem,
  RawReceipt,
  RawDocumentExtra,
  RawDocument,
  RawLineItem,
  Customer,
  Vehicle,
  Appointment,
  Reminder,
  ReminderTemplate,
  StockItem,
  Receipt,
  DocumentExtra,
  Document,
  LineItem,
  ConnectedData,
} from "./types"
import { getUploadedData } from "./upload-store"

const BASE_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com"

const DATA_URLS = {
  customers: `${BASE_URL}/Customers-sxyd49A75iCzk4fbSBJH1M8uGuuepS.csv`,
  vehicles: `${BASE_URL}/Vehicles-1qlKZ8kKf04mGojmqayTZA74wG7vCq.csv`,
  appointments: `${BASE_URL}/Appointments-5CYW7yBunr4wYs4CAUQog3Z53Uivxi.csv`,
  reminders: `${BASE_URL}/Reminders-mEz5iX7XLZ6mXCR88oFfHvK3KnD7lk.csv`,
  reminderTemplates: `${BASE_URL}/Reminder_Templates-2HVGmh4YNU3qzYofKuRxJhDMZbF6ER.csv`,
  receipts: `${BASE_URL}/Receipts-iE2yvMk7bPecZ7ZAcv9exteYhagwBg.csv`,
  stock: `${BASE_URL}/Stock-x7ZeRTDBelmXbTl8nPwl8yCmXLl3Dm.csv`,
  documentExtras: `${BASE_URL}/Document_Extras-cAac3PolTrF1BIyPnEISZvaCVHia4s.csv`,
  documents: `${BASE_URL}/Documents.csv`, // Assuming a placeholder URL, will be overridden by upload
  lineItems: `${BASE_URL}/LineItems.csv`, // Assuming a placeholder URL, will be overridden by upload
}

async function fetchAndParseCSV(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
      // Don't throw for missing files, just return empty array
      if (response.status === 404) {
        console.warn(`[Connector] File not found at ${url}, returning empty array.`)
        return []
      }
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }
    const text = await response.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "")
    if (lines.length < 2) return []

    const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
      const obj: { [key: string]: string } = {}
      header.forEach((h, i) => {
        obj[h] = values[i] || ""
      })
      return obj
    })
    return data
  } catch (error) {
    console.error(`Error fetching or parsing CSV from ${url}:`, error)
    return []
  }
}

async function getTypedData<T>(type: keyof typeof DATA_URLS, uploadedData: any): Promise<T[]> {
  const memoryData = uploadedData[type]
  if (memoryData && memoryData.length > 0) {
    console.log(`[Connector] Using in-memory data for ${type} (${memoryData.length} records)`)
    return memoryData as T[]
  }
  console.log(`[Connector] Fetching remote data for ${type}`)
  return (await fetchAndParseCSV(DATA_URLS[type])) as T[]
}

// --- Singleton Data Store ---
let connectedData: ConnectedData | null = null
let lastFetchTimestamp = 0
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

export function invalidateDataCache() {
  console.log("[Connector] Invalidating data cache.")
  connectedData = null
  lastFetchTimestamp = 0
}

export async function getConnectedData(): Promise<ConnectedData> {
  // DISABLED: Database has been cleaned, return empty data to show clean state
  console.log("[Connector] Database is clean - returning empty connected data")

  const emptyConnectedData: ConnectedData = {
    customers: new Map(),
    vehicles: new Map(),
    appointments: new Map(),
    reminders: new Map(),
    templates: new Map(),
    receipts: new Map(),
    stock: new Map(),
    documentExtras: new Map(),
    documents: new Map(),
    lineItems: new Map(),
    vehiclesByReg: new Map(),
  }

  connectedData = emptyConnectedData
  lastFetchTimestamp = Date.now()

  return emptyConnectedData
}
