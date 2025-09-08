import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[JOB-NUMBERS-ANALYSIS] Starting comprehensive job number analysis...')

    // Get all job sheet documents from documents table
    const documentsResult = await sql`
      SELECT 
        doc_number,
        doc_type,
        doc_date,
        customer_name,
        vehicle_reg,
        total_amount,
        created_at
      FROM documents 
      WHERE doc_type = 'JS'
      ORDER BY 
        CASE 
          WHEN doc_number ~ '^JS[0-9]+$' THEN CAST(SUBSTRING(doc_number FROM 3) AS INTEGER)
          ELSE 999999
        END ASC,
        doc_number ASC
    `

    // Get all job sheets from job_sheets table if it exists
    let jobSheetsResult = []
    try {
      jobSheetsResult = await sql`
        SELECT 
          id,
          job_number,
          registration,
          customer_name,
          status,
          created_at
        FROM job_sheets
        ORDER BY 
          CASE 
            WHEN job_number ~ '^JS[0-9]+$' THEN CAST(SUBSTRING(job_number FROM 3) AS INTEGER)
            ELSE 999999
          END ASC,
          job_number ASC
      `
    } catch (error) {
      console.log('[JOB-NUMBERS-ANALYSIS] No job_sheets table found, using documents only')
    }

    // Analyze numbering patterns
    const allJobNumbers = [
      ...documentsResult.map(d => d.doc_number),
      ...jobSheetsResult.map(j => j.job_number)
    ].filter(Boolean)

    const analysis = {
      totalJobSheets: documentsResult.length + jobSheetsResult.length,
      documentsTable: documentsResult.length,
      jobSheetsTable: jobSheetsResult.length,
      
      // Number format analysis
      standardFormat: allJobNumbers.filter(num => /^JS\d{5}$/.test(num)).length,
      oldFormat: allJobNumbers.filter(num => /^\d+$/.test(num)).length,
      otherFormats: allJobNumbers.filter(num => !(/^JS\d{5}$/.test(num) || /^\d+$/.test(num))).length,
      
      // Find highest numbers
      highestStandardNumber: Math.max(
        ...allJobNumbers
          .filter(num => /^JS\d+$/.test(num))
          .map(num => parseInt(num.substring(2)))
          .filter(num => !isNaN(num)),
        0
      ),
      
      highestOldNumber: Math.max(
        ...allJobNumbers
          .filter(num => /^\d+$/.test(num))
          .map(num => parseInt(num))
          .filter(num => !isNaN(num)),
        0
      ),
      
      // Suggested next number
      suggestedNextNumber: '',
      
      // Sample data
      sampleDocuments: documentsResult.slice(0, 10),
      sampleJobSheets: jobSheetsResult.slice(0, 10),
      
      // All unique numbers for review
      allNumbers: [...new Set(allJobNumbers)].sort((a, b) => {
        // Sort JS numbers numerically, others alphabetically
        const aIsJS = /^JS\d+$/.test(a)
        const bIsJS = /^JS\d+$/.test(b)
        
        if (aIsJS && bIsJS) {
          return parseInt(a.substring(2)) - parseInt(b.substring(2))
        }
        if (aIsJS && !bIsJS) return -1
        if (!aIsJS && bIsJS) return 1
        return a.localeCompare(b)
      })
    }

    // Calculate suggested next number
    const maxStandard = analysis.highestStandardNumber
    const maxOld = analysis.highestOldNumber
    const suggestedNext = Math.max(maxStandard, maxOld) + 1
    analysis.suggestedNextNumber = `JS${suggestedNext.toString().padStart(5, '0')}`

    console.log(`[JOB-NUMBERS-ANALYSIS] Analysis complete:`)
    console.log(`- Total job sheets: ${analysis.totalJobSheets}`)
    console.log(`- Highest standard (JS): ${analysis.highestStandardNumber}`)
    console.log(`- Highest old format: ${analysis.highestOldNumber}`)
    console.log(`- Suggested next: ${analysis.suggestedNextNumber}`)

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[JOB-NUMBERS-ANALYSIS] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
