import { sql } from "@/lib/database/neon-client"

async function checkMOTDates() {
  try {
    console.log("🔍 Checking MOT expiry date distribution in database...\n")

    // 1. Total vehicles
    const totalResult = await sql`
      SELECT COUNT(*) as total FROM vehicles 
      WHERE registration IS NOT NULL AND registration != ''
    `
    console.log(`📊 Total vehicles: ${totalResult[0].total}`)

    // 2. Vehicles with MOT expiry dates
    const withDatesResult = await sql`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL
    `
    console.log(`📅 Vehicles with MOT expiry dates: ${withDatesResult[0].count}`)

    // 3. Check the specific critical criteria
    const criticalResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_all,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_3months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_14days
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL
    `
    
    const stats = criticalResult[0]
    console.log(`\n🎯 Critical MOT Analysis:`)
    console.log(`   • Total expired MOTs: ${stats.expired_all}`)
    console.log(`   • Expired within last 3 months: ${stats.expired_3months}`)
    console.log(`   • Expiring within next 14 days: ${stats.expiring_14days}`)
    console.log(`   • Total critical (our criteria): ${parseInt(stats.expired_3months) + parseInt(stats.expiring_14days)}`)

    // 4. Sample of vehicles with MOT dates to see the date range
    const sampleResult = await sql`
      SELECT registration, make, model, mot_expiry_date, mot_status
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL
      ORDER BY mot_expiry_date
      LIMIT 10
    `
    
    if (sampleResult.length > 0) {
      console.log(`\n📋 Sample vehicles with MOT dates:`)
      sampleResult.forEach((vehicle, i) => {
        const expiryDate = new Date(vehicle.mot_expiry_date).toLocaleDateString()
        console.log(`   ${i + 1}. ${vehicle.registration} (${vehicle.make} ${vehicle.model}) - Expires: ${expiryDate} - Status: ${vehicle.mot_status || 'Unknown'}`)
      })
    }

    // 5. Date range of MOT expiry dates
    const rangeResult = await sql`
      SELECT 
        MIN(mot_expiry_date) as earliest,
        MAX(mot_expiry_date) as latest,
        COUNT(*) as total
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL
    `
    
    if (rangeResult[0].total > 0) {
      const earliest = new Date(rangeResult[0].earliest).toLocaleDateString()
      const latest = new Date(rangeResult[0].latest).toLocaleDateString()
      console.log(`\n📈 MOT Date Range:`)
      console.log(`   • Earliest expiry: ${earliest}`)
      console.log(`   • Latest expiry: ${latest}`)
    }

  } catch (error) {
    console.error("❌ Error checking MOT dates:", error)
  }
}

checkMOTDates()
