import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { sql } from '../lib/database/neon-client'

dotenv.config({ path: '.env.local' })

// Safe SQL wrapper
async function safeSql(query: any, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await query
    } catch (error) {
      if (attempt === retries) throw error
      console.log(`Query failed (attempt ${attempt}/${retries}), retrying...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

async function reimportVehiclesWithCustomers() {
  console.log('🚗 RE-IMPORTING VEHICLES WITH PROPER CUSTOMER CONNECTIONS')
  console.log('========================================================')
  
  try {
    const vehiclePath = '/Users/adamrutstein/Desktop/GA4 EXPORT/Vehicles.csv'
    
    // 1. Read and analyze the CSV
    console.log('📋 READING VEHICLE CSV...')
    const fileContent = fs.readFileSync(vehiclePath, 'utf-8')
    const records = parse(fileContent, { columns: true, skip_empty_lines: true })
    
    console.log(`   Found ${records.length} vehicle records`)
    
    // 2. Analyze the first record to understand field mapping
    if (records.length > 0) {
      console.log('\n🔍 ANALYZING CSV STRUCTURE:')
      const firstRecord = records[0]
      const headers = Object.keys(firstRecord)
      
      console.log('   Available columns:')
      headers.forEach((header, i) => {
        console.log(`     ${i+1}. ${header}`)
      })
      
      // Find customer reference fields
      const customerFields = headers.filter(h => 
        h.toLowerCase().includes('customer') || 
        h.toLowerCase().includes('owner') ||
        h.toLowerCase().includes('_id') && h !== '_ID'
      )
      
      console.log('\n   Potential customer reference fields:')
      customerFields.forEach(field => {
        const sampleValue = firstRecord[field]
        console.log(`     ${field}: "${sampleValue}"`)
      })
    }
    
    // 3. Clear existing vehicle-customer connections
    console.log('\n🔄 CLEARING EXISTING CONNECTIONS...')
    const clearResult = await safeSql(sql`
      UPDATE vehicles SET customer_id = NULL
    `)
    console.log(`   Cleared customer_id from all vehicles`)
    
    // 4. Re-import with all possible field mappings
    console.log('\n🚗 RE-IMPORTING VEHICLES WITH CUSTOMER CONNECTIONS...')
    
    let connected = 0
    let notConnected = 0
    let errors = 0
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      if (i % 500 === 0) {
        const progress = Math.round((i / records.length) * 100)
        process.stdout.write(`\\r   Progress: ${progress}% (${i}/${records.length})`)
      }
      
      try {
        // Try multiple field name variations for customer ID
        const customerId = record._ID_Customer || 
                          record._id_customer || 
                          record.customer_id || 
                          record.customerId ||
                          record.owner_id ||
                          record.ownerId ||
                          record._ID_Owner ||
                          record._id_owner ||
                          null
        
        // Get vehicle details with multiple field name variations
        const vehicleId = record._ID || record._id || record.id
        const registration = record.vehRegistration || 
                           record.registration || 
                           record.reg || 
                           record.Registration
        
        const make = record.vehMake || 
                    record.make || 
                    record.Make || 
                    'Unknown'
        
        const model = record.vehModel || 
                     record.model || 
                     record.Model || 
                     'Unknown'
        
        const year = record.vehYear || 
                    record.year || 
                    record.Year || 
                    null
        
        if (!vehicleId || !registration) {
          errors++
          continue
        }
        
        // Update the vehicle with customer connection
        await safeSql(sql`
          UPDATE vehicles 
          SET 
            customer_id = ${customerId},
            registration = ${registration},
            make = ${make},
            model = ${model},
            year = ${year ? parseInt(year) : null},
            updated_at = NOW()
          WHERE id = ${vehicleId}
        `)
        
        if (customerId) {
          connected++
        } else {
          notConnected++
        }
        
      } catch (error) {
        errors++
        console.log(`\\n   ⚠️ Error processing vehicle ${record._ID || record.registration}: ${error.message}`)
      }
    }
    
    console.log('\\n')
    
    // 5. Final status check
    console.log('📊 RE-IMPORT RESULTS:')
    console.log(`   ✅ Vehicles with customers: ${connected}`)
    console.log(`   ❌ Vehicles without customers: ${notConnected}`)
    console.log(`   ⚠️ Errors: ${errors}`)
    
    // 6. Verify the results
    console.log('\\n🔍 VERIFICATION:')
    const finalStatus = await safeSql(sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(customer_id) as connected_vehicles,
        COUNT(*) - COUNT(customer_id) as orphaned_vehicles
      FROM vehicles
    `)
    
    const final = finalStatus[0]
    const connectionRate = ((parseInt(final.connected_vehicles) / parseInt(final.total_vehicles)) * 100).toFixed(1)
    
    console.log(`   🚗 Total vehicles: ${final.total_vehicles}`)
    console.log(`   ✅ Connected: ${final.connected_vehicles} (${connectionRate}%)`)
    console.log(`   ❌ Orphaned: ${final.orphaned_vehicles}`)
    
    // 7. Show sample connected customers
    if (parseInt(final.connected_vehicles) > 0) {
      console.log('\\n👤 SAMPLE CONNECTED CUSTOMERS:')
      const sampleConnected = await safeSql(sql`
        SELECT 
          c.first_name,
          c.last_name,
          COUNT(*) as vehicle_count
        FROM customers c
        JOIN vehicles v ON v.customer_id = c.id
        WHERE c.first_name != 'Unknown'
        GROUP BY c.first_name, c.last_name
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `)
      
      sampleConnected.forEach((customer, i) => {
        console.log(`   ${i+1}. ${customer.first_name} ${customer.last_name}: ${customer.vehicle_count} vehicles`)
      })
    }
    
    // 8. Success assessment
    console.log('\\n🎯 ASSESSMENT:')
    if (connectionRate >= 95) {
      console.log('🎉 EXCELLENT! Vehicle-customer connections are now working!')
    } else if (connectionRate >= 80) {
      console.log('✅ GOOD! Most vehicles are now connected!')
    } else if (connectionRate >= 50) {
      console.log('⚠️ PARTIAL SUCCESS - Some improvement made')
    } else {
      console.log('❌ ISSUE PERSISTS - Need to investigate CSV field mapping')
    }
    
    const previousConnected = 2082
    const improvement = parseInt(final.connected_vehicles) - previousConnected
    
    if (improvement > 0) {
      console.log(`🎉 IMPROVEMENT: +${improvement} vehicles connected!`)
    }
    
  } catch (error) {
    console.error('❌ Error during vehicle re-import:', error.message)
  }
  
  process.exit(0)
}

reimportVehiclesWithCustomers()
