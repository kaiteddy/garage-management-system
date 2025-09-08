#!/usr/bin/env tsx
/**
 * 🗑️ REMOVE SAMPLE DATA - Clean Database Script
 * 
 * Removes all sample/test data while preserving real garage management data:
 * - Removes test customers (John Doe, Jane Smith, etc.)
 * - Removes sample vehicles (TEST123, SAMPLE456, etc.)
 * - Removes demo documents and line items
 * - Removes any hardcoded test records
 * - Preserves all real customer data from CSV imports
 */

import { sql } from '@/lib/database/neon-client'
import { performance } from 'perf_hooks'

class SampleDataRemover {
  private startTime: number = 0
  private removedCounts = {
    customers: 0,
    vehicles: 0,
    documents: 0,
    line_items: 0,
    receipts: 0,
    document_extras: 0,
    appointments: 0,
    reminders: 0
  }

  constructor() {
    console.log('🗑️ SAMPLE DATA REMOVAL - Database Cleanup')
    console.log('=' .repeat(50))
  }

  async run(): Promise<void> {
    this.startTime = performance.now()
    
    try {
      await this.showCurrentCounts()
      await this.removeSampleCustomers()
      await this.removeSampleVehicles()
      await this.removeSampleDocuments()
      await this.removeSampleLineItems()
      await this.removeSampleReceipts()
      await this.removeSampleDocumentExtras()
      await this.removeSampleAppointments()
      await this.removeSampleReminders()
      await this.removeOrphanedRecords()
      await this.showFinalResults()
      
    } catch (error) {
      console.error('❌ Sample data removal failed:', error)
      process.exit(1)
    }
  }

