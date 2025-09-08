import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [MIGRATION] Creating SWS vehicle cache table...')
    
    // Create the SWS vehicle cache table
    await sql`
      CREATE TABLE IF NOT EXISTS sws_vehicle_cache (
        id SERIAL PRIMARY KEY,
        vrm VARCHAR(20) NOT NULL UNIQUE,
        technical_data JSONB NOT NULL,
        image_url TEXT,
        cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_sws_cache_vrm ON sws_vehicle_cache(vrm)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sws_cache_expires ON sws_vehicle_cache(expires_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sws_cache_created ON sws_vehicle_cache(created_at)`
    
    // Create trigger for updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_sws_cache_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    
    await sql`DROP TRIGGER IF EXISTS update_sws_cache_updated_at_trigger ON sws_vehicle_cache`
    await sql`
      CREATE TRIGGER update_sws_cache_updated_at_trigger 
      BEFORE UPDATE ON sws_vehicle_cache 
      FOR EACH ROW EXECUTE FUNCTION update_sws_cache_updated_at()
    `
    
    console.log('✅ [MIGRATION] SWS vehicle cache table created successfully')
    
    return NextResponse.json({
      success: true,
      message: 'SWS vehicle cache database schema created successfully'
    })
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error creating SWS cache schema:', error)
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
