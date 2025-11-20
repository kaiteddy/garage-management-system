import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CLEANUP-CUSTOMER-DATA] Starting customer data cleanup...")

    let phonesCleaned = 0
    let emailsCleaned = 0
    let namesCleaned = 0
    let addressesCleaned = 0
    let duplicatesFound = 0

    // 1. Clean up phone numbers
    console.log("[CLEANUP-CUSTOMER-DATA] Cleaning phone numbers...")
    const phoneCleanupResult = await sql`
      UPDATE customers
      SET
        phone = CASE
          -- UK mobile numbers starting with 07
          WHEN phone ~ '^07[0-9]{9}$' THEN phone
          -- UK landlines starting with 01/02/03
          WHEN phone ~ '^0[123][0-9]{8,9}$' THEN phone
          -- Remove spaces, dashes, brackets from UK numbers
          WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^07[0-9]{9}$'
            THEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
          WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^0[123][0-9]{8,9}$'
            THEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
          -- International numbers starting with +44
          WHEN phone ~ '^\\+447[0-9]{9}$' THEN '0' || SUBSTRING(phone FROM 4)
          WHEN phone ~ '^\\+44[123][0-9]{8,9}$' THEN '0' || SUBSTRING(phone FROM 4)
          -- Remove common prefixes and clean
          WHEN REGEXP_REPLACE(REGEXP_REPLACE(phone, '^(\+44|0044)', '0'), '[^0-9]', '', 'g') ~ '^0[0-9]{9,10}$'
            THEN REGEXP_REPLACE(REGEXP_REPLACE(phone, '^(\+44|0044)', '0'), '[^0-9]', '', 'g')
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE phone IS NOT NULL
      AND phone != ''
      AND (
        phone !~ '^07[0-9]{9}$'
        OR phone !~ '^0[123][0-9]{8,9}$'
        OR phone ~ '[^0-9+]'
      )
      RETURNING id
    `
    phonesCleaned = phoneCleanupResult.length

    // 2. Clean up email addresses
    console.log("[CLEANUP-CUSTOMER-DATA] Cleaning email addresses...")
    const emailCleanupResult = await sql`
      UPDATE customers
      SET
        email = LOWER(TRIM(email)),
        updated_at = NOW()
      WHERE email IS NOT NULL
      AND email != ''
      AND (email != LOWER(TRIM(email)) OR email ~ '^\s|\s$')
      RETURNING id
    `
    emailsCleaned = emailCleanupResult.length

    // Remove obviously fake emails
    await sql`
      UPDATE customers
      SET email = NULL
      WHERE email LIKE '%@placeholder.com'
      OR email LIKE 'noemail.%'
      OR email = ''
    `

    // 3. Clean up names
    console.log("[CLEANUP-CUSTOMER-DATA] Cleaning names...")
    const nameCleanupResult = await sql`
      UPDATE customers
      SET
        first_name = TRIM(REGEXP_REPLACE(first_name, '\s+', ' ', 'g')),
        last_name = TRIM(REGEXP_REPLACE(last_name, '\s+', ' ', 'g')),
        updated_at = NOW()
      WHERE (first_name ~ '\s{2,}' OR last_name ~ '\s{2,}'
             OR first_name ~ '^\s|\s$' OR last_name ~ '^\s|\s$')
      RETURNING id
    `
    namesCleaned = nameCleanupResult.length

    // 4. Clean up addresses
    console.log("[CLEANUP-CUSTOMER-DATA] Cleaning addresses...")
    const addressCleanupResult = await sql`
      UPDATE customers
      SET
        address_line1 = TRIM(REGEXP_REPLACE(address_line1, '\s+', ' ', 'g')),
        city = TRIM(REGEXP_REPLACE(city, '\s+', ' ', 'g')),
        postcode = UPPER(TRIM(REGEXP_REPLACE(postcode, '\s+', ' ', 'g'))),
        updated_at = NOW()
      WHERE (address_line1 ~ '\s{2,}' OR city ~ '\s{2,}' OR postcode ~ '\s{2,}'
             OR address_line1 ~ '^\s|\s$' OR city ~ '^\s|\s$' OR postcode ~ '^\s|\s$')
      RETURNING id
    `
    addressesCleaned = addressCleanupResult.length

    // 5. Standardize postcodes
    await sql`
      UPDATE customers
      SET
        postcode = CASE
          -- Add space in postcodes without space (e.g., NW41SG -> NW4 1SG)
          WHEN postcode ~ '^[A-Z]{1,2}[0-9]{1,2}[A-Z]{2}$'
            THEN SUBSTRING(postcode FROM 1 FOR LENGTH(postcode)-2) || ' ' || SUBSTRING(postcode FROM LENGTH(postcode)-1)
          -- Fix common postcode issues
          WHEN postcode ~ '^[A-Z]{1,2}[0-9]{1,2}\s+[A-Z]{2}$'
            THEN REGEXP_REPLACE(postcode, '\s+', ' ')
          ELSE postcode
        END,
        updated_at = NOW()
      WHERE postcode IS NOT NULL
      AND postcode != ''
      AND (postcode ~ '^[A-Z]{1,2}[0-9]{1,2}[A-Z]{2}$' OR postcode ~ '\s{2,}')
    `

    // 6. Find potential duplicates
    console.log("[CLEANUP-CUSTOMER-DATA] Finding potential duplicates...")
    const duplicates = await sql`
      SELECT
        email,
        phone,
        CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as full_name,
        COUNT(*) as count,
        ARRAY_AGG(id) as customer_ids
      FROM customers
      WHERE (email IS NOT NULL AND email != '' AND email NOT LIKE '%@placeholder.com')
      OR (phone IS NOT NULL AND phone != '' AND LENGTH(phone) >= 10)
      GROUP BY email, phone, CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `
    duplicatesFound = duplicates.length

    // Get data quality statistics
    const qualityStats = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND phone ~ '^0[0-9]{9,10}$' THEN 1 END) as valid_phones,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' AND email ~ '^[^@]+@[^@]+\.[^@]+$' AND email NOT LIKE '%@placeholder.com' THEN 1 END) as valid_emails,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
        COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END) as with_last_name,
        COUNT(CASE WHEN postcode IS NOT NULL AND postcode != '' AND postcode ~ '^[A-Z]{1,2}[0-9]{1,2}\s?[A-Z]{2}$' THEN 1 END) as valid_postcodes
      FROM customers
    `

    const stats = qualityStats[0]

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
      message: "Customer data cleanup completed",
      results: {
        phonesCleaned,
        emailsCleaned,
        namesCleaned,
        addressesCleaned,
        duplicatesFound
      },
      dataQuality: {
        totalCustomers: parseInt(stats.total_customers),
        validPhones: parseInt(stats.valid_phones),
        validEmails: parseInt(stats.valid_emails),
        withFirstName: parseInt(stats.with_first_name),
        withLastName: parseInt(stats.with_last_name),
        validPostcodes: parseInt(stats.valid_postcodes),
        phoneQualityPercent: Math.round((parseInt(stats.valid_phones) / parseInt(stats.total_customers)) * 100),
        emailQualityPercent: Math.round((parseInt(stats.valid_emails) / parseInt(stats.total_customers)) * 100)
      },
      potentialDuplicates: duplicates.slice(0, 5),
      sampleCleaned,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEANUP-CUSTOMER-DATA] Error:", error)
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
