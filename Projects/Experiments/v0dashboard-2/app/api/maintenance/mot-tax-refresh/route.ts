import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { lookupVehicle } from "@/lib/dvla-api"

/**
 * BACKGROUND MAINTENANCE ENDPOINT - Automatically enriches vehicles with MOT/TAX data
 *
 * This runs automatically in the background via:
 * - Vercel Cron: Nightly at 2 AM (configured in vercel.json)
 * - Auto-triggers when vehicles have missing MOT/TAX data
 * - No frontend UI needed - fully automated
 *
 * GET  /api/maintenance/mot-tax-refresh
 *   - Intended for Vercel Cron (nightly): processes vehicles near due or with missing MOT/TAX
 *   - Query params (optional):
 *       limit: number (default 50)
 *       nearDueDays: number (default 30)
 *       dvsa: 'true' | 'false' (default 'false') - whether to also import exact MOT history from DVSA
 *
 * POST /api/maintenance/mot-tax-refresh
 *   - Internal API for programmatic triggers
 *   - JSON body { registrations?: string[], limit?, nearDueDays?, dvsa? }
 *   - If registrations provided, only those are processed
 */

function getBaseUrl() {
  // Prefer a stable configured base URL to avoid webhook/config drift
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  return envUrl || 'http://localhost:3000'
}

async function fetchDVSAExactHistory(registration: string) {
  const baseUrl = getBaseUrl()
  try {
    const res = await fetch(`${baseUrl}/api/vehicles/${encodeURIComponent(registration)}/fetch-exact-mot-history`, {
      method: 'POST'
    })
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
    const json = await res.json()
    return json
  } catch (e: any) {
    return { success: false, error: e?.message || 'Unknown DVSA import error' }
  }
}

async function listTargets({ limit, nearDueDays }: { limit: number; nearDueDays: number }) {
  // Vehicles missing MOT/TAX or near due (or expired)
  const result = await sql`
    SELECT registration, mot_status, mot_expiry_date, tax_status, tax_due_date
    FROM vehicles
    WHERE (
      mot_status IS NULL OR LOWER(mot_status) = 'unknown' OR mot_expiry_date IS NULL
      OR tax_status IS NULL OR tax_due_date IS NULL
    )
    OR (
      mot_expiry_date IS NOT NULL AND mot_expiry_date <= (CURRENT_DATE + ${nearDueDays}::int)
    )
    ORDER BY COALESCE(mot_expiry_date, '1900-01-01') ASC
    LIMIT ${limit}
  `
  return result as Array<{ registration: string, mot_status?: string, mot_expiry_date?: string, tax_status?: string, tax_due_date?: string }>
}

