import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vrm, clearAll = false } = body

    if (clearAll) {
      // Clear all cached images
      await sql`DELETE FROM vehicle_image_cache`
      console.log('🗑️ [CACHE-CLEAR] Cleared all vehicle image cache')
      
      return NextResponse.json({
        success: true,
        message: 'All vehicle image cache cleared'
      })
    } else if (vrm) {
      // Clear cache for specific VRM
      const result = await sql`
        DELETE FROM vehicle_image_cache 
        WHERE vrm = ${vrm.toUpperCase()}
      `
      
      console.log(`🗑️ [CACHE-CLEAR] Cleared cache for ${vrm}`)
      
      return NextResponse.json({
        success: true,
        message: `Cache cleared for ${vrm}`,
        deletedRows: result.count
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either vrm or clearAll=true is required'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ [CACHE-CLEAR] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get cache statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_cached,
        COUNT(CASE WHEN source LIKE '%Placeholder%' THEN 1 END) as placeholder_count,
        COUNT(CASE WHEN source LIKE '%AI%' THEN 1 END) as ai_count,
        COUNT(CASE WHEN source LIKE '%HaynesPro%' THEN 1 END) as haynes_count,
        COUNT(CASE WHEN source LIKE '%SWS%' THEN 1 END) as sws_count,
        COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_count
      FROM vehicle_image_cache
    `

    const recentCache = await sql`
      SELECT vrm, source, cached_at, expires_at
      FROM vehicle_image_cache
      ORDER BY cached_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      stats: stats[0],
      recentCache
    })

  } catch (error) {
    console.error('❌ [CACHE-STATS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
