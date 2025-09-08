#!/usr/bin/env tsx
/**
 * 🚀 TURBO IMPORT - Lightning Fast Data Import System
 *
 * Imports ALL garage management data in SECONDS using:
 * - Parallel processing
 * - Bulk operations
 * - Real-time progress tracking
 * - Instant verification
 *
 * Usage: npm run turbo-import
 */

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { sql } from '@/lib/database/neon-client'
import { performance } from 'perf_hooks'

// Configuration
const CONFIG = {
  DATA_PATH: '/Users/adamrutstein/Desktop/GA4 EXPORT',
  BATCH_SIZE: 500,  // Smaller batches for better performance
  MAX_PARALLEL: 3,  // Reduced parallelism for stability
  PROGRESS_INTERVAL: 250
}

// File mapping
const FILES = {
  customers: 'Customers.csv',
  vehicles: 'Vehicles.csv',
  documents: 'Documents.csv',
  lineItems: 'LineItems.csv',
  receipts: 'Receipts.csv',
  documentExtras: 'Document_Extras.csv',
  appointments: 'Appointments.csv',
  reminders: 'Reminders.csv',
  reminderTemplates: 'Reminder_Templates.csv',
  stock: 'Stock.csv'
}

interface ImportStats {
  file: string
  records: number
  imported: number
  errors: number
  duration: number
  status: 'pending' | 'running' | 'completed' | 'failed'
}

class TurboImporter {
  private stats: Map<string, ImportStats> = new Map()
  private startTime: number = 0

  constructor() {
    console.log('🚀 TURBO IMPORT - Lightning Fast Data Import System')
    console.log('=' .repeat(60))
  }

  async run(): Promise<void> {
    this.startTime = performance.now()

    try {
      // Step 1: Verify files exist
      await this.verifyFiles()

      // Step 2: Clear existing data (optional)
      await this.clearExistingData()

      // Step 3: Run parallel imports
      await this.runParallelImports()

      // Step 4: Verify data integrity
      await this.verifyImport()

      // Step 5: Show final results
      this.showResults()

    } catch (error) {
      console.error('❌ Import failed:', error)
      process.exit(1)
    }
  }

  private async verifyFiles(): Promise<void> {
    console.log('📁 Verifying files...')

    for (const [key, filename] of Object.entries(FILES)) {
      const filePath = path.join(CONFIG.DATA_PATH, filename)

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      const stats = fs.statSync(filePath)
      console.log(`✅ ${filename} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`)

      this.stats.set(key, {
        file: filename,
        records: 0,
        imported: 0,
        errors: 0,
        duration: 0,
        status: 'pending'
      })
    }
  }

  private async clearExistingData(): Promise<void> {
    console.log('\n🗑️  Clearing existing data...')

    const startTime = performance.now()

    // Clear in dependency order
    await sql`DELETE FROM document_extras`
    await sql`DELETE FROM receipts`
    await sql`DELETE FROM line_items`
    await sql`DELETE FROM documents`
    await sql`DELETE FROM vehicles`
    await sql`DELETE FROM customers`

    const duration = performance.now() - startTime
    console.log(`✅ Data cleared in ${duration.toFixed(0)}ms`)
  }

  private async runParallelImports(): Promise<void> {
    console.log('\n⚡ Starting parallel imports...')

    // Import in dependency order but with parallelization where possible
    const importGroups = [
      ['customers'],                    // Group 1: Independent
      ['vehicles'],                     // Group 2: Depends on customers
      ['documents'],                    // Group 3: Depends on customers & vehicles
      ['lineItems', 'receipts', 'documentExtras'] // Group 4: Depends on documents
    ]

    for (const group of importGroups) {
      const promises = group.map(key => this.importFile(key))
      await Promise.all(promises)
    }
  }

