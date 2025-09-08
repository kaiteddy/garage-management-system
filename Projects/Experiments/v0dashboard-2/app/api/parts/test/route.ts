import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing parts database...');

    // Check if parts table exists
    const tableCheck = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'parts'
    `);

    if (!tableCheck.rows || tableCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Parts table does not exist',
        suggestion: 'Run the migration first: POST /api/parts/migrate'
      });
    }

    // Check parts count
    const countResult = await sql.query('SELECT COUNT(*) as total FROM parts');
    const totalParts = countResult.rows?.[0]?.total || 0;

    // Get sample parts
    const partsResult = await sql.query('SELECT * FROM parts LIMIT 5');
    const parts = partsResult.rows || [];

    // Check suppliers count
    const suppliersCountResult = await sql.query('SELECT COUNT(*) as total FROM parts_suppliers');
    const totalSuppliers = suppliersCountResult.rows?.[0]?.total || 0;

    // Get sample suppliers
    const suppliersResult = await sql.query('SELECT * FROM parts_suppliers LIMIT 5');
    const suppliers = suppliersResult.rows || [];

    return NextResponse.json({
      success: true,
      data: {
        tables_exist: true,
        parts: {
          count: parseInt(totalParts),
          sample: parts
        },
        suppliers: {
          count: parseInt(totalSuppliers),
          sample: suppliers
        }
      }
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
