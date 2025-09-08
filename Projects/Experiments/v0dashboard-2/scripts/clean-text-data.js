/**
 * Script to clean problematic characters from text fields in the database
 * This will fix the "X in box" characters that appear in job descriptions
 */

import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Database connection
const sql = neon(process.env.DATABASE_URL)

/**
 * Check if text contains problematic characters
 */
function hasProblematicCharacters(text) {
  if (!text) return false
  return /[\u000b\u000c\u0000\u001f\u007f]/.test(text)
}

/**
 * Clean text by removing problematic characters
 */
function cleanText(text) {
  if (!text) return text

  // Replace vertical tabs (\u000b) with spaces
  let cleaned = text.replace(/\u000b/g, ' ')

  // Replace other common problematic characters
  cleaned = cleaned.replace(/\u000c/g, ' ') // Form feed
  cleaned = cleaned.replace(/\u0000/g, '') // Null character
  cleaned = cleaned.replace(/\u001f/g, '') // Unit separator
  cleaned = cleaned.replace(/\u007f/g, '') // Delete character

  // Replace multiple consecutive spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ')

  // Trim whitespace from start and end
  cleaned = cleaned.trim()

  return cleaned
}

async function cleanDocumentExtras() {
  console.log('🧹 Cleaning document_extras table...')

  try {
    // Get all records with text fields - we'll check for problematic characters in JavaScript
    const records = await sql`
      SELECT document_id, labour_description, doc_notes
      FROM document_extras
      WHERE labour_description IS NOT NULL
         OR doc_notes IS NOT NULL
    `
    
    // Filter records that actually have problematic characters
    const problematicRecords = records.filter(record =>
      hasProblematicCharacters(record.labour_description) ||
      hasProblematicCharacters(record.doc_notes)
    )

    console.log(`Found ${problematicRecords.length} records with problematic characters out of ${records.length} total`)

    let cleanedCount = 0

    for (const record of problematicRecords) {
      const cleanedLabour = cleanText(record.labour_description)
      const cleanedNotes = cleanText(record.doc_notes)

      // Only update if something actually changed
      if (cleanedLabour !== record.labour_description ||
          cleanedNotes !== record.doc_notes) {

        await sql`
          UPDATE document_extras
          SET
            labour_description = ${cleanedLabour},
            doc_notes = ${cleanedNotes}
          WHERE document_id = ${record.document_id}
        `
        
        cleanedCount++
        
        if (cleanedCount % 100 === 0) {
          console.log(`Cleaned ${cleanedCount} records...`)
        }
      }
    }
    
    console.log(`✅ Cleaned ${cleanedCount} document_extras records`)
    
  } catch (error) {
    console.error('❌ Error cleaning document_extras:', error)
  }
}



async function main() {
  console.log('🚀 Starting text data cleanup...')

  await cleanDocumentExtras()

  console.log('✅ Text data cleanup completed!')
}

// Run the script
main().catch(console.error)

export { cleanText, cleanDocumentExtras }
