import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DATABASE-STATUS] Checking database status...')

    // Check basic tables first
    const basicCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM customer_documents) as documents
    `

    const basic = basicCounts[0]
    
    // Try to check new tables (may not exist)
    let newTables = {
      line_items: 0,
      document_extras: 0,
      receipts: 0,
      reminders: 0,
      appointments: 0,
      stock: 0
    }

    try {
      const lineItems = await sql`SELECT COUNT(*) as count FROM document_line_items`
      newTables.line_items = parseInt(lineItems[0].count)
    } catch (e) {
      console.log('[DATABASE-STATUS] document_line_items table not found')
    }

    try {
      const extras = await sql`SELECT COUNT(*) as count FROM document_extras`
      newTables.document_extras = parseInt(extras[0].count)
    } catch (e) {
      console.log('[DATABASE-STATUS] document_extras table not found')
    }

    try {
      const receipts = await sql`SELECT COUNT(*) as count FROM receipts`
      newTables.receipts = parseInt(receipts[0].count)
    } catch (e) {
      console.log('[DATABASE-STATUS] receipts table not found')
    }

    try {
      const reminders = await sql`SELECT COUNT(*) as count FROM reminders`
      newTables.reminders = parseInt(reminders[0].count)
    } catch (e) {
      console.log('[DATABASE-STATUS] reminders table not found')
    }

    try {
      const appointments = await sql`SELECT COUNT(*) as count FROM appointments`
      newTables.appointments = parseInt(appointments[0].count)
    } catch (e) {
      console.log('[DATABASE-STATUS] appointments table not found')
    }

    try {
      const stock = await sql`SELECT COUNT(*) as count FROM stock`
      newTables.stock = parseInt(stock[0].count)
    } catch (e) {
      console.log('[DATABASE-STATUS] stock table not found')
    }

    const totalRecords = parseInt(basic.customers) + parseInt(basic.vehicles) + parseInt(basic.documents) + 
                        Object.values(newTables).reduce((sum, count) => sum + count, 0)

    const result = {
      success: true,
      basic_tables: {
        customers: parseInt(basic.customers),
        vehicles: parseInt(basic.vehicles),
        documents: parseInt(basic.documents)
      },
      new_tables: newTables,
      total_records: totalRecords,
      import_success: totalRecords > 50000 ? 'MASSIVE SUCCESS' : totalRecords > 25000 ? 'SUCCESS' : 'PARTIAL'
    }

    console.log('[DATABASE-STATUS] Results:', result)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('[DATABASE-STATUS] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
