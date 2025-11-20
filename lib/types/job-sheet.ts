export interface Vehicle {
  registration: string
  make: string
  model: string
  year: number
  colour: string
  engineSize?: string
  fuelType?: string
  motExpiryDate?: string
  taxExpiryDate?: string
  vin?: string
}

export interface Customer {
  id?: string
  title?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: {
    line1: string
    line2?: string
    city: string
    postcode: string
    country?: string
  }
}

export interface JobItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  type: "labour" | "parts" | "other"
}

export interface JobSheet {
  id?: string
  jobNumber: string
  date: string
  vehicle: Vehicle
  customer: Customer
  items: JobItem[]
  notes?: string
  status: "draft" | "in-progress" | "completed" | "invoiced"
  totalAmount: number
  createdAt?: string
  updatedAt?: string
}

export interface DVLAVehicleData {
  registrationNumber: string
  make: string
  model: string
  colour: string
  yearOfManufacture: number
  engineCapacity?: number
  fuelType: string
  motExpiryDate?: string
  taxStatus?: string
  taxDueDate?: string
  co2Emissions?: number
  euroStatus?: string
  realDrivingEmissions?: string
  wheelplan?: string
  typeApproval?: string
}

// Advanced Job Sheet Types
export interface VehicleData {
  registration: string
  make: string
  model: string
  derivative: string
  chassis: string
  engineCC: number
  engineCode: string
  colour: string
  keyCode: string
  mileage: number
  fuelType: string
  engineNumber: string
  paintCode: string
  radioCode: string
  dateRegistered: string
}

export interface CustomerData {
  accountNumber: string
  company: string
  name: string
  houseNumber: string
  road: string
  locality: string
  town: string
  county: string
  postCode: string
  telephone: string
  mobile: string
  email: string
}

export interface AdditionalInfo {
  received: string
  due: string
  status: string
  orderRef: string
  department: string
  terms: string
  salesAdvisor: string
  technician: string
  roadTester: string
}

export interface Extras {
  mot: string
  motClass: string
  motStatus: string
  motTester: string
  sundries: string
  lubricants: string
  paintMaterials: string
}

export interface Totals {
  subTotal: number
  vat: number
  mot: number
  total: number
  excess: number
  receipts: number
  balance: number
}

export interface HistoryEntry {
  date: string
  docNumber: string
  mileage: number
  description: string
  total: number
  type: string
}

export interface Reminders {
  vehicleLastInvoiced: string
  customerLastInvoiced: string
  referral: string
  accountBalance: number
}

export interface JobSheetData {
  jobNumber: string
  vehicle: VehicleData
  customer: CustomerData
  additionalInfo: AdditionalInfo
  extras: Extras
  totals: Totals
  history: HistoryEntry[]
  reminders: Reminders
}
