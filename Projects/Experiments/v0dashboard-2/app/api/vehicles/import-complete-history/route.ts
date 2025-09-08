import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    console.log('[VEHICLE-IMPORT] Starting vehicle import...')

    // Read the vehicle CSV file
    const csvPath = path.join(process.cwd(), 'data', 'vehicles.csv')
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Vehicle CSV file not found' 
      }, { status: 404 })
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true })
    
    console.log(`[VEHICLE-IMPORT] Parsed ${parsed.data.length} vehicle records`)

    let imported = 0
    let skipped = 0

    // Import vehicles in batches
    const batchSize = 100
    for (let i = 0; i < parsed.data.length; i += batchSize) {
      const batch = parsed.data.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          // Parse dates
          const motExpiryDate = record.MOTExpiry && record.MOTExpiry !== '' ? 
            new Date(record.MOTExpiry).toISOString().split('T')[0] : null
          const taxDueDate = record.TaxDue && record.TaxDue !== '' ? 
            new Date(record.TaxDue).toISOString().split('T')[0] : null

          await sql`
            INSERT INTO vehicles (
              registration, make, model, year, color, fuel_type,
              engine_size, vin, mot_status, mot_expiry_date,
              tax_status, tax_due_date, customer_id, created_at, updated_at
            ) VALUES (
              ${record.Registration?.trim()},
              ${record.Make?.trim() || null},
              ${record.Model?.trim() || null},
              ${record.Year ? parseInt(record.Year) : null},
              ${record.Colour?.trim() || null},
              ${record.FuelType?.trim() || null},
              ${record.EngineSize ? parseFloat(record.EngineSize) : null},
              ${record.VIN?.trim() || null},
              ${record.MOTStatus?.trim() || null},
              ${motExpiryDate},
              ${record.TaxStatus?.trim() || null},
              ${taxDueDate},
              ${record._ID_Customer?.trim() || null},
              NOW(),
              NOW()
            )
            ON CONFLICT (registration) DO UPDATE SET
              customer_id = EXCLUDED.customer_id,
              updated_at = NOW()
          `
          imported++
        } catch (error) {
          console.error(`[VEHICLE-IMPORT] Error importing vehicle ${record.Registration}:`, error)
          skipped++
        }
      }

      if (i % 1000 === 0) {
        console.log(`[VEHICLE-IMPORT] Processed ${i + batch.length}/${parsed.data.length} vehicles`)
      }
    }

    console.log('[VEHICLE-IMPORT] ✅ Vehicle import complete')
    
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
    console.error('[VEHICLE-IMPORT] Critical error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to import vehicles',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
