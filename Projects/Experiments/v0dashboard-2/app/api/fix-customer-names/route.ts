import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[FIX-CUSTOMER-NAMES] Starting customer name cleanup...")

    // 1. Fix customers with missing last names but have first names
    const missingLastNames = await sql`
      UPDATE customers 
      SET last_name = 'Unknown'
      WHERE (last_name IS NULL OR last_name = '') 
      AND first_name IS NOT NULL 
      AND first_name != ''
      AND first_name != 'Customer'
    `

    // 2. Fix customers with missing first names but have last names  
    const missingFirstNames = await sql`
      UPDATE customers 
      SET first_name = 'Customer'
      WHERE (first_name IS NULL OR first_name = '') 
      AND last_name IS NOT NULL 
      AND last_name != ''
      AND last_name != 'Unknown'
    `

    // 3. Fix customers with both names missing but have phone/email
    const bothNamesMissing = await sql`
      UPDATE customers 
      SET first_name = 'Customer', last_name = 'Unknown'
      WHERE (first_name IS NULL OR first_name = '') 
      AND (last_name IS NULL OR last_name = '')
      AND (phone IS NOT NULL OR email IS NOT NULL)
    `

    // 4. Standardize phone number formats
    const phoneFormatting = await sql`
      UPDATE customers 
      SET phone = REGEXP_REPLACE(phone, '[^0-9+]', '', 'g')
      WHERE phone IS NOT NULL 
      AND phone != ''
      AND phone ~ '[^0-9+]'
    `

    // 5. Get summary of fixes
    const summary = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
        COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END) as with_last_name,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
        COUNT(CASE WHEN first_name = 'Customer' AND last_name = 'Unknown' THEN 1 END) as generic_names
      FROM customers
    `

    // 6. Get sample of fixed customers
    const sampleFixed = await sql`
      SELECT first_name, last_name, phone, email
      FROM customers
      WHERE (first_name IS NOT NULL AND first_name != '')
      AND (last_name IS NOT NULL AND last_name != '')
      ORDER BY updated_at DESC
      LIMIT 10
    `

    console.log("✅ [FIX-CUSTOMER-NAMES] Customer name cleanup completed")

    return NextResponse.json({
      success: true,
      fixes_applied: {
        missing_last_names: missingLastNames.count,
        missing_first_names: missingFirstNames.count,
        both_names_missing: bothNamesMissing.count,
        phone_formatting: phoneFormatting.count
      },
      summary: summary[0],
      sample_fixed_customers: sampleFixed,
      message: "Customer names have been standardized and cleaned up",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [FIX-CUSTOMER-NAMES] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get current state of customer names
    const nameAnalysis = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as missing_first_name,
        COUNT(CASE WHEN last_name IS NULL OR last_name = '' THEN 1 END) as missing_last_name,
        COUNT(CASE WHEN (first_name IS NULL OR first_name = '') AND (last_name IS NULL OR last_name = '') THEN 1 END) as missing_both_names,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND phone ~ '[^0-9+]' THEN 1 END) as needs_phone_formatting
      FROM customers
    `

    return NextResponse.json({
      success: true,
      current_state: nameAnalysis[0],
      recommendations: {
        should_fix_names: nameAnalysis[0].missing_first_name > 0 || nameAnalysis[0].missing_last_name > 0,
        should_format_phones: nameAnalysis[0].needs_phone_formatting > 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [FIX-CUSTOMER-NAMES] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
