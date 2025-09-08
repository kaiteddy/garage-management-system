#!/usr/bin/env tsx
/**
 * 🚀 PRISMA GA4 IMPORT - Enterprise-grade with Accelerate
 * Uses Prisma Accelerate for reliable connection pooling and caching
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/database/prisma-client'
import { performance } from 'perf_hooks'

// Configuration
const CONFIG = {
  DATA_PATH: '/Users/adamrutstein/Desktop/GA4 EXPORT',
  BATCH_SIZE: 500, // Larger batches with Prisma Accelerate
  LOG_FILE: path.join(process.cwd(), 'logs', 'prisma-import.log')
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
  },
  success: (message: string) => {
    const logMessage = `[${new Date().toISOString()}] ✅ ${message}`
    console.log(logMessage)
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n')
  }
}

class PrismaGA4Importer {
  private stats = {
    customers: { created: 0, updated: 0, errors: 0 },
    vehicles: { created: 0, updated: 0, errors: 0 },
    documents: { created: 0, updated: 0, errors: 0 }
  }

  async run() {
    logger.log('🚀 Starting Prisma GA4 import with Accelerate')
    const startTime = performance.now()

    try {
      // Test Prisma Accelerate connection
      await this.testConnection()
      
      // Import in proper order (customers first, then vehicles, then documents)
      await this.processFile('Customers.csv', this.importCustomers.bind(this))
      await this.processFile('Vehicles.csv', this.importVehicles.bind(this))
      await this.processFile('Documents.csv', this.importDocuments.bind(this))
      
      await this.verifyImport()
      await this.printStats()
      
      const duration = ((performance.now() - startTime) / 1000).toFixed(1)
      logger.success(`Import completed in ${duration}s`)
      
    } catch (error) {
      logger.error('Import failed', error as Error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }

  private async testConnection() {
    logger.log('🔌 Testing Prisma Accelerate connection...')
    try {
      const result = await prisma.$queryRaw`SELECT COUNT(*) as customers FROM customers`
      logger.success(`Connected! Current customers: ${(result as any)[0].customers}`)
    } catch (error) {
      logger.error('Connection test failed', error as Error)
      throw error
    }
  }

  private async processFile(fileName: string, handler: (records: any[]) => Promise<void>) {
    const filePath = path.join(CONFIG.DATA_PATH, fileName)
    logger.log(`📂 Processing ${fileName}...`)
    
    try {
      if (!fs.existsSync(filePath)) {
        logger.error(`File not found: ${filePath}`)
        return
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const records = parse(fileContent, { columns: true, skip_empty_lines: true })
      logger.log(`  Found ${records.length} records`)
      
      // Process in batches
      const batches = this.createBatches(records, CONFIG.BATCH_SIZE)
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        await handler(batch)
        
        const progress = Math.round(((i + 1) / batches.length) * 100)
        process.stdout.write(`\\r  Progress: ${progress}% (${(i + 1) * batch.length}/${records.length})`)
      }
      
      console.log()
      
    } catch (error) {
      logger.error(`Failed to process ${fileName}`, error as Error)
      throw error
    }
  }

  private async importCustomers(records: any[]) {
    logger.log(`📥 Importing ${records.length} customers...`)
    
    for (const record of records) {
      try {
        // Map GA4 CSV columns to Prisma model
        const customerData = {
          id: record._id || record.id,
          accountNumber: record.account_number || null,
          forename: record.nameforename || record.Name_Forename || '',
          surname: record.namesurname || record.Name_Surname || '',
          companyName: record.company_name || null,
          houseNo: record.addresshouseno || record.Address_HouseNo || null,
          road: record.addressroad || record.Address_Road || null,
          locality: record.addresslocality || null,
          town: record.addresstown || record.Address_Town || null,
          county: record.addresscounty || null,
          postCode: record.addresspostcode || record.Address_PostCode || null,
          telephone: record.contacttelephone || record.Contact_Telephone || null,
          mobile: record.contactmobile || record.Contact_Mobile || null,
          email: record.contactemail || record.Contact_Email || null,
          notes: record.notes || null
        }

        if (!customerData.id || !customerData.forename) {
          logger.error(`Skipping customer with missing required fields: ${JSON.stringify(record).substring(0, 100)}`)
          this.stats.customers.errors++
          continue
        }

        // Use Prisma upsert for efficient create/update
        await prisma.customer.upsert({
          where: { id: customerData.id },
          update: {
            accountNumber: customerData.accountNumber,
            forename: customerData.forename,
            surname: customerData.surname,
            companyName: customerData.companyName,
            houseNo: customerData.houseNo,
            road: customerData.road,
            locality: customerData.locality,
            town: customerData.town,
            county: customerData.county,
            postCode: customerData.postCode,
            telephone: customerData.telephone,
            mobile: customerData.mobile,
            email: customerData.email,
            notes: customerData.notes,
            updatedAt: new Date()
          },
          create: {
            id: customerData.id,
            accountNumber: customerData.accountNumber,
            forename: customerData.forename,
            surname: customerData.surname,
            companyName: customerData.companyName,
            houseNo: customerData.houseNo,
            road: customerData.road,
            locality: customerData.locality,
            town: customerData.town,
            county: customerData.county,
            postCode: customerData.postCode,
            telephone: customerData.telephone,
            mobile: customerData.mobile,
            email: customerData.email,
            notes: customerData.notes
          }
        })

        this.stats.customers.created++
        
      } catch (error) {
        logger.error(`Error importing customer ${record._id || 'unknown'}`, error as Error)
        this.stats.customers.errors++
      }
    }
  }

  private async importVehicles(records: any[]) {
    logger.log(`🚗 Importing ${records.length} vehicles...`)
    
    for (const record of records) {
      try {
        // Map GA4 CSV columns to Prisma model
        const vehicleData = {
          id: record._id || record.id,
          customerId: record._id_customer || record.customer_id || null,
          registration: record.registration || record.Registration,
          make: record.make || record.Make || 'Unknown',
          model: record.model || record.Model || 'Unknown',
          colour: record.colour || record.color || record.Colour || null,
          fuelType: record.fuel_type || record.FuelType || null,
          vin: record.vin || record.VIN || null,
          engineCode: record.engine_code || null,
          dateOfReg: record.date_of_reg ? new Date(record.date_of_reg) : null,
          motExpiryDate: record.mot_expiry_date ? new Date(record.mot_expiry_date) : null,
          motStatus: record.mot_status || 'unknown'
        }

        if (!vehicleData.id || !vehicleData.registration) {
          logger.error(`Skipping vehicle with missing required fields: ${JSON.stringify(record).substring(0, 100)}`)
          this.stats.vehicles.errors++
          continue
        }

        // Use Prisma upsert for efficient create/update
        await prisma.vehicle.upsert({
          where: { id: vehicleData.id },
          update: {
            customerId: vehicleData.customerId,
            registration: vehicleData.registration,
            make: vehicleData.make,
            model: vehicleData.model,
            colour: vehicleData.colour,
            fuelType: vehicleData.fuelType,
            vin: vehicleData.vin,
            engineCode: vehicleData.engineCode,
            dateOfReg: vehicleData.dateOfReg,
            motExpiryDate: vehicleData.motExpiryDate,
            motStatus: vehicleData.motStatus,
            updatedAt: new Date()
          },
          create: {
            id: vehicleData.id,
            customerId: vehicleData.customerId,
            registration: vehicleData.registration,
            make: vehicleData.make,
            model: vehicleData.model,
            colour: vehicleData.colour,
            fuelType: vehicleData.fuelType,
            vin: vehicleData.vin,
            engineCode: vehicleData.engineCode,
            dateOfReg: vehicleData.dateOfReg,
            motExpiryDate: vehicleData.motExpiryDate,
            motStatus: vehicleData.motStatus
          }
        })

        this.stats.vehicles.created++
        
      } catch (error) {
        logger.error(`Error importing vehicle ${record._id || record.registration || 'unknown'}`, error as Error)
        this.stats.vehicles.errors++
      }
    }
  }

  private async importDocuments(records: any[]) {
    logger.log(`📄 Importing ${records.length} documents...`)
    
    for (const record of records) {
      try {
        // Map GA4 CSV columns to Prisma model
        const documentData = {
          id: record._id || record.id,
          customerId: record._id_customer || record.customer_id || null,
          vehicleId: record._id_vehicle || record.vehicle_id || null,
          docDate: record.doc_date ? new Date(record.doc_date) : null,
          docNumber: record.doc_number || record.document_number || null,
          docType: record.doc_type || record.document_type || 'Invoice',
          totalNet: record.total_net ? parseFloat(record.total_net) : 0,
          totalVat: record.total_vat ? parseFloat(record.total_vat) : 0,
          totalGross: record.total_gross ? parseFloat(record.total_gross) : 0,
          status: record.status || 'Active',
          labourDescription: record.labour_description || null,
          notes: record.notes || null
        }

        if (!documentData.id) {
          logger.error(`Skipping document with missing ID: ${JSON.stringify(record).substring(0, 100)}`)
          this.stats.documents.errors++
          continue
        }

        // Use Prisma upsert for efficient create/update
        await prisma.document.upsert({
          where: { id: documentData.id },
          update: {
            customerId: documentData.customerId,
            vehicleId: documentData.vehicleId,
            docDate: documentData.docDate,
            docNumber: documentData.docNumber,
            docType: documentData.docType,
            totalNet: documentData.totalNet,
            totalVat: documentData.totalVat,
            totalGross: documentData.totalGross,
            status: documentData.status,
            labourDescription: documentData.labourDescription,
            notes: documentData.notes,
            updatedAt: new Date()
          },
          create: {
            id: documentData.id,
            customerId: documentData.customerId,
            vehicleId: documentData.vehicleId,
            docDate: documentData.docDate,
            docNumber: documentData.docNumber,
            docType: documentData.docType,
            totalNet: documentData.totalNet,
            totalVat: documentData.totalVat,
            totalGross: documentData.totalGross,
            status: documentData.status,
            labourDescription: documentData.labourDescription,
            notes: documentData.notes
          }
        })

        this.stats.documents.created++
        
      } catch (error) {
        logger.error(`Error importing document ${record._id || 'unknown'}`, error as Error)
        this.stats.documents.errors++
      }
    }
  }

  private async verifyImport() {
    logger.log('\\n🔍 Verifying import...')
    
    try {
      const customerCount = await prisma.customer.count()
      const vehicleCount = await prisma.vehicle.count()
      const documentCount = await prisma.document.count()
      
      logger.log(`  👥 Customers: ${customerCount.toLocaleString()}`)
      logger.log(`  🚗 Vehicles: ${vehicleCount.toLocaleString()}`)
      logger.log(`  📄 Documents: ${documentCount.toLocaleString()}`)
      
    } catch (error) {
      logger.error('Error verifying import', error as Error)
    }
  }

  private async printStats() {
    logger.log('\\n📊 IMPORT STATISTICS')
    logger.log('====================')
    
    Object.entries(this.stats).forEach(([table, stats]) => {
      logger.log(`${table.toUpperCase()}:`)
      logger.log(`  ✅ Created/Updated: ${stats.created.toLocaleString()}`)
      logger.log(`  ❌ Errors: ${stats.errors.toLocaleString()}`)
    })
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
new PrismaGA4Importer().run().catch(console.error)
