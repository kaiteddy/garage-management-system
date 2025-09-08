import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const documentId = searchParams.get('document_id');

    // Simplified query without document joins for now
    let lineItems;

    if (search) {
      lineItems = await sql`
        SELECT *
        FROM line_items
        WHERE description ILIKE ${`%${search}%`}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      lineItems = await sql`
        SELECT *
        FROM line_items
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count for pagination
    let countResult;

    if (search) {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM line_items
        WHERE description ILIKE ${`%${search}%`}
      `;
    } else {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM line_items
      `;
    }
    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      success: true,
      data: lineItems,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Line items API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch line items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      document_id,
      stock_id,
      description,
      quantity,
      unit_price,
      tax_rate,
      tax_amount,
      total_amount,
      line_type
    } = body;

    const result = await sql`
      INSERT INTO line_items (
        document_id, stock_id, description, quantity,
        unit_price, tax_rate, tax_amount, total_amount, line_type,
        created_at
      ) VALUES (
        ${document_id}, ${stock_id}, ${description}, ${quantity},
        ${unit_price}, ${tax_rate}, ${tax_amount}, ${total_amount}, ${line_type},
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('Create line item error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create line item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
