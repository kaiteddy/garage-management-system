import fs from 'fs'
import { parse } from 'csv-parse/sync'

async function analyzeVehicleCSVMapping() {
  console.log('🔍 ANALYZING VEHICLE CSV FOR CUSTOMER MAPPING')
  console.log('=============================================')
  
  try {
    const vehiclePath = '/Users/adamrutstein/Desktop/GA4 EXPORT/Vehicles.csv'
    const customerPath = '/Users/adamrutstein/Desktop/GA4 EXPORT/Customers.csv'
    
    // 1. Read Vehicle CSV headers
    console.log('📋 VEHICLE CSV ANALYSIS:')
    const vehicleContent = fs.readFileSync(vehiclePath, 'utf-8')
    const vehicleRecords = parse(vehicleContent, { columns: true, skip_empty_lines: true })
    
    console.log(`   Total vehicle records: ${vehicleRecords.length}`)
    console.log('   Column headers:')
    
    if (vehicleRecords.length > 0) {
      Object.keys(vehicleRecords[0]).forEach((header, i) => {
        console.log(`     ${i+1}. ${header}`)
      })
      
      console.log('\n📄 SAMPLE VEHICLE RECORDS:')
      vehicleRecords.slice(0, 3).forEach((record, i) => {
        console.log(`\n   Vehicle ${i+1}:`)
        Object.keys(record).forEach(key => {
          const value = record[key]
          if (key.toLowerCase().includes('customer') || 
              key.toLowerCase().includes('owner') || 
              key.toLowerCase().includes('_id') ||
              key === 'vehRegistration' ||
              key === 'vehMake' ||
              key === 'vehModel') {
            console.log(`     ${key}: ${value}`)
          }
        })
      })
    }
    
    // 2. Read Customer CSV headers for comparison
    console.log('\n📋 CUSTOMER CSV ANALYSIS:')
    const customerContent = fs.readFileSync(customerPath, 'utf-8')
    const customerRecords = parse(customerContent, { columns: true, skip_empty_lines: true })
    
    console.log(`   Total customer records: ${customerRecords.length}`)
    
    if (customerRecords.length > 0) {
      console.log('\n📄 SAMPLE CUSTOMER RECORDS:')
      customerRecords.slice(0, 2).forEach((record, i) => {
        console.log(`\n   Customer ${i+1}:`)
        Object.keys(record).forEach(key => {
          const value = record[key]
          if (key.toLowerCase().includes('_id') ||
              key.toLowerCase().includes('name') ||
              key.toLowerCase().includes('email')) {
            console.log(`     ${key}: ${value}`)
          }
        })
      })
    }
    
    // 3. Find potential customer-vehicle connections
    console.log('\n🔗 ANALYZING POTENTIAL CONNECTIONS:')
    
    // Look for customer ID fields in vehicles
    const vehicleCustomerFields = Object.keys(vehicleRecords[0]).filter(key => 
      key.toLowerCase().includes('customer') || 
      key.toLowerCase().includes('owner') ||
      (key.toLowerCase().includes('_id') && key !== '_ID')
    )
    
    console.log('   Potential customer reference fields in vehicles:')
    vehicleCustomerFields.forEach(field => {
      const sampleValues = vehicleRecords.slice(0, 5).map(r => r[field]).filter(v => v)
      console.log(`     ${field}: [${sampleValues.join(', ')}]`)
    })
    
    // Check customer ID field
    const customerIdField = Object.keys(customerRecords[0]).find(key => 
      key.toLowerCase().includes('_id')
    )
    
    if (customerIdField) {
      const sampleCustomerIds = customerRecords.slice(0, 5).map(r => r[customerIdField])
      console.log(`\n   Customer ID field: ${customerIdField}`)
      console.log(`   Sample customer IDs: [${sampleCustomerIds.join(', ')}]`)
    }
    
    // 4. Recommendations
    console.log('\n💡 MAPPING RECOMMENDATIONS:')
    
    if (vehicleCustomerFields.length > 0) {
      console.log('✅ Found potential customer reference fields in vehicles')
      vehicleCustomerFields.forEach(field => {
        console.log(`   - Use "${field}" to link vehicles to customers`)
      })
    } else {
      console.log('❌ No obvious customer reference fields found in vehicles')
      console.log('   - May need to use alternative matching (registration, etc.)')
    }
    
    if (customerIdField) {
      console.log(`✅ Customer ID field identified: "${customerIdField}"`)
    }
    
  } catch (error) {
    console.error('❌ Error analyzing CSV files:', error.message)
  }
}

analyzeVehicleCSVMapping()
