import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[SIMPLE-SUMMARY] Generating basic data connection summary...")

    // Basic counts
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const documentCount = await sql`SELECT COUNT(*) as count FROM documents`

    // Connection counts
    const vehiclesWithCustomers = await sql`SELECT COUNT(*) as count FROM vehicles WHERE owner_id IS NOT NULL`
    const documentsWithCustomers = await sql`SELECT COUNT(*) as count FROM documents WHERE _id_customer IS NOT NULL`
    const customersWithPhones = await sql`SELECT COUNT(*) as count FROM customers WHERE phone IS NOT NULL AND phone != ''`

    // SMS ready count
    const smsReady = await sql`
      SELECT COUNT(*) as count FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      WHERE c.phone IS NOT NULL AND c.phone != ''
      AND v.mot_expiry_date IS NOT NULL
    `

    return NextResponse.json({
      success: true,
      summary: {
        tables: {
          customers: parseInt(customerCount[0].count),
          vehicles: parseInt(vehicleCount[0].count),
          documents: parseInt(documentCount[0].count)
        },
        connections: {
          vehiclesWithCustomers: parseInt(vehiclesWithCustomers[0].count),
          documentsWithCustomers: parseInt(documentsWithCustomers[0].count),
          customersWithPhones: parseInt(customersWithPhones[0].count),
          smsReady: parseInt(smsReady[0].count)
        },
        connectionPercentages: {
          vehicleCustomerConnection: Math.round((parseInt(vehiclesWithCustomers[0].count) / parseInt(vehicleCount[0].count)) * 100),
          documentCustomerConnection: Math.round((parseInt(documentsWithCustomers[0].count) / parseInt(documentCount[0].count)) * 100),
          customerPhoneCompletion: Math.round((parseInt(customersWithPhones[0].count) / parseInt(customerCount[0].count)) * 100)
        }
      },
      status: {
        dataConnected: true,
        smsReady: parseInt(smsReady[0].count) > 5000,
        qualityGood: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SIMPLE-SUMMARY] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate summary",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
