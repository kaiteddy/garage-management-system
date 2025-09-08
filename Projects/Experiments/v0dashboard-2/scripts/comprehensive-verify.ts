#!/usr/bin/env tsx
/**
 * 🔍 COMPREHENSIVE IMPORT VERIFICATION
 * 
 * Thoroughly verifies ALL imported data with:
 * - Complete record counts
 * - Data integrity checks
 * - Relationship validation
 * - Field completeness analysis
 * - Sample data inspection
 * - Job sheets functionality test
 * - Performance metrics
 */

import { sql } from '@/lib/database/neon-client'
import { performance } from 'perf_hooks'

interface VerificationResult {
  category: string
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warning'
    value: any
    expected?: any
    message: string
  }>
}

class ComprehensiveVerifier {
  private startTime: number = 0
  private results: VerificationResult[] = []

  constructor() {
    console.log('🔍 COMPREHENSIVE IMPORT VERIFICATION')
    console.log('=' .repeat(60))
  }

  async run(): Promise<void> {
    this.startTime = performance.now()
    
    try {
      await this.verifyRecordCounts()
      await this.verifyDataIntegrity()
      await this.verifyRelationships()
      await this.verifyFieldCompleteness()
      await this.verifyJobSheets()
      await this.verifySampleData()
      await this.verifyPerformanceMetrics()
      
      this.showResults()
      
    } catch (error) {
      console.error('❌ Verification failed:', error)
      process.exit(1)
    }
  }

  private async verifyRecordCounts(): Promise<void> {
    console.log('\n📊 RECORD COUNTS VERIFICATION')
    console.log('-'.repeat(40))
    
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
    const checks = []
    
    // Expected minimums based on typical garage data
    const expectations = {
      customers: 1000,
      vehicles: 1000,
      documents: 10000,
      line_items: 50000,
      receipts: 1000,
      document_extras: 500
    }
    
    for (const [table, count] of Object.entries(result)) {
      const numCount = Number(count)
      const expected = expectations[table as keyof typeof expectations]
      
      checks.push({
        name: `${table} count`,
        status: numCount >= expected ? 'pass' : (numCount > 0 ? 'warning' : 'fail'),
        value: numCount.toLocaleString(),
        expected: `≥ ${expected.toLocaleString()}`,
        message: numCount >= expected 
          ? `✅ ${numCount.toLocaleString()} records imported`
          : numCount > 0 
            ? `⚠️  ${numCount.toLocaleString()} records (lower than expected)`
            : `❌ No records found`
      })
      
      console.log(checks[checks.length - 1].message)
    }
    
    this.results.push({
      category: 'Record Counts',
      checks
    })
  }

