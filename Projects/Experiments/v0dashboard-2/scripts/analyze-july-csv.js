// Analyze the July MOT database CSV to understand the format
console.log("🔍 Analyzing July MOT database CSV...")

try {
  const response = await fetch(
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/july_mot_database-DNHenbyc9L4yQVc2Tj3GDuxPBhlFV2.csv",
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
  console.log("📋 Columns found:", columns)

  // Find key column indices
  const regIndex = columns.findIndex((col) => col.toLowerCase().includes("registration"))
  const customerIndex = columns.findIndex((col) => col.toLowerCase().includes("customer"))
  const makeIndex = columns.findIndex((col) => col.toLowerCase().includes("make"))
  const phoneIndex = columns.findIndex((col) => col.toLowerCase().includes("telephone"))
  const mobileIndex = columns.findIndex((col) => col.toLowerCase().includes("mobile"))
  const emailIndex = columns.findIndex((col) => col.toLowerCase().includes("email"))
  const workDueIndex = columns.findIndex((col) => col.toLowerCase().includes("work due"))
  const lastInvoicedIndex = columns.findIndex((col) => col.toLowerCase().includes("last invoiced"))

  console.log("🔍 Column mapping:")
  console.log(`  Registration: ${regIndex} (${columns[regIndex] || "NOT FOUND"})`)
  console.log(`  Customer Name: ${customerIndex} (${columns[customerIndex] || "NOT FOUND"})`)
  console.log(`  Make: ${makeIndex} (${columns[makeIndex] || "NOT FOUND"})`)
  console.log(`  Telephone: ${phoneIndex} (${columns[phoneIndex] || "NOT FOUND"})`)
  console.log(`  Mobile: ${mobileIndex} (${columns[mobileIndex] || "NOT FOUND"})`)
  console.log(`  Email: ${emailIndex} (${columns[emailIndex] || "NOT FOUND"})`)
  console.log(`  Work Due: ${workDueIndex} (${columns[workDueIndex] || "NOT FOUND"})`)
  console.log(`  Last Invoiced: ${lastInvoicedIndex} (${columns[lastInvoicedIndex] || "NOT FOUND"})`)

  // Analyze first 10 data rows
  console.log("\n📊 Sample data rows:")
  const registrations = []
  for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
    const row = lines[i]
    if (row.trim()) {
      const cells = row.split(",").map((cell) => cell.trim().replace(/"/g, ""))
      console.log(`Row ${i}:`, cells)

      if (regIndex >= 0 && cells[regIndex]) {
        const reg = cells[regIndex].trim().toUpperCase()
        console.log(`  Registration: "${reg}"`)
        registrations.push(reg)
      }

      if (customerIndex >= 0 && cells[customerIndex]) {
        console.log(`  Customer: "${cells[customerIndex]}"`)
      }

      if (makeIndex >= 0 && cells[makeIndex]) {
        console.log(`  Make: "${cells[makeIndex]}"`)
      }
    }
  }

  console.log("\n🚗 Sample registrations found:")
  console.log(registrations)

  // Count total registrations
  let totalRegs = 0
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]
    if (row.trim()) {
      const cells = row.split(",").map((cell) => cell.trim().replace(/"/g, ""))
      if (regIndex >= 0 && cells[regIndex] && cells[regIndex] !== "Registration") {
        totalRegs++
      }
    }
  }

  console.log(`\n📈 Total registrations in file: ${totalRegs}`)
} catch (error) {
  console.error("❌ Error analyzing CSV:", error)
}
