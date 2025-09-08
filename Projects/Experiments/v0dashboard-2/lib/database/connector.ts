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
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

// Use local CSV files instead of external URLs
const DATA_PATHS = {
  customers: path.join(process.cwd(), 'data/customers.csv'),
  vehicles: path.join(process.cwd(), 'data/vehicles.csv'),
  appointments: path.join(process.cwd(), 'data/Appointments.csv'),
  reminders: path.join(process.cwd(), 'data/Reminders.csv'),
  reminderTemplates: path.join(process.cwd(), 'data/Reminder_Templates.csv'),
  receipts: path.join(process.cwd(), 'data/Receipts.csv'),
  stock: path.join(process.cwd(), 'data/Stock.csv'),
  documentExtras: path.join(process.cwd(), 'data/Document_Extras.csv'),
  documents: path.join(process.cwd(), 'data/Documents.csv'),
  lineItems: path.join(process.cwd(), 'data/LineItems.csv'),
}

async function readAndParseCSV(filePath: string): Promise<any[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`[Connector] File not found at ${filePath}, returning empty array.`)
      return []
    }

    // Read and parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true,
      skip_records_with_error: true
    })

    console.log(`[Connector] Successfully loaded ${records.length} records from ${path.basename(filePath)}`)
    return records
  } catch (error) {
    console.error(`Error reading or parsing CSV from ${filePath}:`, error)
    return []
  }
}

async function getTypedData<T>(type: keyof typeof DATA_PATHS, uploadedData: any): Promise<T[]> {
  const memoryData = uploadedData[type]
  if (memoryData && memoryData.length > 0) {
    console.log(`[Connector] Using in-memory data for ${type} (${memoryData.length} records)`)
    return memoryData as T[]
  }
  console.log(`[Connector] Reading local CSV data for ${type}`)
  return (await readAndParseCSV(DATA_PATHS[type])) as T[]
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
  // Check cache first
  const now = Date.now()
  if (connectedData && (now - lastFetchTimestamp) < CACHE_TTL) {
    console.log("[Connector] Using cached data")
    return connectedData
  }

  console.log("[Connector] Loading fresh data from CSV files...")

  try {
    const uploadedData = getUploadedData()

    // Load all data types
    const [
      rawCustomers,
      rawVehicles,
      rawAppointments,
      rawReminders,
      rawTemplates,
      rawReceipts,
      rawStock,
      rawDocumentExtras,
      rawDocuments,
      rawLineItems,
    ] = await Promise.all([
      getTypedData<RawCustomer>("customers", uploadedData),
      getTypedData<RawVehicle>("vehicles", uploadedData),
      getTypedData<RawAppointment>("appointments", uploadedData),
      getTypedData<RawReminder>("reminders", uploadedData),
      getTypedData<RawReminderTemplate>("reminderTemplates", uploadedData),
      getTypedData<RawReceipt>("receipts", uploadedData),
      getTypedData<RawStockItem>("stock", uploadedData),
      getTypedData<RawDocumentExtra>("documentExtras", uploadedData),
      getTypedData<RawDocument>("documents", uploadedData),
      getTypedData<RawLineItem>("lineItems", uploadedData),
    ])

    // Process and connect the data
    const customers = new Map<string, Customer>()
    const vehicles = new Map<string, Vehicle>()
    const vehiclesByReg = new Map<string, Vehicle>()

    // Process customers first
    rawCustomers.forEach((raw) => {
      const customer: Customer = {
        _ID: raw._ID || '',
        forename: raw.Forename || '',
        surname: raw.Surname || '',
        companyName: raw.CompanyName || '',
        contact: {
          telephone: raw.Telephone || '',
          mobile: raw.Mobile || '',
          email: raw.Email || '',
        },
        address: {
          line1: raw.Address1 || '',
          line2: raw.Address2 || '',
          city: raw.City || '',
          postcode: raw.Postcode || '',
          country: raw.Country || '',
        },
        vehicles: [],
      }
      customers.set(customer._ID, customer)
    })

    // Process vehicles and link to customers
    rawVehicles.forEach((raw) => {
      const vehicle: Vehicle = {
        _ID: raw._ID || '',
        registration: raw.Registration || '',
        make: raw.Make || '',
        model: raw.Model || '',
        year: raw.Year || '',
        dateOfReg: raw.DateofReg || '',
        colour: raw.Colour || '',
        fuelType: raw.FuelType || '',
        engineCode: raw.EngineCode || '',
        vin: raw.VIN || '',
        motExpiry: raw.MOTExpiry || null,
        customer: null,
      }

      // Link to customer if customer ID exists
      const customerId = raw._ID_Customer || raw.CustomerId
      if (customerId && customers.has(customerId)) {
        const customer = customers.get(customerId)!
        vehicle.customer = customer
        customer.vehicles.push(vehicle)
      }

      vehicles.set(vehicle._ID, vehicle)
      if (vehicle.registration) {
        vehiclesByReg.set(vehicle.registration.toUpperCase(), vehicle)
      }
    })

    connectedData = {
      customers,
      vehicles,
      appointments: new Map(),
      reminders: new Map(),
      templates: new Map(),
      receipts: new Map(),
      stock: new Map(),
      documentExtras: new Map(),
      documents: new Map(),
      lineItems: new Map(),
      vehiclesByReg,
    }

    lastFetchTimestamp = now
    console.log(`[Connector] ✅ Data loaded: ${customers.size} customers, ${vehicles.size} vehicles`)

    return connectedData
  } catch (error) {
    console.error("[Connector] Error loading data:", error)
    // Return empty data on error
    const emptyData: ConnectedData = {
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
    return emptyData
  }
}