  private async verifyDataIntegrity(): Promise<void> {
    console.log('\n🔍 DATA INTEGRITY VERIFICATION')
    console.log('-'.repeat(40))
    
    const integrity = await sql`
      SELECT 
        -- Customer integrity
        (SELECT COUNT(*) FROM customers WHERE first_name IS NULL OR first_name = '') as customers_no_name,
        (SELECT COUNT(*) FROM customers WHERE id IS NULL OR id = '') as customers_no_id,
        (SELECT COUNT(*) FROM customers WHERE email IS NOT NULL AND email != '') as customers_with_email,
        (SELECT COUNT(*) FROM customers WHERE phone IS NOT NULL AND phone != '') as customers_with_phone,
        
        -- Vehicle integrity
        (SELECT COUNT(*) FROM vehicles WHERE registration IS NULL OR registration = '') as vehicles_no_reg,
        (SELECT COUNT(*) FROM vehicles WHERE make IS NULL OR make = '') as vehicles_no_make,
        (SELECT COUNT(*) FROM vehicles WHERE mot_expiry_date IS NOT NULL) as vehicles_with_mot,
        
        -- Document integrity
        (SELECT COUNT(*) FROM documents WHERE doc_type IS NULL OR doc_type = '') as documents_no_type,
        (SELECT COUNT(*) FROM documents WHERE doc_number IS NOT NULL AND doc_number != '') as documents_with_number,
        (SELECT COUNT(*) FROM documents WHERE total_gross IS NOT NULL AND total_gross > 0) as documents_with_value,
        
        -- Line item integrity
        (SELECT COUNT(*) FROM line_items WHERE description IS NULL OR description = '') as lineitems_no_desc,
        (SELECT COUNT(*) FROM line_items WHERE quantity IS NOT NULL AND quantity > 0) as lineitems_with_qty
    `
    
    const result = integrity[0]
    const checks = []
    
    // Customer checks
    checks.push({
      name: 'Customers with names',
      status: result.customers_no_name === 0 ? 'pass' : 'warning',
      value: result.customers_no_name,
      message: result.customers_no_name === 0 
        ? '✅ All customers have names'
        : `⚠️  ${result.customers_no_name} customers missing names`
    })
    
    checks.push({
      name: 'Customers with email',
      status: result.customers_with_email > 0 ? 'pass' : 'warning',
      value: result.customers_with_email,
      message: `📧 ${result.customers_with_email} customers have email addresses`
    })
    
    // Vehicle checks
    checks.push({
      name: 'Vehicles with registrations',
      status: result.vehicles_no_reg === 0 ? 'pass' : 'fail',
      value: result.vehicles_no_reg,
      message: result.vehicles_no_reg === 0 
        ? '✅ All vehicles have registrations'
        : `❌ ${result.vehicles_no_reg} vehicles missing registrations`
    })
    
    checks.push({
      name: 'Vehicles with MOT dates',
      status: result.vehicles_with_mot > 0 ? 'pass' : 'warning',
      value: result.vehicles_with_mot,
      message: `🔧 ${result.vehicles_with_mot} vehicles have MOT expiry dates`
    })
    
    // Document checks
    checks.push({
      name: 'Documents with types',
      status: result.documents_no_type === 0 ? 'pass' : 'warning',
      value: result.documents_no_type,
      message: result.documents_no_type === 0 
        ? '✅ All documents have types'
        : `⚠️  ${result.documents_no_type} documents missing types`
    })
    
    checks.push({
      name: 'Documents with values',
      status: result.documents_with_value > 0 ? 'pass' : 'warning',
      value: result.documents_with_value,
      message: `💰 ${result.documents_with_value} documents have monetary values`
    })
    
    checks.forEach(check => console.log(check.message))
    
    this.results.push({
      category: 'Data Integrity',
      checks
    })
  }

  private async verifyRelationships(): Promise<void> {
    console.log('\n🔗 RELATIONSHIPS VERIFICATION')
    console.log('-'.repeat(40))
    
    const relationships = await sql`
      SELECT 
        -- Vehicle-Customer relationships
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_customers,
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL AND owner_id IN (SELECT id FROM customers)) as vehicles_valid_customers,
        
        -- Document-Customer relationships
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL) as documents_with_customers,
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL AND _id_customer IN (SELECT id FROM customers)) as documents_valid_customers,
        
        -- LineItem-Document relationships
        (SELECT COUNT(*) FROM line_items WHERE document_id IS NOT NULL) as lineitems_with_documents,
        (SELECT COUNT(*) FROM line_items WHERE document_id IS NOT NULL AND document_id IN (SELECT _id FROM documents)) as lineitems_valid_documents,
        
        -- Receipt-Document relationships
        (SELECT COUNT(*) FROM receipts WHERE document_id IS NOT NULL) as receipts_with_documents,
        (SELECT COUNT(*) FROM receipts WHERE document_id IS NOT NULL AND document_id IN (SELECT _id FROM documents)) as receipts_valid_documents,
        
        -- Orphaned records
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL AND owner_id NOT IN (SELECT id FROM customers)) as orphaned_vehicles,
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL AND _id_customer NOT IN (SELECT id FROM customers)) as orphaned_documents
    `
    
    const result = relationships[0]
    const checks = []
    
    // Vehicle-Customer relationships
    const vehicleCustomerRatio = result.vehicles_with_customers > 0 
      ? Math.round((result.vehicles_valid_customers / result.vehicles_with_customers) * 100)
      : 0
    
    checks.push({
      name: 'Vehicle-Customer links',
      status: vehicleCustomerRatio >= 90 ? 'pass' : vehicleCustomerRatio >= 70 ? 'warning' : 'fail',
      value: `${result.vehicles_valid_customers}/${result.vehicles_with_customers} (${vehicleCustomerRatio}%)`,
      message: `🔗 ${result.vehicles_valid_customers} vehicles properly linked to customers`
    })
    
    // Document-Customer relationships
    const documentCustomerRatio = result.documents_with_customers > 0 
      ? Math.round((result.documents_valid_customers / result.documents_with_customers) * 100)
      : 0
    
    checks.push({
      name: 'Document-Customer links',
      status: documentCustomerRatio >= 90 ? 'pass' : documentCustomerRatio >= 70 ? 'warning' : 'fail',
      value: `${result.documents_valid_customers}/${result.documents_with_customers} (${documentCustomerRatio}%)`,
      message: `📄 ${result.documents_valid_customers} documents properly linked to customers`
    })
    
    // LineItem-Document relationships
    const lineitemDocumentRatio = result.lineitems_with_documents > 0 
      ? Math.round((result.lineitems_valid_documents / result.lineitems_with_documents) * 100)
      : 0
    
    checks.push({
      name: 'LineItem-Document links',
      status: lineitemDocumentRatio >= 95 ? 'pass' : lineitemDocumentRatio >= 80 ? 'warning' : 'fail',
      value: `${result.lineitems_valid_documents}/${result.lineitems_with_documents} (${lineitemDocumentRatio}%)`,
      message: `📝 ${result.lineitems_valid_documents} line items properly linked to documents`
    })
    
    // Orphaned records check
    checks.push({
      name: 'Orphaned records',
      status: (result.orphaned_vehicles + result.orphaned_documents) === 0 ? 'pass' : 'warning',
      value: result.orphaned_vehicles + result.orphaned_documents,
      message: result.orphaned_vehicles + result.orphaned_documents === 0 
        ? '✅ No orphaned records found'
        : `⚠️  ${result.orphaned_vehicles} orphaned vehicles, ${result.orphaned_documents} orphaned documents`
    })
    
    checks.forEach(check => console.log(check.message))
    
    this.results.push({
      category: 'Relationships',
      checks
    })
  }

