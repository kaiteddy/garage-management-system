import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log('[FIX-VEHICLES] Starting vehicles table fix...');
    
    // Check if id column exists
    const idColumnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'id'
    `;
    
    if (idColumnExists.length === 0) {
      console.log('[FIX-VEHICLES] Adding id column to vehicles table...');
      
      // Add id column as primary key
      await sql`
        ALTER TABLE vehicles 
        ADD COLUMN id SERIAL PRIMARY KEY
      `;
      
      console.log('[FIX-VEHICLES] Added id column successfully');
    } else {
      console.log('[FIX-VEHICLES] ID column already exists');
    }
    
    // Get updated vehicle count
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    
    // Get sample vehicles to verify the fix
    const sampleVehicles = await sql`
      SELECT id, registration, make, model, created_at
      FROM vehicles 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Vehicles table fixed successfully',
      vehicleCount: parseInt(vehicleCount[0]?.count || '0'),
      sampleVehicles
    });
    
  } catch (error) {
    console.error('[FIX-VEHICLES] Error fixing vehicles table:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fix vehicles table',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
