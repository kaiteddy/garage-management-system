export interface Vehicle {
  id: string
  registration: string
  make?: string
  model?: string
  year?: string
  customer?: {
    name: string
    phone?: string
    email?: string
  }
  motExpiry?: string
  motStatus?: "Valid" | "Due Soon" | "Expired" | "Unknown"
  lastService?: string
  nextService?: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  registrations: string[]
}

export interface Appointment {
  id: string
  date: string
  time: string
  registration: string
  customerName: string
  service: string
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled"
}

export interface Reminder {
  id: string
  registration: string
  type: "MOT" | "Service" | "Insurance"
  dueDate: string
  sent: boolean
  customerName: string
}

export interface DatabaseConnection {
  vehicles: Vehicle[]
  customers: Customer[]
  appointments: Appointment[]
  reminders: Reminder[]
}

// Base interfaces for raw CSV data
export interface RawCustomer {
  _ID: string
  AccountNumber: string
  nameTitle?: string
  nameForename?: string
  nameSurname?: string
  nameCompany?: string
  addressHouseNo?: string
  addressRoad?: string
  addressLocality?: string
  addressTown?: string
  addressCounty?: string
  addressPostCode?: string
  contactTelephone?: string
  contactMobile?: string
  contactEmail?: string
  status_LastInvoiceDate?: string
  Notes?: string
}

export interface RawVehicle {
  _ID: string
  _ID_Customer: string
  Registration: string
  Make?: string
  Model?: string
  Colour?: string
  FuelType?: string
  VIN?: string
  EngineCode?: string
  DateofReg?: string
  status_LastInvoiceDate?: string
  Notes_Reminders?: string
}

export interface RawAppointment {
  _ID: string
  _ID_Customer: string
  _ID_Vehicle: string
  _ID_Document: string
  ApptDateStart?: string
  ApptDateEnd?: string
  ApptTimeStart?: string
  ApptTimeEnd?: string
  ApptDescEntry?: string
  ApptResource?: string
}

export interface RawReminder {
  _ID: string
  _ID_Vehicle: string
  _ID_Template: string
  DueDate?: string
  method_Email?: string
  method_SMS?: string
  method_Print?: string
  actionedDate_Email?: string
  actionedDate_SMS?: string
  actionedDate_Print?: string
}

export interface RawReminderTemplate {
  _ID: string
  Type?: string
}

export interface RawStockItem {
  _ID: string
  itemPartNumber?: string
  itemDescription?: string
  itemCategory?: string
  itemCostNET?: string
  itemPriceRetailNET?: string
  qtyInStock?: string
  itemLocation?: string
  itemSupplier?: string
  itemManufacturer?: string
}

export interface RawReceipt {
  _ID: string
  _ID_Document: string
  Date?: string
  Amount?: string
  Method?: string
  Description?: string
}

export interface RawDocumentExtra {
  _ID: string // This is the _ID_Document
  "Labour Description"?: string
  docNotes?: string
}

export interface RawDocument {
  _ID: string
  _ID_Customer: string
  _ID_Vehicle: string
  docDate?: string
  docNumber?: string
  docType?: string // e.g., 'Invoice', 'Quote'
  docTotalNET?: string
  docTotalVAT?: string
  docTotalGROSS?: string
  docStatus?: string
}

export interface RawLineItem {
  _ID: string
  _ID_Document: string
  itemType?: string // 'PART' or 'LABOUR'
  itemDescription?: string
  itemQty?: string
  itemPriceNET?: string
  itemTotalNET?: string
}

// Processed and linked data structures
export interface Customer {
  _ID: string
  accountNumber: string
  title?: string
  forename?: string
  surname?: string
  companyName?: string
  address: {
    houseNo?: string
    road?: string
    locality?: string
    town?: string
    county?: string
    postCode?: string
  }
  contact: {
    telephone?: string
    mobile?: string
    email?: string
  }
  lastInvoiceDate?: string
  notes?: string
  vehicles: Vehicle[]
  appointments: Appointment[]
  documents: Document[]
}

export interface Vehicle {
  _ID: string
  _ID_Customer: string
  registration: string
  make?: string
  model?: string
  colour?: string
  fuelType?: string
  vin?: string
  engineCode?: string
  dateOfReg?: string
  lastInvoiceDate?: string
  motExpiry?: string
  reminderNotes?: string
  customer?: Customer
  appointments: Appointment[]
  reminders: Reminder[]
  documents: Document[]
}

export interface Appointment {
  _ID: string
  _ID_Customer: string
  _ID_Vehicle: string
  _ID_Document: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  description?: string
  resource?: string
  customer?: Customer
  vehicle?: Vehicle
  document?: Document
}

export interface Reminder {
  _ID: string
  _ID_Vehicle: string
  _ID_Template: string
  dueDate?: string
  type?: string
  methods: {
    email: boolean
    sms: boolean
    print: boolean
  }
  actioned: {
    email?: string
    sms?: string
    print?: string
  }
  vehicle?: Vehicle
}

export interface ReminderTemplate {
  _ID: string
  type?: string
}

export interface StockItem {
  _ID: string
  partNumber?: string
  description?: string
  category?: string
  costNet: number
  priceRetailNet: number
  quantityInStock: number
  location?: string
  supplier?: string
  manufacturer?: string
}

export interface Receipt {
  _ID: string
  _ID_Document: string
  date?: string
  amount: number
  method?: string
  description?: string
  document?: Document
}

export interface DocumentExtra {
  _ID: string
  labourDescription?: string
  notes?: string
}

export interface LineItem {
  _ID: string
  _ID_Document: string
  type?: string
  description?: string
  quantity: number
  priceNet: number
  totalNet: number
}

export interface Document {
  _ID: string
  _ID_Customer: string
  _ID_Vehicle: string
  date?: string
  number?: string
  type?: string
  totalNet: number
  totalVat: number
  totalGross: number
  status?: string
  customer?: Customer
  vehicle?: Vehicle
  lineItems: LineItem[]
  receipts: Receipt[]
  extras?: DocumentExtra
  appointment?: Appointment
}

// The main connected data object
export interface ConnectedData {
  customers: Map<string, Customer>
  vehicles: Map<string, Vehicle>
  appointments: Map<string, Appointment>
  reminders: Map<string, Reminder>
  templates: Map<string, ReminderTemplate>
  stock: Map<string, StockItem>
  receipts: Map<string, Receipt>
  documentExtras: Map<string, DocumentExtra>
  documents: Map<string, Document>
  lineItems: Map<string, LineItem[]> // Grouped by Document ID
  vehiclesByReg: Map<string, Vehicle>
}

// For API and component props
export interface Database {
  customers: Customer[]
  vehicles: Vehicle[]
  appointments: Appointment[]
  reminders: Reminder[]
  receipts: Receipt[]
  stock: StockItem[]
  documentExtras: DocumentExtra[]
  documents: Document[]
  lineItems: LineItem[]
  reminderTemplates: ReminderTemplate[]
}