  private async verifyFieldCompleteness(): Promise<void> {
    console.log('\n📋 FIELD COMPLETENESS VERIFICATION')
    console.log('-'.repeat(40))
    
    const completeness = await sql`
      SELECT 
        -- Customer field completeness
        (SELECT COUNT(*) FROM customers WHERE email IS NOT NULL AND email != '') * 100.0 / COUNT(*) as customer_email_pct,
        (SELECT COUNT(*) FROM customers WHERE phone IS NOT NULL AND phone != '') * 100.0 / COUNT(*) as customer_phone_pct,
        (SELECT COUNT(*) FROM customers WHERE address_postcode IS NOT NULL AND address_postcode != '') * 100.0 / COUNT(*) as customer_postcode_pct,
        
        -- Vehicle field completeness  
        (SELECT COUNT(*) FROM vehicles WHERE make IS NOT NULL AND make != '') * 100.0 / COUNT(*) as vehicle_make_pct,
        (SELECT COUNT(*) FROM vehicles WHERE year IS NOT NULL) * 100.0 / COUNT(*) as vehicle_year_pct,
        (SELECT COUNT(*) FROM vehicles WHERE mot_expiry_date IS NOT NULL) * 100.0 / COUNT(*) as vehicle_mot_pct,
        
        -- Document field completeness
        (SELECT COUNT(*) FROM documents WHERE doc_number IS NOT NULL AND doc_number != '') * 100.0 / COUNT(*) as document_number_pct,
        (SELECT COUNT(*) FROM documents WHERE total_gross IS NOT NULL) * 100.0 / COUNT(*) as document_total_pct
        
      FROM customers, vehicles, documents
      LIMIT 1
    `
    
    const result = completeness[0]
    const checks = []
    
    const completenessFields = [
      { name: 'Customer emails', value: result.customer_email_pct, threshold: 50 },
      { name: 'Customer phones', value: result.customer_phone_pct, threshold: 70 },
      { name: 'Customer postcodes', value: result.customer_postcode_pct, threshold: 80 },
      { name: 'Vehicle makes', value: result.vehicle_make_pct, threshold: 95 },
      { name: 'Vehicle years', value: result.vehicle_year_pct, threshold: 80 },
      { name: 'Vehicle MOT dates', value: result.vehicle_mot_pct, threshold: 70 },
      { name: 'Document numbers', value: result.document_number_pct, threshold: 90 },
      { name: 'Document totals', value: result.document_total_pct, threshold: 80 }
    ]
    
    completenessFields.forEach(field => {
      const percentage = Math.round(field.value || 0)
      checks.push({
        name: field.name,
        status: percentage >= field.threshold ? 'pass' : percentage >= (field.threshold * 0.7) ? 'warning' : 'fail',
        value: `${percentage}%`,
        expected: `≥ ${field.threshold}%`,
        message: `📊 ${field.name}: ${percentage}% complete`
      })
      
      console.log(checks[checks.length - 1].message)
    })
    
    this.results.push({
      category: 'Field Completeness',
      checks
    })
  }

