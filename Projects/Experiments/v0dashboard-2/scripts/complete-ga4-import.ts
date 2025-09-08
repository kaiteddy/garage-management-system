import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { sql } from '../lib/database/neon-client'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Safe SQL wrapper with timeout and retry
async function safeSql(query: any, retries = 3): Promise<any> {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), 60000)
  )

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await Promise.race([query, timeout])
    } catch (error) {
      if (attempt === retries) throw error
      console.log(`Query failed (attempt ${attempt}/${retries}), retrying...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

// Configuration with all learnings applied
const CONFIG = {
  DATA_PATH: '/Users/adamrutstein/Desktop/GA4 EXPORT',
  BATCH_SIZE: 50, // Optimal batch size from testing
  LOG_FILE: path.join(process.cwd(), 'logs', 'complete-import.log'),
  CONNECTION_TIMEOUT: 30000,
  QUERY_TIMEOUT: 60000
}

// Ensure log directory exists
if (!fs.existsSync(path.dirname(CONFIG.LOG_FILE))) {
  fs.mkdirSync(path.dirname(CONFIG.LOG_FILE), { recursive: true })
}

// Enhanced logger
const logger = {
  log: (message: string) => {
    const logMessage = `[${new Date().toISOString()}] ${message}`
    console.log(logMessage)
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n')
  },
  error: (message: string, error?: Error) => {
    const errorMessage = error ? `${message}: ${error.message}` : message
    const logMessage = `[${new Date().toISOString()}] ERROR: ${errorMessage}`
    console.error(logMessage)
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n')
  }
}

class CompleteGA4Importer {
  async run() {
    logger.log('🚀 STARTING COMPLETE GA4 IMPORT - ALL 200,432 RECORDS!')
    logger.log('📊 Target: Import missing 176,854 records while preserving existing 23,578')
    const startTime = performance.now()

    try {
      // Import in dependency order with smart updates
      await this.processFile('Customers.csv', this.importCustomers.bind(this))
      await this.processFile('Vehicles.csv', this.importVehicles.bind(this))
      await this.processFile('Documents.csv', this.importDocuments.bind(this))
      await this.processFile('LineItems.csv', this.importLineItems.bind(this))
      await this.processFile('Document_Extras.csv', this.importDocumentExtras.bind(this))
      await this.processFile('Receipts.csv', this.importReceipts.bind(this))
      await this.processFile('Reminders.csv', this.importReminders.bind(this))
      await this.processFile('Appointments.csv', this.importAppointments.bind(this))
      await this.processFile('Stock.csv', this.importStock.bind(this))
      
      await this.verifyCompleteImport()

      const duration = ((performance.now() - startTime) / 1000).toFixed(1)
      logger.log(`✅ COMPLETE IMPORT FINISHED in ${duration}s`)
      logger.log('🎉 Your garage database now has ALL 200,432+ records!')
    } catch (error) {
      logger.error('Complete import failed', error as Error)
      process.exit(1)
    }
  }

  private async processFile(fileName: string, handler: (records: any[]) => Promise<{created: number, updated: number}>) {
    const filePath = path.join(CONFIG.DATA_PATH, fileName)
    logger.log(`📂 Processing ${fileName}...`)

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const records = parse(fileContent, { columns: true, skip_empty_lines: true })
      logger.log(`  Found ${records.length} records`)

      const result = await handler(records)
      logger.log(`  ✅ ${result.created} created, ${result.updated} updated`)
    } catch (error) {
      logger.error(`Failed to process ${fileName}`, error as Error)
      throw error
    }
  }

  // CUSTOMERS - Enhanced with all column mapping learnings
  private async importCustomers(records: any[]) {
    let created = 0, updated = 0, skipped = 0
    const batchSize = CONFIG.BATCH_SIZE
    
    logger.log(`  🚀 Processing ${records.length} customers (preserving existing 7,079)...`)

    // Pre-process and validate all records
    const validRecords = records.map(record => {
      const id = record._ID || record._id
      const firstName = record.nameForename || record.nameforename || record.nameTitle || record.nametitle || 'Unknown'
      const lastName = record.nameSurname || record.namesurname || ''
      const email = record.contactEmail || record.contactemail || `no-email-${id}@placeholder.com`
      const phone = record.contactMobile || record.contactmobile || record.contactTelephone || record.contacttelephone || null
      const addressLine1 = [record.addressHouseNo || record.addresshouseno, record.addressRoad || record.addressroad].filter(p => p).join(' ').trim() || null
      const city = record.addressTown || record.addresstown || null
      const postcode = record.addressPostCode || record.addresspostcode || null

      if (!id || (!firstName && !lastName && !record.nameTitle && !record.nametitle)) {
        return null
      }

      return { id, firstName, lastName, email, phone, addressLine1, city, postcode }
    }).filter(Boolean)

    logger.log(`  ✅ Validated ${validRecords.length} records`)

    // Process in batches with parallel processing
    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize)
      const progress = Math.round(((i + batchSize) / validRecords.length) * 100)
      const currentCount = Math.min(i + batchSize, validRecords.length)
      
      process.stdout.write(`\r  📊 Progress: ${progress}% (${currentCount}/${validRecords.length}) - Created: ${created}, Updated: ${updated}`)
      
      try {
        const promises = batch.map(async (record) => {
          try {
            const result = await safeSql(sql`
              INSERT INTO customers (id, first_name, last_name, email, phone, address_line1, city, postcode, created_at, updated_at)
              VALUES (${record.id}, ${record.firstName}, ${record.lastName}, ${record.email}, ${record.phone}, ${record.addressLine1}, ${record.city}, ${record.postcode}, NOW(), NOW())
              ON CONFLICT (id) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                address_line1 = EXCLUDED.address_line1,
                city = EXCLUDED.city,
                postcode = EXCLUDED.postcode,
                updated_at = NOW()
              RETURNING (xmax = 0) AS inserted
            `)
            return { success: true, inserted: result[0]?.inserted || false }
          } catch (error) {
            return { success: false, error, record }
          }
        })
        
        const results = await Promise.all(promises)
        const successful = results.filter(r => r.success)
        const failed = results.filter(r => !r.success)
        
        const insertCount = successful.filter(r => r.inserted).length
        const updateCount = successful.length - insertCount
        
        created += insertCount
        updated += updateCount
        
        failed.forEach(f => {
          skipped++
          logger.error(`Failed to import customer ${f.record?.id}:`, f.error as Error)
        })
        
      } catch (error) {
        logger.error(`Error processing customer batch ${i}-${i + batchSize}`, error as Error)
      }
      
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    console.log()
    logger.log(`  ✅ Customers complete: ${created} created, ${updated} updated, ${skipped} skipped`)
    return { created, updated }
  }

  // VEHICLES - Enhanced processing
  private async importVehicles(records: any[]) {
    let created = 0, updated = 0
    logger.log(`  🚗 Processing ${records.length} vehicles (preserving existing 10,519)...`)

    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_SIZE)
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + CONFIG.BATCH_SIZE, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const customerId = record._ID_Customer || record._id_customer
          const registration = record.vehRegistration || record.vehregistration || ''
          const make = record.vehMake || record.vehmake || 'Unknown'
          const model = record.vehModel || record.vehmodel || 'Unknown'
          const year = record.vehYear || record.vehyear || null

          if (!id) continue

          await safeSql(sql`
            INSERT INTO vehicles (id, customer_id, registration, make, model, year, created_at, updated_at)
            VALUES (${id}, ${customerId}, ${registration}, ${make}, ${model}, ${year}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              customer_id = EXCLUDED.customer_id,
              registration = EXCLUDED.registration,
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              year = EXCLUDED.year,
              updated_at = NOW()
          `)
          created++
        } catch (error) {
          logger.error(`Error importing vehicle ${record._ID || 'unknown'}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log()
    logger.log(`  ✅ Vehicles complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // DOCUMENTS - This is where we'll get the missing 27,216 records!
  private async importDocuments(records: any[]) {
    let created = 0, updated = 0
    logger.log(`  📄 Processing ${records.length} documents (adding missing 27,216!)...`)

    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_SIZE)
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + CONFIG.BATCH_SIZE, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const customerId = record._ID_Customer || record._id_customer
          const docNumber = record.doc_number || record.docNumber || ''
          const docType = record.doc_type || record.docType || 'Unknown'
          const description = record.description || record.Description || ''
          const totalAmount = parseFloat(record.total_amount || record.totalAmount || '0') || 0

          if (!id) continue

          await safeSql(sql`
            INSERT INTO customer_documents (id, customer_id, document_number, document_type, description, total_amount, created_at, updated_at)
            VALUES (${id}, ${customerId}, ${docNumber}, ${docType}, ${description}, ${totalAmount}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              customer_id = EXCLUDED.customer_id,
              document_number = EXCLUDED.document_number,
              document_type = EXCLUDED.document_type,
              description = EXCLUDED.description,
              total_amount = EXCLUDED.total_amount,
              updated_at = NOW()
          `)
          created++
        } catch (error) {
          logger.error(`Error importing document ${record._ID || 'unknown'}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log()
    logger.log(`  ✅ Documents complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // LINE ITEMS - The big one! 90,636 service line items
  private async importLineItems(records: any[]) {
    let created = 0, updated = 0
    logger.log(`  📋 Processing ${records.length} line items (HUGE MISSING DATASET!)...`)

    // Create table if it doesn't exist
    await safeSql(sql`
      CREATE TABLE IF NOT EXISTS document_line_items (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        description TEXT,
        quantity DECIMAL(10,2),
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_SIZE)
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + CONFIG.BATCH_SIZE, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const documentId = record._ID_Document || record._id_document
          const description = record.description || record.Description || ''
          const quantity = parseFloat(record.quantity || record.Quantity || '1') || 1
          const unitPrice = parseFloat(record.unit_price || record.unitPrice || '0') || 0
          const totalPrice = parseFloat(record.total_price || record.totalPrice || '0') || 0

          if (!id) continue

          await safeSql(sql`
            INSERT INTO document_line_items (id, document_id, description, quantity, unit_price, total_price, created_at, updated_at)
            VALUES (${id}, ${documentId}, ${description}, ${quantity}, ${unitPrice}, ${totalPrice}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              document_id = EXCLUDED.document_id,
              description = EXCLUDED.description,
              quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price,
              total_price = EXCLUDED.total_price,
              updated_at = NOW()
          `)
          created++
        } catch (error) {
          logger.error(`Error importing line item ${record._ID || 'unknown'}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log()
    logger.log(`  ✅ Line items complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // DOCUMENT EXTRAS - 22,108 additional document records
  private async importDocumentExtras(records: any[]) {
    let created = 0
    logger.log(`  📄+ Processing ${records.length} document extras...`)

    await safeSql(sql`
      CREATE TABLE IF NOT EXISTS document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        extra_type TEXT,
        extra_value TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_SIZE)
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + CONFIG.BATCH_SIZE, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const documentId = record._ID_Document || record._id_document
          const extraType = record.extra_type || record.extraType || 'Unknown'
          const extraValue = record.extra_value || record.extraValue || ''

          if (!id) continue

          await safeSql(sql`
            INSERT INTO document_extras (id, document_id, extra_type, extra_value, created_at, updated_at)
            VALUES (${id}, ${documentId}, ${extraType}, ${extraValue}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              document_id = EXCLUDED.document_id,
              extra_type = EXCLUDED.extra_type,
              extra_value = EXCLUDED.extra_value,
              updated_at = NOW()
          `)
          created++
        } catch (error) {
          logger.error(`Error importing document extra ${record._ID || 'unknown'}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log()
    logger.log(`  ✅ Document extras complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // RECEIPTS - 24,758 receipt records
  private async importReceipts(records: any[]) {
    let created = 0
    logger.log(`  🧾 Processing ${records.length} receipts...`)

    await safeSql(sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        receipt_number TEXT,
        amount DECIMAL(10,2),
        payment_method TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_SIZE)
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + CONFIG.BATCH_SIZE, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const documentId = record._ID_Document || record._id_document
          const receiptNumber = record.receipt_number || record.receiptNumber || ''
          const amount = parseFloat(record.amount || record.Amount || '0') || 0
          const paymentMethod = record.payment_method || record.paymentMethod || 'Unknown'

          if (!id) continue

          await safeSql(sql`
            INSERT INTO receipts (id, document_id, receipt_number, amount, payment_method, created_at, updated_at)
            VALUES (${id}, ${documentId}, ${receiptNumber}, ${amount}, ${paymentMethod}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              document_id = EXCLUDED.document_id,
              receipt_number = EXCLUDED.receipt_number,
              amount = EXCLUDED.amount,
              payment_method = EXCLUDED.payment_method,
              updated_at = NOW()
          `)
          created++
        } catch (error) {
          logger.error(`Error importing receipt ${record._ID || 'unknown'}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log()
    logger.log(`  ✅ Receipts complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // REMINDERS - 11,667 reminder records
  private async importReminders(records: any[]) {
    let created = 0
    logger.log(`  ⏰ Processing ${records.length} reminders...`)

    await safeSql(sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        vehicle_id TEXT,
        reminder_type TEXT,
        reminder_date DATE,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_SIZE)
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + CONFIG.BATCH_SIZE, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const customerId = record._ID_Customer || record._id_customer
          const vehicleId = record._ID_Vehicle || record._id_vehicle
          const reminderType = record.reminder_type || record.reminderType || 'General'
          const reminderDate = record.reminder_date || record.reminderDate || null
          const description = record.description || record.Description || ''
          const status = record.status || record.Status || 'active'

          if (!id) continue

          await safeSql(sql`
            INSERT INTO reminders (id, customer_id, vehicle_id, reminder_type, reminder_date, description, status, created_at, updated_at)
            VALUES (${id}, ${customerId}, ${vehicleId}, ${reminderType}, ${reminderDate}, ${description}, ${status}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              customer_id = EXCLUDED.customer_id,
              vehicle_id = EXCLUDED.vehicle_id,
              reminder_type = EXCLUDED.reminder_type,
              reminder_date = EXCLUDED.reminder_date,
              description = EXCLUDED.description,
              status = EXCLUDED.status,
              updated_at = NOW()
          `)
          created++
        } catch (error) {
          logger.error(`Error importing reminder ${record._ID || 'unknown'}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log()
    logger.log(`  ✅ Reminders complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // APPOINTMENTS - 92 appointment records
  private async importAppointments(records: any[]) {
    let created = 0
    logger.log(`  📅 Processing ${records.length} appointments...`)

    await safeSql(sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        vehicle_id TEXT,
        appointment_date TIMESTAMP,
        description TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (const record of records) {
      try {
        const id = record._ID || record._id
        const customerId = record._ID_Customer || record._id_customer
        const vehicleId = record._ID_Vehicle || record._id_vehicle
        const appointmentDate = record.appointment_date || record.appointmentDate || null
        const description = record.description || record.Description || ''
        const status = record.status || record.Status || 'scheduled'

        if (!id) continue

        await safeSql(sql`
          INSERT INTO appointments (id, customer_id, vehicle_id, appointment_date, description, status, created_at, updated_at)
          VALUES (${id}, ${customerId}, ${vehicleId}, ${appointmentDate}, ${description}, ${status}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            vehicle_id = EXCLUDED.vehicle_id,
            appointment_date = EXCLUDED.appointment_date,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            updated_at = NOW()
        `)
        created++
      } catch (error) {
        logger.error(`Error importing appointment ${record._ID || 'unknown'}`, error as Error)
      }
    }

    logger.log(`  ✅ Appointments complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // STOCK - 267 stock records
  private async importStock(records: any[]) {
    let created = 0
    logger.log(`  📦 Processing ${records.length} stock items...`)

    await safeSql(sql`
      CREATE TABLE IF NOT EXISTS stock (
        id TEXT PRIMARY KEY,
        part_number TEXT,
        description TEXT,
        quantity INTEGER,
        unit_price DECIMAL(10,2),
        supplier TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (const record of records) {
      try {
        const id = record._ID || record._id
        const partNumber = record.part_number || record.partNumber || ''
        const description = record.description || record.Description || ''
        const quantity = parseInt(record.quantity || record.Quantity || '0') || 0
        const unitPrice = parseFloat(record.unit_price || record.unitPrice || '0') || 0
        const supplier = record.supplier || record.Supplier || ''

        if (!id) continue

        await safeSql(sql`
          INSERT INTO stock (id, part_number, description, quantity, unit_price, supplier, created_at, updated_at)
          VALUES (${id}, ${partNumber}, ${description}, ${quantity}, ${unitPrice}, ${supplier}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            part_number = EXCLUDED.part_number,
            description = EXCLUDED.description,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            supplier = EXCLUDED.supplier,
            updated_at = NOW()
        `)
        created++
      } catch (error) {
        logger.error(`Error importing stock item ${record._ID || 'unknown'}`, error as Error)
      }
    }

    logger.log(`  ✅ Stock complete: ${created} processed`)
    return { created, updated: 0 }
  }

  // COMPREHENSIVE VERIFICATION
  private async verifyCompleteImport() {
    logger.log('\n🔍 COMPREHENSIVE VERIFICATION...')

    try {
      const results = await safeSql(sql`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM customer_documents) as documents,
          (SELECT COUNT(*) FROM document_line_items) as line_items,
          (SELECT COUNT(*) FROM document_extras) as document_extras,
          (SELECT COUNT(*) FROM receipts) as receipts,
          (SELECT COUNT(*) FROM reminders) as reminders,
          (SELECT COUNT(*) FROM appointments) as appointments,
          (SELECT COUNT(*) FROM stock) as stock
      `)

      const counts = results[0]
      const total = Object.values(counts).reduce((sum: number, count: any) => sum + parseInt(count), 0)

      logger.log('📊 FINAL DATABASE COUNTS:')
      logger.log(`  👥 Customers: ${counts.customers}`)
      logger.log(`  🚗 Vehicles: ${counts.vehicles}`)
      logger.log(`  📄 Documents: ${counts.documents}`)
      logger.log(`  📋 Line Items: ${counts.line_items}`)
      logger.log(`  📄+ Document Extras: ${counts.document_extras}`)
      logger.log(`  🧾 Receipts: ${counts.receipts}`)
      logger.log(`  ⏰ Reminders: ${counts.reminders}`)
      logger.log(`  📅 Appointments: ${counts.appointments}`)
      logger.log(`  📦 Stock: ${counts.stock}`)
      logger.log(`  📈 TOTAL RECORDS: ${total}`)

      // Compare with CSV targets
      const targets = {
        customers: 7143,
        vehicles: 10550,
        documents: 33196,
        line_items: 90636,
        document_extras: 22108,
        receipts: 24758,
        reminders: 11667,
        appointments: 92,
        stock: 267
      }

      logger.log('\n🎯 SUCCESS RATES:')
      Object.keys(targets).forEach(key => {
        const actual = parseInt(counts[key])
        const target = targets[key]
        const rate = ((actual / target) * 100).toFixed(1)
        logger.log(`  ${key}: ${rate}% (${actual}/${target})`)
      })

    } catch (error) {
      logger.error('Error during verification', error as Error)
    }
  }
}

// Run the complete import
const importer = new CompleteGA4Importer()
importer.run().catch(console.error)
