#!/usr/bin/env node

/**
 * Test script to verify enhanced vehicle data fetching
 * Tests the BMW 220i M Sport Auto Estate (YD17JXW) to ensure N/A fields are populated
 */

const testRegistration = 'YD17JXW'
const baseUrl = 'http://localhost:3000'

async function testEnhancedDataFetching() {
  console.log('🧪 Testing Enhanced Vehicle Data Fetching')
  console.log('=' .repeat(50))
  
  try {
    // 1. Check current data completeness
    console.log(`\n1. Checking current data completeness for ${testRegistration}...`)
    
    const checkResponse = await fetch(`${baseUrl}/api/vehicles/${testRegistration}/enhance-data`)
    const checkData = await checkResponse.json()
    
    if (checkData.success) {
      console.log(`✅ Current completeness: ${checkData.completenessPercentage}%`)
      console.log(`📋 Missing fields: ${checkData.missingFields.join(', ')}`)
      console.log(`💰 Estimated enhancement cost: £${checkData.estimatedCost}`)
      
      if (checkData.missingFields.length > 0) {
        console.log('\n2. Enhancing vehicle data...')
        
        // 2. Enhance the data
        const enhanceResponse = await fetch(`${baseUrl}/api/vehicles/${testRegistration}/enhance-data`, {
          method: 'POST'
        })
        const enhanceData = await enhanceResponse.json()
        
        if (enhanceData.success) {
          console.log(`✅ Data enhancement successful!`)
          console.log(`💰 Actual cost: £${enhanceData.cost?.toFixed(4) || '0.0000'}`)
          console.log(`📦 Packages used: ${enhanceData.packagesUsed?.join(', ') || 'N/A'}`)
          console.log(`🔧 Fields enhanced: ${enhanceData.fieldsEnhanced?.join(', ') || 'N/A'}`)
          
          // 3. Verify the enhancement
          console.log('\n3. Verifying enhancement...')
          
          const verifyResponse = await fetch(`${baseUrl}/api/vehicles/${testRegistration}/enhance-data`)
          const verifyData = await verifyResponse.json()
          
          if (verifyData.success) {
            console.log(`✅ Post-enhancement completeness: ${verifyData.completenessPercentage}%`)
            console.log(`📋 Remaining missing fields: ${verifyData.missingFields.join(', ') || 'None'}`)
            
            // Show the enhanced data
            console.log('\n4. Enhanced Data Summary:')
            console.log('=' .repeat(30))
            const currentData = verifyData.currentData
            console.log(`Euro Status: ${currentData.euroStatus || 'N/A'}`)
            console.log(`Engine Code: ${currentData.engineCode || 'N/A'}`)
            console.log(`Front Tyre Size: ${currentData.tyreSizeFront || 'N/A'}`)
            console.log(`Rear Tyre Size: ${currentData.tyreSizeRear || 'N/A'}`)
            console.log(`Front Tyre Pressure: ${currentData.tyrePressureFront || 'N/A'}`)
            console.log(`Rear Tyre Pressure: ${currentData.tyrePressureRear || 'N/A'}`)
            console.log(`Timing Belt Interval: ${currentData.timingBeltInterval || 'N/A'}`)
            
            if (verifyData.completenessPercentage === 100) {
              console.log('\n🎉 SUCCESS: All N/A fields have been eliminated!')
            } else {
              console.log(`\n⚠️ PARTIAL SUCCESS: ${verifyData.completenessPercentage}% complete, ${verifyData.missingFields.length} fields still missing`)
            }
          } else {
            console.error('❌ Failed to verify enhancement:', verifyData.error)
          }
        } else {
          console.error('❌ Data enhancement failed:', enhanceData.error)
        }
      } else {
        console.log('✅ No enhancement needed - all fields are already populated!')
      }
    } else {
      console.error('❌ Failed to check data completeness:', checkData.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the development server is running:')
      console.log('   npm run dev')
    }
  }
}

// Run the test
testEnhancedDataFetching()
  .then(() => {
    console.log('\n🏁 Test completed')
  })
  .catch((error) => {
    console.error('💥 Test script error:', error)
    process.exit(1)
  })