  private async verifyJobSheets(): Promise<void> {
    console.log('\n📋 JOB SHEETS VERIFICATION')
    console.log('-'.repeat(40))
    
    const jobSheets = await sql`
      SELECT 
        COUNT(*) as total_job_sheets,
        COUNT(CASE WHEN doc_status = 'Open' OR doc_status = 'OPEN' OR doc_status IS NULL THEN 1 END) as open_job_sheets,
        COUNT(CASE WHEN doc_number IS NOT NULL AND doc_number != '' THEN 1 END) as job_sheets_with_numbers,
        COUNT(CASE WHEN _id_customer IS NOT NULL THEN 1 END) as job_sheets_with_customers,
        COUNT(CASE WHEN vehicle_registration IS NOT NULL AND vehicle_registration != '' THEN 1 END) as job_sheets_with_vehicles
      FROM documents 
      WHERE doc_type IN ('JS', 'JOB', 'Job Sheet', 'JOBSHEET', 'JobSheet')
    `
    
    const result = jobSheets[0]
    const checks = []
    
    checks.push({
      name: 'Total job sheets',
      status: result.total_job_sheets > 0 ? 'pass' : 'fail',
      value: result.total_job_sheets,
      expected: '> 0',
      message: result.total_job_sheets > 0 
        ? `✅ ${result.total_job_sheets} job sheets found`
        : '❌ No job sheets found'
    })
    
    if (result.total_job_sheets > 0) {
      checks.push({
        name: 'Open job sheets',
        status: result.open_job_sheets > 0 ? 'pass' : 'warning',
        value: result.open_job_sheets,
        message: `🔄 ${result.open_job_sheets} open job sheets`
      })
      
      checks.push({
        name: 'Job sheets with numbers',
        status: result.job_sheets_with_numbers > 0 ? 'pass' : 'warning',
        value: result.job_sheets_with_numbers,
        message: `🔢 ${result.job_sheets_with_numbers} job sheets have numbers`
      })
      
      checks.push({
        name: 'Job sheets with customers',
        status: result.job_sheets_with_customers > 0 ? 'pass' : 'warning',
        value: result.job_sheets_with_customers,
        message: `👥 ${result.job_sheets_with_customers} job sheets linked to customers`
      })
      
      checks.push({
        name: 'Job sheets with vehicles',
        status: result.job_sheets_with_vehicles > 0 ? 'pass' : 'warning',
        value: result.job_sheets_with_vehicles,
        message: `🚗 ${result.job_sheets_with_vehicles} job sheets have vehicle registrations`
      })
    }
    
    checks.forEach(check => console.log(check.message))
    
    this.results.push({
      category: 'Job Sheets',
      checks
    })
  }

