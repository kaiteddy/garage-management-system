import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import Papa from "papaparse"
import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"

// Performance optimization: Create indexes for faster imports
async function createPerformanceIndexes() {
  try {
    console.log(`🔧 [PERFORMANCE] Creating database indexes for faster imports...`)

    // Create indexes if they don't exist
    await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_doc_number ON documents(doc_number)`
    await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name ON customers(LOWER(first_name || ' ' || last_name))`
    await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_registration ON vehicles(UPPER(REPLACE(registration, ' ', '')))`

    console.log(`✅ [PERFORMANCE] Database indexes created`)
  } catch (error) {
    console.log(`⚠️ [PERFORMANCE] Index creation skipped (may already exist):`, error.message)
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const action = formData.get('action') as string
    const source = formData.get('source') as string

    let files: Array<[string, File | { name: string, content: string }]> = []

    // Check if this is a filesystem import (GA4 export)
    if (action === 'import' && source === 'ga4_export') {
      console.log(`🚀 [IMPORT] Starting GA4 filesystem import...`)

      // Read files from GA4 EXPORT directory on desktop
      const exportDir = path.join(process.env.HOME || '', 'Desktop', 'GA4 EXPORT')
      console.log(`🔍 [IMPORT] Looking for GA4 files in: ${exportDir}`)
      console.log(`🔍 [IMPORT] Directory exists: ${fs.existsSync(exportDir)}`)
      const processingOrder = [
        'Customers.csv',
        'Vehicles.csv',
        'Documents.csv',
        'LineItems.csv',
        'Document_Extras.csv',
        'Appointments.csv',
        'Receipts.csv',
        'Reminder_Templates.csv',
        'Reminders.csv',
        'Stock.csv'
      ]

      for (const fileName of processingOrder) {
        const filePath = path.join(exportDir, fileName)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          files.push([`file_${fileName}`, { name: fileName, content }])
        }
      }

      console.log(`🚀 [IMPORT] Found ${files.length} GA4 export files...`)
    } else {
      // Handle uploaded files
      files = Array.from(formData.entries()).filter(([key]) => key.startsWith('file_'))
      console.log(`🚀 [IMPORT] Starting upload import with ${files.length} files...`)
    }

    // Create performance indexes before starting import
    await createPerformanceIndexes()
    
    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      files_processed: 0,
      total_records: 0,
      preserved_connections: 0,
      new_records: 0,
      updated_records: 0,
      errors: [],
      summary: {}
    }

    // Process files in specific order to maintain referential integrity
    const processingOrder = [
      'Customers.csv',
      'Vehicles.csv', 
      'Documents.csv',
      'LineItems.csv',
      'Document_Extras.csv',
      'Appointments.csv',
      'Receipts.csv',
      'Reminder_Templates.csv',
      'Reminders.csv',
      'Stock.csv'
    ]

    for (const fileName of processingOrder) {
      const fileEntry = files.find(([key, file]) =>
        file.name.toLowerCase().includes(fileName.toLowerCase())
      )

      if (!fileEntry) {
        console.log(`⏭️ [IMPORT] Skipping ${fileName} - file not found`)
        continue
      }

      const [, file] = fileEntry

      try {
        console.log(`📁 [IMPORT] Processing ${file.name}...`)

        // Handle both File objects and our custom file objects
        const text = 'content' in file ? file.content : await (file as File).text()
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        })

        if (parsed.errors.length > 0) {
          console.error(`❌ [IMPORT] Parse errors in ${file.name}:`, parsed.errors)
          results.errors.push(`Parse errors in ${file.name}: ${parsed.errors.map(e => e.message).join(', ')}`)
          continue
        }

        const data = parsed.data as any[]
        console.log(`📊 [IMPORT] ${file.name}: ${data.length} records`)

        let processed = 0
        let newRecords = 0
        let updatedRecords = 0
        let preservedConnections = 0

        // Process based on file type
        if (fileName === 'Customers.csv') {
          const result = await processCustomers(data)
          processed = result.processed
          newRecords = result.newRecords
          updatedRecords = result.updatedRecords
        } 
        else if (fileName === 'Vehicles.csv') {
          const result = await processVehicles(data)
          processed = result.processed
          newRecords = result.newRecords
          updatedRecords = result.updatedRecords
          preservedConnections = result.preservedConnections
        }
        else if (fileName === 'Documents.csv') {
          const result = await processDocuments(data)
          processed = result.processed
          newRecords = result.newRecords
          updatedRecords = result.updatedRecords
        }
        else if (fileName === 'LineItems.csv') {
          const result = await processLineItems(data)
          processed = result.processed
          newRecords = result.newRecords
          updatedRecords = result.updatedRecords
        }
        else if (fileName === 'Document_Extras.csv') {
          const result = await processDocumentExtras(data)
          processed = result.processed
          newRecords = result.newRecords
          updatedRecords = result.updatedRecords
        }
        else {
          console.log(`⏭️ [IMPORT] ${fileName} processing not yet implemented`)
          continue
        }

        results.files_processed++
        results.total_records += processed
        results.new_records += newRecords
        results.updated_records += updatedRecords
        results.preserved_connections += preservedConnections
        
        results.summary[fileName] = {
          processed,
          newRecords,
          updatedRecords,
          preservedConnections
        }

        console.log(`✅ [IMPORT] ${file.name}: ${processed} processed, ${newRecords} new, ${updatedRecords} updated`)

      } catch (error) {
        console.error(`❌ [IMPORT] Error processing ${file.name}:`, error)
        results.errors.push(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`🎉 [IMPORT] Import completed: ${results.files_processed} files, ${results.total_records} records`)

    return NextResponse.json(results)

  } catch (error) {
    console.error('❌ [IMPORT] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Customer processing with smart merge capabilities
async function processCustomers(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0
  let mergedRecords = 0

  console.log(`🔍 [CUSTOMERS] Processing ${data.length} customer records with smart merge...`)

  for (const row of data) {
    try {
      // Smart matching: phone, email, or name combination
      const existing = await sql`
        SELECT id, first_name, last_name, phone, email, created_at FROM customers
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
          END,
          created_at ASC
        LIMIT 1
      `

      if (existing.length > 0) {
        const existingCustomer = existing[0]

        // Smart merge: only update if new data is better
        const updates = []
        const values = []

        // First name: update if existing is empty or new is longer/better
        if (row.first_name || row.firstName) {
          const newFirstName = row.first_name || row.firstName
          if (!existingCustomer.first_name ||
              existingCustomer.first_name.length < newFirstName.length ||
              existingCustomer.first_name.toLowerCase() === 'customer' ||
              existingCustomer.first_name.toLowerCase() === 'unknown') {
            updates.push('first_name = $' + (values.length + 1))
            values.push(newFirstName)
          }
        }

        // Last name: similar logic
        if (row.last_name || row.lastName) {
          const newLastName = row.last_name || row.lastName
          if (!existingCustomer.last_name ||
              existingCustomer.last_name.length < newLastName.length ||
              /^\d+$/.test(existingCustomer.last_name)) { // Replace if it's just numbers
            updates.push('last_name = $' + (values.length + 1))
            values.push(newLastName)
          }
        }

        // Phone: update if existing is empty or new is longer
        if (row.phone && row.phone.length >= 10) {
          if (!existingCustomer.phone || existingCustomer.phone.length < row.phone.length) {
            updates.push('phone = $' + (values.length + 1))
            values.push(row.phone)
          }
        }

        // Email: update if existing is empty, placeholder, or new is better
        if (row.email && row.email.includes('@') && !row.email.includes('placeholder')) {
          if (!existingCustomer.email ||
              existingCustomer.email.includes('placeholder') ||
              existingCustomer.email === '') {
            updates.push('email = $' + (values.length + 1))
            values.push(row.email)
          }
        }

        // Address fields: update if existing is empty
        if (row.address_line1 || row.addressLine1) {
          updates.push('address_line1 = COALESCE(address_line1, $' + (values.length + 1) + ')')
          values.push(row.address_line1 || row.addressLine1)
        }

        if (row.city) {
          updates.push('city = COALESCE(city, $' + (values.length + 1) + ')')
          values.push(row.city)
        }

        if (row.postcode || row.postal_code) {
          updates.push('postcode = COALESCE(postcode, $' + (values.length + 1) + ')')
          values.push(row.postcode || row.postal_code)
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()')
          const updateQuery = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${values.length + 1}`
          values.push(existingCustomer.id)

          await sql.unsafe(updateQuery, values)
          updatedRecords++

          console.log(`📝 [CUSTOMERS] Updated: ${existingCustomer.first_name} ${existingCustomer.last_name} with ${updates.length - 1} fields`)
        } else {
          mergedRecords++
        }
      } else {
        // Insert new customer with data validation
        const firstName = row.first_name || row.firstName || 'Customer'
        const lastName = row.last_name || row.lastName || (row.phone ? row.phone.slice(-4) : 'Unknown')

        const customerId = randomUUID()
        await sql`
          INSERT INTO customers (
            id, first_name, last_name, email, phone,
            address_line1, city, postcode
          ) VALUES (
            ${customerId},
            ${firstName},
            ${lastName},
            ${row.email && row.email.includes('@') ? row.email : `placeholder-${customerId}@example.com`},
            ${row.phone || null},
            ${row.address_line1 || row.addressLine1 || null},
            ${row.city || null},
            ${row.postcode || row.postal_code || null}
          )
        `
        newRecords++
        console.log(`✨ [CUSTOMERS] Created: ${firstName} ${lastName}`)
      }
      processed++
    } catch (error) {
      console.error('Error processing customer:', error)
    }
  }

  console.log(`✅ [CUSTOMERS] Completed: ${processed} processed, ${newRecords} new, ${updatedRecords} updated, ${mergedRecords} merged`)
  return { processed, newRecords, updatedRecords, mergedRecords }
}

