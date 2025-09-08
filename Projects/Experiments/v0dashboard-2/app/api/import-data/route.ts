import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import Papa from "papaparse"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = Array.from(formData.entries()).filter(([key]) => key.startsWith('file_'))
    
    console.log(`🚀 [IMPORT] Starting fresh import with ${files.length} files...`)
    
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
        (file as File).name.toLowerCase().includes(fileName.toLowerCase())
      )
      
      if (!fileEntry) {
        console.log(`⏭️ [IMPORT] Skipping ${fileName} - file not found`)
        continue
      }

      const [, file] = fileEntry
      const csvFile = file as File
      
      try {
        console.log(`📁 [IMPORT] Processing ${csvFile.name}...`)
        
        const text = await csvFile.text()
        const parsed = Papa.parse(text, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        })

        if (parsed.errors.length > 0) {
          console.error(`❌ [IMPORT] Parse errors in ${csvFile.name}:`, parsed.errors)
          results.errors.push(`Parse errors in ${csvFile.name}: ${parsed.errors.map(e => e.message).join(', ')}`)
          continue
        }

        const data = parsed.data as any[]
        console.log(`📊 [IMPORT] ${csvFile.name}: ${data.length} records`)

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

        console.log(`✅ [IMPORT] ${csvFile.name}: ${processed} processed, ${newRecords} new, ${updatedRecords} updated`)

      } catch (error) {
        console.error(`❌ [IMPORT] Error processing ${csvFile.name}:`, error)
        results.errors.push(`Error processing ${csvFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

        await sql`
          INSERT INTO customers (
            first_name, last_name, email, phone,
            address_line1, city, postcode, created_at, updated_at
          ) VALUES (
            ${firstName},
            ${lastName},
            ${row.email && row.email.includes('@') ? row.email : null},
            ${row.phone || null},
            ${row.address_line1 || row.addressLine1 || null},
            ${row.city || null},
            ${row.postcode || row.postal_code || null},
            NOW(), NOW()
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

  for (const row of data) {
    try {
      const registration = (row.registration || row.reg || '').toUpperCase().replace(/\s/g, '')
      if (!registration) continue

      // Check if vehicle exists
      const existing = await sql`
        SELECT id, customer_id, owner_id, make, model, year FROM vehicles
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
        if (row.make && row.make.length > 2) {
          if (!vehicle.make || vehicle.make.length < row.make.length) {
            updates.push('make = $' + (values.length + 1))
            values.push(row.make)
          }
        }

        // Model: update if existing is empty or new is more specific
        if (row.model && row.model.length > 2) {
          if (!vehicle.model || vehicle.model.length < row.model.length) {
            updates.push('model = $' + (values.length + 1))
            values.push(row.model)
          }
        }

        // Year: update if existing is null or new is more recent/accurate
        if (row.year && parseInt(row.year) > 1990 && parseInt(row.year) <= new Date().getFullYear()) {
          if (!vehicle.year || Math.abs(parseInt(row.year) - new Date().getFullYear()) < Math.abs(vehicle.year - new Date().getFullYear())) {
            updates.push('year = $' + (values.length + 1))
            values.push(parseInt(row.year))
          }
        }

        // Other fields: update if existing is empty
        if (row.color || row.colour) {
          updates.push('color = COALESCE(color, $' + (values.length + 1) + ')')
          values.push(row.color || row.colour)
        }

        if (row.vin && row.vin.length >= 10) {
          updates.push('vin = COALESCE(vin, $' + (values.length + 1) + ')')
          values.push(row.vin)
        }

        if (row.engine_size) {
          updates.push('engine_size = COALESCE(engine_size, $' + (values.length + 1) + ')')
          values.push(row.engine_size)
        }

        if (row.fuel_type) {
          updates.push('fuel_type = COALESCE(fuel_type, $' + (values.length + 1) + ')')
          values.push(row.fuel_type)
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
          const updateQuery = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${values.length + 1}`
          values.push(vehicle.id)

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
            registration, make, model, year, color, vin,
            engine_size, fuel_type, mot_expiry_date,
            customer_id, owner_id, created_at, updated_at
          ) VALUES (
            ${row.registration || row.reg || ''},
            ${row.make || null},
            ${row.model || null},
            ${row.year ? parseInt(row.year) : null},
            ${row.color || row.colour || null},
            ${row.vin || null},
            ${row.engine_size || null},
            ${row.fuel_type || null},
            ${row.mot_expiry_date || row.mot_expiry || null},
            ${customerId},
            ${ownerId},
            NOW(), NOW()
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

// Document processing with smart merge and linking
async function processDocuments(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0
  let smartLinked = 0

  console.log(`📄 [DOCUMENTS] Processing ${data.length} document records with smart merge...`)

  for (const row of data) {
    try {
      const docNumber = row.doc_number || row.document_number || row.number || row.id || ''
      if (!docNumber) continue

      // Check if document exists (by number or ID)
      const existing = await sql`
        SELECT id, _id_customer, customer_name FROM documents
        WHERE doc_number = ${docNumber} OR id::text = ${docNumber}
        LIMIT 1
      `

      // Smart customer linking
      let customerId = null
      if (row.customer_name || row.customerName) {
        const customerName = row.customer_name || row.customerName

        // Try exact match first
        let customer = await sql`
          SELECT id FROM customers
          WHERE LOWER(first_name || ' ' || last_name) = LOWER(${customerName})
          OR LOWER(last_name || ', ' || first_name) = LOWER(${customerName})
          LIMIT 1
        `

        // If no exact match, try partial match
        if (customer.length === 0 && customerName.length > 3) {
          customer = await sql`
            SELECT id FROM customers
            WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER('%' || ${customerName} || '%')
            OR LOWER(last_name) LIKE LOWER('%' || ${customerName.split(' ').pop()} || '%')
            LIMIT 1
          `
        }

        if (customer.length > 0) {
          customerId = customer[0].id
          smartLinked++
        }
      }

      // Smart vehicle linking
      let vehicleRegistration = row.vehicle_registration || row.registration || row.reg || ''
      if (vehicleRegistration) {
        // Standardize registration format
        vehicleRegistration = vehicleRegistration.toUpperCase().replace(/\s/g, '')

        // Verify vehicle exists
        const vehicle = await sql`
          SELECT registration FROM vehicles
          WHERE UPPER(REPLACE(registration, ' ', '')) = ${vehicleRegistration}
          LIMIT 1
        `

        if (vehicle.length > 0) {
          vehicleRegistration = vehicle[0].registration // Use the standardized format from DB
        }
      }

      if (existing.length > 0) {
        const document = existing[0]

        // Smart merge: only update if new data is better
        const updates = []
        const values = []

        // Customer: update if existing is null and we found a match
        if (customerId && !document._id_customer) {
          updates.push('_id_customer = $' + (values.length + 1))
          values.push(customerId)
        }

        // Customer name: update if existing is empty or new is better
        if (row.customer_name || row.customerName) {
          const newCustomerName = row.customer_name || row.customerName
          if (!document.customer_name || document.customer_name.length < newCustomerName.length) {
            updates.push('customer_name = $' + (values.length + 1))
            values.push(newCustomerName)
          }
        }

        // Document type: update if existing is empty
        if (row.doc_type || row.type) {
          updates.push('doc_type = COALESCE(doc_type, $' + (values.length + 1) + ')')
          values.push(row.doc_type || row.type)
        }

        // Date: update if existing is null
        if (row.doc_date_issued || row.date_issued) {
          updates.push('doc_date_issued = COALESCE(doc_date_issued, $' + (values.length + 1) + ')')
          values.push(row.doc_date_issued || row.date_issued)
        }

        // Vehicle registration: update if existing is empty
        if (vehicleRegistration) {
          updates.push('vehicle_registration = COALESCE(vehicle_registration, $' + (values.length + 1) + ')')
          values.push(vehicleRegistration)
        }

        // Financial totals: update if existing is 0 or null
        if (row.total_net || row.net_total) {
          const totalNet = parseFloat(row.total_net || row.net_total || '0') || 0
          if (totalNet > 0) {
            updates.push('total_net = CASE WHEN total_net IS NULL OR total_net = 0 THEN $' + (values.length + 1) + ' ELSE total_net END')
            values.push(totalNet)
          }
        }

        if (row.total_vat || row.vat_total) {
          const totalVat = parseFloat(row.total_vat || row.vat_total || '0') || 0
          if (totalVat > 0) {
            updates.push('total_vat = CASE WHEN total_vat IS NULL OR total_vat = 0 THEN $' + (values.length + 1) + ' ELSE total_vat END')
            values.push(totalVat)
          }
        }

        if (row.total_gross || row.gross_total) {
          const totalGross = parseFloat(row.total_gross || row.gross_total || '0') || 0
          if (totalGross > 0) {
            updates.push('total_gross = CASE WHEN total_gross IS NULL OR total_gross = 0 THEN $' + (values.length + 1) + ' ELSE total_gross END')
            values.push(totalGross)
          }
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()')
          const updateQuery = `UPDATE documents SET ${updates.join(', ')} WHERE id = $${values.length + 1}`
          values.push(document.id)

          await sql.unsafe(updateQuery, values)
          updatedRecords++

          console.log(`📝 [DOCUMENTS] Updated: ${docNumber} with ${updates.length - 1} fields`)
        }
      } else {
        // Insert new document
        await sql`
          INSERT INTO documents (
            doc_number, doc_type, doc_date_issued, customer_name, _id_customer,
            vehicle_registration, total_net, total_vat, total_gross, created_at, updated_at
          ) VALUES (
            ${docNumber},
            ${row.doc_type || row.type || 'Service'},
            ${row.doc_date_issued || row.date_issued || null},
            ${row.customer_name || row.customerName || ''},
            ${customerId},
            ${vehicleRegistration || null},
            ${parseFloat(row.total_net || row.net_total || '0') || 0},
            ${parseFloat(row.total_vat || row.vat_total || '0') || 0},
            ${parseFloat(row.total_gross || row.gross_total || '0') || 0},
            NOW(), NOW()
          )
        `
        newRecords++
        console.log(`✨ [DOCUMENTS] Created: ${docNumber}${customerId ? ' (linked to customer)' : ''}`)
      }
      processed++
    } catch (error) {
      console.error('Error processing document:', error)
    }
  }

  console.log(`✅ [DOCUMENTS] Completed: ${processed} processed, ${newRecords} new, ${updatedRecords} updated, ${smartLinked} smart-linked`)
  return { processed, newRecords, updatedRecords, smartLinked }
}

// Line items processing
async function processLineItems(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of data) {
    try {
      const documentId = row.document_id || row.doc_id || ''
      if (!documentId) continue

      // Check if line item exists
      const existing = await sql`
        SELECT id FROM document_line_items
        WHERE document_id = ${documentId}
        AND description = ${row.description || ''}
        LIMIT 1
      `

      if (existing.length > 0) {
        // Update existing line item
        await sql`
          UPDATE document_line_items SET
            quantity = COALESCE(${parseFloat(row.quantity || '0') || 0}, quantity),
            unit_price = COALESCE(${parseFloat(row.unit_price || row.price || '0') || 0}, unit_price),
            total_price = COALESCE(${parseFloat(row.total_price || row.total || '0') || 0}, total_price),
            vat_rate = COALESCE(${parseFloat(row.vat_rate || '0') || 0}, vat_rate),
            updated_at = NOW()
          WHERE id = ${existing[0].id}
        `
        updatedRecords++
      } else {
        // Insert new line item
        await sql`
          INSERT INTO document_line_items (
            document_id, description, quantity, unit_price, total_price, vat_rate, created_at, updated_at
          ) VALUES (
            ${documentId},
            ${row.description || ''},
            ${parseFloat(row.quantity || '0') || 0},
            ${parseFloat(row.unit_price || row.price || '0') || 0},
            ${parseFloat(row.total_price || row.total || '0') || 0},
            ${parseFloat(row.vat_rate || '0') || 0},
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

// Document extras processing
async function processDocumentExtras(data: any[]) {
  let processed = 0
  let newRecords = 0
  let updatedRecords = 0

  for (const row of data) {
    try {
      const documentId = row.document_id || row.doc_id || ''
      if (!documentId) continue

      // Check if extra exists
      const existing = await sql`
        SELECT id FROM document_extras
        WHERE document_id = ${documentId}
        AND labour_description = ${row.labour_description || row.description || ''}
        LIMIT 1
      `

      if (existing.length > 0) {
        // Update existing extra
        await sql`
          UPDATE document_extras SET
            amount = COALESCE(${parseFloat(row.amount || '0') || 0}, amount),
            vat_rate = COALESCE(${parseFloat(row.vat_rate || '0') || 0}, vat_rate),
            updated_at = NOW()
          WHERE id = ${existing[0].id}
        `
        updatedRecords++
      } else {
        // Insert new extra
        await sql`
          INSERT INTO document_extras (
            document_id, labour_description, amount, vat_rate, created_at, updated_at
          ) VALUES (
            ${documentId},
            ${row.labour_description || row.description || ''},
            ${parseFloat(row.amount || '0') || 0},
            ${parseFloat(row.vat_rate || '0') || 0},
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
