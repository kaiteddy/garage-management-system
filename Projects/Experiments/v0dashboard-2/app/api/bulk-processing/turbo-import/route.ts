import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { lookupVehicle } from "@/lib/dvla-api"

// Helper function to parse various date formats
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // Handle various date formats
    const cleanDate = dateStr.trim()

    // Try parsing as-is first
    let date = new Date(cleanDate)

    // If invalid, try common formats
    if (isNaN(date.getTime())) {
      // Try DD/MM/YYYY format
      const parts = cleanDate.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      }
    }

    // If still invalid, try DD-MM-YYYY format
    if (isNaN(date.getTime())) {
      const parts = cleanDate.split('-')
      if (parts.length === 3 && parts[0].length <= 2) {
        const [day, month, year] = parts
        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      }
    }

    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
  } catch (error) {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const {
      operation = 'documents', // 'documents', 'dvla', 'both'
      turboMode = true,
      maxConcurrency = 50,
      batchSize = 1000
    } = await request.json()

    console.log(`[TURBO-IMPORT] 🚀 TURBO MODE ACTIVATED: ${operation}`)
    console.log(`[TURBO-IMPORT] Concurrency: ${maxConcurrency}, Batch Size: ${batchSize}`)

    const startTime = Date.now()
    let results = {}

    if (operation === 'documents' || operation === 'both') {
      console.log(`[TURBO-IMPORT] 📄 Starting TURBO document import...`)
      results.documents = await turboDocumentImport(maxConcurrency, batchSize)
    }

    if (operation === 'dvla' || operation === 'both') {
      console.log(`[TURBO-IMPORT] 🚗 Starting TURBO DVLA processing...`)
      results.dvla = await turboDvlaProcessing(maxConcurrency)
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      turbo_results: results,
      performance: {
        total_time_ms: totalTime,
        total_time_minutes: Math.round(totalTime / 60000),
        turbo_mode: turboMode,
        max_concurrency: maxConcurrency
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[TURBO-IMPORT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "TURBO import failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function turboDocumentImport(maxConcurrency: number, batchSize: number) {
  const startTime = Date.now()
  console.log(`[TURBO-DOCS] 🔥 Reading entire CSV into memory for maximum speed...`)

  const documentsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv"

  // Read entire CSV into memory at once (MUCH faster than streaming)
  const csvContent = fs.readFileSync(documentsPath, 'utf8')
  const lines = csvContent.split('\n')
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())

  console.log(`[TURBO-DOCS] 📊 Loaded ${lines.length - 1} documents into memory`)

  // Parse all documents at once
  const allDocuments = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i] || lines[i].trim() === '') continue

    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
    const docData = {}
    headers.forEach((header, index) => {
      docData[header] = values[index] || null
    })

    // Only include documents with essential data
    const documentId = docData._ID
    const documentNumber = docData.docNumber_Invoice || docData.docNumber_Estimate || docData.docNumber_Jobsheet
    const customerId = docData._ID_Customer

    if (documentId && documentNumber && customerId) {
      allDocuments.push({
        _id: documentId,
        _id_customer: customerId,
        _id_vehicle: docData._ID_Vehicle,
        doc_type: docData.docType || 'SI',
        doc_number: documentNumber,
        doc_date_issued: parseDate(docData.docDate_Issued),
        customer_name: `${docData.custName_Forename || ''} ${docData.custName_Surname || ''}`.trim(),
        vehicle_registration: docData.vehRegistration,
        total_gross: docData.us_TotalGROSS ? parseFloat(docData.us_TotalGROSS) : 0,
        total_net: docData.us_TotalNET ? parseFloat(docData.us_TotalNET) : 0,
        total_tax: docData.us_TotalTAX ? parseFloat(docData.us_TotalTAX) : 0,
        status: docData.docUserStatus || 'Issued'
      })
    }
  }

  console.log(`[TURBO-DOCS] 🎯 Filtered to ${allDocuments.length} valid documents`)

  // Process in massive parallel batches
  const results = {
    total_documents: allDocuments.length,
    imported: 0,
    failed: 0,
    batches_processed: 0,
    processing_time_ms: 0
  }

  // Split into chunks for parallel processing
  const chunks = []
  for (let i = 0; i < allDocuments.length; i += batchSize) {
    chunks.push(allDocuments.slice(i, i + batchSize))
  }

  console.log(`[TURBO-DOCS] 🚀 Processing ${chunks.length} chunks with ${maxConcurrency} concurrent operations`)

  // Process chunks with controlled concurrency
  const processChunk = async (chunk: any[], chunkIndex: number) => {
    console.log(`[TURBO-DOCS] Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} documents)`)

    let chunkImported = 0
    let chunkFailed = 0

    // Use SQL transaction for maximum speed
    try {
      await sql.begin(async (sql) => {
        for (const doc of chunk) {
          try {
            await sql`
              INSERT INTO documents (
                _id, _id_customer, _id_vehicle, doc_type, doc_number,
                doc_date_issued, customer_name, vehicle_registration,
                total_gross, total_net, total_tax, status,
                created_at, updated_at
              ) VALUES (
                ${doc._id}, ${doc._id_customer}, ${doc._id_vehicle},
                ${doc.doc_type}, ${doc.doc_number}, ${doc.doc_date_issued},
                ${doc.customer_name}, ${doc.vehicle_registration},
                ${doc.total_gross}, ${doc.total_net}, ${doc.total_tax},
                ${doc.status}, NOW(), NOW()
              )
              ON CONFLICT (_id) DO UPDATE SET
                doc_number = EXCLUDED.doc_number,
                customer_name = EXCLUDED.customer_name,
                vehicle_registration = EXCLUDED.vehicle_registration,
                total_gross = EXCLUDED.total_gross,
                updated_at = NOW()
            `
            chunkImported++
          } catch (error) {
            chunkFailed++
            console.log(`[TURBO-DOCS] Document ${doc.doc_number} failed:`, error.message)
          }
        }
      })
    } catch (error) {
      console.error(`[TURBO-DOCS] Chunk ${chunkIndex + 1} transaction failed:`, error)
      chunkFailed += chunk.length
    }

    return { imported: chunkImported, failed: chunkFailed }
  }

  // Process chunks with controlled concurrency
  const semaphore = new Array(maxConcurrency).fill(null)
  let chunkIndex = 0
  const chunkResults = []

  while (chunkIndex < chunks.length) {
    const batch = []
    for (let i = 0; i < maxConcurrency && chunkIndex < chunks.length; i++) {
      batch.push(processChunk(chunks[chunkIndex], chunkIndex))
      chunkIndex++
    }

    const batchResults = await Promise.all(batch)
    chunkResults.push(...batchResults)

    // Update results
    for (const result of batchResults) {
      results.imported += result.imported
      results.failed += result.failed
    }
    results.batches_processed += batchResults.length

    console.log(`[TURBO-DOCS] 📈 Progress: ${results.imported} imported, ${results.failed} failed`)
  }

  results.processing_time_ms = Date.now() - startTime

  console.log(`[TURBO-DOCS] ✅ COMPLETED: ${results.imported} documents imported in ${Math.round(results.processing_time_ms / 1000)} seconds`)
  console.log(`[TURBO-DOCS] 🚀 Speed: ${Math.round(results.imported / (results.processing_time_ms / 1000))} documents/second`)

  return results
}

