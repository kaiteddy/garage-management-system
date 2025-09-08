import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// AI Configuration
const AI_CONFIG = {
  dailyLimit: parseInt(process.env.AI_IMAGE_DAILY_LIMIT || '50'),
  monthlyLimit: parseInt(process.env.AI_IMAGE_MONTHLY_LIMIT || '1000'),
  enabled: process.env.AI_IMAGE_GENERATION_ENABLED === 'true'
}

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)
    
    // Get daily usage
    const dailyUsage = await sql`
      SELECT COUNT(*) as count 
      FROM vehicle_image_cache 
      WHERE source LIKE '%AI Generated%' 
      AND DATE(created_at) = ${today}
    `
    
    // Get monthly usage
    const monthlyUsage = await sql`
      SELECT COUNT(*) as count 
      FROM vehicle_image_cache 
      WHERE source LIKE '%AI Generated%' 
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `
    
    // Get total AI images generated
    const totalAiImages = await sql`
      SELECT COUNT(*) as count 
      FROM vehicle_image_cache 
      WHERE source LIKE '%AI Generated%'
    `
    
    // Get recent AI generations
    const recentGenerations = await sql`
      SELECT vrm, source, created_at 
      FROM vehicle_image_cache 
      WHERE source LIKE '%AI Generated%' 
      ORDER BY created_at DESC 
      LIMIT 10
    `
    
    // Get cache statistics
    const cacheStats = await sql`
      SELECT 
        COUNT(*) as total_cached_images,
        COUNT(CASE WHEN source LIKE '%AI Generated%' THEN 1 END) as ai_generated_count,
        COUNT(CASE WHEN source LIKE '%HaynesPro%' THEN 1 END) as haynespro_count,
        COUNT(CASE WHEN source LIKE '%Placeholder%' THEN 1 END) as placeholder_count,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_cache_count,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_cache_count
      FROM vehicle_image_cache
    `
    
    // Calculate usage percentages
    const dailyUsageCount = parseInt(dailyUsage[0].count)
    const monthlyUsageCount = parseInt(monthlyUsage[0].count)
    const dailyPercentage = (dailyUsageCount / AI_CONFIG.dailyLimit) * 100
    const monthlyPercentage = (monthlyUsageCount / AI_CONFIG.monthlyLimit) * 100
    
    return NextResponse.json({
      success: true,
      config: {
        enabled: AI_CONFIG.enabled,
        dailyLimit: AI_CONFIG.dailyLimit,
        monthlyLimit: AI_CONFIG.monthlyLimit,
        hasApiKey: !!process.env.OPENAI_API_KEY
      },
      usage: {
        today: {
          count: dailyUsageCount,
          limit: AI_CONFIG.dailyLimit,
          percentage: Math.round(dailyPercentage),
          remaining: AI_CONFIG.dailyLimit - dailyUsageCount
        },
        thisMonth: {
          count: monthlyUsageCount,
          limit: AI_CONFIG.monthlyLimit,
          percentage: Math.round(monthlyPercentage),
          remaining: AI_CONFIG.monthlyLimit - monthlyUsageCount
        },
        total: parseInt(totalAiImages[0].count)
      },
      cache: {
        totalImages: parseInt(cacheStats[0].total_cached_images),
        aiGenerated: parseInt(cacheStats[0].ai_generated_count),
        haynesPro: parseInt(cacheStats[0].haynespro_count),
        placeholders: parseInt(cacheStats[0].placeholder_count),
        activeCache: parseInt(cacheStats[0].active_cache_count),
        expiredCache: parseInt(cacheStats[0].expired_cache_count)
      },
      recentGenerations: recentGenerations.map(gen => ({
        vrm: gen.vrm,
        source: gen.source,
        createdAt: gen.created_at,
        timeAgo: getTimeAgo(new Date(gen.created_at))
      }))
    })
    
  } catch (error) {
    console.error('❌ [AI-STATS] Error getting AI image statistics:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return `${diffDays} days ago`
}

export async function POST() {
  return NextResponse.json({
    error: 'This endpoint only accepts GET requests'
  }, { status: 405 })
}
