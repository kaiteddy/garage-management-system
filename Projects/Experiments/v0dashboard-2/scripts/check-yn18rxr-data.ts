import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'

// Load environment variables
const env = dotenv.config({ path: '.env.local' })
dotenvExpand.expand(env)

import { sql } from '@/lib/database/neon-client'

async function checkYN18RXRData() {
  try {
    console.log('🔍 Checking YN18RXR technical data...')
    
    // Check for the vehicle in the database
    const vehicleData = await sql`
      SELECT 
        registration, 
        make, 
        model, 
        year,
        comprehensive_technical_data,
        sws_last_updated
      FROM vehicles 
      WHERE registration = 'YN18RXR'
    `
    
    if (vehicleData.length === 0) {
      console.log('❌ No vehicle found with registration YN18RXR')
      return
    }
    
    const vehicle = vehicleData[0]
    console.log('✅ Vehicle found:')
    console.log(`   Registration: ${vehicle.registration}`)
    console.log(`   Make: ${vehicle.make}`)
    console.log(`   Model: ${vehicle.model}`)
    console.log(`   Year: ${vehicle.year}`)
    console.log(`   SWS Last Updated: ${vehicle.sws_last_updated}`)
    
    if (vehicle.comprehensive_technical_data) {
      console.log('\n📊 Technical Data Available:')
      const techData = vehicle.comprehensive_technical_data
      
      // Check what keys are available
      const keys = Object.keys(techData)
      console.log(`   Available data keys: ${keys.join(', ')}`)
      
      // Check each key to see what type of data it contains
      for (const key of keys) {
        if (key === 'vrm') continue
        
        const data = techData[key]
        if (data) {
          console.log(`\n   ${key}:`)
          if (typeof data === 'string') {
            // Check if it's HTML content
            if (data.includes('<html') || data.includes('<!DOCTYPE')) {
              console.log(`     Type: HTML content (${data.length} characters)`)
              // Check if it contains Job Sheets content
              if (data.includes('Job Sheets') || data.includes('jobsheets')) {
                console.log('     ⚠️  Contains Job Sheets content!')
              }
              // Check if it contains actual technical data
              if (data.includes('lubricant') || data.includes('repair time') || data.includes('technical')) {
                console.log('     ✅ Contains technical data')
              }
            } else {
              console.log(`     Type: String (${data.length} characters)`)
              console.log(`     Preview: ${data.substring(0, 100)}...`)
            }
          } else if (typeof data === 'object') {
            console.log(`     Type: Object with ${Object.keys(data).length} properties`)
            console.log(`     Properties: ${Object.keys(data).join(', ')}`)
          } else {
            console.log(`     Type: ${typeof data}`)
            console.log(`     Value: ${data}`)
          }
        }
      }
    } else {
      console.log('\n❌ No comprehensive technical data found')
    }
    
  } catch (error) {
    console.error('❌ Error checking YN18RXR data:', error)
  }
}

checkYN18RXRData().catch(console.error)
