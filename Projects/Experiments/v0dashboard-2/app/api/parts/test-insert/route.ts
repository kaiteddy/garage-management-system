import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Testing parts insertion...');

    // First, check if parts table exists
    const tableCheck = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'parts'
    `);

    if (!tableCheck.rows || tableCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Parts table does not exist'
      });
    }

    // Clear existing test data
    await sql.query("DELETE FROM parts WHERE created_by = 'test-insert'");

    // Insert a test part
    const insertResult = await sql.query(`
      INSERT INTO parts (
        part_number, description, category, subcategory,
        cost_net, price_retail_net, quantity_in_stock,
        supplier_name, manufacturer, is_active, created_by
      ) VALUES (
        'TEST-001', 'Test Brake Pads', 'Brakes', 'Brake Pads',
        30.00, 55.99, 5,
        'Test Supplier', 'Test Manufacturer', true, 'test-insert'
      ) RETURNING *
    `);

    // Check if insertion was successful
    const selectResult = await sql.query("SELECT * FROM parts WHERE created_by = 'test-insert'");

    // Get total count
    const countResult = await sql.query('SELECT COUNT(*) as total FROM parts');
    const totalParts = countResult.rows?.[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        table_exists: true,
        insert_result: insertResult.rows?.[0] || null,
        test_parts: selectResult.rows || [],
        total_parts_count: parseInt(totalParts)
      }
    });

  } catch (error) {
    console.error('❌ Test insertion failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test insertion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
