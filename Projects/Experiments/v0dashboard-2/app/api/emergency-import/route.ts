import { NextResponse } from "next/server"
import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export async function POST(request: Request) {
  try {
    console.log("[EMERGENCY-IMPORT] 🚨 Starting emergency import bypass...")
    
    const { action = 'status' } = await request.json().catch(() => ({}))
    
    const sql = neon(process.env.DATABASE_URL!, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    })
    
    if (action === 'status') {
      // Check current database status
      const [vehicles, customers, docs] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM vehicles`,
        sql`SELECT COUNT(*) as count FROM customers`,
        sql`SELECT COUNT(*) as count FROM customer_documents`
      ])
      
      return NextResponse.json({
        success: true,
        message: "Emergency import system ready",
        currentStatus: {
          vehicles: vehicles[0].count,
          customers: customers[0].count,
          documents: docs[0].count
        },
        timestamp: new Date().toISOString()
      })
    }
    
    if (action === 'import-all') {
      console.log("[EMERGENCY-IMPORT] 🚀 Starting full import...")
      
      const dataDir = '/Users/adamrutstein/v0dashboard-2/data'
      const results = {}
      let totalProcessed = 0
      
      // Check if data directory exists
      if (!fs.existsSync(dataDir)) {
        throw new Error(`Data directory not found: ${dataDir}`)
      }
      
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
      console.log(`[EMERGENCY-IMPORT] Found ${files.length} CSV files`)
      
      // Process each file
      for (const filename of files) {
        const filePath = path.join(dataDir, filename)
        console.log(`[EMERGENCY-IMPORT] Processing ${filename}...`)
        
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          const parsed = Papa.parse(content, { 
            header: true, 
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().toLowerCase()
          })
          
          const records = parsed.data.filter(r => 
            Object.keys(r).some(key => r[key] && r[key].toString().trim())
          )
          
          let processed = 0
          
          if (filename.toLowerCase().includes('lineitem')) {
            processed = await processLineItems(sql, records)
          } else if (filename.toLowerCase().includes('receipt')) {
            processed = await processReceipts(sql, records)
          } else if (filename.toLowerCase().includes('stock')) {
            processed = await processStock(sql, records)
          } else if (filename.toLowerCase().includes('reminder')) {
            processed = await processReminders(sql, records)
          } else {
            console.log(`[EMERGENCY-IMPORT] Skipping unknown file: ${filename}`)
            processed = 0
          }
          
          results[filename] = processed
          totalProcessed += processed
          
        } catch (error) {
          console.log(`[EMERGENCY-IMPORT] Error processing ${filename}:`, error.message)
          results[filename] = 0
        }
      }
      
      // Final verification
      const [finalVehicles, finalCustomers, finalDocs] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM vehicles`,
        sql`SELECT COUNT(*) as count FROM customers`,
        sql`SELECT COUNT(*) as count FROM customer_documents`
      ])
      
      return NextResponse.json({
        success: true,
        message: "Emergency import completed!",
        results: {
          filesProcessed: Object.keys(results).length,
          totalRecordsProcessed: totalProcessed,
          fileResults: results,
          finalCounts: {
            vehicles: finalVehicles[0].count,
            customers: finalCustomers[0].count,
            documents: finalDocs[0].count
          }
        },
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      success: false,
      error: "Unknown action",
      availableActions: ['status', 'import-all']
    }, { status: 400 })
    
  } catch (error) {
    console.error("[EMERGENCY-IMPORT] Error:", error)
    
    return NextResponse.json({
      success: false,
      error: "Emergency import failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function processLineItems(sql: any, records: any[]) {
  console.log(`[EMERGENCY-IMPORT] Processing ${records.length} line items...`)
  let processed = 0
  
  for (const record of records) {
    try {
      const id = record._id || record.id
      const docId = record._id_document || record.document_id
      const description = record.description || ''
      const quantity = parseFloat(record.quantity || 1)
      const unitPrice = parseFloat(record.unit_price || 0)
      const total = parseFloat(record.total || 0)
      
      if (id) {
        await sql`
          INSERT INTO document_line_items (id, document_id, description, quantity, unit_price, total, created_at)
          VALUES (${id}, ${docId}, ${description}, ${quantity}, ${unitPrice}, ${total}, NOW())
          ON CONFLICT (id) DO NOTHING
        `
        processed++
      }
    } catch (e) {
      // Skip individual errors
    }
  }
  
  return processed
}

async function processReceipts(sql: any, records: any[]) {
  console.log(`[EMERGENCY-IMPORT] Processing ${records.length} receipts...`)
  // Implement receipt processing based on your schema
  return 0
}

async function processStock(sql: any, records: any[]) {
  console.log(`[EMERGENCY-IMPORT] Processing ${records.length} stock items...`)
  // Implement stock processing based on your schema
  return 0
}

async function processReminders(sql: any, records: any[]) {
  console.log(`[EMERGENCY-IMPORT] Processing ${records.length} reminders...`)
  // Implement reminder processing based on your schema
  return 0
}