// Vehicle processing with smart merge and connection preservation
async function processVehicles(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0
  let preservedConnections = 0
  let smartLinked = 0

  console.log(`🚗 [VEHICLES] Processing ${data.length} vehicle records with smart merge...`)
  console.log(`🔍 [VEHICLES] Sample data structure:`, data.slice(0, 2))

  for (const row of data) {
    try {
      const registration = (row.Registration || row.registration || row.reg || '').toUpperCase().replace(/\s/g, '')
      console.log(`🔍 [VEHICLES] Processing row: registration="${registration}", raw_Registration="${row.Registration}", raw_registration="${row.registration}"`)
      if (!registration) {
        console.log(`⚠️ [VEHICLES] Skipping row - no registration found`)
        continue
      }

      // Check if vehicle exists
      const existing = await sql`
        SELECT registration, customer_id, owner_id, make, model, year FROM vehicles
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration}
        LIMIT 1
      `

      if (existing.length > 0) {
        const vehicle = existing[0]
        const hasExistingConnection = vehicle.customer_id || vehicle.owner_id

        // Smart merge: only update if new data is better
        const updates = []
        const values = []

        // Make: update if existing is empty or new is more specific
        const make = row.Make || row.make || ''
        if (make && make.length > 2) {
          if (!vehicle.make || vehicle.make.length < make.length) {
            updates.push('make = $' + (values.length + 1))
            values.push(make)
          }
        }

        // Model: update if existing is empty or new is more specific
        const model = row.Model || row.model || ''
        if (model && model.length > 2) {
          if (!vehicle.model || vehicle.model.length < model.length) {
            updates.push('model = $' + (values.length + 1))
            values.push(model)
          }
        }

        // Year: update if existing is null or new is more recent/accurate
        const year = row.DateofReg ? new Date(row.DateofReg).getFullYear() : (row.year || row.Year || null)
        if (year && parseInt(year) > 1990 && parseInt(year) <= new Date().getFullYear()) {
          if (!vehicle.year || Math.abs(parseInt(year) - new Date().getFullYear()) < Math.abs(vehicle.year - new Date().getFullYear())) {
            updates.push('year = $' + (values.length + 1))
            values.push(parseInt(year))
          }
        }

        // Other fields: update if existing is empty
        const color = row.Colour || row.color || row.colour || ''
        if (color) {
          updates.push('color = COALESCE(color, $' + (values.length + 1) + ')')
          values.push(color)
        }

        const vin = row.VIN || row.vin || ''
        if (vin && vin.length >= 10) {
          updates.push('vin = COALESCE(vin, $' + (values.length + 1) + ')')
          values.push(vin)
        }

        const engineSize = row.EngineCC || row.engine_size || null
        if (engineSize) {
          updates.push('engine_size = COALESCE(engine_size, $' + (values.length + 1) + ')')
          values.push(engineSize)
        }

        const fuelType = row.FuelType || row.fuel_type || ''
        if (fuelType) {
          updates.push('fuel_type = COALESCE(fuel_type, $' + (values.length + 1) + ')')
          values.push(fuelType)
        }

        // MOT date if provided
        if (row.mot_expiry_date || row.mot_expiry) {
          updates.push('mot_expiry_date = COALESCE(mot_expiry_date, $' + (values.length + 1) + ')')
          values.push(row.mot_expiry_date || row.mot_expiry)
        }

        // Smart customer linking if no existing connection
        if (!hasExistingConnection && (row.customer_name || row.owner_name)) {
          const customerName = row.customer_name || row.owner_name
          const customer = await sql`
            SELECT id FROM customers
            WHERE LOWER(first_name || ' ' || last_name) = LOWER(${customerName})
            OR LOWER(last_name || ', ' || first_name) = LOWER(${customerName})
            LIMIT 1
          `

          if (customer.length > 0) {
            updates.push('customer_id = $' + (values.length + 1))
            updates.push('owner_id = $' + (values.length + 2))
            values.push(customer[0].id)
            values.push(customer[0].id)
            smartLinked++
          }
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()')
          const updateQuery = `UPDATE vehicles SET ${updates.join(', ')} WHERE registration = $${values.length + 1}`
          values.push(vehicle.registration)

          await sql.unsafe(updateQuery, values)
          updatedRecords++

          if (hasExistingConnection) {
            preservedConnections++
          }

          console.log(`📝 [VEHICLES] Updated: ${registration} with ${updates.length - 1} fields`)
        } else if (hasExistingConnection) {
          preservedConnections++
        }
      } else {
        // Insert new vehicle with smart customer linking
        let customerId = null
        let ownerId = null

        // Try to link to customer by name
        if (row.customer_name || row.owner_name) {
          const customerName = row.customer_name || row.owner_name
          const customer = await sql`
            SELECT id FROM customers
            WHERE LOWER(first_name || ' ' || last_name) = LOWER(${customerName})
            OR LOWER(last_name || ', ' || first_name) = LOWER(${customerName})
            LIMIT 1
          `

          if (customer.length > 0) {
            customerId = customer[0].id
            ownerId = customer[0].id
            smartLinked++
          }
        }

        await sql`
          INSERT INTO vehicles (
            registration, make, model, year, color, vin, engine_size,
            fuel_type, mot_expiry_date, customer_id, owner_id
          ) VALUES (
            ${registration},
            ${row.Make || row.make || null},
            ${row.Model || row.model || null},
            ${row.DateofReg ? new Date(row.DateofReg).getFullYear() : (row.year || row.Year || null)},
            ${row.Colour || row.color || row.colour || null},
            ${row.VIN || row.vin || null},
            ${row.EngineCC || row.engine_size || null},
            ${row.FuelType || row.fuel_type || null},
            ${row.mot_expiry_date || row.mot_expiry || null},
            ${customerId},
            ${ownerId}
          )
        `
        newRecords++
        console.log(`✨ [VEHICLES] Created: ${registration}${customerId ? ' (linked to customer)' : ''}`)
      }
      processed++
    } catch (error) {
      console.error('Error processing vehicle:', error)
    }
  }

  console.log(`✅ [VEHICLES] Completed: ${processed} processed, ${newRecords} new, ${updatedRecords} updated, ${preservedConnections} preserved, ${smartLinked} smart-linked`)
  return { processed, newRecords, updatedRecords, preservedConnections, smartLinked }
}

