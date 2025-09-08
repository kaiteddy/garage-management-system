// Fetch and analyze the CSV data to understand the format
console.log("🔍 Fetching and analyzing CSV data...")

try {
  const response = await fetch(
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/final_mot_database-ixsUfyjVlpUkXJNjTyAAB2aB2FewuD.csv",
  )
  const csvText = await response.text()

  console.log("📄 CSV file size:", csvText.length, "characters")
  console.log("📋 First 1000 characters:")
  console.log(csvText.substring(0, 1000))

  // Split into lines
  const lines = csvText.split("\n")
  console.log("📊 Total lines:", lines.length)

  // Analyze header
  const header = lines[0]
  console.log("🏷️ Header:", header)

  const columns = header.split(",").map((col) => col.trim().replace(/"/g, ""))
  console.log("📋 Columns:", columns)

  // Find registration column
  const regColumnIndex = columns.findIndex(
    (col) => col.toLowerCase().includes("registration") || col.toLowerCase().includes("reg"),
  )
  console.log("🚗 Registration column index:", regColumnIndex)

  // Analyze first 10 data rows
  console.log("\n📊 Sample data rows:")
  for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
    const row = lines[i]
    if (row.trim()) {
      const cells = row.split(",").map((cell) => cell.trim().replace(/"/g, ""))
      console.log(`Row ${i}:`, cells)

      if (regColumnIndex >= 0 && cells[regColumnIndex]) {
        console.log(`  Registration: "${cells[regColumnIndex]}"`)
      }
    }
  }

  // Extract all registrations
  const registrations = []
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]
    if (row.trim()) {
      const cells = row.split(",").map((cell) => cell.trim().replace(/"/g, ""))
      if (regColumnIndex >= 0 && cells[regColumnIndex]) {
        const reg = cells[regColumnIndex].trim().toUpperCase()
        if (reg && reg !== "REGISTRATION") {
          registrations.push(reg)
        }
      }
    }
  }

  console.log("\n🚗 Found registrations:")
  console.log("Total:", registrations.length)
  console.log("First 20:", registrations.slice(0, 20))
  console.log("Unique:", [...new Set(registrations)].length)

  // Analyze registration formats
  const formats = {}
  registrations.forEach((reg) => {
    const cleaned = reg.replace(/\s/g, "")
    const length = cleaned.length
    const pattern = cleaned.replace(/[A-Z]/g, "L").replace(/[0-9]/g, "N")

    if (!formats[pattern]) {
      formats[pattern] = { count: 0, examples: [] }
    }
    formats[pattern].count++
    if (formats[pattern].examples.length < 3) {
      formats[pattern].examples.push(reg)
    }
  })

  console.log("\n📋 Registration patterns found:")
  Object.entries(formats).forEach(([pattern, data]) => {
    console.log(`${pattern}: ${data.count} registrations (e.g., ${data.examples.join(", ")})`)
  })

  // Analyze customer data
  const customerNameIndex = columns.findIndex(
    (col) => col.toLowerCase().includes("customer") || col.toLowerCase().includes("name"),
  )
  const phoneIndex = columns.findIndex(
    (col) => col.toLowerCase().includes("telephone") || col.toLowerCase().includes("phone"),
  )
  const mobileIndex = columns.findIndex((col) => col.toLowerCase().includes("mobile"))
  const emailIndex = columns.findIndex((col) => col.toLowerCase().includes("email"))

  console.log("\n👤 Customer data columns:")
  console.log("Customer Name index:", customerNameIndex)
  console.log("Telephone index:", phoneIndex)
  console.log("Mobile index:", mobileIndex)
  console.log("Email index:", emailIndex)

  // Sample customer data
  console.log("\n👤 Sample customer records:")
  for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
    const row = lines[i]
    if (row.trim()) {
      const cells = row.split(",").map((cell) => cell.trim().replace(/"/g, ""))
      console.log(`Record ${i}:`)
      console.log(`  Registration: ${cells[regColumnIndex] || "N/A"}`)
      console.log(`  Customer: ${cells[customerNameIndex] || "N/A"}`)
      console.log(`  Phone: ${cells[phoneIndex] || "N/A"}`)
      console.log(`  Mobile: ${cells[mobileIndex] || "N/A"}`)
      console.log(`  Email: ${cells[emailIndex] || "N/A"}`)
    }
  }
} catch (error) {
  console.error("❌ Error analyzing CSV:", error)
}
