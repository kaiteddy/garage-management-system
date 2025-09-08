import { NextResponse } from "next/server"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function GET() {
  try {
    console.log("[ANALYZE-CUSTOMER-CSV] Analyzing Customers.csv file structure...")

    const filePath = '/Users/adamrutstein/v0dashboard-2/data/Customers.csv'
    
    // Read file
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n')
    
    console.log(`[ANALYZE-CUSTOMER-CSV] Total lines in file: ${lines.length}`)
    
    // Try different parsing approaches
    let parseResults = []
    
    // Method 1: Standard parsing
    try {
      const records1 = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: false
      })
      parseResults.push({
        method: "Standard parsing",
        recordCount: records1.length,
        success: true
      })
    } catch (error) {
      parseResults.push({
        method: "Standard parsing",
        recordCount: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    }

    // Method 2: More lenient parsing
    try {
      const records2 = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true, // Skip problematic records
        cast: false
      })
      parseResults.push({
        method: "Lenient parsing (skip errors)",
        recordCount: records2.length,
        success: true
      })
    } catch (error) {
      parseResults.push({
        method: "Lenient parsing (skip errors)",
        recordCount: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    }

    // Check for unique IDs in the file
    const idPattern = /_ID,/
    const headerLine = lines[0]
    const hasIdColumn = idPattern.test(headerLine)
    
    // Count non-empty lines
    const nonEmptyLines = lines.filter(line => line.trim().length > 0).length
    
    // Sample some lines to check structure
    const sampleLines = lines.slice(1, 6).map((line, index) => ({
      lineNumber: index + 2,
      content: line.substring(0, 200) + (line.length > 200 ? "..." : ""),
      length: line.length
    }))

    // Check for potential issues
    const issues = []
    if (lines.some(line => line.includes('\r'))) {
      issues.push("File contains carriage returns (\\r)")
    }
    if (lines.some(line => line.split(',').length > 50)) {
      issues.push("Some lines have excessive comma count")
    }
    if (lines.some(line => line.includes('""'))) {
      issues.push("File contains escaped quotes")
    }

    return NextResponse.json({
      success: true,
      analysis: {
        totalLines: lines.length,
        nonEmptyLines,
        hasIdColumn,
        headerLine: headerLine.substring(0, 500),
        parseResults,
        sampleLines,
        potentialIssues: issues
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ANALYZE-CUSTOMER-CSV] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze CSV",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
