import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [MIGRATION] Starting enhanced vehicle fields migration...')
    
    // Add engine code field
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS engine_code VARCHAR(20)
    `
    console.log('✅ [MIGRATION] Added engine_code column')
    
    // Add Euro status field  
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS euro_status VARCHAR(20)
    `
    console.log('✅ [MIGRATION] Added euro_status column')
    
    // Add tyre size fields
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS tyre_size_front VARCHAR(50),
      ADD COLUMN IF NOT EXISTS tyre_size_rear VARCHAR(50)
    `
    console.log('✅ [MIGRATION] Added tyre size columns')
    
    // Add tyre pressure fields
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS tyre_pressure_front VARCHAR(20),
      ADD COLUMN IF NOT EXISTS tyre_pressure_rear VARCHAR(20)
    `
    console.log('✅ [MIGRATION] Added tyre pressure columns')
    
    // Add timing belt interval field
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS timing_belt_interval VARCHAR(50)
    `
    console.log('✅ [MIGRATION] Added timing_belt_interval column')
    
    // Add indexes for better query performance
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_engine_code ON vehicles(engine_code)`
      await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_euro_status ON vehicles(euro_status)`
      console.log('✅ [MIGRATION] Added performance indexes')
    } catch (indexError) {
      console.log('⚠️ [MIGRATION] Index creation skipped (may already exist)')
    }
    
    console.log('🎉 [MIGRATION] Enhanced vehicle fields migration completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Enhanced vehicle fields migration completed successfully',
      fieldsAdded: [
        'engine_code',
        'euro_status', 
        'tyre_size_front',
        'tyre_size_rear',
        'tyre_pressure_front',
        'tyre_pressure_rear',
        'timing_belt_interval'
      ],
      indexesAdded: [
        'idx_vehicles_engine_code',
        'idx_vehicles_euro_status'
      ]
    })
    
  } catch (error) {
    console.error('❌ [MIGRATION] Enhanced vehicle fields migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
