// Test the direct CSV import functionality
console.log("🧪 Testing direct CSV import...")

try {
  // Fetch the CSV file directly
  console.log("📥 Fetching CSV file...")
  const response = await fetch(
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/final_mot_database-ixsUfyjVlpUkXJNjTyAAB2aB2FewuD.csv",
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`)
  }

  const csvText = await response.text()
  console.log(`📄 CSV file fetched: ${csvText.length} characters`)
  console.log(`📄 First 1000 characters:`)
  console.log(csvText.substring(0, 1000))

  // Parse the CSV manually to see the structure
  const lines = csvText.split("\n").filter((line) => line.trim())
  console.log(`📊 Total lines: ${lines.length}`)

  if (lines.length > 0) {
    console.log(`📋 Header: ${lines[0]}`)

    // Parse header
    const columns = lines[0].split(",").map((col) => col.trim().replace(/"/g, ""))
    console.log(`📋 Columns:`, columns)

    // Find registration column
    const regIndex = columns.findIndex(
      (col) => col.toLowerCase().includes("registration") || col.toLowerCase() === "reg",
    )
    console.log(`🚗 Registration column index: ${regIndex}`)

    if (regIndex >= 0) {
      console.log(`🚗 Registration column: "${columns[regIndex]}"`)

      // Extract some sample registrations
      const sampleRegs = []
      for (let i = 1; i < Math.min(10, lines.length); i++) {
        const cells = lines[i].split(",").map((cell) => cell.trim().replace(/"/g, ""))
        if (cells.length > regIndex && cells[regIndex]) {
          sampleRegs.push(cells[regIndex])
        }
      }

      console.log(`🚗 Sample registrations:`, sampleRegs)
    }

    // Show sample data rows
    console.log(`📊 Sample data rows:`)
    for (let i = 1; i < Math.min(5, lines.length); i++) {
      console.log(`Row ${i}: ${lines[i]}`)
    }
  }

  // Now test the upload API
  console.log("\n🧪 Testing upload API...")
  const uploadResponse = await fetch("/api/registrations/upload", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: csvText,
  })

  const uploadResult = await uploadResponse.json()
  console.log("📊 Upload API result:", uploadResult)
} catch (error) {
  console.error("❌ Test failed:", error)
}
