import { NextResponse } from "next/server"
import fs from 'fs'

export async function GET() {
  try {
    console.log("[INVESTIGATE-MISSING-CUSTOMERS] Investigating why we're missing ~6,000 customers...")

    const customersPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv'
    
    // Read file and analyze structure
    const fileContent = fs.readFileSync(customersPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    console.log(`[INVESTIGATE-MISSING-CUSTOMERS] Total lines: ${lines.length}`)
    
    // Analyze first 20 lines to understand structure
    const sampleLines = lines.slice(0, 20).map((line, index) => ({
      lineNumber: index + 1,
      length: line.length,
      commaCount: (line.match(/,/g) || []).length,
      quoteCount: (line.match(/"/g) || []).length,
      hasId: line.includes('_ID'),
      preview: line.substring(0, 200) + (line.length > 200 ? "..." : "")
    }))

    // Check for different line patterns
    let emptyLines = 0
    let shortLines = 0
    let normalLines = 0
    let longLines = 0
    let linesWithIds = 0
    let linesWithoutIds = 0

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim()
      
      if (line.length === 0) {
        emptyLines++
      } else if (line.length < 50) {
        shortLines++
      } else if (line.length < 500) {
        normalLines++
      } else {
        longLines++
      }

      // Check for ID pattern
      if (line.includes(',') && line.split(',').length > 0) {
        const firstField = line.split(',')[0].replace(/"/g, '').trim()
        if (firstField.length > 10) { // IDs are long strings
          linesWithIds++
        } else {
          linesWithoutIds++
        }
      }
    }

    // Try to manually parse a few problematic lines
    const problematicLines = []
    for (let i = 1; i < Math.min(100, lines.length); i++) {
      const line = lines[i].trim()
      if (line.length === 0) continue

      try {
        // Simple comma split
        const fields = line.split(',')
        const id = fields[0] ? fields[0].replace(/"/g, '').trim() : ''
        
        if (!id || id.length < 10) {
          problematicLines.push({
            lineNumber: i + 1,
            issue: 'Missing or invalid ID',
            id: id,
            preview: line.substring(0, 100)
          })
        }
      } catch (error) {
        problematicLines.push({
          lineNumber: i + 1,
          issue: 'Parse error',
          error: error instanceof Error ? error.message : 'Unknown error',
          preview: line.substring(0, 100)
        })
      }
    }

    // Check encoding issues
    const hasNonAscii = fileContent.includes('\ufffd') || /[^\x00-\x7F]/.test(fileContent.substring(0, 1000))
    const hasBOM = fileContent.charCodeAt(0) === 0xFEFF

    return NextResponse.json({
      success: true,
      analysis: {
        fileInfo: {
          totalLines: lines.length,
          totalDataLines: lines.length - 1,
          fileSize: fileContent.length,
          hasNonAscii,
          hasBOM
        },
        lineAnalysis: {
          emptyLines,
          shortLines,
          normalLines,
          longLines,
          linesWithIds,
          linesWithoutIds
        },
        sampleLines: sampleLines.slice(0, 10),
        problematicLines: problematicLines.slice(0, 10),
        expectedVsActual: {
          expectedCustomers: 7000,
          actualImported: 1111,
          missingCount: 7000 - 1111,
          missingPercentage: Math.round(((7000 - 1111) / 7000) * 100)
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[INVESTIGATE-MISSING-CUSTOMERS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to investigate missing customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
