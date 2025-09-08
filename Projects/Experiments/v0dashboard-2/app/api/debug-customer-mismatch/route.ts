import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../../../lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    // Check if the suggested changes are actually needed
    const testReg = '1431NE'
    
    // Get the current vehicle customer_id
    const vehicle = await sql`
      SELECT registration, customer_id 
      FROM vehicles 
      WHERE registration = ${testReg}
    `
    
    // Get the suggested customer_id from the repair logic
    const suggested = await sql`
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
      )
      SELECT customer_id as suggested_customer_id, cnt, next_cnt
      FROM ranked
      WHERE reg_norm = ${testReg.toUpperCase().replace(/\s/g, '')}
      AND rnk = 1
    `
    
    // Check if they're different
    const currentCustomerId = vehicle[0]?.customer_id
    const suggestedCustomerId = suggested[0]?.suggested_customer_id
    
    return NextResponse.json({
      registration: testReg,
      current_customer_id: currentCustomerId,
      suggested_customer_id: suggestedCustomerId,
      are_different: currentCustomerId !== suggestedCustomerId,
      vehicle_data: vehicle[0],
      suggestion_data: suggested[0]
    })
    
  } catch (error) {
    console.error('Debug customer mismatch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
