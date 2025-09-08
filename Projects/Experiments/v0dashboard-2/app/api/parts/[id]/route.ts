import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';
import { Part, PartApiResponse } from '@/types/parts';

// Get single part by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partId = params.id;
    console.log(`🔧 [PARTS-API] Getting part by ID: ${partId}`);

    const query = `
      SELECT 
        id, part_number, oem_part_number, description, category, subcategory,
        cost_net, price_retail_net, price_trade_net, margin_percentage,
        quantity_in_stock, minimum_stock_level, location, bin_location,
        supplier_id, supplier_name, supplier_part_number, manufacturer, brand,
        vehicle_makes, vehicle_models, year_from, year_to, engine_codes,
        weight_kg, dimensions_length_mm, dimensions_width_mm, dimensions_height_mm, warranty_months,
        partsouq_id, partsouq_url, partsouq_last_updated, partsouq_price, partsouq_availability,
        notes, tags, is_active, is_hazardous, requires_core_exchange,
        created_at, updated_at, created_by, updated_by
      FROM parts 
      WHERE id = $1
    `;

    const result = await sql.query(query, [partId]);

    if (result.rows.length === 0) {
      const response: PartApiResponse = {
        success: false,
        error: 'Part not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const part = result.rows[0] as Part;
    console.log(`✅ [PARTS-API] Found part: ${part.part_number}`);

    const response: PartApiResponse<Part> = {
      success: true,
      data: part
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [PARTS-API] Error getting part:', error);
    const response: PartApiResponse = {
      success: false,
      error: 'Failed to fetch part'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Update part by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partId = params.id;
    const partData = await request.json();
    
    console.log(`🔧 [PARTS-API] Updating part: ${partId}`);

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Add fields to update
    const updatableFields = [
      'part_number', 'oem_part_number', 'description', 'category', 'subcategory',
      'cost_net', 'price_retail_net', 'price_trade_net', 'margin_percentage',
      'quantity_in_stock', 'minimum_stock_level', 'location', 'bin_location',
      'supplier_id', 'supplier_name', 'supplier_part_number', 'manufacturer', 'brand',
      'vehicle_makes', 'vehicle_models', 'year_from', 'year_to', 'engine_codes',
      'weight_kg', 'dimensions_length_mm', 'dimensions_width_mm', 'dimensions_height_mm', 'warranty_months',
      'partsouq_id', 'partsouq_url', 'partsouq_price', 'partsouq_availability',
      'notes', 'tags', 'is_active', 'is_hazardous', 'requires_core_exchange'
    ];

    for (const field of updatableFields) {
      if (partData.hasOwnProperty(field)) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(partData[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      const response: PartApiResponse = {
        success: false,
        error: 'No fields to update'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Add updated_by and updated_at
    updateFields.push(`updated_by = $${paramIndex}`);
    values.push(partData.updated_by || 'system');
    paramIndex++;

    // Add part ID for WHERE clause
    values.push(partId);

    const updateQuery = `
      UPDATE parts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql.query(updateQuery, values);

    if (result.rows.length === 0) {
      const response: PartApiResponse = {
        success: false,
        error: 'Part not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const updatedPart = result.rows[0] as Part;
    console.log(`✅ [PARTS-API] Updated part: ${updatedPart.part_number}`);

    const response: PartApiResponse<Part> = {
      success: true,
      data: updatedPart,
      message: 'Part updated successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ [PARTS-API] Error updating part:', error);
    
    let errorMessage = 'Failed to update part';
    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'Part number already exists';
    }

    const response: PartApiResponse = {
      success: false,
      error: errorMessage
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Delete part by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partId = params.id;
    console.log(`🔧 [PARTS-API] Deleting part: ${partId}`);

    // Check if part exists and get its details
    const checkQuery = `SELECT part_number FROM parts WHERE id = $1`;
    const checkResult = await sql.query(checkQuery, [partId]);

    if (checkResult.rows.length === 0) {
      const response: PartApiResponse = {
        success: false,
        error: 'Part not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const partNumber = checkResult.rows[0].part_number;

    // Soft delete by setting is_active to false
    const deleteQuery = `
      UPDATE parts 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING part_number
    `;

    const result = await sql.query(deleteQuery, [partId]);
    
    console.log(`✅ [PARTS-API] Deleted part: ${partNumber}`);

    const response: PartApiResponse = {
      success: true,
      message: `Part ${partNumber} deleted successfully`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [PARTS-API] Error deleting part:', error);
    const response: PartApiResponse = {
      success: false,
      error: 'Failed to delete part'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
