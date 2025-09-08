import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST(request: Request) {
  try {
    const { operation = 'documents', maxBatches = 50 } = await request.json()
    
    console.log(`[MEGA-FAST] 🚀 MEGA-FAST processing: ${operation}`)

    const startTime = Date.now()

    if (operation === 'documents') {
      const result = await megaFastDocuments(maxBatches)
      
      return NextResponse.json({
        success: true,
        mega_fast_results: result,
        performance: {
          total_time_ms: Date.now() - startTime,
          total_time_minutes: Math.round((Date.now() - startTime) / 60000),
          documents_per_second: Math.round(result.imported / ((Date.now() - startTime) / 1000))
        },
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid operation"
    }, { status: 400 })

  } catch (error) {
    console.error("[MEGA-FAST] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "MEGA-FAST processing failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function megaFastDocuments(maxBatches: number) {
  console.log(`[MEGA-FAST] 📄 Starting MEGA-FAST document processing...`)

  const documentsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv"
  
  // Read CSV content
  const csvContent = fs.readFileSync(documentsPath, 'utf8')
  const lines = csvContent.split('\n')
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  
  console.log(`[MEGA-FAST] 📊 Processing ${lines.length - 1} total lines`)

  const results = {
    total_lines: lines.length - 1,
    imported: 0,
    failed: 0,
    batches_processed: 0
  }

  // Process in large batches with minimal validation
  const batchSize = Math.ceil((lines.length - 1) / maxBatches)
  
  for (let batchNum = 0; batchNum < maxBatches && (batchNum * batchSize + 1) < lines.length; batchNum++) {
    const startIdx = batchNum * batchSize + 1
    const endIdx = Math.min(startIdx + batchSize, lines.length)
    
    console.log(`[MEGA-FAST] Processing batch ${batchNum + 1}/${maxBatches}: lines ${startIdx} to ${endIdx - 1}`)

    const batchDocuments = []
    
    for (let i = startIdx; i < endIdx; i++) {
      if (!lines[i] || lines[i].trim() === '') continue
      
      try {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
        const docData = {}
        headers.forEach((header, index) => {
          docData[header] = values[index] || null
        })

        // Extract essential fields with minimal validation
        const documentId = docData._ID
        const documentNumber = docData.docNumber_Invoice || docData.docNumber_Estimate || docData.docNumber_Jobsheet
        const customerId = docData._ID_Customer

        if (documentId && documentNumber && customerId) {
          batchDocuments.push({
            _id: documentId,
            _id_customer: customerId,
            doc_number: documentNumber,
            customer_name: `${docData.custName_Forename || ''} ${docData.custName_Surname || ''}`.trim() || 'Unknown',
            vehicle_registration: docData.vehRegistration || '',
            total_gross: docData.us_TotalGROSS ? parseFloat(docData.us_TotalGROSS) || 0 : 0,
            doc_type: docData.docType || 'SI',
            status: 'Imported'
          })
        }
      } catch (error) {
        // Skip problematic lines
        continue
      }
    }

    // Bulk insert with single transaction
    if (batchDocuments.length > 0) {
      try {
        await sql.begin(async (sql) => {
          for (const doc of batchDocuments) {
            try {
              await sql`
                INSERT INTO documents (
                  _id, _id_customer, doc_type, doc_number,
                  customer_name, vehicle_registration, total_gross, status,
                  created_at, updated_at
                ) VALUES (
                  ${doc._id}, ${doc._id_customer}, ${doc.doc_type}, ${doc.doc_number},
                  ${doc.customer_name}, ${doc.vehicle_registration}, ${doc.total_gross}, ${doc.status},
                  NOW(), NOW()
                )
                ON CONFLICT (_id) DO UPDATE SET
                  doc_number = EXCLUDED.doc_number,
                  customer_name = EXCLUDED.customer_name,
                  total_gross = EXCLUDED.total_gross,
                  updated_at = NOW()
              `
              results.imported++
            } catch (docError) {
              results.failed++
            }
          }
        })
        
        console.log(`[MEGA-FAST] ✅ Batch ${batchNum + 1} completed: ${batchDocuments.length} documents processed`)
        
      } catch (batchError) {
        console.error(`[MEGA-FAST] ❌ Batch ${batchNum + 1} failed:`, batchError)
        results.failed += batchDocuments.length
      }
    }

    results.batches_processed++
  }

  console.log(`[MEGA-FAST] 🎉 COMPLETED: ${results.imported} imported, ${results.failed} failed`)
  return results
}
