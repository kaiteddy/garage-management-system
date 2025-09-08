import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../../../lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    // Find vehicles where the current customer_id doesn't match the most frequent customer_id in documents
    const mismatches = await sql`
      WITH docs_norm AS (
        SELECT 
          UPPER(REPLACE(vehicle_registration, ' ', '')) AS reg_norm,
          customer_id,
          COUNT(*) AS cnt,
          MAX(document_date) AS last_date
        FROM customer_documents
        WHERE vehicle_registration IS NOT NULL AND customer_id IS NOT NULL
        GROUP BY reg_norm, customer_id
      ), ranked AS (
        SELECT *,
          RANK() OVER (PARTITION BY reg_norm ORDER BY cnt DESC, last_date DESC) AS rnk,
          LEAD(cnt) OVER (PARTITION BY reg_norm ORDER BY cnt DESC, last_date DESC) AS next_cnt
        FROM docs_norm
      ), suggested AS (
        SELECT 
          reg_norm,
          customer_id as suggested_customer_id,
          cnt,
          COALESCE(next_cnt, 0) as next_cnt
        FROM ranked
        WHERE rnk = 1
        AND cnt >= 2
        AND (next_cnt IS NULL OR cnt::float / next_cnt >= 1.5)
      )
      SELECT 
        v.registration,
        v.customer_id as current_customer_id,
        s.suggested_customer_id,
        s.cnt as evidence_count,
        s.next_cnt
      FROM vehicles v
      JOIN suggested s ON v.registration = s.reg_norm
      WHERE v.customer_id != s.suggested_customer_id
      LIMIT 10
    `
    
    return NextResponse.json({
      actual_mismatches: mismatches,
      count: mismatches.length,
      message: 'These are vehicles that currently have incorrect customer_id values'
    })
    
  } catch (error) {
    console.error('Check actual mismatches error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
