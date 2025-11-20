import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CLEANUP-SOLD-VEHICLES] Starting database cleanup for sold vehicles...")

    // Add necessary columns if they don't exist
    try {
      await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`
      await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership_status TEXT DEFAULT 'current'`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS opt_out BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS opt_out_date TIMESTAMP`
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_response_date TIMESTAMP`
    } catch (error) {
      console.log("[CLEANUP-SOLD-VEHICLES] Columns may already exist")
    }

    // 1. Find vehicles marked as sold through customer responses
    const soldVehicles = await sql`
      SELECT DISTINCT
        voc.vehicle_registration,
        voc.previous_owner_id,
        voc.change_type,
        voc.change_date,
        c.first_name,
        c.last_name,
        c.phone,
        v.make,
        v.model
      FROM vehicle_ownership_changes voc
      LEFT JOIN customers c ON voc.previous_owner_id = c.id
      LEFT JOIN vehicles v ON voc.vehicle_registration = v.registration
      WHERE voc.change_type IN ('sold', 'no_longer_own')
      AND voc.verified = FALSE
      ORDER BY voc.change_date DESC
    `

    // 2. Find customers who have opted out
    const optedOutCustomers = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.opt_out_date,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id AND v.active = TRUE
      WHERE c.opt_out = TRUE
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email, c.opt_out_date
      ORDER BY c.opt_out_date DESC
    `

    // 3. Find duplicate customers (same phone/email)
    const duplicateCustomers = await sql`
      SELECT 
        phone,
        email,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at DESC) as customer_ids,
        ARRAY_AGG(first_name || ' ' || last_name ORDER BY created_at DESC) as names
      FROM customers
      WHERE (phone IS NOT NULL AND phone != '') 
         OR (email IS NOT NULL AND email != '')
      GROUP BY phone, email
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `

    // 4. Find customers with no active vehicles
    const customersWithoutVehicles = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.created_at,
        COUNT(v.registration) as total_vehicles,
        COUNT(CASE WHEN v.active = TRUE THEN 1 END) as active_vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email, c.created_at
      HAVING COUNT(CASE WHEN v.active = TRUE THEN 1 END) = 0
      ORDER BY c.created_at DESC
      LIMIT 50
    `

    // 5. Find vehicles with expired MOTs and no recent contact
    const abandonedVehicles = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        v.owner_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.last_contact_date,
        CURRENT_DATE - v.mot_expiry_date as days_expired
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.active = TRUE
      AND v.mot_expiry_date < CURRENT_DATE - INTERVAL '6 months'
      AND (c.last_contact_date IS NULL OR c.last_contact_date < CURRENT_DATE - INTERVAL '3 months')
      ORDER BY v.mot_expiry_date ASC
      LIMIT 30
    `

    // 6. Get cleanup statistics
    const cleanupStats = await sql`
      SELECT 
        COUNT(CASE WHEN v.active = FALSE THEN 1 END) as inactive_vehicles,
        COUNT(CASE WHEN v.ownership_status = 'sold' THEN 1 END) as sold_vehicles,
        COUNT(CASE WHEN c.opt_out = TRUE THEN 1 END) as opted_out_customers,
        COUNT(CASE WHEN v.mot_expiry_date < CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as long_expired_mots,
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT v.registration) as total_vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
    `

    // 7. Generate cleanup recommendations
    const recommendations = []
    
    if (soldVehicles.length > 0) {
      recommendations.push(`${soldVehicles.length} vehicles reported as sold - review and mark as inactive`)
    }
    
    if (optedOutCustomers.length > 0) {
      recommendations.push(`${optedOutCustomers.length} customers have opted out - exclude from future communications`)
    }
    
    if (duplicateCustomers.length > 0) {
      recommendations.push(`${duplicateCustomers.length} duplicate customer records found - consider merging`)
    }
    
    if (customersWithoutVehicles.length > 0) {
      recommendations.push(`${customersWithoutVehicles.length} customers have no active vehicles - review for archival`)
    }
    
    if (abandonedVehicles.length > 0) {
      recommendations.push(`${abandonedVehicles.length} vehicles appear abandoned (6+ months expired MOT, no contact) - investigate`)
    }

    return NextResponse.json({
      success: true,
      cleanup: {
        soldVehicles: soldVehicles.slice(0, 10), // Limit for display
        optedOutCustomers: optedOutCustomers.slice(0, 10),
        duplicateCustomers: duplicateCustomers.slice(0, 10),
        customersWithoutVehicles: customersWithoutVehicles.slice(0, 10),
        abandonedVehicles: abandonedVehicles.slice(0, 10)
      },
      statistics: {
        soldVehiclesCount: soldVehicles.length,
        optedOutCustomersCount: optedOutCustomers.length,
        duplicateCustomersCount: duplicateCustomers.length,
        customersWithoutVehiclesCount: customersWithoutVehicles.length,
        abandonedVehiclesCount: abandonedVehicles.length,
        ...cleanupStats[0]
      },
      recommendations,
      actions: {
        available: [
          "Mark sold vehicles as inactive",
          "Archive customers without vehicles",
          "Merge duplicate customer records",
          "Send final contact attempt to abandoned vehicles",
          "Export opted-out customers for compliance"
        ],
        automated: [
          "Auto-process 'SOLD' SMS responses",
          "Auto-process 'STOP' opt-out requests",
          "Flag vehicles with 12+ month expired MOTs",
          "Identify customers with invalid contact info"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEANUP-SOLD-VEHICLES] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to cleanup sold vehicles" },
      { status: 500 }
    )
  }
}

// Process specific cleanup actions
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { action, items } = body

    let processed = 0

    switch (action) {
      case 'mark_vehicles_inactive':
        for (const registration of items) {
          await sql`
            UPDATE vehicles 
            SET active = FALSE, ownership_status = 'sold', updated_at = NOW()
            WHERE registration = ${registration}
          `
          processed++
        }
        break

      case 'archive_customers':
        for (const customerId of items) {
          await sql`
            UPDATE customers 
            SET archived = TRUE, archived_date = NOW(), updated_at = NOW()
            WHERE id = ${customerId}
          `
          processed++
        }
        break

      case 'verify_ownership_changes':
        for (const changeId of items) {
          await sql`
            UPDATE vehicle_ownership_changes 
            SET verified = TRUE, verified_date = NOW()
            WHERE id = ${changeId}
          `
          processed++
        }
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return NextResponse.json({
      success: true,
      action,
      processed,
      message: `Successfully processed ${processed} items`
    })

  } catch (error) {
    console.error("[CLEANUP-ACTION] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process cleanup action" },
      { status: 500 }
    )
  }
}
