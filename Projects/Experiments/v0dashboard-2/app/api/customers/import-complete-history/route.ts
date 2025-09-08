import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    console.log('[CUSTOMER-IMPORT] Starting customer import...')

    // Read the customer CSV file
    const csvPath = path.join(process.cwd(), 'data', 'customers.csv')
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Customer CSV file not found' 
      }, { status: 404 })
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true })
    
    console.log(`[CUSTOMER-IMPORT] Parsed ${parsed.data.length} customer records`)

    let imported = 0
    let skipped = 0

    // Import customers in batches
    const batchSize = 100
    for (let i = 0; i < parsed.data.length; i += batchSize) {
      const batch = parsed.data.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          await sql`
            INSERT INTO customers (
              id, first_name, last_name, email, phone,
              address_line1, address_line2, city, postcode, country,
              created_at, updated_at
            ) VALUES (
              ${record._ID?.trim()},
              ${record.Forename?.trim() || ''},
              ${record.Surname?.trim() || ''},
              ${record.Email?.trim() || ''},
              ${record.Phone?.trim() || null},
              ${record.Address1?.trim() || null},
              ${record.Address2?.trim() || null},
              ${record.City?.trim() || null},
              ${record.Postcode?.trim() || null},
              ${record.Country?.trim() || 'UK'},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO NOTHING
          `
          imported++
        } catch (error) {
          console.error(`[CUSTOMER-IMPORT] Error importing customer ${record._ID}:`, error)
          skipped++
        }
      }

      if (i % 1000 === 0) {
        console.log(`[CUSTOMER-IMPORT] Processed ${i + batch.length}/${parsed.data.length} customers`)
      }
    }

    console.log('[CUSTOMER-IMPORT] ✅ Customer import complete')
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      summary: {
        total_processed: parsed.data.length,
        imported: imported,
        skipped: skipped,
        success_rate: `${((imported / parsed.data.length) * 100).toFixed(2)}%`
      }
    })

  } catch (error) {
    console.error('[CUSTOMER-IMPORT] Critical error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to import customers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