  private async importFile(key: string): Promise<void> {
    const stat = this.stats.get(key)!
    stat.status = 'running'

    const startTime = performance.now()
    const filePath = path.join(CONFIG.DATA_PATH, stat.file)

    console.log(`🔄 Importing ${stat.file}...`)

    try {
      // Read and parse CSV
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
      })

      stat.records = records.length
      console.log(`📊 ${stat.file}: ${records.length} records found`)

      // Import based on file type
      switch (key) {
        case 'customers':
          await this.importCustomers(records, stat)
          break
        case 'vehicles':
          await this.importVehicles(records, stat)
          break
        case 'documents':
          await this.importDocuments(records, stat)
          break
        case 'lineItems':
          await this.importLineItems(records, stat)
          break
        case 'receipts':
          await this.importReceipts(records, stat)
          break
        case 'documentExtras':
          await this.importDocumentExtras(records, stat)
          break
      }

      stat.status = 'completed'
      stat.duration = performance.now() - startTime

      console.log(`✅ ${stat.file}: ${stat.imported} imported in ${stat.duration.toFixed(0)}ms`)

    } catch (error) {
      stat.status = 'failed'
      stat.duration = performance.now() - startTime
      console.error(`❌ ${stat.file} failed:`, error)
      throw error
    }
  }

  private async importCustomers(records: any[], stat: ImportStats): Promise<void> {
    const batches = this.createBatches(records, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
      const values = batch.map(record => {
        // Map CSV fields to database fields based on actual CSV structure
        const id = record._ID
        const firstName = record.nameForename || ''
        const lastName = record.nameSurname || ''
        const title = record.nameTitle || null
        const companyName = record.nameCompany || null
        const email = record.contactEmail || null
        const phone = record.contactTelephone || null
        const mobile = record.contactMobile || null
        const addressHouseNo = record.addressHouseNo || null
        const addressRoad = record.addressRoad || null
        const addressLocality = record.addressLocality || null
        const addressTown = record.addressTown || null
        const addressCounty = record.addressCounty || null
        const addressPostCode = record.addressPostCode || null
        const accountNumber = record.accountNumber || null
        const accountStatus = record.accountStatus || 'active'
        const notes = record.Notes || null

        return [
          id, firstName, lastName, title, companyName, email, phone, mobile,
          addressHouseNo, addressRoad, addressLocality, addressTown,
          addressCounty, addressPostCode, accountNumber, accountStatus, notes
        ]
      }).filter(v => v[0]) // Only include records with ID

      if (values.length > 0) {
        const placeholders = values.map((_, i) =>
          `($${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5}, $${i * 17 + 6}, $${i * 17 + 7}, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10}, $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${i * 17 + 14}, $${i * 17 + 15}, $${i * 17 + 16}, $${i * 17 + 17})`
        ).join(', ')

        await sql.unsafe(`
          INSERT INTO customers (
            id, first_name, last_name, title, company_name, email, phone, mobile,
            address_house_no, address_road, address_locality, address_town,
            address_county, address_postcode, account_number, account_status, notes
          )
          VALUES ${placeholders}
          ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            title = EXCLUDED.title,
            company_name = EXCLUDED.company_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            mobile = EXCLUDED.mobile,
            address_house_no = EXCLUDED.address_house_no,
            address_road = EXCLUDED.address_road,
            address_locality = EXCLUDED.address_locality,
            address_town = EXCLUDED.address_town,
            address_county = EXCLUDED.address_county,
            address_postcode = EXCLUDED.address_postcode,
            account_number = EXCLUDED.account_number,
            account_status = EXCLUDED.account_status,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `, values.flat())

        stat.imported += values.length
        this.showProgress(stat)
      }
    }
  }

  private async importVehicles(records: any[], stat: ImportStats): Promise<void> {
    const batches = this.createBatches(records, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
      const values = batch.map(record => {
        // Map CSV fields to database fields based on actual CSV structure
        const registration = (record.registration || '').toUpperCase().trim()
        const customerId = record._ID_Customer || null // Link to customer
        const make = record.make || null
        const model = record.model || null
        const year = record.year ? parseInt(record.year) : null
        const color = record.color || record.colour || null
        const fuelType = record.fuel_type || record.fuelType || null
        const engineSize = record.engine_size || record.engineSize || null
        const engineCode = record.engine_code || record.engineCode || null
        const vin = record.vin || null
        const motStatus = record.mot_status || record.motStatus || null
        const motExpiryDate = this.parseDate(record.mot_expiry_date || record.motExpiryDate)
        const taxStatus = record.tax_status || record.taxStatus || null
        const taxDueDate = this.parseDate(record.tax_due_date || record.taxDueDate)
        const registrationDate = this.parseDate(record.registration_date || record.registrationDate)
        const bodyStyle = record.body_style || record.bodyStyle || null
        const doors = record.doors ? parseInt(record.doors) : null
        const transmission = record.transmission || null
        const notes = record.notes || null

        return [
          registration, customerId, make, model, year, color, fuelType, engineSize,
          engineCode, vin, motStatus, motExpiryDate, taxStatus, taxDueDate,
          registrationDate, bodyStyle, doors, transmission, notes
        ]
      }).filter(v => v[0]) // Only include vehicles with registration

      if (values.length > 0) {
        const placeholders = values.map((_, i) =>
          `($${i * 19 + 1}, $${i * 19 + 2}, $${i * 19 + 3}, $${i * 19 + 4}, $${i * 19 + 5}, $${i * 19 + 6}, $${i * 19 + 7}, $${i * 19 + 8}, $${i * 19 + 9}, $${i * 19 + 10}, $${i * 19 + 11}, $${i * 19 + 12}, $${i * 19 + 13}, $${i * 19 + 14}, $${i * 19 + 15}, $${i * 19 + 16}, $${i * 19 + 17}, $${i * 19 + 18}, $${i * 19 + 19})`
        ).join(', ')

        await sql.unsafe(`
          INSERT INTO vehicles (
            registration, owner_id, make, model, year, color, fuel_type, engine_size,
            engine_code, vin, mot_status, mot_expiry_date, tax_status, tax_due_date,
            registration_date, body_style, doors, transmission, notes
          )
          VALUES ${placeholders}
          ON CONFLICT (registration) DO UPDATE SET
            owner_id = EXCLUDED.owner_id,
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            color = EXCLUDED.color,
            fuel_type = EXCLUDED.fuel_type,
            engine_size = EXCLUDED.engine_size,
            engine_code = EXCLUDED.engine_code,
            vin = EXCLUDED.vin,
            mot_status = EXCLUDED.mot_status,
            mot_expiry_date = EXCLUDED.mot_expiry_date,
            tax_status = EXCLUDED.tax_status,
            tax_due_date = EXCLUDED.tax_due_date,
            registration_date = EXCLUDED.registration_date,
            body_style = EXCLUDED.body_style,
            doors = EXCLUDED.doors,
            transmission = EXCLUDED.transmission,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `, values.flat())

        stat.imported += values.length
        this.showProgress(stat)
      }
    }
  }

  private async importDocuments(records: any[], stat: ImportStats): Promise<void> {
    const batches = this.createBatches(records, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
      const values = batch.map(record => {
        // Map CSV fields to database fields based on actual CSV structure
        const id = record._ID
        const customerId = record._ID_Customer || null
        const vehicleId = record._ID_Vehicle || null
        const docType = record.docType || 'invoice'
        const docNumber = record.docNumber || null
        const docDateCreated = this.parseDate(record.docDate_Created || record.docDate)
        const docDateIssued = this.parseDate(record.docDate_Issued)
        const docDatePaid = this.parseDate(record.docDate_Paid)
        const docStatus = record.docStatus || 'draft'
        const customerName = record.customerName || null
        const customerCompany = record.customerCompany || null
        const customerAddress = record.customerAddress || null
        const customerPhone = record.customerPhone || null
        const customerMobile = record.customerMobile || null
        const vehicleMake = record.vehicleMake || null
        const vehicleModel = record.vehicleModel || null
        const vehicleRegistration = record.vehicleRegistration || null
        const vehicleMileage = record.vehicleMileage ? parseInt(record.vehicleMileage) : null
        const totalGross = this.parseDecimal(record.us_TotalGROSS || record.docTotalGross)
        const totalNet = this.parseDecimal(record.us_TotalNET || record.docTotalNet)
        const totalTax = this.parseDecimal(record.us_TotalTAX || record.docTotalTax)
        const status = record.docStatus || 'draft'
        const originalJobSheet = record.originalJobSheet || null
        const convertedTo = record.convertedTo || null
        const conversionNotes = record.conversionNotes || null

        return [
          id, customerId, vehicleId, docType, docNumber, docDateCreated, docDateIssued, docDatePaid,
          docStatus, customerName, customerCompany, customerAddress, customerPhone, customerMobile,
          vehicleMake, vehicleModel, vehicleRegistration, vehicleMileage, totalGross, totalNet,
          totalTax, status, originalJobSheet, convertedTo, conversionNotes
        ]
      }).filter(v => v[0]) // Only include records with ID

      if (values.length > 0) {
        const placeholders = values.map((_, i) =>
          `($${i * 25 + 1}, $${i * 25 + 2}, $${i * 25 + 3}, $${i * 25 + 4}, $${i * 25 + 5}, $${i * 25 + 6}, $${i * 25 + 7}, $${i * 25 + 8}, $${i * 25 + 9}, $${i * 25 + 10}, $${i * 25 + 11}, $${i * 25 + 12}, $${i * 25 + 13}, $${i * 25 + 14}, $${i * 25 + 15}, $${i * 25 + 16}, $${i * 25 + 17}, $${i * 25 + 18}, $${i * 25 + 19}, $${i * 25 + 20}, $${i * 25 + 21}, $${i * 25 + 22}, $${i * 25 + 23}, $${i * 25 + 24}, $${i * 25 + 25})`
        ).join(', ')

        await sql.unsafe(`
          INSERT INTO documents (
            _id, _id_customer, _id_vehicle, doc_type, doc_number, doc_date_created, doc_date_issued, doc_date_paid,
            doc_status, customer_name, customer_company, customer_address, customer_phone, customer_mobile,
            vehicle_make, vehicle_model, vehicle_registration, vehicle_mileage, total_gross, total_net,
            total_tax, status, original_job_sheet, converted_to, conversion_notes
          )
          VALUES ${placeholders}
          ON CONFLICT (_id) DO UPDATE SET
            _id_customer = EXCLUDED._id_customer,
            _id_vehicle = EXCLUDED._id_vehicle,
            doc_type = EXCLUDED.doc_type,
            doc_number = EXCLUDED.doc_number,
            doc_date_created = EXCLUDED.doc_date_created,
            doc_date_issued = EXCLUDED.doc_date_issued,
            doc_date_paid = EXCLUDED.doc_date_paid,
            doc_status = EXCLUDED.doc_status,
            customer_name = EXCLUDED.customer_name,
            customer_company = EXCLUDED.customer_company,
            customer_address = EXCLUDED.customer_address,
            customer_phone = EXCLUDED.customer_phone,
            customer_mobile = EXCLUDED.customer_mobile,
            vehicle_make = EXCLUDED.vehicle_make,
            vehicle_model = EXCLUDED.vehicle_model,
            vehicle_registration = EXCLUDED.vehicle_registration,
            vehicle_mileage = EXCLUDED.vehicle_mileage,
            total_gross = EXCLUDED.total_gross,
            total_net = EXCLUDED.total_net,
            total_tax = EXCLUDED.total_tax,
            status = EXCLUDED.status,
            original_job_sheet = EXCLUDED.original_job_sheet,
            converted_to = EXCLUDED.converted_to,
            conversion_notes = EXCLUDED.conversion_notes,
            updated_at = NOW()
        `, values.flat())

        stat.imported += values.length
        this.showProgress(stat)
      }
    }
  }

  private async importLineItems(records: any[], stat: ImportStats): Promise<void> {
    const batches = this.createBatches(records, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
      const values = batch.map(record => {
        // Map CSV fields to database fields based on actual CSV structure
        const id = record._ID
        const documentId = record._ID_Document
        const stockId = record._ID_Stock || null
        const description = record.itemDescription || ''
        const quantity = this.parseDecimal(record.itemQuantity) || 1
        const unitPrice = this.parseDecimal(record.itemUnitPrice) || 0
        const totalAmount = this.parseDecimal(record.itemSub_Gross) || (quantity * unitPrice)
        const taxRate = this.parseDecimal(record.itemTaxRate) || 0
        const taxAmount = this.parseDecimal(record.itemTaxAmount) || 0
        const lineType = record.itemType || 'part'
        const notes = record.itemNotes || null
        const partNumber = record.itemPartNumber || null
        const nominalCode = record.itemNominalCode || null

        return [
          id, documentId, stockId, description, quantity, unitPrice, totalAmount,
          taxRate, taxAmount, lineType, notes, partNumber, nominalCode
        ]
      }).filter(v => v[0] && v[1]) // Only include items with ID and document ID

      if (values.length > 0) {
        const placeholders = values.map((_, i) =>
          `($${i * 13 + 1}, $${i * 13 + 2}, $${i * 13 + 3}, $${i * 13 + 4}, $${i * 13 + 5}, $${i * 13 + 6}, $${i * 13 + 7}, $${i * 13 + 8}, $${i * 13 + 9}, $${i * 13 + 10}, $${i * 13 + 11}, $${i * 13 + 12}, $${i * 13 + 13})`
        ).join(', ')

        await sql.unsafe(`
          INSERT INTO line_items (
            id, document_id, stock_id, description, quantity, unit_price, total_price,
            tax_rate, tax_amount, line_type, notes, part_number, nominal_code
          )
          VALUES ${placeholders}
          ON CONFLICT (id) DO UPDATE SET
            document_id = EXCLUDED.document_id,
            stock_id = EXCLUDED.stock_id,
            description = EXCLUDED.description,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            total_price = EXCLUDED.total_price,
            tax_rate = EXCLUDED.tax_rate,
            tax_amount = EXCLUDED.tax_amount,
            line_type = EXCLUDED.line_type,
            notes = EXCLUDED.notes,
            part_number = EXCLUDED.part_number,
            nominal_code = EXCLUDED.nominal_code,
            updated_at = NOW()
        `, values.flat())

        stat.imported += values.length
        this.showProgress(stat)
      }
    }
  }

  private async importReceipts(records: any[], stat: ImportStats): Promise<void> {
    const batches = this.createBatches(records, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
      const values = batch.map(record => {
        // Map CSV fields to database fields based on actual CSV structure
        const id = record._ID
        const documentId = record._ID_Document || record.document_id
        const receiptDate = this.parseDate(record.receiptDate || record.receipt_date)
        const amount = this.parseDecimal(record.amount || record.receiptAmount) || 0
        const paymentMethod = record.paymentMethod || record.payment_method || null
        const description = record.description || record.receiptDescription || null

        return [id, documentId, receiptDate, amount, paymentMethod, description]
      }).filter(v => v[0] && v[1]) // Only include receipts with ID and document ID

      if (values.length > 0) {
        const placeholders = values.map((_, i) =>
          `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
        ).join(', ')

        await sql.unsafe(`
          INSERT INTO receipts (id, document_id, receipt_date, amount, payment_method, description)
          VALUES ${placeholders}
          ON CONFLICT (id) DO UPDATE SET
            document_id = EXCLUDED.document_id,
            receipt_date = EXCLUDED.receipt_date,
            amount = EXCLUDED.amount,
            payment_method = EXCLUDED.payment_method,
            description = EXCLUDED.description
        `, values.flat())

        stat.imported += values.length
        this.showProgress(stat)
      }
    }
  }

  private async importDocumentExtras(records: any[], stat: ImportStats): Promise<void> {
    const batches = this.createBatches(records, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
      const values = batch.map(record => {
        // Map CSV fields to database fields based on actual CSV structure
        const documentId = record._ID
        const labourDescription = record['Labour Description'] || record.labourDescription || null
        const notes = record.docNotes || record.notes || null

        return [documentId, labourDescription, notes]
      }).filter(v => v[0]) // Only include records with document ID

      if (values.length > 0) {
        const placeholders = values.map((_, i) =>
          `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`
        ).join(', ')

        await sql.unsafe(`
          INSERT INTO document_extras (document_id, labour_description, notes)
          VALUES ${placeholders}
          ON CONFLICT (document_id) DO UPDATE SET
            labour_description = EXCLUDED.labour_description,
            notes = EXCLUDED.notes
        `, values.flat())

        stat.imported += values.length
        this.showProgress(stat)
      }
    }
  }

  private async verifyImport(): Promise<void> {
    console.log('\n🔍 Verifying import...')

    const counts = await sql`
      SELECT
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM line_items) as line_items
    `

    const result = counts[0]
    console.log(`✅ Customers: ${result.customers}`)
    console.log(`✅ Vehicles: ${result.vehicles}`)
    console.log(`✅ Documents: ${result.documents}`)
    console.log(`✅ Line Items: ${result.line_items}`)

    // Verify relationships
    const relationships = await sql`
      SELECT
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_customers,
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL) as documents_with_customers
    `

    const rel = relationships[0]
    console.log(`🔗 Vehicles linked to customers: ${rel.vehicles_with_customers}`)
    console.log(`🔗 Documents linked to customers: ${rel.documents_with_customers}`)
  }

  private showResults(): void {
    const totalDuration = performance.now() - this.startTime

    console.log('\n🎉 IMPORT COMPLETED!')
    console.log('=' .repeat(60))
    console.log(`⏱️  Total time: ${(totalDuration / 1000).toFixed(1)}s`)

    let totalRecords = 0
    let totalImported = 0
    let totalErrors = 0

    for (const [key, stat] of this.stats) {
      const status = stat.status === 'completed' ? '✅' : '❌'
      console.log(`${status} ${stat.file}: ${stat.imported}/${stat.records} (${stat.duration.toFixed(0)}ms)`)

      totalRecords += stat.records
      totalImported += stat.imported
      totalErrors += stat.errors
    }

    console.log('=' .repeat(60))
    console.log(`📊 Total: ${totalImported}/${totalRecords} records imported`)
    console.log(`⚡ Speed: ${Math.round(totalImported / (totalDuration / 1000))} records/second`)

    if (totalErrors > 0) {
      console.log(`⚠️  Errors: ${totalErrors}`)
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private showProgress(stat: ImportStats): void {
    if (stat.imported % CONFIG.PROGRESS_INTERVAL === 0) {
      const percentage = Math.round((stat.imported / stat.records) * 100)
      console.log(`  📈 ${stat.file}: ${stat.imported}/${stat.records} (${percentage}%)`)
    }
  }

  private parseDate(dateStr: string | null): string | null {
    if (!dateStr) return null

    try {
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  private parseDecimal(value: string | number | null): number | null {
    if (value === null || value === undefined || value === '') return null

    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value
    return isNaN(num) ? null : num
  }
}

// Run the turbo import
async function main() {
  const importer = new TurboImporter()
  await importer.run()
  process.exit(0)
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Turbo import failed:', error)
    process.exit(1)
  })
}

export { TurboImporter }
