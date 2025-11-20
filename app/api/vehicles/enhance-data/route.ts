import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[ENHANCE-VEHICLE-DATA] Starting vehicle data enhancement...")

    // Add vehicle_age column if it doesn't exist
    try {
      await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_age INTEGER`
      await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sorn_status TEXT`
      await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER`
    } catch (error) {
      console.log("[ENHANCE-VEHICLE-DATA] Columns may already exist")
    }

    let agesCalculated = 0
    let yearsExtracted = 0
    let sornChecked = 0

    // 1. Calculate vehicle age from registration
    console.log("[ENHANCE-VEHICLE-DATA] Calculating vehicle ages...")

    // Extract year from registration format
    const ageUpdateResult = await sql`
      UPDATE vehicles
      SET
        year_of_manufacture = CASE
          -- New format (2001+): AB51 CDE, AB02 CDE, etc.
          WHEN registration ~ '^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$' THEN
            CASE
              WHEN CAST(SUBSTRING(registration FROM '[0-9]{2}') AS INTEGER) BETWEEN 1 AND 50 THEN
                2000 + CAST(SUBSTRING(registration FROM '[0-9]{2}') AS INTEGER)
              WHEN CAST(SUBSTRING(registration FROM '[0-9]{2}') AS INTEGER) BETWEEN 51 AND 99 THEN
                2000 + CAST(SUBSTRING(registration FROM '[0-9]{2}') AS INTEGER) - 50
              ELSE NULL
            END
          -- Prefix format (1983-2001): A123 BCD, B123 CDE, etc.
          WHEN registration ~ '^[A-Z][0-9]{1,3}\s?[A-Z]{3}$' THEN
            CASE SUBSTRING(registration FROM '^[A-Z]')
              WHEN 'A' THEN 1983 WHEN 'B' THEN 1984 WHEN 'C' THEN 1985 WHEN 'D' THEN 1986
              WHEN 'E' THEN 1987 WHEN 'F' THEN 1988 WHEN 'G' THEN 1989 WHEN 'H' THEN 1990
              WHEN 'J' THEN 1991 WHEN 'K' THEN 1992 WHEN 'L' THEN 1993 WHEN 'M' THEN 1994
              WHEN 'N' THEN 1995 WHEN 'P' THEN 1996 WHEN 'R' THEN 1997 WHEN 'S' THEN 1998
              WHEN 'T' THEN 1999 WHEN 'V' THEN 1999 WHEN 'W' THEN 2000 WHEN 'X' THEN 2000
              WHEN 'Y' THEN 2001
              ELSE NULL
            END
          -- Suffix format (1963-1983): 123 ABC D
          WHEN registration ~ '^[0-9]{1,4}\s?[A-Z]{3}\s?[A-Z]$' THEN
            CASE SUBSTRING(registration FROM '[A-Z]$')
              WHEN 'A' THEN 1963 WHEN 'B' THEN 1964 WHEN 'C' THEN 1965 WHEN 'D' THEN 1966
              WHEN 'E' THEN 1967 WHEN 'F' THEN 1968 WHEN 'G' THEN 1969 WHEN 'H' THEN 1970
              WHEN 'J' THEN 1971 WHEN 'K' THEN 1972 WHEN 'L' THEN 1973 WHEN 'M' THEN 1974
              WHEN 'N' THEN 1975 WHEN 'P' THEN 1976 WHEN 'R' THEN 1977 WHEN 'S' THEN 1978
              WHEN 'T' THEN 1979 WHEN 'V' THEN 1980 WHEN 'W' THEN 1981 WHEN 'X' THEN 1982
              WHEN 'Y' THEN 1983
              ELSE NULL
            END
          ELSE NULL
        END,
        vehicle_age = CASE
          WHEN year_of_manufacture IS NOT NULL THEN EXTRACT(YEAR FROM CURRENT_DATE) - year_of_manufacture
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE year_of_manufacture IS NULL OR vehicle_age IS NULL
      RETURNING registration
    `
    agesCalculated = ageUpdateResult.length

    // Update vehicle_age for existing year_of_manufacture
    await sql`
      UPDATE vehicles
      SET
        vehicle_age = EXTRACT(YEAR FROM CURRENT_DATE) - year_of_manufacture,
        updated_at = NOW()
      WHERE year_of_manufacture IS NOT NULL
      AND (vehicle_age IS NULL OR vehicle_age != EXTRACT(YEAR FROM CURRENT_DATE) - year_of_manufacture)
    `

    // 2. Check for potential SORN indicators
    console.log("[ENHANCE-VEHICLE-DATA] Checking for SORN indicators...")

    // Mark vehicles as potentially SORN based on MOT patterns
    const sornUpdateResult = await sql`
      UPDATE vehicles
      SET
        sorn_status = CASE
          -- Very old MOT expiry (likely SORN)
          WHEN mot_expiry_date < CURRENT_DATE - INTERVAL '2 years' THEN 'likely_sorn'
          -- Recent MOT but very old
          WHEN mot_expiry_date < CURRENT_DATE - INTERVAL '6 months' AND vehicle_age > 15 THEN 'possibly_sorn'
          -- Active MOT
          WHEN mot_expiry_date >= CURRENT_DATE THEN 'active'
          -- Recently expired
          WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' THEN 'recently_expired'
          ELSE 'unknown'
        END,
        updated_at = NOW()
      WHERE sorn_status IS NULL OR sorn_status = ''
      RETURNING registration
    `
    sornChecked = sornUpdateResult.length

    // Get statistics
    const vehicleStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN vehicle_age IS NOT NULL THEN 1 END) as with_age,
        COUNT(CASE WHEN year_of_manufacture IS NOT NULL THEN 1 END) as with_year,
        COUNT(CASE WHEN sorn_status = 'active' THEN 1 END) as active_vehicles,
        COUNT(CASE WHEN sorn_status = 'likely_sorn' THEN 1 END) as likely_sorn,
        COUNT(CASE WHEN sorn_status = 'possibly_sorn' THEN 1 END) as possibly_sorn,
        AVG(vehicle_age) as average_age,
        MIN(vehicle_age) as youngest_vehicle,
        MAX(vehicle_age) as oldest_vehicle
      FROM vehicles
    `

    const stats = vehicleStats[0]

    // Get sample enhanced vehicles
    const sampleVehicles = await sql`
      SELECT
        registration,
        make,
        model,
        year_of_manufacture,
        vehicle_age,
        mot_expiry_date,
        sorn_status,
        CASE
          WHEN owner_id IS NOT NULL THEN 'Connected'
          ELSE 'No Customer'
        END as customer_status
      FROM vehicles
      WHERE vehicle_age IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 10
    `

    // Get age distribution (simplified)
    const ageDistribution = await sql`
      SELECT
        CASE
          WHEN vehicle_age < 3 THEN 'New (0-2 years)'
          WHEN vehicle_age < 6 THEN 'Recent (3-5 years)'
          WHEN vehicle_age < 10 THEN 'Mature (6-9 years)'
          WHEN vehicle_age < 15 THEN 'Older (10-14 years)'
          WHEN vehicle_age >= 15 THEN 'Vintage (15+ years)'
          ELSE 'Unknown'
        END as age_category,
        COUNT(*) as count
      FROM vehicles
      WHERE vehicle_age IS NOT NULL
      GROUP BY
        CASE
          WHEN vehicle_age < 3 THEN 'New (0-2 years)'
          WHEN vehicle_age < 6 THEN 'Recent (3-5 years)'
          WHEN vehicle_age < 10 THEN 'Mature (6-9 years)'
          WHEN vehicle_age < 15 THEN 'Older (10-14 years)'
          WHEN vehicle_age >= 15 THEN 'Vintage (15+ years)'
          ELSE 'Unknown'
        END
      ORDER BY count DESC
    `

    return NextResponse.json({
      success: true,
      message: "Vehicle data enhancement completed",
      results: {
        agesCalculated,
        yearsExtracted,
        sornChecked
      },
      statistics: {
        totalVehicles: parseInt(stats.total_vehicles),
        withAge: parseInt(stats.with_age),
        withYear: parseInt(stats.with_year),
        activeVehicles: parseInt(stats.active_vehicles),
        likelySorn: parseInt(stats.likely_sorn),
        possiblySorn: parseInt(stats.possibly_sorn),
        averageAge: Math.round(parseFloat(stats.average_age) * 10) / 10,
        youngestVehicle: parseInt(stats.youngest_vehicle),
        oldestVehicle: parseInt(stats.oldest_vehicle),
        ageCalculationRate: Math.round((parseInt(stats.with_age) / parseInt(stats.total_vehicles)) * 100)
      },
      ageDistribution,
      sampleVehicles,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ENHANCE-VEHICLE-DATA] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to enhance vehicle data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
