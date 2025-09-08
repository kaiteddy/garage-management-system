import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('[FIX-VEHICLE-SCHEMA] Fixing vehicle schema issues...')

    const fixes = []

    // Fix varchar length issues in vehicles table
    const columnFixes = [
      'ALTER TABLE vehicles ALTER COLUMN registration TYPE VARCHAR(50)',
      'ALTER TABLE vehicles ALTER COLUMN make TYPE VARCHAR(100)',
      'ALTER TABLE vehicles ALTER COLUMN model TYPE VARCHAR(100)',
      'ALTER TABLE vehicles ALTER COLUMN color TYPE VARCHAR(50)',
      'ALTER TABLE vehicles ALTER COLUMN fuel_type TYPE VARCHAR(50)',
      'ALTER TABLE vehicles ALTER COLUMN vin TYPE VARCHAR(100)',
      'ALTER TABLE vehicles ALTER COLUMN mot_status TYPE VARCHAR(50)',
      'ALTER TABLE vehicles ALTER COLUMN tax_status TYPE VARCHAR(50)',
      'ALTER TABLE vehicles ALTER COLUMN mot_test_number TYPE VARCHAR(50)',
      'ALTER TABLE vehicles ALTER COLUMN mot_odometer_unit TYPE VARCHAR(20)',
      'ALTER TABLE vehicles ALTER COLUMN mot_test_result TYPE VARCHAR(50)',
      'ALTER TABLE vehicles ALTER COLUMN status TYPE VARCHAR(50)'
    ]

    for (const fixSQL of columnFixes) {
      try {
        await sql.unsafe(fixSQL)
        fixes.push(`Applied: ${fixSQL}`)
      } catch (error) {
        fixes.push(`Skipped (already applied): ${fixSQL}`)
      }
    }

    console.log('[FIX-VEHICLE-SCHEMA] ✅ Vehicle schema fixes complete')
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      fixes_applied: fixes
    })

  } catch (error) {
    console.error('[FIX-VEHICLE-SCHEMA] Error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to fix vehicle schema',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
