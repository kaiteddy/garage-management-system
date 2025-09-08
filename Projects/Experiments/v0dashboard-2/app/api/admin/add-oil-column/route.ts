import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding oil_data column to vehicles table...')
    
    // Add oil_data column if it doesn't exist
    await sql`
      DO $$
      BEGIN
          -- Add oil_data column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'vehicles' AND column_name = 'oil_data') THEN
              ALTER TABLE vehicles ADD COLUMN oil_data JSONB;
              RAISE NOTICE 'Added oil_data column to vehicles table';
          ELSE
              RAISE NOTICE 'oil_data column already exists in vehicles table';
          END IF;
      END $$;
    `
    
    // Create index on oil_data for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vehicles_oil_data ON vehicles USING GIN (oil_data);
    `
    
    console.log('✅ Successfully added oil_data column and index to vehicles table')
    
    return NextResponse.json({
      success: true,
      message: "Successfully added oil_data column to vehicles table"
    })
    
  } catch (error) {
    console.error('❌ Error adding oil_data column:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add oil_data column",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
