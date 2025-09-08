import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for uploaded registrations - START EMPTY
const uploadedRegistrations = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type")
    console.log(`📥 Processing upload with content-type: ${contentType}`)

    let registrations: string[] = []
    let customerData: any[] = []
    let file: File | null = null

    if (contentType?.includes("multipart/form-data")) {
      // Handle file upload - PROPERLY FIXED
      try {
        const formData = await request.formData()
        file = formData.get("file") as File

        if (!file) {
          return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        console.log(`📁 Processing file: ${file.name} (${file.size} bytes, type: ${file.type})`)

        // Read file content as text - THIS IS THE KEY FIX
        const text = await file.text()

        console.log(`📄 File content length: ${text.length} characters`)
        console.log(`📄 First 500 characters:`, text.substring(0, 500))

        // Parse CSV data
        const result = parseCSVData(text)
        registrations = result.registrations
        customerData = result.customerData
      } catch (formError) {
        console.error("❌ FormData parsing failed:", formError)
        return NextResponse.json({ error: "Failed to parse uploaded file" }, { status: 400 })
      }
    } else if (contentType?.includes("application/json")) {
      // Handle JSON data
      const body = await request.json()
      if (body.registrations && Array.isArray(body.registrations)) {
        registrations = body.registrations
      } else if (body.text) {
        const result = parseCSVData(body.text)
        registrations = result.registrations
        customerData = result.customerData
      }
    } else {
      // Handle raw text - for direct import
      const text = await request.text()
      console.log(`📄 Raw text length: ${text.length} characters`)
      console.log(`📄 First 500 characters:`, text.substring(0, 500))

      const result = parseCSVData(text)
      registrations = result.registrations
      customerData = result.customerData
    }

    // Validate and clean registrations
    const validRegistrations = registrations
      .map((reg) => reg.trim().toUpperCase())
      .filter((reg) => isValidUKRegistration(reg))

    console.log(`✅ Found ${validRegistrations.length} valid registrations from ${registrations.length} candidates`)
    console.log(
      `📋 Valid registrations: ${validRegistrations.slice(0, 10).join(", ")}${validRegistrations.length > 10 ? "..." : ""}`,
    )

    // Add to storage
    let added = 0
    let duplicates = 0

    validRegistrations.forEach((reg) => {
      if (uploadedRegistrations.has(reg)) {
        duplicates++
      } else {
        uploadedRegistrations.add(reg)
        added++
      }
    })

    // Also save customer data if we have it
    if (customerData.length > 0) {
      console.log(`💾 Also importing ${customerData.length} customer records...`)

      // Send customer data to customer API - use internal call
      try {
        const { POST: customerPost } = await import("../../customers/route")

        for (const customer of customerData) {
          const customerRequest = new Request("http://localhost:3000/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add",
              ...customer,
            }),
          })

          await customerPost(customerRequest)
        }
        console.log(`✅ Successfully imported ${customerData.length} customer records`)
      } catch (error) {
        console.error("❌ Failed to import customer data:", error)
      }
    }

    const response = {
      success: true,
      message: `Successfully processed ${validRegistrations.length} registrations${customerData.length > 0 ? ` and ${customerData.length} customer records` : ""}`,
      found: validRegistrations.length,
      added,
      duplicates,
      total: uploadedRegistrations.size,
      customerRecords: customerData.length,
      details: {
        fileName: file?.name || "text input",
        validRegistrations: validRegistrations.slice(0, 20),
        hasMore: validRegistrations.length > 20,
        extractedCount: registrations.length,
        sampleCustomers: customerData.slice(0, 5),
      },
    }

    console.log("📊 Upload response:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("💥 Upload error:", error)
    return NextResponse.json(
      {
        error: "Failed to process upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    registrations: Array.from(uploadedRegistrations),
    total: uploadedRegistrations.size,
  })
}

export async function DELETE() {
  uploadedRegistrations.clear()
  return NextResponse.json({ success: true, message: "All registrations cleared" })
}

