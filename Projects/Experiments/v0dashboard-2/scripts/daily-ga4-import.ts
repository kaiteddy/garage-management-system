#!/usr/bin/env tsx
/**
 * 📅 DAILY GA4 IMPORT - Optimized for Daily Updates
 * Processes GA4 export files with efficient updates
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { sql } from '@/lib/database/neon-client'
import { performance } from 'perf_hooks'

// Connection safety wrapper to prevent lockups
const safeSql = async (query: any) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 30000)
  )

  try {
    return await Promise.race([query, timeout])
  } catch (error) {
    console.error('Database query failed:', error)
    throw error
  }
}

// Configuration
const CONFIG = {
  DATA_PATH: '/Users/adamrutstein/Desktop/GA4 EXPORT',
  BATCH_SIZE: 100, // Smaller batches to prevent connection issues
  LOG_FILE: path.join(process.cwd(), 'logs', 'daily-import.log'),
  CONNECTION_TIMEOUT: 30000,
  QUERY_TIMEOUT: 60000
}

// Ensure log directory exists
if (!fs.existsSync(path.dirname(CONFIG.LOG_FILE))) {
  fs.mkdirSync(path.dirname(CONFIG.LOG_FILE), { recursive: true })
}

// Simple logger
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

class DailyGA4Importer {
  async run() {
    logger.log('🚀 Starting daily GA4 import')
    const startTime = performance.now()

    try {
      // Import in dependency order
      logger.log('🎯 IMPORTING ALL 10 CSV FILES - COMPLETE GARAGE DATABASE!')

      await this.processFile('Customers.csv', this.importCustomers.bind(this))
      await this.processFile('Vehicles.csv', this.importVehicles.bind(this))
      await this.processFile('Documents.csv', this.importDocuments.bind(this))
      await this.processFile('LineItems.csv', this.importLineItems.bind(this))
      await this.processFile('Document_Extras.csv', this.importDocumentExtras.bind(this))
      await this.processFile('Receipts.csv', this.importReceipts.bind(this))
      await this.processFile('Reminders.csv', this.importReminders.bind(this))
      await this.processFile('Appointments.csv', this.importAppointments.bind(this))
      await this.processFile('Stock.csv', this.importStock.bind(this))
      await this.verifyImport()

      const duration = ((performance.now() - startTime) / 1000).toFixed(1)
      logger.log(`✅ Import completed in ${duration}s`)
    } catch (error) {
      logger.error('Import failed', error as Error)
      process.exit(1)
    }
  }

  private async processFile(fileName: string,
    handler: (records: any[]) => Promise<{created: number, updated: number}>) {

    const filePath = path.join(CONFIG.DATA_PATH, fileName)
    logger.log(`📂 Processing ${fileName}...`)

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const records = parse(fileContent, { columns: true, skip_empty_lines: true })
      logger.log(`  Found ${records.length} records`)

      // Process in batches with safety pauses
      const batches = this.createBatches(records, CONFIG.BATCH_SIZE)
      let created = 0, updated = 0

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const result = await handler(batch)
        created += result.created
        updated += result.updated

        const progress = Math.round(((i + 1) / batches.length) * 100)
        process.stdout.write(`\r  Progress: ${progress}% (${(i + 1) * batch.length}/${records.length})`)

        // Safety pause between batches to prevent connection overload
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log()
      logger.log(`  ✅ ${created} created, ${updated} updated`)

    } catch (error) {
      logger.error(`Failed to process ${fileName}`, error as Error)
      throw error
    }
  }

  private async importCustomers(records: any[]) {
    let created = 0, updated = 0, skipped = 0
    const batchSize = 50 // Smaller batches for stability
    const maxRetries = 3

    logger.log(`  🚀 Processing ${records.length} customers in batches of ${batchSize}...`)

    // Pre-process and validate all records first
    const validRecords = records.map(record => {
      const id = record._ID || record._id
      const firstName = record.nameForename || record.nameforename || record.nameTitle || record.nametitle || 'Unknown'
      const lastName = record.nameSurname || record.namesurname || ''
      const email = record.contactEmail || record.contactemail || `no-email-${id}@placeholder.com`
      const phone = record.contactMobile || record.contactmobile || record.contactTelephone || record.contacttelephone || null
      const addressLine1 = [record.addressHouseNo || record.addresshouseno, record.addressRoad || record.addressroad].filter(p => p).join(' ').trim() || null
      const city = record.addressTown || record.addresstown || null
      const postcode = record.addressPostCode || record.addresspostcode || null

      // Skip invalid records
      if (!id || (!firstName && !lastName && !record.nameTitle && !record.nametitle)) {
        return null
      }

      return { id, firstName, lastName, email, phone, addressLine1, city, postcode }
    }).filter(Boolean)

    logger.log(`  ✅ Validated ${validRecords.length} records (${records.length - validRecords.length} skipped)`)

    // Process in batches with retry logic
    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize)
      const progress = Math.round(((i + batchSize) / validRecords.length) * 100)
      const currentCount = Math.min(i + batchSize, validRecords.length)

      process.stdout.write(`\r  📊 Progress: ${progress}% (${currentCount}/${validRecords.length}) - Created: ${created}, Updated: ${updated}`)

      let retryCount = 0
      let batchSuccess = false

      while (retryCount < maxRetries && !batchSuccess) {
        try {
          // Process batch records individually but in parallel
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

          // Count successes and failures
          const successful = results.filter(r => r.success)
          const failed = results.filter(r => !r.success)

          // For successful ones, count inserts vs updates
          const insertCount = successful.filter(r => r.inserted).length
          const updateCount = successful.length - insertCount

          created += insertCount
          updated += updateCount

          // Log any failures
          failed.forEach(f => {
            logger.error(`Failed to import customer ${f.record?.id}:`, f.error as Error)
          })

          batchSuccess = true

        } catch (error) {
          retryCount++
          logger.error(`Batch ${i}-${i + batchSize} failed (attempt ${retryCount}/${maxRetries}):`, error as Error)

          if (retryCount < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
          } else {
            // Final attempt: process records individually
            logger.log(`\n  ⚠️  Falling back to individual processing for batch ${i}-${i + batchSize}`)
            for (const record of batch) {
              try {
                await safeSql(sql`
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
                `)
                created++
              } catch (individualError) {
                skipped++
                logger.error(`Failed to import customer ${record.id}:`, individualError as Error)
              }
            }
            batchSuccess = true
          }
        }
      }

      // Brief pause between batches
      if (i + batchSize < validRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    console.log() // New line after progress
    logger.log(`  ✅ Import complete: ${created} created, ${updated} updated, ${skipped} skipped`)
    return { created, updated }
  }

  private async importVehicles(records: any[]) {
    let created = 0, updated = 0

    for (const record of records) {
      try {
        // Map GA4 CSV columns to database columns
        const id = record._id
        const customerId = record._id_customer
        const registration = record.registration
        const make = record.make || 'Unknown'
        const model = record.model || 'Unknown'
        const year = record.year ? parseInt(record.year) : null
        const color = record.colour || record.color || null
        const fuelType = record.fuel_type || null
        const engineSize = record.engine_size || null
        const vin = record.vin || null

        if (!id || !registration) {
          logger.error(`Skipping vehicle with missing required fields: ${JSON.stringify(record)}`)
          continue
        }

        const existing = await safeSql(sql`
          SELECT id FROM vehicles WHERE id = ${id} LIMIT 1
        `)

        if (existing.length > 0) {
          await safeSql(sql`
            UPDATE vehicles
            SET customer_id = ${customerId},
                registration = ${registration},
                make = ${make},
                model = ${model},
                year = ${year},
                color = ${color},
                fuel_type = ${fuelType},
                engine_size = ${engineSize},
                vin = ${vin},
                updated_at = NOW()
            WHERE id = ${id}
          `)
          updated++
        } else {
          await safeSql(sql`
            INSERT INTO vehicles (id, customer_id, registration, make, model, year, color, fuel_type, engine_size, vin, created_at, updated_at)
            VALUES (${id}, ${customerId}, ${registration}, ${make}, ${model}, ${year}, ${color}, ${fuelType}, ${engineSize}, ${vin}, NOW(), NOW())
          `)
          created++
        }
      } catch (error) {
        logger.error(`Error importing vehicle ${record._id || record.registration || 'unknown'}`, error as Error)
      }
    }

    return { created, updated }
  }

  private async importDocuments(records: any[]) {
    let created = 0, updated = 0

    for (const record of records) {
      try {
        // Map GA4 CSV columns to database columns
        const id = record._id
        const customerId = record._id_customer
        const vehicleRegistration = record.vehicle_registration
        const documentType = record.doc_type || 'Invoice'
        const documentNumber = record.doc_number || record._id
        const documentDate = record.doc_date
        const totalGross = parseFloat(record.total_gross || 0)
        const totalNet = parseFloat(record.total_net || 0)
        const totalTax = parseFloat(record.total_tax || 0)
        const status = record.status || 'Active'

        if (!id) {
          logger.error(`Skipping document with missing ID: ${JSON.stringify(record)}`)
          continue
        }

        const existing = await safeSql(sql`
          SELECT id FROM customer_documents WHERE id = ${id} LIMIT 1
        `)

        if (existing.length > 0) {
          await safeSql(sql`
            UPDATE customer_documents
            SET customer_id = ${customerId},
                vehicle_registration = ${vehicleRegistration},
                document_type = ${documentType},
                document_number = ${documentNumber},
                document_date = ${documentDate},
                total_gross = ${totalGross},
                total_net = ${totalNet},
                total_tax = ${totalTax},
                status = ${status},
                updated_at = NOW()
            WHERE id = ${id}
          `)
          updated++
        } else {
          await safeSql(sql`
            INSERT INTO customer_documents (id, customer_id, vehicle_registration, document_type, document_number, document_date, total_gross, total_net, total_tax, status, created_at, updated_at)
            VALUES (${id}, ${customerId}, ${vehicleRegistration}, ${documentType}, ${documentNumber}, ${documentDate}, ${totalGross}, ${totalNet}, ${totalTax}, ${status}, NOW(), NOW())
          `)
          created++
        }
      } catch (error) {
        logger.error(`Error importing document ${record._id || 'unknown'}`, error as Error)
      }
    }

    return { created, updated }
  }

  private async verifyImport() {
    logger.log('\n🔍 Verifying import...')

    try {
      const customerCount = await safeSql(sql`SELECT COUNT(*) as count FROM customers`)
      logger.log(`  customers: ${customerCount[0].count} records`)
    } catch (error) {
      logger.error(`Error verifying customers`, error as Error)
    }

    try {
      const vehicleCount = await safeSql(sql`SELECT COUNT(*) as count FROM vehicles`)
      logger.log(`  vehicles: ${vehicleCount[0].count} records`)
    } catch (error) {
      logger.error(`Error verifying vehicles`, error as Error)
    }

    try {
      const documentCount = await safeSql(sql`SELECT COUNT(*) as count FROM customer_documents`)
      logger.log(`  customer_documents: ${documentCount[0].count} records`)
    } catch (error) {
      logger.error(`Error verifying customer_documents`, error as Error)
    }
  }

  // LINE ITEMS - 90,636 records!
  private async importLineItems(records: any[]) {
    let created = 0
    logger.log(`  📋 Processing ${records.length} line items (HUGE DATASET!)...`)

    // Create table if needed
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

    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)
      const progress = Math.round(((i + 50) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + 50, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const documentId = record._ID_Document || record._id_document
          const description = record.description || record.Description || ''
          const quantity = parseFloat(record.quantity || '1') || 1
          const unitPrice = parseFloat(record.unit_price || '0') || 0
          const totalPrice = parseFloat(record.total_price || '0') || 0

          if (!id) continue

          await safeSql(sql`
            INSERT INTO document_line_items (id, document_id, description, quantity, unit_price, total_price)
            VALUES (${id}, ${documentId}, ${description}, ${quantity}, ${unitPrice}, ${totalPrice})
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
          logger.error(`Error importing line item ${record._ID}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    console.log()
    return { created, updated: 0 }
  }

  // DOCUMENT EXTRAS - 22,108 records!
  private async importDocumentExtras(records: any[]) {
    let created = 0
    logger.log(`  📄+ Processing ${records.length} document extras...`)

    await safeSql(sql`
      CREATE TABLE IF NOT EXISTS document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        extra_type TEXT,
        extra_value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)
      const progress = Math.round(((i + 50) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + 50, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const documentId = record._ID_Document || record._id_document
          const extraType = record.extra_type || 'Unknown'
          const extraValue = record.extra_value || ''

          if (!id) continue

          await safeSql(sql`
            INSERT INTO document_extras (id, document_id, extra_type, extra_value)
            VALUES (${id}, ${documentId}, ${extraType}, ${extraValue})
            ON CONFLICT (id) DO NOTHING
          `)
          created++
        } catch (error) {
          logger.error(`Error importing document extra ${record._ID}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    console.log()
    return { created, updated: 0 }
  }

  // RECEIPTS - 24,758 records!
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)
      const progress = Math.round(((i + 50) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + 50, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const documentId = record._ID_Document || record._id_document
          const receiptNumber = record.receipt_number || ''
          const amount = parseFloat(record.amount || '0') || 0
          const paymentMethod = record.payment_method || 'Unknown'

          if (!id) continue

          await safeSql(sql`
            INSERT INTO receipts (id, document_id, receipt_number, amount, payment_method)
            VALUES (${id}, ${documentId}, ${receiptNumber}, ${amount}, ${paymentMethod})
            ON CONFLICT (id) DO NOTHING
          `)
          created++
        } catch (error) {
          logger.error(`Error importing receipt ${record._ID}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    console.log()
    return { created, updated: 0 }
  }

  // REMINDERS - 11,667 records!
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)
      const progress = Math.round(((i + 50) / records.length) * 100)
      process.stdout.write(`\r  📊 Progress: ${progress}% (${Math.min(i + 50, records.length)}/${records.length})`)

      for (const record of batch) {
        try {
          const id = record._ID || record._id
          const customerId = record._ID_Customer || record._id_customer
          const vehicleId = record._ID_Vehicle || record._id_vehicle
          const reminderType = record.reminder_type || 'General'
          const reminderDate = record.reminder_date || null
          const description = record.description || ''

          if (!id) continue

          await safeSql(sql`
            INSERT INTO reminders (id, customer_id, vehicle_id, reminder_type, reminder_date, description)
            VALUES (${id}, ${customerId}, ${vehicleId}, ${reminderType}, ${reminderDate}, ${description})
            ON CONFLICT (id) DO NOTHING
          `)
          created++
        } catch (error) {
          logger.error(`Error importing reminder ${record._ID}`, error as Error)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    console.log()
    return { created, updated: 0 }
  }

  // APPOINTMENTS - 92 records
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (const record of records) {
      try {
        const id = record._ID || record._id
        const customerId = record._ID_Customer || record._id_customer
        const vehicleId = record._ID_Vehicle || record._id_vehicle
        const appointmentDate = record.appointment_date || null
        const description = record.description || ''

        if (!id) continue

        await safeSql(sql`
          INSERT INTO appointments (id, customer_id, vehicle_id, appointment_date, description)
          VALUES (${id}, ${customerId}, ${vehicleId}, ${appointmentDate}, ${description})
          ON CONFLICT (id) DO NOTHING
        `)
        created++
      } catch (error) {
        logger.error(`Error importing appointment ${record._ID}`, error as Error)
      }
    }
    return { created, updated: 0 }
  }

  // STOCK - 267 records
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    for (const record of records) {
      try {
        const id = record._ID || record._id
        const partNumber = record.part_number || ''
        const description = record.description || ''
        const quantity = parseInt(record.quantity || '0') || 0
        const unitPrice = parseFloat(record.unit_price || '0') || 0

        if (!id) continue

        await safeSql(sql`
          INSERT INTO stock (id, part_number, description, quantity, unit_price)
          VALUES (${id}, ${partNumber}, ${description}, ${quantity}, ${unitPrice})
          ON CONFLICT (id) DO NOTHING
        `)
        created++
      } catch (error) {
        logger.error(`Error importing stock item ${record._ID}`, error as Error)
      }
    }
    return { created, updated: 0 }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }
}

// Run the importer
new DailyGA4Importer().run().catch(console.error)