async function processOne(reg: string, opts: { dvsa: boolean }) {
  const cleanReg = reg.toUpperCase().replace(/\s/g, '')
  const updates: Record<string, any> = {}
  const actions: string[] = []
  let dvlaSuccess = false
  let dvsaImported = false

  // 1) DVLA enrichment (preferred cheap call)
  try {
    const dvla = await lookupVehicle(cleanReg)
    console.log(`[MAINTENANCE] DVLA data for ${cleanReg}:`, dvla)
    if (dvla) {
      updates.mot_status = dvla.motStatus ?? null
      updates.mot_expiry_date = dvla.motExpiryDate ?? null
      updates.tax_status = dvla.taxStatus ?? null
      updates.tax_due_date = dvla.taxDueDate ?? null
      actions.push('dvla')
      dvlaSuccess = true

      console.log(`[MAINTENANCE] Updating ${cleanReg} with:`, updates)

      // First try to update existing vehicle
      const updateResult = await sql`
        UPDATE vehicles
        SET
          mot_status = ${updates.mot_status},
          mot_expiry_date = ${updates.mot_expiry_date},
          tax_status = ${updates.tax_status},
          tax_due_date = ${updates.tax_due_date},
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
      `

      console.log(`[MAINTENANCE] Update result for ${cleanReg}:`, updateResult)

      // If no rows were updated, create the vehicle record
      if (updateResult.length === 0) {
        console.log(`[MAINTENANCE] Vehicle ${cleanReg} not found, creating new record`)
        const insertResult = await sql`
          INSERT INTO vehicles (
            registration, make, model, year, color, fuel_type, engine_size,
            mot_status, mot_expiry_date, tax_status, tax_due_date,
            created_at, updated_at
          ) VALUES (
            ${cleanReg}, ${dvla.make}, ${dvla.model || null}, ${dvla.yearOfManufacture || null},
            ${dvla.colour || null}, ${dvla.fuelType || null}, ${dvla.engineCapacity || null},
            ${updates.mot_status}, ${updates.mot_expiry_date},
            ${updates.tax_status}, ${updates.tax_due_date},
            NOW(), NOW()
          )
          ON CONFLICT (registration) DO UPDATE SET
            mot_status = EXCLUDED.mot_status,
            mot_expiry_date = EXCLUDED.mot_expiry_date,
            tax_status = EXCLUDED.tax_status,
            tax_due_date = EXCLUDED.tax_due_date,
            updated_at = NOW()
        `
        console.log(`[MAINTENANCE] Insert result for ${cleanReg}:`, insertResult)
      }
    }
  } catch (e) {
    console.error(`[MAINTENANCE] DVLA lookup failed for ${cleanReg}:`, e)
    // Swallow and continue to DVSA if requested
  }

  // 2) Optional DVSA exact history import (writes mot_history and refreshes MOT fields)
  if (opts.dvsa) {
    const dvsaRes = await fetchDVSAExactHistory(cleanReg)
    if (dvsaRes?.success) {
      dvsaImported = true
      actions.push('dvsa_import')
    }
  }

  return { registration: cleanReg, actions, dvlaSuccess, dvsaImported }
}

import Bottleneck from "bottleneck"

const limiter = new Bottleneck({
  minTime: 250, // at most ~4 calls/second
  maxConcurrent: 2 // only a couple in flight at once
})

async function processBatch(registrations: string[], opts: { dvsa: boolean }) {
  const results: any[] = []
  for (const reg of registrations) {
    const r = await limiter.schedule(() => processOne(reg, opts))
    results.push(r)
  }
  return results
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit')) || 50))
    const nearDueDays = Math.max(0, Math.min(90, Number(searchParams.get('nearDueDays')) || 30))
    const dvsa = (searchParams.get('dvsa') || 'false').toLowerCase() === 'true'

    const targets = await listTargets({ limit, nearDueDays })

    if (targets.length === 0) {
      return NextResponse.json({ success: true, message: 'No vehicles require MOT/TAX refresh', count: 0 })
    }

    const regs = targets.map(t => t.registration)
    const results = await processBatch(regs, { dvsa })

    const summary = {
      processed: results.length,
      dvla_ok: results.filter(r => r.dvlaSuccess).length,
      dvsa_imports: results.filter(r => r.dvsaImported).length,
    }

    return NextResponse.json({ success: true, summary, results })
  } catch (error) {
    console.error('[MAINTENANCE] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to run MOT/TAX refresh' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { registrations, limit = 100, nearDueDays = 30, dvsa = false } = body || {}

    let regs: string[]
    if (Array.isArray(registrations) && registrations.length > 0) {
      regs = registrations
    } else {
      const targets = await listTargets({ limit: Math.max(1, Math.min(500, Number(limit))), nearDueDays: Math.max(0, Math.min(120, Number(nearDueDays))) })
      regs = targets.map(t => t.registration)
    }

    if (regs.length === 0) {
      return NextResponse.json({ success: true, message: 'No vehicles to process', count: 0 })
    }

    const results = await processBatch(regs, { dvsa: Boolean(dvsa) })

    const summary = {
      processed: results.length,
      dvla_ok: results.filter((r: any) => r.dvlaSuccess).length,
      dvsa_imports: results.filter((r: any) => r.dvsaImported).length,
    }

    return NextResponse.json({ success: true, summary, results })
  } catch (error) {
    console.error('[MAINTENANCE] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to run MOT/TAX refresh' }, { status: 500 })
  }
}

