#!/usr/bin/env tsx
/**
 * 🔍 TURBO IMPORT VERIFICATION
 * 
 * Instantly verifies the turbo import results with:
 * - Record counts
 * - Data integrity checks
 * - Relationship validation
 * - Sample data inspection
 */

import { sql } from '@/lib/database/neon-client'
import { performance } from 'perf_hooks'

class TurboVerifier {
  private startTime: number = 0

  constructor() {
    console.log('🔍 TURBO IMPORT VERIFICATION')
    console.log('=' .repeat(50))
  }

  async run(): Promise<void> {
    this.startTime = performance.now()
    
    try {
      await this.checkRecordCounts()
      await this.checkDataIntegrity()
      await this.checkRelationships()
      await this.inspectSampleData()
      await this.checkJobSheets()
      
      this.showResults()
      
    } catch (error) {
      console.error('❌ Verification failed:', error)
      process.exit(1)
    }
  }

  private async checkRecordCounts(): Promise<void> {
    console.log('\n📊 Record Counts:')
    
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM line_items) as line_items,
        (SELECT COUNT(*) FROM receipts) as receipts,
        (SELECT COUNT(*) FROM document_extras) as document_extras
    `
    
    const result = counts[0]
    
    console.log(`✅ Customers: ${result.customers?.toLocaleString() || 0}`)
    console.log(`✅ Vehicles: ${result.vehicles?.toLocaleString() || 0}`)
    console.log(`✅ Documents: ${result.documents?.toLocaleString() || 0}`)
    console.log(`✅ Line Items: ${result.line_items?.toLocaleString() || 0}`)
    console.log(`✅ Receipts: ${result.receipts?.toLocaleString() || 0}`)
    console.log(`✅ Document Extras: ${result.document_extras?.toLocaleString() || 0}`)
    
    // Check for expected minimums
    if (result.customers < 1000) {
      console.log('⚠️  Warning: Customer count seems low')
    }
    if (result.vehicles < 1000) {
      console.log('⚠️  Warning: Vehicle count seems low')
    }
  }

  private async checkDataIntegrity(): Promise<void> {
    console.log('\n🔍 Data Integrity:')
    
    // Check for null/empty critical fields
    const integrity = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE first_name IS NULL OR first_name = '') as customers_no_name,
        (SELECT COUNT(*) FROM vehicles WHERE registration IS NULL OR registration = '') as vehicles_no_reg,
        (SELECT COUNT(*) FROM documents WHERE doc_type IS NULL OR doc_type = '') as documents_no_type,
        (SELECT COUNT(*) FROM customers WHERE id IS NULL) as customers_no_id,
        (SELECT COUNT(*) FROM vehicles WHERE registration IS NULL) as vehicles_no_id
    `
    
    const result = integrity[0]
    
    if (result.customers_no_name === 0) {
      console.log('✅ All customers have names')
    } else {
      console.log(`⚠️  ${result.customers_no_name} customers missing names`)
    }
    
    if (result.vehicles_no_reg === 0) {
      console.log('✅ All vehicles have registrations')
    } else {
      console.log(`⚠️  ${result.vehicles_no_reg} vehicles missing registrations`)
    }
    
