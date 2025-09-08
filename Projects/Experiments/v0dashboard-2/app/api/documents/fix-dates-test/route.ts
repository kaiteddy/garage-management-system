import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

/**
 * Test endpoint to fix document dates for a small batch
 */

interface DocumentRecord {
  _ID: string
  docDate_Created: string
  docDate_Issued: string
  docDate_DueBy: string
  docDate_Paid: string
}

// Proper date parsing function for DD/MM/YYYY format
function parseUKDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '""') return null
  
  try {
    // Remove quotes and trim
    const cleaned = dateStr.replace(/"/g, '').trim()
    if (!cleaned) return null
    
    // Handle DD/MM/YYYY format
    const parts = cleaned.split('/')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // JavaScript months are 0-based
    const year = parseInt(parts[2], 10)
    
    // Validate the date components
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) return null
    
    const date = new Date(year, month, day)
    
    // Check if the date is valid (handles invalid dates like 31/02/2011)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      return null
    }
    
    // Return as UTC date to avoid timezone issues
    return new Date(Date.UTC(year, month, day))
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`, error)
    return null
  }
}

export async function POST() {
  try {
    console.log("[FIX-DATES-TEST] Starting test document date fix...")
    
    // Check if CSV file exists
    const csvPath = '/Users/adamrutstein/v0dashboard-2/data/Documents.csv'
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`)
    }
    
    console.log("📖 Reading Documents.csv...")
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true,
      skip_records_with_error: true
    }) as DocumentRecord[]
    
    console.log(`📊 Parsed ${records.length} records from CSV`)
    
    // Get a small sample of records with null document_date for testing
    console.log("🔍 Getting test records...")
    const testRecords = await sql`
      SELECT id, document_date, created_at 
      FROM customer_documents 
      WHERE document_date IS NULL
      LIMIT 10
    `
    
    console.log(`📋 Found ${testRecords.length} test records with null document_date`)
    
    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0
    const results = []
    
    console.log("🔄 Processing test records...")
    
    for (const dbRecord of testRecords) {
      try {
        // Find the corresponding CSV record
        const csvRecord = records.find(r => r._ID && r._ID.trim() === dbRecord.id)
        
        if (!csvRecord) {
          console.log(`❌ No CSV record found for ID: ${dbRecord.id}`)
          skippedCount++
          continue
        }
        
        // Try to parse dates in order of preference
        let bestDate: Date | null = null
        let dateSource = ''
        
        // 1. Try docDate_Issued first (most relevant for service date)
        bestDate = parseUKDate(csvRecord.docDate_Issued)
        if (bestDate) {
          dateSource = 'docDate_Issued'
        } else {
          // 2. Fall back to docDate_Created
          bestDate = parseUKDate(csvRecord.docDate_Created)
          if (bestDate) {
            dateSource = 'docDate_Created'
          }
        }
        
        if (bestDate) {
          console.log(`✅ Found date for ${dbRecord.id}: ${bestDate.toISOString().split('T')[0]} (from ${dateSource})`)
          
          // Update the database record
          const result = await sql`
            UPDATE customer_documents 
            SET document_date = ${bestDate}, updated_at = NOW()
            WHERE id = ${dbRecord.id}
          `
          
          if (result.count > 0) {
            updatedCount++
            results.push({
              id: dbRecord.id,
              oldDate: dbRecord.document_date,
              newDate: bestDate.toISOString().split('T')[0],
              source: dateSource,
              csvCreated: csvRecord.docDate_Created,
              csvIssued: csvRecord.docDate_Issued
            })
          } else {
            skippedCount++
          }
        } else {
          console.log(`⚠️ No valid date found for ${dbRecord.id}`)
          skippedCount++
          results.push({
            id: dbRecord.id,
            oldDate: dbRecord.document_date,
            newDate: null,
            source: 'none',
            csvCreated: csvRecord.docDate_Created,
            csvIssued: csvRecord.docDate_Issued
          })
        }
        
      } catch (error) {
        errorCount++
        console.error(`❌ Error processing record ${dbRecord.id}:`, error)
      }
    }
    
    console.log("\n📊 TEST RESULTS:")
    console.log(`✅ Successfully updated: ${updatedCount} records`)
    console.log(`⏭️  Skipped: ${skippedCount} records`)
    console.log(`❌ Errors: ${errorCount} records`)
    
    return NextResponse.json({
      success: true,
      message: "Test document date fix completed",
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      results: results
    })
    
  } catch (error) {
    console.error("[FIX-DATES-TEST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix document dates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Document Date Fix Test API",
    description: "POST to this endpoint to test fix null document_date fields using original CSV data",
    usage: "POST /api/documents/fix-dates-test"
  })
}
