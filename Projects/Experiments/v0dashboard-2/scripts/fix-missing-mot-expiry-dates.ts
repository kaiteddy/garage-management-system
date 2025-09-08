import { sql } from "@/lib/database/neon-client"
import { checkMOTStatus } from "@/lib/mot-api"

interface VehicleToFix {
  registration: string
  mot_status: string
  mot_last_checked: string
}

async function fixMissingMOTExpiryDates() {
  try {
    console.log("🔧 Starting to fix missing MOT expiry dates...")

    // Get vehicles that have MOT status but no expiry date
    const vehiclesToFix = await sql`
      SELECT registration, mot_status, mot_last_checked
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid')
      AND mot_expiry_date IS NULL
      AND registration IS NOT NULL
      AND registration != ''
      ORDER BY mot_last_checked DESC
      LIMIT 50
    ` as VehicleToFix[]

    console.log(`📊 Found ${vehiclesToFix.length} vehicles with MOT status but missing expiry dates`)

    if (vehiclesToFix.length === 0) {
      console.log("✅ No vehicles need fixing!")
      return
    }

    let fixed = 0
    let errors = 0

    // Process vehicles one by one to avoid rate limits
    for (let i = 0; i < vehiclesToFix.length; i++) {
      const vehicle = vehiclesToFix[i]
      
      try {
        console.log(`\n🔍 [${i + 1}/${vehiclesToFix.length}] Checking ${vehicle.registration}...`)
        
        // Re-check MOT status to get expiry date
        const motResult = await checkMOTStatus(vehicle.registration)
        
        if (motResult.success && motResult.expiryDate) {
          // Update the vehicle with the expiry date
          await sql`
            UPDATE vehicles 
            SET 
              mot_expiry_date = ${motResult.expiryDate},
              mot_status = ${motResult.motStatus},
              mot_last_checked = NOW(),
              updated_at = NOW()
            WHERE UPPER(REPLACE(registration, ' ', '')) = ${vehicle.registration.toUpperCase().replace(/\s/g, "")}
          `
          
          console.log(`✅ Fixed ${vehicle.registration}: Expiry date set to ${motResult.expiryDate}`)
          fixed++
        } else if (motResult.success && !motResult.expiryDate) {
          console.log(`⚠️  ${vehicle.registration}: MOT check successful but no expiry date available`)
        } else {
          console.log(`❌ ${vehicle.registration}: MOT check failed - ${motResult.error}`)
          errors++
        }

        // Add delay to respect rate limits
        if (i < vehiclesToFix.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        }

      } catch (error) {
        console.error(`❌ Error processing ${vehicle.registration}:`, error)
        errors++
      }
    }

    console.log(`\n📈 Summary:`)
    console.log(`   • Vehicles processed: ${vehiclesToFix.length}`)
    console.log(`   • Successfully fixed: ${fixed}`)
    console.log(`   • Errors: ${errors}`)

    // Check the results
    const updatedCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid')
      AND mot_expiry_date IS NOT NULL
    `

    console.log(`\n🎯 Current status:`)
    console.log(`   • Vehicles with MOT status AND expiry date: ${updatedCount[0].count}`)

    // Check for critical MOTs after the fix
    const criticalCheck = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_all,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_3months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_14days
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL
    `

    const critical = criticalCheck[0]
    const totalCritical = parseInt(critical.expired_3months) + parseInt(critical.expiring_14days)

    console.log(`\n🚨 Critical MOT Status:`)
    console.log(`   • Expired within 3 months: ${critical.expired_3months}`)
    console.log(`   • Expiring within 14 days: ${critical.expiring_14days}`)
    console.log(`   • Total critical: ${totalCritical}`)

    if (totalCritical > 0) {
      console.log(`\n🎉 Success! Your critical MOT system will now show ${totalCritical} vehicles!`)
    }

  } catch (error) {
    console.error("❌ Error in fix script:", error)
  }
}

fixMissingMOTExpiryDates()
