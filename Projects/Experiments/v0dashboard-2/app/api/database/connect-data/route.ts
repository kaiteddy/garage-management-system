import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CONNECT-DATA] Starting comprehensive data connection process...")

    let connectionsFixed = 0
    let errors = 0
    const errorDetails: string[] = []

    // 1. Connect vehicles to customers by matching names and phone numbers
    console.log("[CONNECT-DATA] Step 1: Connecting vehicles to customers...")
    
    try {
      // First, try to connect vehicles using exact customer name matches from documents
      const vehicleCustomerConnections = await sql`
        UPDATE vehicles v
        SET owner_id = c.id, updated_at = NOW()
        FROM customers c
        INNER JOIN documents d ON c.id::text = d._id_customer
        WHERE v.owner_id IS NULL
        AND UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(d.vehicle_registration, ' ', ''))
        AND c.id IS NOT NULL
      `
      
      connectionsFixed += vehicleCustomerConnections.count || 0
      console.log(`[CONNECT-DATA] Connected ${vehicleCustomerConnections.count || 0} vehicles to customers via documents`)

    } catch (error) {
      errors++
      errorDetails.push(`Vehicle-customer connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 2. Connect documents to customers using _id_customer field
    console.log("[CONNECT-DATA] Step 2: Ensuring document-customer connections...")
    
    try {
      // Update documents to have proper customer_id field based on _id_customer
      const documentCustomerConnections = await sql`
        UPDATE documents d
        SET customer_id = c.id, updated_at = NOW()
        FROM customers c
        WHERE d.customer_id IS NULL
        AND c.id::text = d._id_customer
      `
      
      connectionsFixed += documentCustomerConnections.count || 0
      console.log(`[CONNECT-DATA] Connected ${documentCustomerConnections.count || 0} documents to customers`)

    } catch (error) {
      errors++
      errorDetails.push(`Document-customer connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 3. Connect documents to vehicles using registration matching
    console.log("[CONNECT-DATA] Step 3: Connecting documents to vehicles...")
    
    try {
      const documentVehicleConnections = await sql`
        UPDATE documents d
        SET vehicle_id = v.id, updated_at = NOW()
        FROM vehicles v
        WHERE d.vehicle_id IS NULL
        AND d.vehicle_registration IS NOT NULL
        AND UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(d.vehicle_registration, ' ', ''))
      `
      
      connectionsFixed += documentVehicleConnections.count || 0
      console.log(`[CONNECT-DATA] Connected ${documentVehicleConnections.count || 0} documents to vehicles`)

    } catch (error) {
      errors++
      errorDetails.push(`Document-vehicle connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 4. Update customer phone numbers from documents where missing
    console.log("[CONNECT-DATA] Step 4: Updating customer phone numbers...")
    
    try {
      const phoneUpdates = await sql`
        UPDATE customers c
        SET phone = d.customer_phone, updated_at = NOW()
        FROM documents d
        WHERE (c.phone IS NULL OR c.phone = '')
        AND d.customer_phone IS NOT NULL
        AND d.customer_phone != ''
        AND c.id::text = d._id_customer
      `
      
      connectionsFixed += phoneUpdates.count || 0
      console.log(`[CONNECT-DATA] Updated ${phoneUpdates.count || 0} customer phone numbers`)

    } catch (error) {
      errors++
      errorDetails.push(`Phone update error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 5. Ensure document line items are connected
    console.log("[CONNECT-DATA] Step 5: Connecting document line items...")
    
    try {
      // Check and fix any orphaned line items
      const lineItemConnections = await sql`
        SELECT COUNT(*) as orphaned FROM document_line_items dli
        WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = dli.document_id)
      `
      
      console.log(`[CONNECT-DATA] Found ${lineItemConnections[0].orphaned} orphaned line items`)

    } catch (error) {
      errors++
      errorDetails.push(`Line item check error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 6. Verify final connection state
    console.log("[CONNECT-DATA] Step 6: Verifying final connections...")
    
    const finalVerification = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles WHERE owner_id IS NOT NULL`,
      sql`SELECT COUNT(*) as count FROM documents WHERE _id_customer IS NOT NULL`,
      sql`SELECT COUNT(*) as count FROM customers WHERE phone IS NOT NULL AND phone != ''`,
      sql`
        SELECT COUNT(*) as count FROM customers c
        INNER JOIN vehicles v ON c.id = v.owner_id
        WHERE c.phone IS NOT NULL AND c.phone != ''
        AND v.mot_expiry_date IS NOT NULL
      `
    ])

    const verification = {
      vehiclesWithCustomers: parseInt(finalVerification[0][0].count),
      documentsWithCustomers: parseInt(finalVerification[1][0].count),
      customersWithPhones: parseInt(finalVerification[2][0].count),
      smsReadyCustomers: parseInt(finalVerification[3][0].count)
    }

    return NextResponse.json({
      success: true,
      message: "Data connection process completed",
      results: {
        connectionsFixed,
        errors,
        errorDetails
      },
      verification,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CONNECT-DATA] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
