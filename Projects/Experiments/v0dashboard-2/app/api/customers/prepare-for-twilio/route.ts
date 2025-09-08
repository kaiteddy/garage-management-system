import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[PREPARE-FOR-TWILIO] Preparing customer phone numbers for Twilio SMS...")

    // Add Twilio-specific fields if they don't exist
    try {
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS twilio_phone TEXT`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_contact_date DATE`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'sms'`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS opt_out BOOLEAN DEFAULT FALSE`
    } catch (error) {
      console.log("[PREPARE-FOR-TWILIO] Columns may already exist")
    }

    let phonesCleaned = 0
    let phonesFormatted = 0
    let invalidPhones = 0

    // 1. Format phone numbers for Twilio (E.164 format)
    console.log("[PREPARE-FOR-TWILIO] Formatting phone numbers to E.164 format...")

    const phoneFormatResult = await sql`
      UPDATE customers
      SET
        twilio_phone = CASE
          -- UK mobile numbers (07xxxxxxxxx -> +447xxxxxxxxx)
          WHEN phone ~ '^07[0-9]{9}$' THEN '+44' || SUBSTRING(phone FROM 2)
          -- UK landlines (01xxxxxxxxx or 02xxxxxxxxx -> +441xxxxxxxxx or +442xxxxxxxxx)
          WHEN phone ~ '^0[12][0-9]{8,9}$' THEN '+44' || SUBSTRING(phone FROM 2)
          -- Already in international format
          WHEN phone ~ '^\\+44[0-9]{10,11}$' THEN phone
          -- Clean and format other UK numbers
          WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^07[0-9]{9}$'
            THEN '+44' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g') FROM 2)
          WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^0[12][0-9]{8,9}$'
            THEN '+44' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g') FROM 2)
          ELSE NULL
        END,
        phone_verified = CASE
          WHEN phone ~ '^07[0-9]{9}$' OR phone ~ '^0[12][0-9]{8,9}$' OR phone ~ '^\\+44[0-9]{10,11}$'
            THEN TRUE
          ELSE FALSE
        END,
        updated_at = NOW()
      WHERE phone IS NOT NULL
      AND phone != ''
      RETURNING id
    `
    phonesFormatted = phoneFormatResult.length

    // 2. Get phone number statistics
    const phoneStats = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
        COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) as twilio_ready,
        COUNT(CASE WHEN phone_verified = TRUE THEN 1 END) as verified_phones,
        COUNT(CASE WHEN phone ~ '^07[0-9]{9}$' THEN 1 END) as uk_mobile,
        COUNT(CASE WHEN phone ~ '^0[12][0-9]{8,9}$' THEN 1 END) as uk_landline,
        COUNT(CASE WHEN phone ~ '^\\+[0-9]+$' THEN 1 END) as international
      FROM customers
    `

    // 3. Find customers with invalid phone numbers
    const invalidPhoneCustomers = await sql`
      SELECT
        id,
        first_name,
        last_name,
        phone,
        twilio_phone,
        email
      FROM customers
      WHERE phone IS NOT NULL
      AND phone != ''
      AND twilio_phone IS NULL
      ORDER BY updated_at DESC
      LIMIT 20
    `
    invalidPhones = invalidPhoneCustomers.length

    // 4. Get sample of Twilio-ready customers
    const twilioReadyCustomers = await sql`
      SELECT
        id,
        first_name,
        last_name,
        phone,
        twilio_phone,
        phone_verified,
        email
      FROM customers
      WHERE twilio_phone IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 10
    `

    // 5. Check for duplicate phone numbers
    const duplicatePhones = await sql`
      SELECT
        twilio_phone,
        COUNT(*) as count,
        ARRAY_AGG(id) as customer_ids,
        ARRAY_AGG(first_name || ' ' || last_name) as names
      FROM customers
      WHERE twilio_phone IS NOT NULL
      GROUP BY twilio_phone
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `

    const stats = phoneStats[0]

    return NextResponse.json({
      success: true,
      message: "Phone numbers prepared for Twilio",
      results: {
        phonesCleaned,
        phonesFormatted,
        invalidPhones
      },
      statistics: {
        totalCustomers: parseInt(stats.total_customers),
        withPhone: parseInt(stats.with_phone),
        twilioReady: parseInt(stats.twilio_ready),
        verifiedPhones: parseInt(stats.verified_phones),
        ukMobile: parseInt(stats.uk_mobile),
        ukLandline: parseInt(stats.uk_landline),
        international: parseInt(stats.international),
        twilioReadyPercent: Math.round((parseInt(stats.twilio_ready) / parseInt(stats.total_customers)) * 100),
        verificationRate: Math.round((parseInt(stats.verified_phones) / parseInt(stats.with_phone)) * 100)
      },
      twilioReadyCustomers,
      invalidPhoneCustomers: invalidPhoneCustomers.slice(0, 10),
      duplicatePhones,
      twilioConfiguration: {
        recommendedFormat: "E.164 (+44xxxxxxxxxx)",
        supportedTypes: ["UK Mobile (+447xxxxxxxxx)", "UK Landline (+441xxxxxxxxx, +442xxxxxxxxx)"],
        notes: [
          "All phone numbers are formatted to E.164 standard for Twilio",
          "UK mobile numbers are preferred for SMS",
          "Landlines may not support SMS",
          "Invalid numbers are flagged for manual review"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[PREPARE-FOR-TWILIO] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to prepare for Twilio",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
