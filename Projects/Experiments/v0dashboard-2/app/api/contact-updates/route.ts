import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Create contact_updates table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS contact_updates (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        update_type TEXT, -- 'email_added', 'phone_updated', 'address_updated', etc.
        old_value TEXT,
        new_value TEXT,
        source TEXT, -- 'sms_response', 'email_response', 'phone_call', 'manual'
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `

    // Get recent contact updates
    const contactUpdates = await sql`
      SELECT 
        cu.*,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM contact_updates cu
      LEFT JOIN customers c ON cu.customer_id = c.id
      ORDER BY cu.created_at DESC
      LIMIT 100
    `

    // Get contact update statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_updates,
        COUNT(CASE WHEN update_type = 'email_added' THEN 1 END) as emails_added,
        COUNT(CASE WHEN update_type = 'phone_updated' THEN 1 END) as phones_updated,
        COUNT(CASE WHEN update_type = 'address_updated' THEN 1 END) as addresses_updated,
        COUNT(CASE WHEN source = 'sms_response' THEN 1 END) as from_sms,
        COUNT(CASE WHEN source = 'email_response' THEN 1 END) as from_email,
        COUNT(CASE WHEN verified = TRUE THEN 1 END) as verified_updates,
        COUNT(CASE WHEN verified = FALSE THEN 1 END) as pending_verification
      FROM contact_updates
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `

    // Get customers who recently provided email addresses
    const newEmailCustomers = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        cu.created_at as email_added_date,
        cu.source
      FROM customers c
      JOIN contact_updates cu ON c.id = cu.customer_id
      WHERE cu.update_type = 'email_added'
      AND cu.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY cu.created_at DESC
    `

    // Get data quality improvements
    const qualityImprovements = await sql`
      SELECT 
        COUNT(CASE WHEN c.email IS NOT NULL AND c.email != '' THEN 1 END) as customers_with_email,
        COUNT(CASE WHEN c.phone IS NOT NULL AND c.phone != '' THEN 1 END) as customers_with_phone,
        COUNT(CASE WHEN c.email IS NOT NULL AND c.phone IS NOT NULL THEN 1 END) as customers_with_both,
        COUNT(*) as total_customers,
        ROUND(
          COUNT(CASE WHEN c.email IS NOT NULL AND c.email != '' THEN 1 END) * 100.0 / COUNT(*), 
          1
        ) as email_coverage_percent,
        ROUND(
          COUNT(CASE WHEN c.phone IS NOT NULL AND c.phone != '' THEN 1 END) * 100.0 / COUNT(*), 
          1
        ) as phone_coverage_percent
      FROM customers c
      WHERE c.opt_out = FALSE OR c.opt_out IS NULL
    `

    return NextResponse.json({
      success: true,
      contactUpdates: contactUpdates.slice(0, 20), // Limit for display
      newEmailCustomers,
      statistics: {
        ...stats[0],
        qualityImprovements: qualityImprovements[0]
      },
      insights: {
        dataQualityTrend: "improving", // Could be calculated based on recent updates
        mostCommonUpdateType: stats[0].emails_added > stats[0].phones_updated ? "email_added" : "phone_updated",
        responseRate: Math.round((parseInt(stats[0].from_sms) / 100) * 100) / 100 // Placeholder calculation
      },
      recommendations: [
        `${stats[0].emails_added} customers have provided email addresses via SMS`,
        `${stats[0].phones_updated} customers have updated their phone numbers`,
        `${qualityImprovements[0].email_coverage_percent}% of customers now have email addresses`,
        `${qualityImprovements[0].customers_with_both} customers have both email and phone contact methods`
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CONTACT-UPDATES] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get contact updates" },
      { status: 500 }
    )
  }
}

// Verify contact updates
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { updateIds, action } = body

    if (action === 'verify_updates') {
      for (const updateId of updateIds) {
        await sql`
          UPDATE contact_updates 
          SET verified = TRUE, processed_at = NOW()
          WHERE id = ${updateId}
        `
      }

      return NextResponse.json({
        success: true,
        message: `${updateIds.length} contact updates verified`,
        verified: updateIds.length
      })
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("[CONTACT-UPDATES-VERIFY] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to verify contact updates" },
      { status: 500 }
    )
  }
}
