import { NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST() {
  try {
    console.log('[DB-MIGRATE] Starting technical data schema migration...')

    // Add technical data columns to vehicles table
    // These store permanent vehicle specifications that don't change over time
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS technical_data JSONB,
      ADD COLUMN IF NOT EXISTS repair_times_data JSONB,
      ADD COLUMN IF NOT EXISTS lubricants_data JSONB,
      ADD COLUMN IF NOT EXISTS ac_gas_type TEXT,
      ADD COLUMN IF NOT EXISTS diagrams_data JSONB,
      ADD COLUMN IF NOT EXISTS sws_last_updated TIMESTAMP,
      ADD COLUMN IF NOT EXISTS vin TEXT
    `

    console.log('[DB-MIGRATE] ✅ Added technical data columns to vehicles table')

    // Create index for faster VRM lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicles_registration_upper 
      ON vehicles (UPPER(REPLACE(registration, ' ', '')))
    `

    // Create index for technical data queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicles_sws_updated 
      ON vehicles (sws_last_updated) 
      WHERE technical_data IS NOT NULL
    `

    console.log('[DB-MIGRATE] ✅ Created indexes for technical data')

    // Check current schema
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name IN (
        'technical_data', 'repair_times_data', 'lubricants_data', 
        'ac_gas_type', 'diagrams_data', 'sws_last_updated', 'vin'
      )
      ORDER BY column_name
    `

    console.log('[DB-MIGRATE] ✅ Schema migration completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Technical data schema migration completed',
      columns_added: columns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DB-MIGRATE] ❌ Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Schema migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
