export interface JobSheetEntry {
  docNo: string
  date: string
  registration: string
  total: number
  status: string
  type: "JOB_SHEET" | "INVOICE"
}

export interface CustomerData {
  name: string
  registrations: string[]
  phone?: string
  email?: string
  address?: string
  totalJobs: number
  totalValue: number
  lastJobDate: string
  averageJobValue: number
}

export interface MOTReminder {
  registration: string
  lastJobDate: string
  daysSinceLastJob: number
  estimatedMOTDue: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  lastJobValue: number
  reason: string
}

export interface VehicleData {
  registration: string
  jobCount: number
  totalValue: number
  firstJobDate: string
  lastJobDate: string
  averageJobValue: number
}

export interface DocumentData {
  docNo: string
  date: string
  registration: string
  total: number
  status: string
  type: string
}

export function parseJobSheetData(rawData: string): {
  customers: CustomerData[]
  motReminders: MOTReminder[]
  vehicles: VehicleData[]
  documents: DocumentData[]
} {
  const lines = rawData.split("\n").filter((line) => line.trim())
  const entries: JobSheetEntry[] = []

  // Parse each line - handle the actual format from your data
  for (const line of lines) {
    if (line.includes("DOC NO") || line.includes("REGISTRATION") || line.includes("TOTAL")) {
      continue // Skip header lines
    }

    // Match patterns like: JS 81376 20/03/2020 LF67 ZLO 0.00 COMPLETED
    const docMatch = line.match(
      /(JS|SI|XS)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9\s]+?)\s+([\d,]+\.?\d*)\s*(COMPLETED|~)?/,
    )

    if (docMatch) {
      const [, type, docNo, date, registration, total, status] = docMatch
      entries.push({
        docNo: `${type} ${docNo}`,
        date,
        registration: registration.trim().replace(/\s+/g, " "),
        total: Number.parseFloat(total.replace(/,/g, "")),
        status: status === "~" ? "PENDING" : status || "COMPLETED",
        type: type === "JS" ? "JOB_SHEET" : "INVOICE",
      })
    }
  }

  // Group by registration for vehicles
  const vehicleMap = new Map<string, VehicleData>()
  const documents: DocumentData[] = []

  for (const entry of entries) {
    const reg = entry.registration

    // Vehicle data
    if (!vehicleMap.has(reg)) {
      vehicleMap.set(reg, {
        registration: reg,
        jobCount: 0,
        totalValue: 0,
        firstJobDate: entry.date,
        lastJobDate: entry.date,
        averageJobValue: 0,
      })
    }

    const vehicle = vehicleMap.get(reg)!
    vehicle.jobCount++
    vehicle.totalValue += entry.total

    // Update date ranges
    const entryDate = new Date(entry.date.split("/").reverse().join("-"))
    const firstDate = new Date(vehicle.firstJobDate.split("/").reverse().join("-"))
    const lastDate = new Date(vehicle.lastJobDate.split("/").reverse().join("-"))

    if (entryDate < firstDate) vehicle.firstJobDate = entry.date
    if (entryDate > lastDate) vehicle.lastJobDate = entry.date

    vehicle.averageJobValue = vehicle.totalValue / vehicle.jobCount

    // Documents
    documents.push({
      docNo: entry.docNo,
      date: entry.date,
      registration: reg,
      total: entry.total,
      status: entry.status,
      type: entry.type,
    })
  }

  // Generate customer data by grouping similar registrations
  const customerMap = new Map<string, CustomerData>()

  for (const [reg, vehicle] of vehicleMap) {
    // Group by first 2-3 characters of registration for potential customers
    const prefix = reg.substring(0, 3)
    const customerKey = `Customer ${prefix}`

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        name: customerKey,
        registrations: [],
        totalJobs: 0,
        totalValue: 0,
        lastJobDate: vehicle.lastJobDate,
        averageJobValue: 0,
      })
    }

    const customer = customerMap.get(customerKey)!
    customer.registrations.push(reg)
    customer.totalJobs += vehicle.jobCount
    customer.totalValue += vehicle.totalValue

    // Update last job date to most recent
    const vehicleLastDate = new Date(vehicle.lastJobDate.split("/").reverse().join("-"))
    const customerLastDate = new Date(customer.lastJobDate.split("/").reverse().join("-"))

    if (vehicleLastDate > customerLastDate) {
      customer.lastJobDate = vehicle.lastJobDate
    }

    customer.averageJobValue = customer.totalValue / customer.totalJobs
  }

  // Filter customers to only show those with multiple vehicles or significant value
  const customers = Array.from(customerMap.values())
    .filter((customer) => customer.registrations.length > 1 || customer.totalValue > 100)
    .sort((a, b) => b.totalValue - a.totalValue)

  // Generate MOT reminders
  const motReminders: MOTReminder[] = []
  const today = new Date()

  for (const [reg, vehicle] of vehicleMap) {
    const lastJobDate = new Date(vehicle.lastJobDate.split("/").reverse().join("-"))
    const daysSince = Math.floor((today.getTime() - lastJobDate.getTime()) / (1000 * 60 * 60 * 24))

    // Estimate MOT due date (assuming annual MOT)
    const estimatedMOTDue = new Date(lastJobDate)
    estimatedMOTDue.setFullYear(estimatedMOTDue.getFullYear() + 1)

    let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW"
    let reason = "Recent service history"

    if (daysSince > 330) {
      priority = "HIGH"
      reason = "Over 11 months since last service - MOT likely due soon"
    } else if (daysSince > 270) {
      priority = "MEDIUM"
      reason = "Over 9 months since last service - MOT may be due"
    } else if (daysSince > 180) {
      priority = "LOW"
      reason = "Over 6 months since last service"
    }

    motReminders.push({
      registration: reg,
      lastJobDate: vehicle.lastJobDate,
      daysSinceLastJob: daysSince,
      estimatedMOTDue: estimatedMOTDue.toLocaleDateString("en-GB"),
      priority,
      lastJobValue: vehicle.averageJobValue,
      reason,
    })
  }

  return {
    customers,
    motReminders: motReminders.sort((a, b) => b.daysSinceLastJob - a.daysSinceLastJob),
    vehicles: Array.from(vehicleMap.values()).sort((a, b) => b.totalValue - a.totalValue),
    documents: documents.sort(
      (a, b) =>
        new Date(b.date.split("/").reverse().join("-")).getTime() -
        new Date(a.date.split("/").reverse().join("-")).getTime(),
    ),
  }
}
