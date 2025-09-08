import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [MIGRATION] Creating vehicle image cache table...')
    
    // Create the vehicle image cache table with AI support
    await sql`
      CREATE TABLE IF NOT EXISTS vehicle_image_cache (
        id SERIAL PRIMARY KEY,
        vrm VARCHAR(20) NOT NULL UNIQUE,
        image_url TEXT NOT NULL,
        source VARCHAR(200) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
        is_ai_generated BOOLEAN DEFAULT FALSE
      )
    `

    // Add the new columns if they don't exist (for existing installations)
    await sql`
      ALTER TABLE vehicle_image_cache
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
      ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE
    `

    // Update source column size if needed
    await sql`
      ALTER TABLE vehicle_image_cache
      ALTER COLUMN source TYPE VARCHAR(200)
    `
    
    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicle_image_cache_vrm 
      ON vehicle_image_cache(vrm)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicle_image_cache_created_at
      ON vehicle_image_cache(created_at)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicle_image_cache_expires_at
      ON vehicle_image_cache(expires_at)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicle_image_cache_ai_generated
      ON vehicle_image_cache(is_ai_generated)
    `
    
    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_vehicle_image_cache_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    
    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_vehicle_image_cache_updated_at 
      ON vehicle_image_cache
    `
    
    await sql`
      CREATE TRIGGER trigger_update_vehicle_image_cache_updated_at
        BEFORE UPDATE ON vehicle_image_cache
        FOR EACH ROW
        EXECUTE FUNCTION update_vehicle_image_cache_updated_at()
    `
    
    console.log('✅ [MIGRATION] Vehicle image cache table created successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Vehicle image cache table created successfully'
    })
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error creating vehicle image cache table:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint only accepts POST requests'
  }, { status: 405 })
}