async function turboDvlaProcessing(maxConcurrency: number) {
  const startTime = Date.now()
  console.log(`[TURBO-DVLA] 🚗 Starting TURBO DVLA processing...`)

  // Get all vehicles needing updates
  const vehicles = await sql`
    SELECT registration, make, model, year, color, fuel_type, engine_size, mot_status
    FROM vehicles
    WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
    ORDER BY registration
  `

  console.log(`[TURBO-DVLA] 🎯 Found ${vehicles.length} vehicles needing DVLA updates`)

  const results = {
    total_vehicles: vehicles.length,
    updated: 0,
    failed: 0,
    processing_time_ms: 0
  }

  // Process with controlled concurrency (respecting DVLA rate limits)
  const processVehicle = async (vehicle: any) => {
    try {
      const dvlaData = await lookupVehicle(vehicle.registration)

      if (!dvlaData) {
        return { success: false, registration: vehicle.registration, error: 'No DVLA data' }
      }

      // Prepare update
      const updates = []
      const values = []
      let paramIndex = 1

      if (!vehicle.year && dvlaData.yearOfManufacture) {
        updates.push(`year = $${paramIndex++}`)
        values.push(dvlaData.yearOfManufacture)
      }

      if (!vehicle.color && dvlaData.colour) {
        updates.push(`color = $${paramIndex++}`)
        values.push(dvlaData.colour)
      }

      if (!vehicle.fuel_type && dvlaData.fuelType) {
        updates.push(`fuel_type = $${paramIndex++}`)
        values.push(dvlaData.fuelType)
      }

      if (!vehicle.engine_size && dvlaData.engineCapacity) {
        updates.push(`engine_size = $${paramIndex++}`)
        values.push(dvlaData.engineCapacity)
      }

      updates.push(`mot_status = $${paramIndex++}`)
      values.push(dvlaData.motStatus)

      if (dvlaData.motExpiryDate) {
        updates.push(`mot_expiry_date = $${paramIndex++}`)
        values.push(dvlaData.motExpiryDate)
      }

      if (dvlaData.taxStatus) {
        updates.push(`tax_status = $${paramIndex++}`)
        values.push(dvlaData.taxStatus)
      }

      updates.push(`updated_at = NOW()`)

      if (updates.length > 1) {
        values.push(vehicle.registration)

        const updateQuery = `
          UPDATE vehicles
          SET ${updates.join(', ')}
          WHERE registration = $${paramIndex}
        `

        await sql.query(updateQuery, values)

        // Create MOT history
        if (dvlaData.motExpiryDate) {
          try {
            const testDate = new Date(new Date(dvlaData.motExpiryDate).getTime() - 365*24*60*60*1000).toISOString().split('T')[0]
            const testResult = dvlaData.motStatus === 'Valid' ? 'PASS' :
                              dvlaData.motStatus === 'Not valid' ? 'EXPIRED' : 'UNKNOWN'

            await sql`
              INSERT INTO mot_history (
                vehicle_registration, test_date, test_result, expiry_date, created_at
              ) VALUES (
                ${vehicle.registration}, ${testDate}, ${testResult}, ${dvlaData.motExpiryDate}, NOW()
              )
              ON CONFLICT DO NOTHING
            `
          } catch (motError) {
            console.log(`[TURBO-DVLA] MOT history failed for ${vehicle.registration}`)
          }
        }

        return { success: true, registration: vehicle.registration, fields_updated: updates.length - 1 }
      }

      return { success: false, registration: vehicle.registration, error: 'No updates needed' }

    } catch (error) {
      return { success: false, registration: vehicle.registration, error: error.message }
    }
  }

  // Process with semaphore for rate limiting
  const semaphore = new Array(Math.min(maxConcurrency, 10)).fill(null) // Max 10 concurrent DVLA calls
  let vehicleIndex = 0

  const processNext = async () => {
    if (vehicleIndex >= vehicles.length) return null

    const vehicle = vehicles[vehicleIndex++]
    const result = await processVehicle(vehicle)

    if (result.success) {
      results.updated++
    } else {
      results.failed++
    }

    if (vehicleIndex % 100 === 0) {
      console.log(`[TURBO-DVLA] 📈 Progress: ${results.updated} updated, ${results.failed} failed (${vehicleIndex}/${vehicles.length})`)
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 100)) // 100ms = 10 RPS max

    return processNext()
  }

  // Start concurrent processing
  await Promise.all(semaphore.map(() => processNext()))

  results.processing_time_ms = Date.now() - startTime

  console.log(`[TURBO-DVLA] ✅ COMPLETED: ${results.updated} vehicles updated in ${Math.round(results.processing_time_ms / 1000)} seconds`)
  console.log(`[TURBO-DVLA] 🚀 Speed: ${Math.round(results.updated / (results.processing_time_ms / 60000))} vehicles/minute`)

  return results
}