// Document processing with smart merge and linking - PERFORMANCE OPTIMIZED
async function processDocuments(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0
  let smartLinked = 0

  console.log(`🚀 [DOCUMENTS] PERFORMANCE MODE: Processing ${data.length} document records with batch inserts...`)
  const startTime = Date.now()

  // Helper function to validate and format UK date format (DD/MM/YYYY)
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '' || dateStr === '01/01/2000') return null

    try {
      // Handle DD/MM/YYYY format (UK format) - keep as is but validate
      const parts = dateStr.trim().split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        const year = parseInt(parts[2], 10)

        // Validate date components
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          const dayStr = day.toString().padStart(2, '0')
          const monthStr = month.toString().padStart(2, '0')
          return `${dayStr}/${monthStr}/${year}` // Keep DD/MM/YYYY format
        }
      }

      // Try to parse other formats and convert to DD/MM/YYYY
      const isoDate = new Date(dateStr)
      if (!isNaN(isoDate.getTime())) {
        const day = isoDate.getDate().toString().padStart(2, '0')
        const month = (isoDate.getMonth() + 1).toString().padStart(2, '0')
        const year = isoDate.getFullYear()
        return `${day}/${month}/${year}`
      }

      return null
    } catch (error) {
      console.log(`Date parsing error for "${dateStr}":`, error)
      return null
    }
  }

  // Process in batches of 500 with parallel processing for maximum speed
  const BATCH_SIZE = 500
  const PARALLEL_BATCHES = 3 // Process 3 batches simultaneously
  console.log(`🚀 [DOCUMENTS] Processing ${data.length} documents in batches of ${BATCH_SIZE} with ${PARALLEL_BATCHES} parallel workers`)

  // Split data into chunks for parallel processing
  const chunks = []
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    chunks.push(data.slice(i, i + BATCH_SIZE))
  }

  // Process chunks in parallel batches
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += PARALLEL_BATCHES) {
    const parallelChunks = chunks.slice(chunkIndex, chunkIndex + PARALLEL_BATCHES)

    // Process multiple batches in parallel
    const batchPromises = parallelChunks.map(async (batch, batchIdx) => {
      const actualBatchIndex = chunkIndex + batchIdx + 1
      console.log(`📦 [DOCUMENTS] Processing batch ${actualBatchIndex}/${chunks.length} (${batch.length} documents)`)

      // Prepare batch data
      const batchInserts = []

      for (const row of batch) {
      try {
        const docNumber = row.docNumber_Invoice || row.docNumber_Estimate || row.docNumber_Jobsheet || row.doc_number || row.document_number || row.number || row._ID || ''
        if (!docNumber) {
          continue
        }

        // Prepare document data for batch processing
        const rawDate = row.docDate_Issued || row.doc_date_issued || row.date_issued
        const parsedDate = parseDate(rawDate)

        // Smart customer linking
        let customerId = row._ID_Customer || null
        const customerName = row.custName_Company || (row.custName_Forename && row.custName_Surname ? row.custName_Forename + ' ' + row.custName_Surname : '') || row.customer_name || row.customerName || ''

        // Smart vehicle linking
        let vehicleRegistration = row.vehRegistration || row.vehicle_registration || row.registration || row.reg || ''
        if (vehicleRegistration) {
          vehicleRegistration = vehicleRegistration.toUpperCase().replace(/\s/g, '')
        }

        batchInserts.push({
          docNumber,
          docType: row.docType || row.doc_type || row.type || 'Service',
          parsedDate,
          customerName: customerName || '',
          customerId,
          vehicleRegistration: vehicleRegistration || null,
          totalNet: parseFloat(row.us_TotalNET || row.total_net || row.net_total || '0') || 0,
          totalTax: parseFloat(row.us_TotalTAX || row.total_vat || row.vat_total || '0') || 0,
          totalGross: parseFloat(row.us_TotalGROSS || row.total_gross || row.gross_total || '0') || 0
        })
      } catch (error) {
        console.error('Error preparing document:', error)
      }
    }

    // Bulk insert all documents in this batch
    if (batchInserts.length > 0) {
      try {
        const values = batchInserts.map(doc =>
          `('${randomUUID()}', '${doc.docNumber}', '${doc.docType}', ${doc.parsedDate ? `'${doc.parsedDate}'` : 'NULL'}, '${doc.customerName.replace(/'/g, "''")}', ${doc.customerId ? `'${doc.customerId}'` : 'NULL'}, ${doc.vehicleRegistration ? `'${doc.vehicleRegistration}'` : 'NULL'}, ${doc.totalNet}, ${doc.totalTax}, ${doc.totalGross})`
        ).join(',')

        await sql.unsafe(`
          INSERT INTO documents (_id, doc_number, doc_type, doc_date_issued, customer_name, _id_customer, vehicle_registration, total_net, total_tax, total_gross)
          VALUES ${values}
          ON CONFLICT (doc_number) DO NOTHING
        `)

        newRecords += batchInserts.length
        processed += batchInserts.length
        console.log(`✨ [DOCUMENTS] Batch inserted ${batchInserts.length} documents`)
      } catch (error) {
        console.error('Batch insert error:', error)
        // Fall back to individual inserts if batch fails
        for (const doc of batchInserts) {
          try {
            await sql`
              INSERT INTO documents (
                _id, doc_number, doc_type, doc_date_issued, customer_name, _id_customer,
                vehicle_registration, total_net, total_tax, total_gross
              ) VALUES (
                ${randomUUID()},
                ${doc.docNumber},
                ${doc.docType},
                ${doc.parsedDate},
                ${doc.customerName},
                ${doc.customerId},
                ${doc.vehicleRegistration},
                ${doc.totalNet},
                ${doc.totalTax},
                ${doc.totalGross}
              )
              ON CONFLICT (doc_number) DO NOTHING
            `
            newRecords++
            processed++
          } catch (individualError) {
            console.error('Individual insert error:', individualError)
          }
        }
      }

      return { batchInserts: batchInserts.length, batchProcessed: batch.length }
    })

    // Wait for all parallel batches to complete
    const batchResults = await Promise.all(batchPromises)

    // Update counters
    for (const result of batchResults) {
      newRecords += result.batchInserts
      processed += result.batchProcessed
    }

    console.log(`✅ [DOCUMENTS] Completed parallel batch set ${Math.floor(chunkIndex/PARALLEL_BATCHES) + 1} - Total processed: ${processed}`)
  }



  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000
  const docsPerSecond = Math.round(processed / duration)

  console.log(`🎉 [DOCUMENTS] PERFORMANCE COMPLETE: ${processed} processed, ${newRecords} new in ${duration}s (${docsPerSecond} docs/sec)`)
  return { processed, newRecords, updatedRecords, smartLinked }
}