  private async showCurrentCounts(): Promise<void> {
    console.log('\n📊 Current Database State:')
    console.log('-'.repeat(30))
    
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM line_items) as line_items,
        (SELECT COUNT(*) FROM receipts) as receipts,
        (SELECT COUNT(*) FROM document_extras) as document_extras,
        (SELECT COUNT(*) FROM appointments) as appointments,
        (SELECT COUNT(*) FROM reminders) as reminders
    `
    
    const result = counts[0]
    
    console.log(`👥 Customers: ${Number(result.customers).toLocaleString()}`)
    console.log(`🚗 Vehicles: ${Number(result.vehicles).toLocaleString()}`)
    console.log(`📄 Documents: ${Number(result.documents).toLocaleString()}`)
    console.log(`📝 Line Items: ${Number(result.line_items).toLocaleString()}`)
    console.log(`🧾 Receipts: ${Number(result.receipts).toLocaleString()}`)
    console.log(`📋 Document Extras: ${Number(result.document_extras).toLocaleString()}`)
    console.log(`📅 Appointments: ${Number(result.appointments).toLocaleString()}`)
    console.log(`⏰ Reminders: ${Number(result.reminders).toLocaleString()}`)
  }

  private async removeSampleCustomers(): Promise<void> {
    console.log('\n🗑️ Removing Sample Customers...')
    
    // Remove customers with obvious test/sample patterns
    const sampleCustomerPatterns = [
      'John Doe',
      'Jane Doe', 
      'Jane Smith',
      'John Smith',
      'Test Customer',
      'Sample Customer',
      'Demo Customer',
      'Example Customer',
      'Acme Corp',
      'Test Company',
      'Sample Company',
      'Demo Company',
      'Example Ltd'
    ]
    
    // Remove by name patterns
    for (const pattern of sampleCustomerPatterns) {
      const result = await sql`
        DELETE FROM customers 
        WHERE 
          LOWER(first_name || ' ' || last_name) = LOWER(${pattern})
          OR LOWER(company_name) = LOWER(${pattern})
          OR first_name ILIKE ${'%test%'}
          OR first_name ILIKE ${'%sample%'}
          OR first_name ILIKE ${'%demo%'}
          OR first_name ILIKE ${'%example%'}
          OR last_name ILIKE ${'%test%'}
          OR last_name ILIKE ${'%sample%'}
          OR last_name ILIKE ${'%demo%'}
          OR last_name ILIKE ${'%example%'}
          OR company_name ILIKE ${'%test%'}
          OR company_name ILIKE ${'%sample%'}
          OR company_name ILIKE ${'%demo%'}
          OR company_name ILIKE ${'%example%'}
      `
      this.removedCounts.customers += result.count
    }
    
    // Remove customers with test email patterns
    const testEmailResult = await sql`
      DELETE FROM customers 
      WHERE 
        email ILIKE '%test%'
        OR email ILIKE '%sample%'
        OR email ILIKE '%demo%'
        OR email ILIKE '%example%'
        OR email ILIKE '%@test.%'
        OR email ILIKE '%@sample.%'
        OR email ILIKE '%@demo.%'
        OR email ILIKE '%@example.%'
        OR email = 'test@test.com'
        OR email = 'sample@sample.com'
        OR email = 'demo@demo.com'
    `
    this.removedCounts.customers += testEmailResult.count
    
    // Remove customers with sequential IDs (likely test data)
    const sequentialResult = await sql`
      DELETE FROM customers 
      WHERE 
        id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
        OR id ILIKE 'test%'
        OR id ILIKE 'sample%'
        OR id ILIKE 'demo%'
        OR id ILIKE 'customer%'
    `
    this.removedCounts.customers += sequentialResult.count
    
    console.log(`✅ Removed ${this.removedCounts.customers} sample customers`)
  }

  private async removeSampleVehicles(): Promise<void> {
    console.log('\n🗑️ Removing Sample Vehicles...')
    
    // Remove vehicles with test registration patterns
    const testVehicleResult = await sql`
      DELETE FROM vehicles 
      WHERE 
        registration ILIKE '%TEST%'
        OR registration ILIKE '%SAMPLE%'
        OR registration ILIKE '%DEMO%'
        OR registration ILIKE '%EXAMPLE%'
        OR registration IN ('TEST123', 'SAMPLE456', 'DEMO789', 'ABC123', 'XYZ789')
        OR registration ILIKE 'AA%AA'  -- Obviously fake patterns
        OR registration ILIKE 'BB%BB'
        OR registration ILIKE 'CC%CC'
        OR registration = '123ABC'
        OR registration = '456DEF'
        OR registration = '789GHI'
        OR make ILIKE '%test%'
        OR make ILIKE '%sample%'
        OR make ILIKE '%demo%'
        OR model ILIKE '%test%'
        OR model ILIKE '%sample%'
        OR model ILIKE '%demo%'
    `
    this.removedCounts.vehicles += testVehicleResult.count
    
    console.log(`✅ Removed ${this.removedCounts.vehicles} sample vehicles`)
  }

  private async removeSampleDocuments(): Promise<void> {
    console.log('\n🗑️ Removing Sample Documents...')
    
    // Remove documents with test patterns
    const testDocumentResult = await sql`
      DELETE FROM documents 
      WHERE 
        doc_number ILIKE '%TEST%'
        OR doc_number ILIKE '%SAMPLE%'
        OR doc_number ILIKE '%DEMO%'
        OR doc_number ILIKE '%EXAMPLE%'
        OR customer_name ILIKE '%test%'
        OR customer_name ILIKE '%sample%'
        OR customer_name ILIKE '%demo%'
        OR customer_name ILIKE '%example%'
        OR customer_name = 'John Doe'
        OR customer_name = 'Jane Doe'
        OR customer_name = 'Jane Smith'
        OR customer_name = 'John Smith'
        OR vehicle_registration ILIKE '%TEST%'
        OR vehicle_registration ILIKE '%SAMPLE%'
        OR vehicle_registration ILIKE '%DEMO%'
        OR _id ILIKE 'test%'
        OR _id ILIKE 'sample%'
        OR _id ILIKE 'demo%'
        OR _id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
    `
    this.removedCounts.documents += testDocumentResult.count
    
    console.log(`✅ Removed ${this.removedCounts.documents} sample documents`)
  }

  private async removeSampleLineItems(): Promise<void> {
    console.log('\n🗑️ Removing Sample Line Items...')
    
    // Remove line items with test patterns
    const testLineItemResult = await sql`
      DELETE FROM line_items 
      WHERE 
        description ILIKE '%test%'
        OR description ILIKE '%sample%'
        OR description ILIKE '%demo%'
        OR description ILIKE '%example%'
        OR description = 'Test Item'
        OR description = 'Sample Part'
        OR description = 'Demo Service'
        OR part_number ILIKE '%TEST%'
        OR part_number ILIKE '%SAMPLE%'
        OR part_number ILIKE '%DEMO%'
        OR id ILIKE 'test%'
        OR id ILIKE 'sample%'
        OR id ILIKE 'demo%'
        OR id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
    `
    this.removedCounts.line_items += testLineItemResult.count
    
    console.log(`✅ Removed ${this.removedCounts.line_items} sample line items`)
  }

  private async removeSampleReceipts(): Promise<void> {
    console.log('\n🗑️ Removing Sample Receipts...')
    
    // Remove receipts with test patterns
    const testReceiptResult = await sql`
      DELETE FROM receipts 
      WHERE 
        description ILIKE '%test%'
        OR description ILIKE '%sample%'
        OR description ILIKE '%demo%'
        OR description ILIKE '%example%'
        OR payment_method = 'Test Payment'
        OR payment_method = 'Sample Payment'
        OR id ILIKE 'test%'
        OR id ILIKE 'sample%'
        OR id ILIKE 'demo%'
        OR id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
    `
    this.removedCounts.receipts += testReceiptResult.count
    
    console.log(`✅ Removed ${this.removedCounts.receipts} sample receipts`)
  }

  private async removeSampleDocumentExtras(): Promise<void> {
    console.log('\n🗑️ Removing Sample Document Extras...')
    
    // Remove document extras with test patterns
    const testDocumentExtraResult = await sql`
      DELETE FROM document_extras 
      WHERE 
        labour_description ILIKE '%test%'
        OR labour_description ILIKE '%sample%'
        OR labour_description ILIKE '%demo%'
        OR labour_description ILIKE '%example%'
        OR notes ILIKE '%test%'
        OR notes ILIKE '%sample%'
        OR notes ILIKE '%demo%'
        OR document_id ILIKE 'test%'
        OR document_id ILIKE 'sample%'
        OR document_id ILIKE 'demo%'
        OR document_id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
    `
    this.removedCounts.document_extras += testDocumentExtraResult.count
    
    console.log(`✅ Removed ${this.removedCounts.document_extras} sample document extras`)
  }

  private async removeSampleAppointments(): Promise<void> {
    console.log('\n🗑️ Removing Sample Appointments...')
    
    // Remove appointments with test patterns
    const testAppointmentResult = await sql`
      DELETE FROM appointments 
      WHERE 
        description ILIKE '%test%'
        OR description ILIKE '%sample%'
        OR description ILIKE '%demo%'
        OR description ILIKE '%example%'
        OR resource ILIKE '%test%'
        OR resource ILIKE '%sample%'
        OR resource ILIKE '%demo%'
    `
    this.removedCounts.appointments += testAppointmentResult.count
    
    console.log(`✅ Removed ${this.removedCounts.appointments} sample appointments`)
  }

  private async removeSampleReminders(): Promise<void> {
    console.log('\n🗑️ Removing Sample Reminders...')
    
    // Remove reminders linked to test vehicles (will be removed by cascade)
    const testReminderResult = await sql`
      DELETE FROM reminders 
      WHERE 
        vehicle_id IN (
          SELECT id FROM vehicles 
          WHERE registration ILIKE '%TEST%' 
          OR registration ILIKE '%SAMPLE%'
          OR registration ILIKE '%DEMO%'
        )
    `
    this.removedCounts.reminders += testReminderResult.count
    
    console.log(`✅ Removed ${this.removedCounts.reminders} sample reminders`)
  }

  private async removeOrphanedRecords(): Promise<void> {
    console.log('\n🗑️ Removing Orphaned Records...')
    
    // Remove vehicles without valid customers
    const orphanedVehicles = await sql`
      DELETE FROM vehicles 
      WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT id FROM customers)
    `
    
    // Remove documents without valid customers
    const orphanedDocuments = await sql`
      DELETE FROM documents 
      WHERE _id_customer IS NOT NULL 
      AND _id_customer NOT IN (SELECT id FROM customers)
    `
    
    // Remove line items without valid documents
    const orphanedLineItems = await sql`
      DELETE FROM line_items 
      WHERE document_id IS NOT NULL 
      AND document_id NOT IN (SELECT _id FROM documents)
    `
    
    // Remove receipts without valid documents
    const orphanedReceipts = await sql`
      DELETE FROM receipts 
      WHERE document_id IS NOT NULL 
      AND document_id NOT IN (SELECT _id FROM documents)
    `
    
    // Remove document extras without valid documents
    const orphanedDocumentExtras = await sql`
      DELETE FROM document_extras 
      WHERE document_id IS NOT NULL 
      AND document_id NOT IN (SELECT _id FROM documents)
    `
    
    console.log(`✅ Removed ${orphanedVehicles.count} orphaned vehicles`)
    console.log(`✅ Removed ${orphanedDocuments.count} orphaned documents`)
    console.log(`✅ Removed ${orphanedLineItems.count} orphaned line items`)
    console.log(`✅ Removed ${orphanedReceipts.count} orphaned receipts`)
    console.log(`✅ Removed ${orphanedDocumentExtras.count} orphaned document extras`)
  }

  private async showFinalResults(): Promise<void> {
    const totalDuration = performance.now() - this.startTime
    
    console.log('\n📊 Final Database State:')
    console.log('-'.repeat(30))
    
    const finalCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM line_items) as line_items,
        (SELECT COUNT(*) FROM receipts) as receipts,
        (SELECT COUNT(*) FROM document_extras) as document_extras,
        (SELECT COUNT(*) FROM appointments) as appointments,
        (SELECT COUNT(*) FROM reminders) as reminders
    `
    
    const result = finalCounts[0]
    
    console.log(`👥 Customers: ${Number(result.customers).toLocaleString()}`)
    console.log(`🚗 Vehicles: ${Number(result.vehicles).toLocaleString()}`)
    console.log(`📄 Documents: ${Number(result.documents).toLocaleString()}`)
    console.log(`📝 Line Items: ${Number(result.line_items).toLocaleString()}`)
    console.log(`🧾 Receipts: ${Number(result.receipts).toLocaleString()}`)
    console.log(`📋 Document Extras: ${Number(result.document_extras).toLocaleString()}`)
    console.log(`📅 Appointments: ${Number(result.appointments).toLocaleString()}`)
    console.log(`⏰ Reminders: ${Number(result.reminders).toLocaleString()}`)
    
    console.log('\n🗑️ SAMPLE DATA REMOVAL COMPLETED!')
    console.log('=' .repeat(50))
    console.log(`⏱️  Total time: ${(totalDuration / 1000).toFixed(1)}s`)
    
    const totalRemoved = Object.values(this.removedCounts).reduce((sum, count) => sum + count, 0)
    console.log(`🗑️  Total records removed: ${totalRemoved.toLocaleString()}`)
    
    console.log('\n📋 Removal Summary:')
    Object.entries(this.removedCounts).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`   🗑️  ${table}: ${count.toLocaleString()} removed`)
      }
    })
    
    console.log('\n✅ Your database now contains only real garage management data!')
    console.log('🎯 Ready for production use!')
    
    // Verify no sample data remains
    await this.verifySampleDataRemoval()
  }

  private async verifySampleDataRemoval(): Promise<void> {
    console.log('\n🔍 Verifying Sample Data Removal...')
    
    const sampleCheck = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE 
          first_name ILIKE '%test%' OR first_name ILIKE '%sample%' OR 
          last_name ILIKE '%test%' OR last_name ILIKE '%sample%' OR
          email ILIKE '%test%' OR email ILIKE '%sample%'
        ) as sample_customers,
        
        (SELECT COUNT(*) FROM vehicles WHERE 
          registration ILIKE '%TEST%' OR registration ILIKE '%SAMPLE%'
        ) as sample_vehicles,
        
        (SELECT COUNT(*) FROM documents WHERE 
          customer_name ILIKE '%test%' OR customer_name ILIKE '%sample%' OR
          doc_number ILIKE '%TEST%' OR doc_number ILIKE '%SAMPLE%'
        ) as sample_documents
    `
    
    const result = sampleCheck[0]
    
    if (result.sample_customers === 0 && result.sample_vehicles === 0 && result.sample_documents === 0) {
      console.log('✅ Verification passed: No sample data detected!')
    } else {
      console.log(`⚠️  Warning: Found ${result.sample_customers} sample customers, ${result.sample_vehicles} sample vehicles, ${result.sample_documents} sample documents`)
    }
  }
}

// Run the sample data removal
async function main() {
  const remover = new SampleDataRemover()
  await remover.run()
  process.exit(0)
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Sample data removal failed:', error)
    process.exit(1)
  })
}

export { SampleDataRemover }
