import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[EMAIL-CLEANUP] Starting email cleanup and verification...")

    // Add email tracking columns if they don't exist
    try {
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verification_token TEXT`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_email_sent TIMESTAMP`
    } catch (error) {
      console.log("[EMAIL-CLEANUP] Columns may already exist")
    }

    // 1. Clean up email formats
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

    // 2. Find invalid email formats
    const invalidEmails = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone
      FROM customers
      WHERE email IS NOT NULL 
      AND email != ''
      AND NOT (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
      ORDER BY updated_at DESC
      LIMIT 50
    `

    // 3. Find duplicate emails
    const duplicateEmails = await sql`
      SELECT 
        email,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at DESC) as customer_ids,
        ARRAY_AGG(first_name || ' ' || last_name ORDER BY created_at DESC) as names
      FROM customers
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `

    // 4. Find customers with both email and phone for verification
    const verifiableCustomers = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        twilio_phone,
        email_verified,
        phone_verified,
        created_at
      FROM customers
      WHERE email IS NOT NULL 
      AND email != ''
      AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
      AND twilio_phone IS NOT NULL
      AND (email_verified = FALSE OR email_verified IS NULL)
      ORDER BY created_at DESC
      LIMIT 100
    `

    // 5. Find customers with vehicles needing contact verification
    const customersNeedingVerification = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.twilio_phone,
        c.email_verified,
        c.phone_verified,
        COUNT(v.registration) as vehicle_count,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as urgent_mots
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id AND v.active = TRUE
      WHERE (c.email_verified = FALSE OR c.email_verified IS NULL OR c.phone_verified = FALSE OR c.phone_verified IS NULL)
      AND (c.email IS NOT NULL OR c.twilio_phone IS NOT NULL)
      AND c.opt_out = FALSE
      GROUP BY c.id, c.first_name, c.last_name, c.email, c.twilio_phone, c.email_verified, c.phone_verified
      HAVING COUNT(v.registration) > 0
      ORDER BY COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) DESC
      LIMIT 50
    `

    // 6. Generate verification tokens for email verification
    const tokensGenerated = []
    for (const customer of verifiableCustomers.slice(0, 20)) {
      const token = generateVerificationToken()
      await sql`
        UPDATE customers 
        SET email_verification_token = ${token}
        WHERE id = ${customer.id}
      `
      tokensGenerated.push({
        customerId: customer.id,
        email: customer.email,
        token,
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
      })
    }

    // 7. Get email statistics
    const emailStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
        COUNT(CASE WHEN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN 1 END) as valid_email_format,
        COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_emails,
        COUNT(CASE WHEN email_bounced = TRUE THEN 1 END) as bounced_emails,
        COUNT(CASE WHEN email IS NOT NULL AND twilio_phone IS NOT NULL THEN 1 END) as dual_contact
      FROM customers
    `

    return NextResponse.json({
      success: true,
      cleanup: {
        emailsCleaned: emailCleanupResult.length,
        invalidEmails: invalidEmails.slice(0, 10),
        duplicateEmails: duplicateEmails.slice(0, 10),
        verifiableCustomers: verifiableCustomers.slice(0, 10),
        customersNeedingVerification: customersNeedingVerification.slice(0, 10),
        tokensGenerated: tokensGenerated.length
      },
      statistics: {
        ...emailStats[0],
        invalidEmailsCount: invalidEmails.length,
        duplicateEmailsCount: duplicateEmails.length,
        verifiableCustomersCount: verifiableCustomers.length,
        needingVerificationCount: customersNeedingVerification.length
      },
      verificationTokens: tokensGenerated, // Use these to send verification emails
      recommendations: [
        `${invalidEmails.length} customers have invalid email formats - review and correct`,
        `${duplicateEmails.length} duplicate email addresses found - consider merging accounts`,
        `${verifiableCustomers.length} customers ready for email verification`,
        `${customersNeedingVerification.length} customers with vehicles need contact verification`,
        `${parseInt(emailStats[0].dual_contact)} customers have both email and phone - ideal for multi-channel communication`
      ],
      nextSteps: [
        "Send email verification requests to customers with unverified emails",
        "Set up email bounce handling to mark bounced emails",
        "Implement preference center for customers to update contact preferences",
        "Create automated cleanup routine to run weekly",
        "Set up email delivery monitoring and reporting"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[EMAIL-CLEANUP] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to cleanup emails" },
      { status: 500 }
    )
  }
}

function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36)
}

// Handle email verification
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { token, action } = body

    if (action === 'verify_email') {
      const customer = await sql`
        SELECT id, email, first_name, last_name
        FROM customers
        WHERE email_verification_token = ${token}
        AND email_verification_token IS NOT NULL
      `

      if (customer.length === 0) {
        return NextResponse.json(
          { success: false, error: "Invalid or expired verification token" },
          { status: 400 }
        )
      }

      await sql`
        UPDATE customers
        SET 
          email_verified = TRUE,
          email_verification_token = NULL,
          updated_at = NOW()
        WHERE id = ${customer[0].id}
      `

      return NextResponse.json({
        success: true,
        message: "Email verified successfully",
        customer: customer[0]
      })
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("[EMAIL-VERIFICATION] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process email verification" },
      { status: 500 }
    )
  }
}
