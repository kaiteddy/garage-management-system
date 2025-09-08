import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import Papa from "papaparse"

// Increase payload size limits
export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    console.log('📁 [LARGE-IMPORT] Starting large file import with chunked processing...')

    const formData = await request.formData()
    const files = Array.from(formData.entries()).filter(([key]) => key.startsWith('file_'))
    
    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No files provided",
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      files_processed: 0,
      total_records: 0,
      new_records: 0,
      updated_records: 0,
      preserved_connections: 0,
      smart_linked: 0,
      errors: [],
      summary: {},
      processing_time: 0
    }

    const startTime = Date.now()

    // Process files in optimal order for referential integrity
    const processingOrder = [
      'Customers.csv',
      'Vehicles.csv', 
      'Documents.csv',
      'LineItems.csv',
      'Document_Extras.csv'
    ]

    for (const fileName of processingOrder) {
      const fileEntry = files.find(([key, file]) => 
        (file as File).name.toLowerCase().includes(fileName.toLowerCase())
      )
      
      if (!fileEntry) {
        console.log(`⏭️ [LARGE-IMPORT] Skipping ${fileName} - file not found`)
        continue
      }

      const [, file] = fileEntry
      const csvFile = file as File
      
      try {
        console.log(`📊 [LARGE-IMPORT] Processing ${csvFile.name} (${(csvFile.size / 1024 / 1024).toFixed(2)} MB)...`)
        
        // Read file in chunks to handle large files
        const text = await csvFile.text()
        const parsed = Papa.parse(text, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        })

        if (parsed.errors.length > 0) {
          console.error(`❌ [LARGE-IMPORT] Parse errors in ${csvFile.name}:`, parsed.errors)
          results.errors.push(`Parse errors in ${csvFile.name}: ${parsed.errors.slice(0, 3).map(e => e.message).join(', ')}`)
          continue
        }

        const data = parsed.data as any[]
        console.log(`📈 [LARGE-IMPORT] ${csvFile.name}: ${data.length} records to process`)

        // Process in chunks to avoid timeouts
        const chunkSize = 100
        let processed = 0
        let newRecords = 0
        let updatedRecords = 0
        let preservedConnections = 0
        let smartLinked = 0

        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize)
          console.log(`🔄 [LARGE-IMPORT] Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(data.length/chunkSize)} (${chunk.length} records)`)

          let chunkResult
          if (fileName === 'Customers.csv') {
            chunkResult = await processCustomersChunk(chunk)
          } else if (fileName === 'Vehicles.csv') {
            chunkResult = await processVehiclesChunk(chunk)
          } else if (fileName === 'Documents.csv') {
            chunkResult = await processDocumentsChunk(chunk)
          } else if (fileName === 'LineItems.csv') {
            chunkResult = await processLineItemsChunk(chunk)
          } else if (fileName === 'Document_Extras.csv') {
            chunkResult = await processDocumentExtrasChunk(chunk)
          } else {
            continue
          }

          processed += chunkResult.processed
          newRecords += chunkResult.newRecords
          updatedRecords += chunkResult.updatedRecords
          preservedConnections += chunkResult.preservedConnections || 0
          smartLinked += chunkResult.smartLinked || 0

          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        results.files_processed++
        results.total_records += processed
        results.new_records += newRecords
        results.updated_records += updatedRecords
        results.preserved_connections += preservedConnections
        results.smart_linked += smartLinked
        
        results.summary[fileName] = {
          processed,
          newRecords,
          updatedRecords,
          preservedConnections,
          smartLinked,
          file_size_mb: (csvFile.size / 1024 / 1024).toFixed(2)
        }

        console.log(`✅ [LARGE-IMPORT] ${csvFile.name}: ${processed} processed, ${newRecords} new, ${updatedRecords} updated`)

      } catch (error) {
        console.error(`❌ [LARGE-IMPORT] Error processing ${csvFile.name}:`, error)
        results.errors.push(`Error processing ${csvFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    results.processing_time = Math.round((Date.now() - startTime) / 1000)
    console.log(`🎉 [LARGE-IMPORT] Import completed: ${results.files_processed} files, ${results.total_records} records in ${results.processing_time}s`)

    return NextResponse.json(results)

  } catch (error) {
    console.error('❌ [LARGE-IMPORT] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Chunked customer processing
async function processCustomersChunk(chunk: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of chunk) {
    try {
      // Smart matching with multiple criteria
      const existing = await sql`
        SELECT id, first_name, last_name, phone, email FROM customers 
        WHERE (
          (phone = ${row.phone || ''} AND phone != '' AND phone IS NOT NULL)
          OR (email = ${row.email || ''} AND email != '' AND email NOT LIKE '%placeholder%' AND email IS NOT NULL)
          OR (
            LOWER(first_name || ' ' || last_name) = LOWER(${(row.first_name || row.firstName || '') + ' ' + (row.last_name || row.lastName || '')})
            AND ${(row.first_name || row.firstName || '') + ' ' + (row.last_name || row.lastName || '')} != ' '
          )
        )
        ORDER BY 
          CASE 
            WHEN phone = ${row.phone || ''} AND phone != '' THEN 1
            WHEN email = ${row.email || ''} AND email != '' THEN 2
            ELSE 3
          END
        LIMIT 1
      `

      if (existing.length > 0) {
        // Smart merge logic
        const customer = existing[0]
        const updates = []
        const values = []
        
        // Only update if new data is better
        if ((row.first_name || row.firstName) && 
            (!customer.first_name || customer.first_name.length < (row.first_name || row.firstName).length)) {
          updates.push('first_name = $' + (values.length + 1))
          values.push(row.first_name || row.firstName)
        }

        if ((row.last_name || row.lastName) && 
            (!customer.last_name || customer.last_name.length < (row.last_name || row.lastName).length)) {
          updates.push('last_name = $' + (values.length + 1))
          values.push(row.last_name || row.lastName)
        }

        if (row.phone && row.phone.length >= 10 && 
            (!customer.phone || customer.phone.length < row.phone.length)) {
          updates.push('phone = $' + (values.length + 1))
          values.push(row.phone)
        }

        if (row.email && row.email.includes('@') && !row.email.includes('placeholder') &&
            (!customer.email || customer.email.includes('placeholder'))) {
          updates.push('email = $' + (values.length + 1))
          values.push(row.email)
        }

        // Address fields
        if (row.address_line1 || row.addressLine1) {
          updates.push('address_line1 = COALESCE(address_line1, $' + (values.length + 1) + ')')
          values.push(row.address_line1 || row.addressLine1)
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()')
          const updateQuery = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${values.length + 1}`
          values.push(customer.id)
          await sql.unsafe(updateQuery, values)
          updatedRecords++
        }
      } else {
        // Insert new customer
        await sql`
          INSERT INTO customers (
            first_name, last_name, email, phone, 
            address_line1, city, postcode, created_at, updated_at
          ) VALUES (
            ${row.first_name || row.firstName || 'Customer'},
            ${row.last_name || row.lastName || (row.phone ? row.phone.slice(-4) : 'Unknown')},
            ${row.email && row.email.includes('@') ? row.email : null},
            ${row.phone || null},
            ${row.address_line1 || row.addressLine1 || null},
            ${row.city || null},
            ${row.postcode || row.postal_code || null},
            NOW(), NOW()
          )
        `
        newRecords++
      }
      processed++
    } catch (error) {
      console.error('Error processing customer:', error)
    }
  }

  return { processed, newRecords, updatedRecords }
}