function parseCSVData(csvText: string): { registrations: string[]; customerData: any[] } {
  console.log(`📊 Parsing CSV data (${csvText.length} characters)`)

  // Clean up the CSV text - remove any BOM or extra whitespace
  const cleanText = csvText.replace(/^\uFEFF/, "").trim()
  console.log(`📊 Cleaned CSV data (${cleanText.length} characters)`)

  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) {
    console.log("❌ CSV has no data rows")
    return { registrations: [], customerData: [] }
  }

  console.log(`📊 Found ${lines.length} lines in CSV`)
  console.log(`📊 Header line: ${lines[0]}`)

  // Parse header - handle different CSV formats
  const header = lines[0]
  let columns: string[]

  // Try different parsing methods
  if (header.includes('","') || header.startsWith('"')) {
    // Quoted CSV
    columns = parseCSVRow(header)
  } else if (header.includes(",")) {
    // Simple comma-separated
    columns = header.split(",").map((col) => col.trim())
  } else if (header.includes("\t")) {
    // Tab-separated
    columns = header.split("\t").map((col) => col.trim())
  } else {
    console.log("❌ Could not parse CSV header format")
    return { registrations: [], customerData: [] }
  }

  // Clean column names
  columns = columns.map((col) => col.replace(/^["']|["']$/g, "").trim())

  console.log("📋 CSV columns:", columns)

  // Enhanced column mapping for the July database format
  const regIndex = findColumnIndex(columns, ["registration", "reg", "vehicle reg", "reg no"])
  const customerIndex = findColumnIndex(columns, ["customer name", "customer", "name", "client name"])
  const makeIndex = findColumnIndex(columns, ["make", "vehicle make", "make/model", "vehicle"])
  const phoneIndex = findColumnIndex(columns, ["telephone", "phone", "tel", "landline"])
  const mobileIndex = findColumnIndex(columns, ["mobile", "cell", "mobile phone"])
  const emailIndex = findColumnIndex(columns, ["email", "e-mail", "email address"])
  const workDueIndex = findColumnIndex(columns, ["work due", "due date", "service due"])
  const lastInvoicedIndex = findColumnIndex(columns, ["last invoiced", "last invoice", "invoiced"])
  const typeIndex = findColumnIndex(columns, ["type", "service type", "work type"])

  console.log("🔍 Enhanced column mapping:")
  console.log(`  Registration: ${regIndex} (${columns[regIndex] || "NOT FOUND"})`)
  console.log(`  Customer Name: ${customerIndex} (${columns[customerIndex] || "NOT FOUND"})`)
  console.log(`  Make: ${makeIndex} (${columns[makeIndex] || "NOT FOUND"})`)
  console.log(`  Telephone: ${phoneIndex} (${columns[phoneIndex] || "NOT FOUND"})`)
  console.log(`  Mobile: ${mobileIndex} (${columns[mobileIndex] || "NOT FOUND"})`)
  console.log(`  Email: ${emailIndex} (${columns[emailIndex] || "NOT FOUND"})`)
  console.log(`  Work Due: ${workDueIndex} (${columns[workDueIndex] || "NOT FOUND"})`)
  console.log(`  Last Invoiced: ${lastInvoicedIndex} (${columns[lastInvoicedIndex] || "NOT FOUND"})`)
  console.log(`  Type: ${typeIndex} (${columns[typeIndex] || "NOT FOUND"})`)

  if (regIndex === -1) {
    console.log("❌ No registration column found")
    console.log("Available columns:", columns)
    return { registrations: [], customerData: [] }
  }

  const registrations: string[] = []
  const customerData: any[] = []

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim()
    if (!row) continue

    // Parse CSV row using the same method as header
    let cells: string[]
    if (row.includes('","') || row.startsWith('"')) {
      cells = parseCSVRow(row)
    } else if (row.includes(",")) {
      cells = row.split(",").map((cell) => cell.trim())
    } else if (row.includes("\t")) {
      cells = row.split("\t").map((cell) => cell.trim())
    } else {
      continue
    }

    // Clean cell values
    cells = cells.map((cell) => cell.replace(/^["']|["']$/g, "").trim())

    if (cells.length <= regIndex) {
      console.log(`⚠️ Row ${i} has insufficient columns: ${cells.length}, need at least ${regIndex + 1}`)
      continue
    }

    const registration = cells[regIndex]?.trim().toUpperCase()
    if (!registration || registration === "REGISTRATION" || registration === "REG") continue

    console.log(`🚗 Found registration in row ${i}: "${registration}"`)
    registrations.push(registration)

    // Build enhanced customer record for July database format
    const customerRecord: any = {
      registration: registration,
      customerName: customerIndex >= 0 && cells[customerIndex] ? cells[customerIndex].trim() : "",
      phone: phoneIndex >= 0 && cells[phoneIndex] ? cleanPhoneNumber(cells[phoneIndex]) : "",
      mobile: mobileIndex >= 0 && cells[mobileIndex] ? cleanPhoneNumber(cells[mobileIndex]) : "",
      email: emailIndex >= 0 && cells[emailIndex] ? cleanEmailAddress(cells[emailIndex]) : "",
      notes: makeIndex >= 0 && cells[makeIndex] ? cells[makeIndex].trim() : "",
      workDue: workDueIndex >= 0 && cells[workDueIndex] ? cells[workDueIndex].trim() : "",
      lastInvoiced: lastInvoicedIndex >= 0 && cells[lastInvoicedIndex] ? cells[lastInvoicedIndex].trim() : "",
      serviceType: typeIndex >= 0 && cells[typeIndex] ? cells[typeIndex].trim() : "MOT & Service",
    }

    // Only add customer record if we have a name
    if (
      customerRecord.customerName &&
      customerRecord.customerName !== "Customer Name" &&
      customerRecord.customerName !== "CUSTOMER NAME"
    ) {
      console.log(`👤 Adding customer: ${customerRecord.customerName} for ${registration}`)
      customerData.push(customerRecord)
    }
  }

  console.log(`✅ Parsed ${registrations.length} registrations and ${customerData.length} customer records`)

  return { registrations, customerData }
}

function findColumnIndex(columns: string[], searchTerms: string[]): number {
  for (const term of searchTerms) {
    const index = columns.findIndex((col) => col.toLowerCase().includes(term.toLowerCase()))
    if (index !== -1) return index
  }
  return -1
}

function parseCSVRow(row: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      // End of cell
      cells.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  // Add final cell
  cells.push(current.trim())

  return cells
}

function cleanPhoneNumber(phone: string): string {
  if (!phone) return ""
  // Remove common separators and clean up phone numbers
  return phone.replace(/[^\d+]/g, "").trim()
}

function cleanEmailAddress(email: string): string {
  if (!email) return ""
  // Handle cases like "email1@domain.com/phone" - take just the email part
  const emailPart = email.split("/")[0].trim()
  return emailPart.includes("@") ? emailPart : ""
}

function isValidUKRegistration(reg: string): boolean {
  const cleaned = reg.replace(/\s/g, "")

  // Enhanced UK registration patterns
  const patterns = [
    /^[A-Z]{2}\d{2}[A-Z]{3}$/, // AB12CDE (current format)
    /^[A-Z]\d{1,3}[A-Z]{3}$/, // A123BCD (prefix format)
    /^[A-Z]{3}\d{1,3}[A-Z]$/, // ABC123D (suffix format)
    /^\d{1,4}[A-Z]{1,3}$/, // 1234AB (dateless format)
    /^[A-Z]{1,3}\d{1,4}$/, // ABC1234 (reverse dateless)
  ]

  const isValidPattern = patterns.some((pattern) => pattern.test(cleaned))
  const isValidLength = cleaned.length >= 4 && cleaned.length <= 8

  // Enhanced exclusion patterns
  const excludePatterns = [
    /^[A-Z]{4,}$/, // All letters (4+ chars)
    /^\d{4,}$/, // All numbers (4+ chars)
    /^(TEST|DEMO|SAMPLE|NULL|NONE|TBA|TBC)/, // Test data
    /^(WORK|DATE|TIME|YEAR|MONTH|WEEK|DAY)/, // Common words
    /^(MAKE|MODEL|TYPE|SIZE|FUEL|AUTO)/, // Vehicle terms
    /^(REGISTRATION|REG|CUSTOMER|NAME)$/, // Header text
  ]

  const isNotExcluded = !excludePatterns.some((pattern) => pattern.test(cleaned))

  const isValid = isValidPattern && isValidLength && isNotExcluded

  return isValid
}
