import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[SIMPLE-STATUS] Checking current database status...")

    // Check main tables
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    
    // Check if document tables exist and have data
    let documentTablesStatus = {}
    
    try {
      const customerDocsCount = await sql`SELECT COUNT(*) as count FROM customer_documents`
      documentTablesStatus.customer_documents = parseInt(customerDocsCount[0].count)
    } catch {
      documentTablesStatus.customer_documents = 'Table does not exist'
    }

    try {
      const lineItemsCount = await sql`SELECT COUNT(*) as count FROM document_line_items`
      documentTablesStatus.document_line_items = parseInt(lineItemsCount[0].count)
    } catch {
      documentTablesStatus.document_line_items = 'Table does not exist'
    }

    try {
      const extrasCount = await sql`SELECT COUNT(*) as count FROM document_extras`
      documentTablesStatus.document_extras = parseInt(extrasCount[0].count)
    } catch {
      documentTablesStatus.document_extras = 'Table does not exist'
    }

    try {
      const receiptsCount = await sql`SELECT COUNT(*) as count FROM document_receipts`
      documentTablesStatus.document_receipts = parseInt(receiptsCount[0].count)
    } catch {
      documentTablesStatus.document_receipts = 'Table does not exist'
    }

    // Check customer activity
    const customerActivity = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) as with_last_contact,
        COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) as twilio_ready,
        COUNT(CASE WHEN phone_verified = TRUE THEN 1 END) as phone_verified
      FROM customers
    `

    // Check vehicle connections
    const vehicleConnections = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_customers,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as with_mot_data,
        COUNT(CASE WHEN vehicle_age IS NOT NULL THEN 1 END) as with_age_data
      FROM vehicles
    `

    // Check critical MOTs
    const criticalMots = await sql`
      SELECT 
        COUNT(*) as critical_vehicles,
        COUNT(CASE WHEN v.owner_id IS NOT NULL THEN 1 END) as with_customers
      FROM vehicles v
      WHERE v.mot_expiry_date IS NOT NULL 
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
    `

    const customerStats = customerActivity[0]
    const vehicleStats = vehicleConnections[0]
    const motStats = criticalMots[0]

    return NextResponse.json({
      success: true,
      currentStatus: {
        customers: {
          total: parseInt(customerCount[0].count),
          withLastContact: parseInt(customerStats.with_last_contact),
          twilioReady: parseInt(customerStats.twilio_ready),
          phoneVerified: parseInt(customerStats.phone_verified)
        },
        vehicles: {
          total: parseInt(vehicleCount[0].count),
          withCustomers: parseInt(vehicleStats.with_customers),
          withMotData: parseInt(vehicleStats.with_mot_data),
          withAgeData: parseInt(vehicleStats.with_age_data)
        },
        criticalMots: {
          total: parseInt(motStats.critical_vehicles),
          withCustomers: parseInt(motStats.with_customers)
        },
        documentTables: documentTablesStatus
      },
      systemReadiness: {
        customerDataComplete: parseInt(customerCount[0].count) > 7000,
        vehicleDataComplete: parseInt(vehicleCount[0].count) > 10000,
        twilioReady: parseInt(customerStats.twilio_ready) > 6000,
        criticalMotsIdentified: parseInt(motStats.critical_vehicles) > 200,
        documentHistoryImported: Object.values(documentTablesStatus).some(v => typeof v === 'number' && v > 0)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SIMPLE-STATUS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check database status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