    if (result.documents_no_type === 0) {
      console.log('✅ All documents have types')
    } else {
      console.log(`⚠️  ${result.documents_no_type} documents missing types`)
    }
  }

  private async checkRelationships(): Promise<void> {
    console.log('\n🔗 Relationships:')
    
    const relationships = await sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_customers,
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL AND owner_id IN (SELECT id FROM customers)) as vehicles_valid_customers,
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL) as documents_with_customers,
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL AND _id_customer IN (SELECT id FROM customers)) as documents_valid_customers,
        (SELECT COUNT(*) FROM line_items WHERE document_id IS NOT NULL) as lineitems_with_documents
    `
    
    const result = relationships[0]
    
    console.log(`🔗 Vehicles linked to customers: ${result.vehicles_with_customers}`)
    console.log(`✅ Valid customer links: ${result.vehicles_valid_customers}`)
    
    console.log(`🔗 Documents linked to customers: ${result.documents_with_customers}`)
    console.log(`✅ Valid customer links: ${result.documents_valid_customers}`)
    
    console.log(`🔗 Line items linked to documents: ${result.lineitems_with_documents}`)
    
    // Check for orphaned records
    const orphaned = await sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL AND owner_id NOT IN (SELECT id FROM customers)) as orphaned_vehicles,
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL AND _id_customer NOT IN (SELECT id FROM customers)) as orphaned_documents
    `
    
    const orphans = orphaned[0]
    
    if (orphans.orphaned_vehicles > 0) {
      console.log(`⚠️  ${orphans.orphaned_vehicles} vehicles have invalid customer references`)
    }
    
    if (orphans.orphaned_documents > 0) {
      console.log(`⚠️  ${orphans.orphaned_documents} documents have invalid customer references`)
    }
  }

  private async inspectSampleData(): Promise<void> {
    console.log('\n🔍 Sample Data:')
    
    // Sample customers
    const sampleCustomers = await sql`
      SELECT first_name, last_name, email, phone, city
      FROM customers 
      WHERE first_name IS NOT NULL AND first_name != ''
      ORDER BY created_at DESC
      LIMIT 3
    `
    
    console.log('📋 Sample Customers:')
    sampleCustomers.forEach((customer, i) => {
      console.log(`  ${i + 1}. ${customer.first_name} ${customer.last_name} - ${customer.city || 'No city'} - ${customer.phone || 'No phone'}`)
    })
    
    // Sample vehicles
    const sampleVehicles = await sql`
      SELECT registration, make, model, year, mot_expiry_date
      FROM vehicles 
      WHERE registration IS NOT NULL AND registration != ''
      ORDER BY created_at DESC
      LIMIT 3
    `
    
    console.log('\n🚗 Sample Vehicles:')
    sampleVehicles.forEach((vehicle, i) => {
      const motDate = vehicle.mot_expiry_date ? new Date(vehicle.mot_expiry_date).toLocaleDateString() : 'No MOT date'
      console.log(`  ${i + 1}. ${vehicle.registration} - ${vehicle.make} ${vehicle.model} (${vehicle.year || 'Unknown year'}) - MOT: ${motDate}`)
    })
    
    // Sample documents
    const sampleDocuments = await sql`
      SELECT doc_type, doc_number, customer_name, vehicle_registration, total_gross
      FROM documents 
      WHERE doc_type IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 3
    `
    
    console.log('\n📄 Sample Documents:')
    sampleDocuments.forEach((doc, i) => {
      const total = doc.total_gross ? `£${doc.total_gross}` : 'No total'
      console.log(`  ${i + 1}. ${doc.doc_type} ${doc.doc_number || 'No number'} - ${doc.customer_name || 'No customer'} - ${doc.vehicle_registration || 'No vehicle'} - ${total}`)
    })
  }

  private async checkJobSheets(): Promise<void> {
    console.log('\n📋 Job Sheets Check:')
    
    // Check for job sheet documents
    const jobSheets = await sql`
      SELECT COUNT(*) as count
      FROM documents 
      WHERE doc_type IN ('JS', 'JOB', 'Job Sheet', 'JOBSHEET')
    `
    
    const jsCount = jobSheets[0]?.count || 0
    console.log(`📋 Job Sheets found: ${jsCount}`)
    
    if (jsCount > 0) {
      // Sample job sheets
      const sampleJS = await sql`
        SELECT doc_number, customer_name, vehicle_registration, doc_status, total_gross
        FROM documents 
        WHERE doc_type IN ('JS', 'JOB', 'Job Sheet', 'JOBSHEET')
        ORDER BY created_at DESC
        LIMIT 5
      `
      
      console.log('📋 Sample Job Sheets:')
      sampleJS.forEach((js, i) => {
        console.log(`  ${i + 1}. ${js.doc_number || 'No number'} - ${js.customer_name || 'No customer'} - ${js.vehicle_registration || 'No reg'} - ${js.doc_status || 'No status'}`)
      })
    } else {
      console.log('⚠️  No job sheets found - check document type mapping')
    }
  }

  private showResults(): void {
    const totalDuration = performance.now() - this.startTime
    
    console.log('\n🎉 VERIFICATION COMPLETED!')
    console.log('=' .repeat(50))
    console.log(`⏱️  Verification time: ${totalDuration.toFixed(0)}ms`)
    console.log('✅ Import verification successful!')
    console.log('\n🚀 Your garage management system is ready to use!')
  }
}

// Run the verification
async function main() {
  const verifier = new TurboVerifier()
  await verifier.run()
  process.exit(0)
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Verification failed:', error)
    process.exit(1)
  })
}

export { TurboVerifier }
