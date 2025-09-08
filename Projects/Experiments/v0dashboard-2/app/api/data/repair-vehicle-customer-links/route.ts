import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Helper to normalize registrations consistently
const norm = (s: string | null) => (s || '').toUpperCase().replace(/\s/g, '')

export async function GET() {
  try {
    // 1) Identify customers with unusually high vehicle counts
    const highCounts = await sql`
      SELECT c.id as customer_id, c.first_name, c.last_name,
             COUNT(DISTINCT v.registration) AS vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.customer_id
      GROUP BY c.id, c.first_name, c.last_name
      HAVING COUNT(DISTINCT v.registration) > 10
      ORDER BY vehicle_count DESC
      LIMIT 50
    `

    // 2) For those customers, collect a small sample of their vehicles
    const sampleVehicles = await sql`
      WITH high AS (
        SELECT c.id as customer_id
        FROM customers c
        JOIN vehicles v ON c.id = v.customer_id
        GROUP BY c.id
        HAVING COUNT(DISTINCT v.registration) > 10
        ORDER BY COUNT(DISTINCT v.registration) DESC
        LIMIT 50
      )
      SELECT v.customer_id, v.registration, v.make, v.model
      FROM vehicles v
      JOIN high h ON v.customer_id = h.customer_id
      ORDER BY v.owner_id, v.registration
      LIMIT 150
    `

    // 3) Build suggested mapping from customer_documents majority vote
    //    For each registration, pick the customer_id with the highest doc count (tie-break by most recent date)
    const proposed = await sql`
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
      SELECT 
        v.registration,
        v.customer_id AS current_owner_id,
        r.customer_id AS suggested_owner_id,
        r.cnt AS evidence_count,
        COALESCE(r.next_cnt, 0) AS next_best_count
      FROM vehicles v
      JOIN ranked r
        ON UPPER(REPLACE(v.registration, ' ', '')) = r.reg_norm
      WHERE r.rnk = 1
      AND (v.customer_id IS DISTINCT FROM r.customer_id)
      ORDER BY r.cnt DESC
      LIMIT 500
    `

    return NextResponse.json({
      success: true,
      summary: {
        high_customer_counts: highCounts,
        sample_vehicles: sampleVehicles,
        proposed_corrections: proposed.slice(0, 50), // trim payload
        proposed_total: proposed.length
      },
      message: "Analyze proposed corrections. POST with apply=true to write updates (recommend reviewing first).",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("❌ [REPAIR-LINKS][GET] Error:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const apply = (searchParams.get('apply') || 'false').toLowerCase() === 'true'
    const minEvidence = parseInt(searchParams.get('minEvidence') || '2', 10)
    const dominanceRatio = parseFloat(searchParams.get('dominanceRatio') || '1.5') // suggested > next_best * ratio

    // Compute corrections with evidence and dominance filtering
    const candidates = await sql`
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
      ), best AS (
        SELECT reg_norm, customer_id, cnt, COALESCE(next_cnt, 0) AS next_cnt
        FROM ranked
        WHERE rnk = 1
      )
      SELECT v.registration, v.customer_id AS current_owner_id, b.customer_id AS suggested_owner_id, b.cnt, b.next_cnt
      FROM vehicles v
      JOIN best b ON UPPER(REPLACE(v.registration, ' ', '')) = b.reg_norm
      WHERE (v.customer_id IS DISTINCT FROM b.customer_id)
    `

    // Filter by evidence and dominance
    const toApply = (candidates as any[]).filter(row => {
      const cnt = Number(row.cnt || 0)
      const nextCnt = Number(row.next_cnt || 0)
      const dominant = nextCnt === 0 ? cnt >= minEvidence : cnt >= Math.max(minEvidence, nextCnt * dominanceRatio)
      return dominant
    })

    if (!apply) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        minEvidence,
        dominanceRatio,
        total_candidates: (candidates as any[]).length,
        to_apply_count: toApply.length,
        sample_changes: toApply.slice(0, 50),
        debug_sample_candidates: (candidates as any[]).slice(0, 5)
      })
    }

    // Apply updates in a single query using VALUES
    if (toApply.length === 0) {
      return NextResponse.json({ success: true, applied: 0, message: 'No confident corrections to apply' })
    }

    // 1) Ensure backup table exists
    await sql`CREATE TABLE IF NOT EXISTS vehicles_owner_backup (
      registration TEXT,
      old_owner_id TEXT,
      backup_at TIMESTAMPTZ DEFAULT NOW()
    )`

    // 2) Snapshot current assignments before changes
    for (const item of toApply) {
      try {
        await sql`
          INSERT INTO vehicles_owner_backup (registration, old_owner_id)
          SELECT registration, customer_id
          FROM vehicles
          WHERE registration = ${item.registration}
        `
      } catch (error) {
        console.error(`Failed to backup vehicle ${item.registration}:`, error)
      }
    }

    // 3) Apply updates in batches
    let totalUpdated = 0
    const batchSize = 100

    for (let i = 0; i < toApply.length; i += batchSize) {
      const batch = toApply.slice(i, i + batchSize)

      // Process each item in the batch individually using simple UPDATE statements
      let batchUpdated = 0
      for (const item of batch) {
        try {
          const result = await sql`
            UPDATE vehicles
            SET customer_id = ${item.suggested_owner_id},
                updated_at = NOW()
            WHERE registration = ${item.registration}
          `

          // Check if the update affected any rows
          if (result.count && result.count > 0) {
            batchUpdated++
          }
        } catch (error) {
          console.error(`Failed to update vehicle ${item.registration}:`, error)
        }
      }

      totalUpdated += batchUpdated
      console.log(`Batch ${Math.floor(i/batchSize) + 1}: updated ${batchUpdated} vehicles`)
    }

    return NextResponse.json({
      success: true,
      applied: totalUpdated,
      minEvidence,
      dominanceRatio,
      batches: Math.ceil(toApply.length / batchSize)
    })
  } catch (error) {
    console.error("❌ [REPAIR-LINKS][POST] Error:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

