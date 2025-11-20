import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[IMPORT-EXTRAS-FINAL] Starting final document extras import...")

    const extrasPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Document_Extras.csv'
    
    if (!fs.existsSync(extrasPath)) {
      return NextResponse.json({ success: false, error: "Document_Extras.csv not found" }, { status: 404 })
    }

    // Recreate table with proper structure for job descriptions
    await sql`
      DROP TABLE IF EXISTS document_extras CASCADE
    `

    await sql`
      CREATE TABLE document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        labour_description TEXT,
        doc_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    const fileContent = fs.readFileSync(extrasPath, 'utf-8')
    
    let records
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true
      })
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: "Failed to parse Document_Extras CSV",
        details: parseError instanceof Error ? parseError.message : "Unknown parse error"
      }, { status: 400 })
    }

    console.log(`[IMPORT-EXTRAS-FINAL] Successfully parsed ${records.length} extras records`)

    let imported = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      try {
        // Use document ID as the primary key since _ID might be the document ID
        const documentId = record._ID?.trim()
        const labourDescription = record['Labour Description']?.trim()
        const docNotes = record.docNotes?.trim()

        if (!documentId) {
          skipped++
          continue
        }

        // Skip if no meaningful content
        if (!labourDescription && !docNotes) {
          skipped++
          continue
        }

        await sql`
          INSERT INTO document_extras (
            id, document_id, labour_description, doc_notes
          ) VALUES (
            ${documentId + '_extra'},
            ${documentId},
            ${labourDescription || null},
            ${docNotes || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            labour_description = EXCLUDED.labour_description,
            doc_notes = EXCLUDED.doc_notes
        `
        imported++

        if (imported % 1000 === 0) {
          console.log(`[IMPORT-EXTRAS-FINAL] Imported ${imported} extras...`)
        }

      } catch (error) {
        errors++
        if (errors < 10) {
          console.error(`[IMPORT-EXTRAS-FINAL] Error importing extra ${record._ID}:`, error)
        }
      }
    }

    const finalCount = await sql`SELECT COUNT(*) as count FROM document_extras`

    // Get sample data to verify
    const sampleExtras = await sql`
      SELECT 
        de.document_id,
        de.labour_description,
        de.doc_notes,
        cd.document_type,
        cd.document_date,
        cd.total_gross
      FROM document_extras de
      LEFT JOIN customer_documents cd ON de.document_id = cd.id
      WHERE de.labour_description IS NOT NULL
      ORDER BY LENGTH(de.labour_description) DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      results: {
        totalRecords: records.length,
        imported,
        skipped,
        errors,
        finalCount: parseInt(finalCount[0].count)
      },
      sampleExtras,
      message: "Document extras (job descriptions) imported successfully!"
    })

  } catch (error) {
    console.error("[IMPORT-EXTRAS-FINAL] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import document extras",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
