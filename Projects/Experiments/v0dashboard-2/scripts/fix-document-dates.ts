import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

/**
 * Script to fix document dates by reading from the original CSV and updating the database
 * with properly parsed dates from docDate_Created and docDate_Issued fields
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

async function fixDocumentDates() {
  try {
    console.log("🔧 Starting document date fix process...")
    
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
    
    // Get current records with null document_date
    console.log("🔍 Checking current database state...")
    const nullDateRecords = await sql`
      SELECT id, document_date, created_at 
      FROM customer_documents 
      WHERE document_date IS NULL
    `
    
    console.log(`📋 Found ${nullDateRecords.length} records with null document_date`)
    
    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    console.log("🔄 Processing records in batches...")
    
    // Process in batches of 100
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          if (!record._ID) continue
          
          // Try to parse dates in order of preference
          let bestDate: Date | null = null
          let dateSource = ''
          
          // 1. Try docDate_Issued first (most relevant for service date)
          bestDate = parseUKDate(record.docDate_Issued)
          if (bestDate) {
            dateSource = 'docDate_Issued'
          } else {
            // 2. Fall back to docDate_Created
            bestDate = parseUKDate(record.docDate_Created)
            if (bestDate) {
              dateSource = 'docDate_Created'
            }
          }
          
          if (bestDate) {
            // Update the database record
            const result = await sql`
              UPDATE customer_documents 
              SET document_date = ${bestDate}, updated_at = NOW()
              WHERE id = ${record._ID.trim()} AND document_date IS NULL
            `
            
            if (result.count > 0) {
              updatedCount++
              if (updatedCount % 50 === 0) {
                console.log(`✅ Updated ${updatedCount} records so far...`)
              }
            } else {
              skippedCount++
            }
          } else {
            skippedCount++
          }
          
        } catch (error) {
          errorCount++
          console.error(`❌ Error processing record ${record._ID}:`, error)
        }
      }
    }
    
    // Final verification
    console.log("🔍 Verifying results...")
    const remainingNullDates = await sql`
      SELECT COUNT(*) as count 
      FROM customer_documents 
      WHERE document_date IS NULL
    `
    
    const totalRecords = await sql`
      SELECT COUNT(*) as count 
      FROM customer_documents
    `
    
    console.log("\n📊 RESULTS SUMMARY:")
    console.log(`✅ Successfully updated: ${updatedCount} records`)
    console.log(`⏭️  Skipped (no valid date or already had date): ${skippedCount} records`)
    console.log(`❌ Errors: ${errorCount} records`)
    console.log(`📋 Total records in database: ${totalRecords[0].count}`)
    console.log(`🔍 Remaining null dates: ${remainingNullDates[0].count}`)
    
    const successRate = ((updatedCount / (updatedCount + skippedCount + errorCount)) * 100).toFixed(1)
    console.log(`📈 Success rate: ${successRate}%`)
    
    return {
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      remainingNullDates: parseInt(remainingNullDates[0].count),
      totalRecords: parseInt(totalRecords[0].count)
    }
    
  } catch (error) {
    console.error("💥 Fatal error in date fix process:", error)
    throw error
  }
}

// Export for use as API endpoint or direct execution
export { fixDocumentDates, parseUKDate }

// Allow direct execution
if (require.main === module) {
  fixDocumentDates()
    .then((result) => {
      console.log("\n🎉 Document date fix completed successfully!")
      console.log(result)
      process.exit(0)
    })
    .catch((error) => {
      console.error("\n💥 Document date fix failed:", error)
      process.exit(1)
    })
}
