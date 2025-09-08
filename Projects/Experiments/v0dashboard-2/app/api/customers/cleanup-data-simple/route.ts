import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CLEANUP-CUSTOMER-DATA-SIMPLE] Starting simple customer data cleanup...")

    let phonesCleaned = 0
    let emailsCleaned = 0
    let namesCleaned = 0
    let addressesCleaned = 0

    // 1. Clean up phone numbers - simple approach
    console.log("[CLEANUP-CUSTOMER-DATA-SIMPLE] Cleaning phone numbers...")
    const phoneCleanupResult = await sql`
      UPDATE customers
      SET
        phone = CASE
          WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 11
               AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '07%'
            THEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
          WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 11
               AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '01%'
            THEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
          WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 11
               AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '02%'
            THEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
          WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10
               AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '01%'
            THEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
          WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10
               AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '02%'
            THEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
          ELSE phone
        END,
        updated_at = NOW()
      WHERE phone IS NOT NULL
      AND phone != ''
      AND phone != REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      RETURNING id
    `
    phonesCleaned = phoneCleanupResult.length

    // 2. Clean up email addresses
    console.log("[CLEANUP-CUSTOMER-DATA-SIMPLE] Cleaning email addresses...")
    const emailCleanupResult = await sql`
      UPDATE customers
      SET
        email = LOWER(TRIM(email)),
        updated_at = NOW()
      WHERE email IS NOT NULL
      AND email != ''
      AND email != LOWER(TRIM(email))
      RETURNING id
    `
    emailsCleaned = emailCleanupResult.length

    // Keep placeholder emails for now since email is NOT NULL
    // We'll improve them instead of removing them

    // 3. Clean up names
    console.log("[CLEANUP-CUSTOMER-DATA-SIMPLE] Cleaning names...")
    const nameCleanupResult = await sql`
      UPDATE customers
      SET
        first_name = TRIM(first_name),
        last_name = TRIM(last_name),
        updated_at = NOW()
      WHERE (first_name != TRIM(first_name) OR last_name != TRIM(last_name))
      AND (first_name IS NOT NULL OR last_name IS NOT NULL)
      RETURNING id
    `
    namesCleaned = nameCleanupResult.length

    // 4. Clean up addresses and postcodes
    console.log("[CLEANUP-CUSTOMER-DATA-SIMPLE] Cleaning addresses...")
    const addressCleanupResult = await sql`
      UPDATE customers
      SET
        address_line1 = TRIM(address_line1),
        city = TRIM(city),
        postcode = UPPER(TRIM(postcode)),
        updated_at = NOW()
      WHERE (address_line1 != TRIM(address_line1)
             OR city != TRIM(city)
             OR postcode != UPPER(TRIM(postcode)))
      AND (address_line1 IS NOT NULL OR city IS NOT NULL OR postcode IS NOT NULL)
      RETURNING id
    `
    addressesCleaned = addressCleanupResult.length

    // Get data quality statistics
    const qualityStats = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND LENGTH(phone) >= 10 THEN 1 END) as valid_phones,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' AND email LIKE '%@%' AND email NOT LIKE '%@placeholder.com' THEN 1 END) as valid_emails,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
        COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END) as with_last_name,
        COUNT(CASE WHEN postcode IS NOT NULL AND postcode != '' THEN 1 END) as with_postcodes,
        COUNT(CASE WHEN address_line1 IS NOT NULL AND address_line1 != '' THEN 1 END) as with_addresses
      FROM customers
    `

    const stats = qualityStats[0]

    // Find potential duplicates based on phone or email
    const duplicates = await sql`
      SELECT
        phone,
        email,
        COUNT(*) as count,
        ARRAY_AGG(id) as customer_ids,
        ARRAY_AGG(first_name || ' ' || last_name) as names
      FROM customers
      WHERE (phone IS NOT NULL AND phone != '' AND LENGTH(phone) >= 10)
      OR (email IS NOT NULL AND email != '' AND email LIKE '%@%' AND email NOT LIKE '%@placeholder.com')
      GROUP BY phone, email
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `

    // Sample cleaned customers
    const sampleCleaned = await sql`
      SELECT id, first_name, last_name, email, phone, address_line1, city, postcode
      FROM customers
      WHERE updated_at > NOW() - INTERVAL '5 minutes'
      ORDER BY updated_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Simple customer data cleanup completed",
      results: {
        phonesCleaned,
        emailsCleaned,
        namesCleaned,
        addressesCleaned
      },
      dataQuality: {
        totalCustomers: parseInt(stats.total_customers),
        validPhones: parseInt(stats.valid_phones),
        validEmails: parseInt(stats.valid_emails),
        withFirstName: parseInt(stats.with_first_name),
        withLastName: parseInt(stats.with_last_name),
        withPostcodes: parseInt(stats.with_postcodes),
        withAddresses: parseInt(stats.with_addresses),
        phoneQualityPercent: Math.round((parseInt(stats.valid_phones) / parseInt(stats.total_customers)) * 100),
        emailQualityPercent: Math.round((parseInt(stats.valid_emails) / parseInt(stats.total_customers)) * 100)
      },
      potentialDuplicates: duplicates,
      sampleCleaned,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEANUP-CUSTOMER-DATA-SIMPLE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup customer data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
