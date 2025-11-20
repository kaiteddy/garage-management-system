import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[NEXT-JOB-NUMBER] Generating next job sheet number...')

    // Get all job sheet numbers from customer_documents table (primary source)
    const customerDocsResult = await sql`
      SELECT document_number as doc_number
      FROM customer_documents
      WHERE document_type IN ('JS', 'ESTIMATE', 'ES', 'INVOICE', 'SI')
        AND document_number IS NOT NULL
        AND document_number != ''
      ORDER BY
        CASE
          WHEN document_number ~ '^JS[0-9]+$' THEN CAST(SUBSTRING(document_number FROM 3) AS INTEGER)
          WHEN document_number ~ '^[0-9]+$' THEN CAST(document_number AS INTEGER)
          ELSE 0
        END DESC
      LIMIT 50
    `

    // Also check documents table for any additional job sheets
    const documentsResult = await sql`
      SELECT doc_number
      FROM documents
      WHERE doc_type IN ('JS', 'ES', 'SI')
        AND doc_number IS NOT NULL
        AND doc_number != ''
      ORDER BY
        CASE
          WHEN doc_number ~ '^JS[0-9]+$' THEN CAST(SUBSTRING(doc_number FROM 3) AS INTEGER)
          WHEN doc_number ~ '^[0-9]+$' THEN CAST(doc_number AS INTEGER)
          ELSE 0
        END DESC
      LIMIT 50
    `

    // Also check job_sheets table if it exists
    let jobSheetsResult = []
    try {
      jobSheetsResult = await sql`
        SELECT job_number as doc_number
        FROM job_sheets
        WHERE job_number IS NOT NULL
        ORDER BY
          CASE
            WHEN job_number ~ '^JS[0-9]+$' THEN CAST(SUBSTRING(job_number FROM 3) AS INTEGER)
            WHEN job_number ~ '^[0-9]+$' THEN CAST(job_number AS INTEGER)
            ELSE 0
          END DESC
        LIMIT 50
      `
    } catch (error) {
      console.log('[NEXT-JOB-NUMBER] No job_sheets table found')
    }

    // Combine and find highest number
    const allNumbers = [...customerDocsResult, ...documentsResult, ...jobSheetsResult]
      .map(row => row.doc_number)
      .filter(Boolean)

    let highestNumber = 0

    for (const number of allNumbers) {
      let numericValue = 0

      if (/^JS\d+$/.test(number)) {
        // JS format: extract number after JS
        numericValue = parseInt(number.substring(2))
      } else if (/^\d+$/.test(number)) {
        // Old numeric format
        numericValue = parseInt(number)
      }

      if (!isNaN(numericValue) && numericValue > highestNumber) {
        highestNumber = numericValue
      }
    }

    // Generate next number
    const nextNumericPart = highestNumber + 1
    const nextNumber = `JS${nextNumericPart.toString().padStart(5, '0')}`

    console.log(`[NEXT-JOB-NUMBER] Found highest number: ${highestNumber}`)
    console.log(`[NEXT-JOB-NUMBER] Generated next number: ${nextNumber}`)
    console.log(`[NEXT-JOB-NUMBER] Sample existing numbers:`, allNumbers.slice(0, 5))

    return NextResponse.json({
      success: true,
      nextNumber: nextNumber,
      highestFound: highestNumber,
      sampleExisting: allNumbers.slice(0, 5),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[NEXT-JOB-NUMBER] Error generating job number:', error)

    // Fallback to timestamp-based number
    const fallbackNumber = `JS${Date.now().toString().slice(-5)}`

    return NextResponse.json({
      success: true,
      nextNumber: fallbackNumber,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