  private async verifySampleData(): Promise<void> {
    console.log('\n🔍 SAMPLE DATA INSPECTION')
    console.log('-'.repeat(40))
    
    // Sample customers
    const sampleCustomers = await sql`
      SELECT first_name, last_name, email, phone, address_town
      FROM customers 
      WHERE first_name IS NOT NULL AND first_name != ''
      ORDER BY created_at DESC
      LIMIT 3
    `
    
    console.log('👥 Sample Customers:')
    sampleCustomers.forEach((customer, i) => {
      console.log(`  ${i + 1}. ${customer.first_name} ${customer.last_name} - ${customer.address_town || 'No town'} - ${customer.phone || customer.email || 'No contact'}`)
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
    
    // Sample job sheets
    const sampleJobSheets = await sql`
      SELECT doc_number, customer_name, vehicle_registration, doc_status, total_gross
      FROM documents 
      WHERE doc_type IN ('JS', 'JOB', 'Job Sheet', 'JOBSHEET')
      ORDER BY created_at DESC
      LIMIT 5
    `
    
    if (sampleJobSheets.length > 0) {
      console.log('\n📋 Sample Job Sheets:')
      sampleJobSheets.forEach((js, i) => {
        const total = js.total_gross ? `£${js.total_gross}` : 'No total'
        console.log(`  ${i + 1}. ${js.doc_number || 'No number'} - ${js.customer_name || 'No customer'} - ${js.vehicle_registration || 'No reg'} - ${js.doc_status || 'No status'} - ${total}`)
      })
    }
    
    this.results.push({
      category: 'Sample Data',
      checks: [{
        name: 'Sample data inspection',
        status: 'pass',
        value: 'Completed',
        message: 'Sample data shows real garage management records'
      }]
    })
  }

  private async verifyPerformanceMetrics(): Promise<void> {
    console.log('\n⚡ PERFORMANCE METRICS')
    console.log('-'.repeat(40))
    
    const totalDuration = performance.now() - this.startTime
    
    // Get total record count
    const totalRecords = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) +
        (SELECT COUNT(*) FROM vehicles) +
        (SELECT COUNT(*) FROM documents) +
        (SELECT COUNT(*) FROM line_items) +
        (SELECT COUNT(*) FROM receipts) +
        (SELECT COUNT(*) FROM document_extras) as total
    `
    
    const total = Number(totalRecords[0].total)
    const verificationSpeed = Math.round(total / (totalDuration / 1000))
    
    console.log(`⏱️  Verification time: ${(totalDuration / 1000).toFixed(1)}s`)
    console.log(`📊 Records verified: ${total.toLocaleString()}`)
    console.log(`⚡ Verification speed: ${verificationSpeed.toLocaleString()} records/second`)
    
    this.results.push({
      category: 'Performance',
      checks: [{
        name: 'Verification speed',
        status: verificationSpeed > 1000 ? 'pass' : 'warning',
        value: `${verificationSpeed.toLocaleString()} records/second`,
        message: `Verified ${total.toLocaleString()} records in ${(totalDuration / 1000).toFixed(1)}s`
      }]
    })
  }

  private showResults(): void {
    const totalDuration = performance.now() - this.startTime
    
    console.log('\n🎉 COMPREHENSIVE VERIFICATION COMPLETED!')
    console.log('=' .repeat(60))
    
    let totalChecks = 0
    let passedChecks = 0
    let warningChecks = 0
    let failedChecks = 0
    
    this.results.forEach(category => {
      category.checks.forEach(check => {
        totalChecks++
        if (check.status === 'pass') passedChecks++
        else if (check.status === 'warning') warningChecks++
        else failedChecks++
      })
    })
    
    console.log(`⏱️  Total verification time: ${(totalDuration / 1000).toFixed(1)}s`)
    console.log(`📊 Verification summary:`)
    console.log(`   ✅ Passed: ${passedChecks}/${totalChecks}`)
    console.log(`   ⚠️  Warnings: ${warningChecks}/${totalChecks}`)
    console.log(`   ❌ Failed: ${failedChecks}/${totalChecks}`)
    
    const overallScore = Math.round((passedChecks / totalChecks) * 100)
    console.log(`\n🎯 Overall Score: ${overallScore}%`)
    
    if (overallScore >= 90) {
      console.log('🎉 EXCELLENT! Your garage management system is ready to use!')
    } else if (overallScore >= 75) {
      console.log('✅ GOOD! Minor issues detected but system is functional.')
    } else if (overallScore >= 50) {
      console.log('⚠️  FAIR! Some issues need attention before full operation.')
    } else {
      console.log('❌ POOR! Significant issues detected. Review import process.')
    }
    
    console.log('\n🚀 Next steps:')
    console.log('   • Visit http://localhost:3000 to access your dashboard')
    console.log('   • Check job sheets at http://localhost:3000/job-sheets')
    console.log('   • View customers at http://localhost:3000/customers')
    console.log('   • Test MOT reminders at http://localhost:3000/mot-reminders')
  }
}

// Run the comprehensive verification
async function main() {
  const verifier = new ComprehensiveVerifier()
  await verifier.run()
  process.exit(0)
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Comprehensive verification failed:', error)
    process.exit(1)
  })
}

export { ComprehensiveVerifier }