// Line items processing
async function processLineItems(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of data) {
    try {
      const documentId = row._ID_Document || row.document_id || row.doc_id || ''
      console.log(`🔍 [LINE_ITEMS] Processing row: documentId="${documentId}", raw_ID_Document="${row._ID_Document}", raw_document_id="${row.document_id}"`)
      if (!documentId) {
        console.log(`⚠️ [LINE_ITEMS] Skipping row - no document ID found`)
        continue
      }

      // Check if line item exists
      const existing = await sql`
        SELECT id FROM line_items
        WHERE document_id = ${documentId}
        AND description = ${row.description || ''}
        LIMIT 1
      `

      if (existing.length > 0) {
        // Update existing line item
        await sql`
          UPDATE line_items SET
            quantity = COALESCE(${parseFloat(row.quantity || '0') || 0}, quantity),
            unit_price = COALESCE(${parseFloat(row.unit_price || row.price || '0') || 0}, unit_price),
            total_amount = COALESCE(${parseFloat(row.total_price || row.total || '0') || 0}, total_amount),
            tax_rate = COALESCE(${parseFloat(row.vat_rate || row.tax_rate || '0') || 0}, tax_rate),
            tax_amount = COALESCE(${parseFloat(row.vat_amount || row.tax_amount || '0') || 0}, tax_amount),
            updated_at = NOW()
          WHERE id = ${existing[0].id}
        `
        updatedRecords++
      } else {
        // Insert new line item
        const lineItemId = randomUUID()
        await sql`
          INSERT INTO line_items (
            id, document_id, line_type, description, quantity, unit_price,
            tax_rate, tax_amount, total_amount
          ) VALUES (
            ${lineItemId},
            ${documentId},
            ${row.itemType || row.line_type || 'service'},
            ${row.itemDescription || row.description || ''},
            ${parseFloat(row.itemQuantity || row.quantity || '1') || 1},
            ${parseFloat(row.itemUnitPrice || row.unit_price || row.price || '0') || 0},
            ${parseFloat(row.itemTaxRate || row.vat_rate || row.tax_rate || '0') || 0},
            ${parseFloat(row.itemSub_Tax || row.vat_amount || row.tax_amount || '0') || 0},
            ${parseFloat(row.itemSub_Gross || row.total_price || row.total || '0') || 0}
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

// Document extras processing
async function processDocumentExtras(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of data) {
    try {
      const documentId = row._ID || row.document_id || row.doc_id || ''
      console.log(`🔍 [DOCUMENT_EXTRAS] Processing row: documentId="${documentId}", raw_ID="${row._ID}", raw_document_id="${row.document_id}"`)
      if (!documentId) {
        console.log(`⚠️ [DOCUMENT_EXTRAS] Skipping row - no document ID found`)
        continue
      }

      // Check if extra exists
      const existing = await sql`
        SELECT id FROM document_extras
        WHERE document_id = ${documentId}
        AND labour_description = ${row.labour_description || row.description || ''}
        LIMIT 1
      `

      if (existing.length > 0) {
        // Update existing extra (only update doc_notes if provided)
        if (row.doc_notes || row.notes) {
          await sql`
            UPDATE document_extras SET
              doc_notes = COALESCE(${row.doc_notes || row.notes || null}, doc_notes)
            WHERE id = ${existing[0].id}
          `
          updatedRecords++
        }
      } else {
        // Insert new extra
        const extraId = randomUUID()
        await sql`
          INSERT INTO document_extras (
            id, document_id, labour_description, doc_notes
          ) VALUES (
            ${extraId},
            ${documentId},
            ${row['Labour Description'] || row.labour_description || row.description || ''},
            ${row.docNotes || row.doc_notes || row.notes || null}
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
