import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting vehicle schema migration...')

    // Add missing columns to vehicles table
    const migrations = [
      {
        name: 'Add derivative column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS derivative VARCHAR(255)`
      },
      {
        name: 'Add transmission column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission VARCHAR(100)`
      },
      {
        name: 'Add body_type column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS body_type VARCHAR(100)`
      },
      {
        name: 'Add doors column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS doors INTEGER`
      },
      {
        name: 'Add seats column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seats INTEGER`
      },
      {
        name: 'Add co2_emissions column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS co2_emissions INTEGER`
      },
      {
        name: 'Add euro_status column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS euro_status VARCHAR(50)`
      },
      {
        name: 'Add engine_size column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_size VARCHAR(50)`
      },
      {
        name: 'Add year column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year INTEGER`
      },
      {
        name: 'Add specification_source column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS specification_source VARCHAR(100)`
      },
      {
        name: 'Add specification_updated_at column',
        query: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS specification_updated_at TIMESTAMP`
      }
    ]

    const results = []

    for (const migration of migrations) {
      try {
        console.log(`🔧 Running: ${migration.name}`)
        await sql.unsafe(migration.query)
        results.push({ name: migration.name, status: 'success' })
        console.log(`✅ Completed: ${migration.name}`)
      } catch (error) {
        console.log(`⚠️ ${migration.name}: ${error}`)
        results.push({ 
          name: migration.name, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Create indexes for better performance
    const indexes = [
      {
        name: 'Create index on derivative',
        query: `CREATE INDEX IF NOT EXISTS idx_vehicles_derivative ON vehicles(derivative)`
      },
      {
        name: 'Create index on make_model',
        query: `CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model)`
      },
      {
        name: 'Create index on specification_updated_at',
        query: `CREATE INDEX IF NOT EXISTS idx_vehicles_spec_updated ON vehicles(specification_updated_at)`
      }
    ]

    for (const index of indexes) {
      try {
        console.log(`🔧 Creating: ${index.name}`)
        await sql.unsafe(index.query)
        results.push({ name: index.name, status: 'success' })
        console.log(`✅ Created: ${index.name}`)
      } catch (error) {
        console.log(`⚠️ ${index.name}: ${error}`)
        results.push({ 
          name: index.name, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    console.log('✅ Vehicle schema migration completed')

    return NextResponse.json({
      success: true,
      message: 'Vehicle schema migration completed',
      results
    })

  } catch (error) {
    console.error('❌ Vehicle schema migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Vehicle schema migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check current schema
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking vehicle table schema...')

    // Get table information
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      ORDER BY ordinal_position
    `

    // Get indexes
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'vehicles'
      ORDER BY indexname
    `

    return NextResponse.json({
      success: true,
      schema: {
        columns: tableInfo,
        indexes: indexes
      }
    })

  } catch (error) {
    console.error('❌ Error checking schema:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