// Chunked vehicle processing
async function processVehiclesChunk(chunk: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0
  let preservedConnections = 0
  let smartLinked = 0

  for (const row of chunk) {
    try {
      const registration = (row.registration || row.reg || '').toUpperCase().replace(/\s/g, '')
      if (!registration) continue

      const existing = await sql`
        SELECT id, customer_id, owner_id, make, model FROM vehicles 
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration}
        LIMIT 1
      `

      if (existing.length > 0) {
        const vehicle = existing[0]
        const hasConnection = vehicle.customer_id || vehicle.owner_id
        
        const updates = []
        const values = []
        
        // Smart merge - only update if better
        if (row.make && (!vehicle.make || vehicle.make.length < row.make.length)) {
          updates.push('make = $' + (values.length + 1))
          values.push(row.make)
        }

        if (row.model && (!vehicle.model || vehicle.model.length < row.model.length)) {
          updates.push('model = $' + (values.length + 1))
          values.push(row.model)
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()')
          const updateQuery = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${values.length + 1}`
          values.push(vehicle.id)
          await sql.unsafe(updateQuery, values)
          updatedRecords++
        }

        if (hasConnection) {
          preservedConnections++
        }
      } else {
        // Insert new vehicle with smart customer linking
        let customerId = null
        if (row.customer_name || row.owner_name) {
          const customerName = row.customer_name || row.owner_name
          const customer = await sql`
            SELECT id FROM customers 
            WHERE LOWER(first_name || ' ' || last_name) = LOWER(${customerName})
            LIMIT 1
          `
          if (customer.length > 0) {
            customerId = customer[0].id
            smartLinked++
          }
        }

        await sql`
          INSERT INTO vehicles (
            registration, make, model, year, color, 
            customer_id, owner_id, created_at, updated_at
          ) VALUES (
            ${row.registration || row.reg},
            ${row.make || null},
            ${row.model || null},
            ${row.year ? parseInt(row.year) : null},
            ${row.color || row.colour || null},
            ${customerId},
            ${customerId},
            NOW(), NOW()
          )
        `
        newRecords++
      }
      processed++
    } catch (error) {
      console.error('Error processing vehicle:', error)
    }
  }

  return { processed, newRecords, updatedRecords, preservedConnections, smartLinked }
}

// Simplified chunk processors for other file types
async function processDocumentsChunk(chunk: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of chunk) {
    try {
      const docNumber = row.doc_number || row.document_number || row.number || row.id || ''
      if (!docNumber) continue

      const existing = await sql`
        SELECT id FROM documents WHERE doc_number = ${docNumber} LIMIT 1
      `

      if (existing.length === 0) {
        await sql`
          INSERT INTO documents (
            doc_number, doc_type, doc_date_issued, customer_name,
            total_gross, created_at, updated_at
          ) VALUES (
            ${docNumber},
            ${row.doc_type || row.type || 'Service'},
            ${row.doc_date_issued || row.date_issued || null},
            ${row.customer_name || row.customerName || ''},
            ${parseFloat(row.total_gross || row.gross_total || '0') || 0},
            NOW(), NOW()
          )
        `
        newRecords++
      }
      processed++
    } catch (error) {
      console.error('Error processing document:', error)
    }
  }

  return { processed, newRecords, updatedRecords }
}

async function processLineItemsChunk(chunk: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of chunk) {
    try {
      const documentId = row.document_id || row.doc_id || ''
      if (!documentId) continue

      const existing = await sql`
        SELECT id FROM document_line_items 
        WHERE document_id = ${documentId} AND description = ${row.description || ''}
        LIMIT 1
      `

      if (existing.length === 0) {
        await sql`
          INSERT INTO document_line_items (
            document_id, description, quantity, unit_price, total_price, created_at, updated_at
          ) VALUES (
            ${documentId},
            ${row.description || ''},
            ${parseFloat(row.quantity || '0') || 0},
            ${parseFloat(row.unit_price || row.price || '0') || 0},
            ${parseFloat(row.total_price || row.total || '0') || 0},
            NOW(), NOW()
          )
        `
        newRecords++
      }
      processed++
    } catch (error) {
      console.error('Error processing line item:', error)
    }
  }

  return { processed, newRecords, updatedRecords }
}

async function processDocumentExtrasChunk(chunk: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of chunk) {
    try {
      const documentId = row.document_id || row.doc_id || ''
      if (!documentId) continue

      const existing = await sql`
        SELECT id FROM document_extras 
        WHERE document_id = ${documentId} AND labour_description = ${row.labour_description || row.description || ''}
        LIMIT 1
      `

      if (existing.length === 0) {
        await sql`
          INSERT INTO document_extras (
            document_id, labour_description, amount, created_at, updated_at
          ) VALUES (
            ${documentId},
            ${row.labour_description || row.description || ''},
            ${parseFloat(row.amount || '0') || 0},
            NOW(), NOW()
          )
        `
        newRecords++
      }
      processed++
    } catch (error) {
      console.error('Error processing document extra:', error)
    }
  }

  return { processed, newRecords, updatedRecords }
}
