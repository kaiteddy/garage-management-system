import { sql } from "@/lib/database/neon-client"

async function addTestMOTData() {
  try {
    console.log("Adding test MOT data for demonstration...")

    // Calculate dates
    const today = new Date()
    const expiredDate1 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const expiredDate2 = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
    const expiringDate1 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    const expiringDate2 = new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000) // 12 days from now

    // Add test vehicles with critical MOT dates
    const testVehicles = [
      {
        registration: "TEST001",
        make: "Ford",
        model: "Focus",
        year: 2018,
        mot_expiry_date: expiredDate1.toISOString().split('T')[0],
        mot_status: "expired"
      },
      {
        registration: "TEST002", 
        make: "Vauxhall",
        model: "Corsa",
        year: 2019,
        mot_expiry_date: expiredDate2.toISOString().split('T')[0],
        mot_status: "expired"
      },
      {
        registration: "TEST003",
        make: "BMW",
        model: "320d",
        year: 2020,
        mot_expiry_date: expiringDate1.toISOString().split('T')[0],
        mot_status: "due-soon"
      },
      {
        registration: "TEST004",
        make: "Audi",
        model: "A4",
        year: 2017,
        mot_expiry_date: expiringDate2.toISOString().split('T')[0],
        mot_status: "due-soon"
      }
    ]

    // Insert test vehicles
    for (const vehicle of testVehicles) {
      await sql`
        INSERT INTO vehicles (
          registration, make, model, year, mot_expiry_date, mot_status, created_at, updated_at
        ) VALUES (
          ${vehicle.registration},
          ${vehicle.make},
          ${vehicle.model},
          ${vehicle.year},
          ${vehicle.mot_expiry_date},
          ${vehicle.mot_status},
          NOW(),
          NOW()
        )
        ON CONFLICT (registration) 
        DO UPDATE SET
          mot_expiry_date = EXCLUDED.mot_expiry_date,
          mot_status = EXCLUDED.mot_status,
          updated_at = NOW()
      `
      console.log(`✅ Added/updated test vehicle: ${vehicle.registration} (MOT expires: ${vehicle.mot_expiry_date})`)
    }

    console.log("\n🎯 Test data added successfully!")
    console.log("You can now test the critical MOT functionality with these vehicles:")
    console.log("- TEST001 & TEST002: Expired MOTs")
    console.log("- TEST003 & TEST004: MOTs expiring soon")

  } catch (error) {
    console.error("❌ Error adding test MOT data:", error)
  }
}

addTestMOTData()
