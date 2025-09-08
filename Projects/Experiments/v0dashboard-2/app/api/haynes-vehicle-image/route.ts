import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// SWS API configuration using your exact working implementation
const SWS_API_CONFIG = {
  endpoint: "https://www.sws-solutions.co.uk/API-V4/TechnicalData_Query.php",
  basicAuth: process.env.SWS_BASIC_AUTH || "R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc=",
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc=',
    'User-Agent': 'Garage Assistant/4.0'
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  delayBetweenRequests: 2000, // 2 seconds between requests
  maxRetries: 3,
  backoffMultiplier: 2,
  cooldownPeriod: 300000 // 5 minutes cooldown if blocked
}

// In-memory cache for vehicle images (consider moving to Redis in production)
const imageCache = new Map<string, { imageUrl: string, timestamp: number, source: string }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours for HaynesPro images
const AI_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days for AI-generated images

// Database cache management functions
async function getCachedSWSData(vrm: string) {
  try {
    const result = await sql`
      SELECT technical_data, image_url, cached_at, expires_at
      FROM sws_vehicle_cache
      WHERE vrm = ${vrm.toUpperCase()}
      AND expires_at > NOW()
    `

    if (result.length > 0) {
      console.log(`💾 [SWS-CACHE] Database cache hit for ${vrm}`)
      return {
        technicalData: result[0].technical_data,
        imageUrl: result[0].image_url,
        cached: true,
        cachedAt: result[0].cached_at
      }
    }

    console.log(`🔍 [SWS-CACHE] Database cache miss for ${vrm}`)
    return null
  } catch (error) {
    console.error(`❌ [SWS-CACHE] Error checking database cache for ${vrm}:`, error)
    return null
  }
}

async function cacheSWSData(vrm: string, technicalData: any, imageUrl?: string) {
  try {
    await sql`
      INSERT INTO sws_vehicle_cache (
        vrm,
        technical_data,
        image_url,
        cached_at,
        expires_at
      ) VALUES (
        ${vrm.toUpperCase()},
        ${JSON.stringify(technicalData)},
        ${imageUrl || null},
        NOW(),
        NOW() + INTERVAL '7 days'
      )
      ON CONFLICT (vrm) DO UPDATE SET
        technical_data = EXCLUDED.technical_data,
        image_url = EXCLUDED.image_url,
        cached_at = NOW(),
        expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    `
    console.log(`💾 [SWS-CACHE] Cached data in database for ${vrm}`)
  } catch (error) {
    console.error(`❌ [SWS-CACHE] Failed to cache data in database for ${vrm}:`, error)
  }
}

// AI Image Generation Configuration
const AI_CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  dailyLimit: parseInt(process.env.AI_IMAGE_DAILY_LIMIT || '50'),
  monthlyLimit: parseInt(process.env.AI_IMAGE_MONTHLY_LIMIT || '1000'),
  enabled: process.env.AI_IMAGE_GENERATION_ENABLED === 'true'
}

// Rate limiting tracker
let lastApiCall = 0
let consecutiveErrors = 0
let isInCooldown = false
let cooldownUntil = 0

// Function to reset cooldown (for development/testing)
function resetCooldown() {
  isInCooldown = false
  cooldownUntil = 0
  consecutiveErrors = 0
  console.log('🔄 [RATE-LIMIT] Cooldown reset')
}

// Blacklist for VRMs that are known to fail (to prevent repeated attempts)
const failedVrmBlacklist = new Set<string>()

function addToBlacklist(vrm: string) {
  failedVrmBlacklist.add(vrm.toUpperCase().replace(/\s/g, ''))
  console.log(`🚫 [BLACKLIST] Added ${vrm} to failed VRM blacklist`)
}

function isBlacklisted(vrm: string): boolean {
  return failedVrmBlacklist.has(vrm.toUpperCase().replace(/\s/g, ''))
}

// Function to check and enforce rate limiting
async function enforceRateLimit(): Promise<void> {
  const now = Date.now()

  // Check if we're in cooldown period
  if (isInCooldown && now < cooldownUntil) {
    const remainingCooldown = Math.ceil((cooldownUntil - now) / 1000)
    throw new Error(`API in cooldown for ${remainingCooldown} seconds due to consecutive errors`)
  }

  // Reset cooldown if period has passed
  if (isInCooldown && now >= cooldownUntil) {
    isInCooldown = false
    consecutiveErrors = 0
    console.log('🔄 [RATE-LIMIT] Cooldown period ended, resuming API calls')
  }

  // Enforce delay between requests
  const timeSinceLastCall = now - lastApiCall
  if (timeSinceLastCall < RATE_LIMIT.delayBetweenRequests) {
    const waitTime = RATE_LIMIT.delayBetweenRequests - timeSinceLastCall
    console.log(`⏱️ [RATE-LIMIT] Waiting ${waitTime}ms before next API call`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  lastApiCall = Date.now()
}

// Function to handle API errors and implement backoff
function handleApiError(error: any): void {
  consecutiveErrors++
  console.error(`❌ [API-ERROR] Error #${consecutiveErrors}:`, error)

  // If we have too many consecutive errors, enter cooldown
  if (consecutiveErrors >= RATE_LIMIT.maxRetries) {
    isInCooldown = true
    cooldownUntil = Date.now() + RATE_LIMIT.cooldownPeriod
    console.error(`🚫 [RATE-LIMIT] Entering cooldown period for ${RATE_LIMIT.cooldownPeriod / 1000} seconds`)
  }
}

// Function to reset error count on successful API call
function resetErrorCount(): void {
  if (consecutiveErrors > 0) {
    console.log(`✅ [RATE-LIMIT] API call successful, resetting error count (was ${consecutiveErrors})`)
    consecutiveErrors = 0
  }
}

// Function to get cached vehicle image
async function getCachedVehicleImage(vrm: string): Promise<{ imageUrl: string, source: string } | null> {
  try {
    // Check in-memory cache first
    const cached = imageCache.get(vrm)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`💾 [CACHE] Found vehicle image in memory cache for ${vrm}`)
      return { imageUrl: cached.imageUrl, source: cached.source }
    }

    // Check database cache
    const result = await sql`
      SELECT image_url, source, created_at
      FROM vehicle_image_cache
      WHERE vrm = ${vrm}
      AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `

    if (result.length > 0) {
      const dbCached = result[0]
      console.log(`💾 [CACHE] Found vehicle image in database cache for ${vrm}`)

      // Update in-memory cache
      imageCache.set(vrm, {
        imageUrl: dbCached.image_url,
        source: dbCached.source,
        timestamp: Date.now()
      })

      return { imageUrl: dbCached.image_url, source: dbCached.source }
    }

    return null
  } catch (error) {
    console.error('❌ [CACHE] Error checking cache:', error)
    return null
  }
}

// Function to cache vehicle image with appropriate TTL
async function cacheVehicleImage(vrm: string, imageUrl: string, source: string): Promise<void> {
  try {
    // Determine cache duration based on source
    const isAiGenerated = source.includes('AI Generated')
    const cacheDuration = isAiGenerated ? AI_CACHE_DURATION : CACHE_DURATION

    // Update in-memory cache
    imageCache.set(vrm, { imageUrl, source, timestamp: Date.now() })

    // Update database cache with appropriate expiry
    const expiryDate = new Date(Date.now() + cacheDuration)
    await sql`
      INSERT INTO vehicle_image_cache (vrm, image_url, source, created_at, expires_at)
      VALUES (${vrm}, ${imageUrl}, ${source}, NOW(), ${expiryDate.toISOString()})
      ON CONFLICT (vrm)
      DO UPDATE SET
        image_url = EXCLUDED.image_url,
        source = EXCLUDED.source,
        created_at = EXCLUDED.created_at,
        expires_at = EXCLUDED.expires_at
    `

    console.log(`💾 [CACHE] Cached vehicle image for ${vrm} (expires: ${expiryDate.toLocaleDateString()})`)
  } catch (error) {
    console.error('❌ [CACHE] Error caching image:', error)
  }
}

// Function to check AI generation limits
async function checkAiGenerationLimits(): Promise<{ canGenerate: boolean, reason?: string }> {
  try {
    if (!AI_CONFIG.enabled) {
      return { canGenerate: false, reason: 'AI image generation is disabled' }
    }

    if (!AI_CONFIG.openaiApiKey) {
      return { canGenerate: false, reason: 'OpenAI API key not configured' }
    }

    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    // Check daily limit
    const dailyCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicle_image_cache
      WHERE source LIKE '%AI Generated%'
      AND DATE(created_at) = ${today}
    `

    if (parseInt(dailyCount[0].count) >= AI_CONFIG.dailyLimit) {
      return { canGenerate: false, reason: `Daily limit of ${AI_CONFIG.dailyLimit} AI images reached` }
    }

    // Check monthly limit
    const monthlyCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicle_image_cache
      WHERE source LIKE '%AI Generated%'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `

    if (parseInt(monthlyCount[0].count) >= AI_CONFIG.monthlyLimit) {
      return { canGenerate: false, reason: `Monthly limit of ${AI_CONFIG.monthlyLimit} AI images reached` }
    }

    return { canGenerate: true }

  } catch (error) {
    console.error('❌ [AI-LIMITS] Error checking limits:', error)
    return { canGenerate: false, reason: 'Error checking AI generation limits' }
  }
}

// Function to get vehicle data for AI prompt enhancement
async function getVehicleDataForAI(vrm: string): Promise<any> {
  try {
    // Try to get vehicle data from our database first
    const vehicleData = await sql`
      SELECT make, model, year, color, fuel_type, body_type
      FROM vehicles
      WHERE registration = ${vrm}
      LIMIT 1
    `

    if (vehicleData.length > 0) {
      return vehicleData[0]
    }

    // If not in database, try to get basic info from DVLA or other sources
    // For now, return null - could be enhanced with DVLA API integration
    return null

  } catch (error) {
    console.error('❌ [AI-DATA] Error getting vehicle data:', error)
    return null
  }
}

// Function to generate AI vehicle image using OpenAI DALL-E
async function generateAiVehicleImage(vrm: string): Promise<{ imageUrl: string, source: string } | null> {
  try {
    console.log(`🤖 [AI-GEN] Generating AI vehicle image for ${vrm}`)

    // Check if we can generate AI images
    const limitCheck = await checkAiGenerationLimits()
    if (!limitCheck.canGenerate) {
      console.log(`🚫 [AI-GEN] Cannot generate AI image: ${limitCheck.reason}`)
      return null
    }

    // Get vehicle data to enhance the prompt
    const vehicleData = await getVehicleDataForAI(vrm)

    // Build AI prompt based on available data
    let prompt = `A realistic, high-quality photograph of a `

    if (vehicleData) {
      if (vehicleData.year) prompt += `${vehicleData.year} `
      if (vehicleData.make) prompt += `${vehicleData.make} `
      if (vehicleData.model) prompt += `${vehicleData.model} `
      if (vehicleData.color) prompt += `in ${vehicleData.color} color `
      if (vehicleData.body_type) prompt += `${vehicleData.body_type} `
    } else {
      prompt += `modern passenger vehicle `
    }

    prompt += `parked in a clean, professional setting. The vehicle should be photographed from a 3/4 front angle, showing the front and side clearly. Professional automotive photography style, good lighting, clean background, high resolution, detailed and realistic.`

    console.log(`🎨 [AI-GEN] Using prompt: ${prompt}`)

    // Call OpenAI DALL-E API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [AI-GEN] OpenAI API error: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()

    if (data.data && data.data.length > 0) {
      const imageUrl = data.data[0].url
      const source = `AI Generated (DALL-E 3)${vehicleData ? ` - ${vehicleData.make} ${vehicleData.model}` : ''}`

      console.log(`✅ [AI-GEN] Successfully generated AI image for ${vrm}`)
      return { imageUrl, source }
    } else {
      console.error(`❌ [AI-GEN] No image data returned from OpenAI`)
      return null
    }

  } catch (error) {
    console.error(`❌ [AI-GEN] Error generating AI image:`, error)
    return null
  }
}

// Utility: Decompress .svgz binary to SVG text (matches your code exactly)
async function decompressSvgzFromUrl(url: string): Promise<string> {
  try {
    console.log(`📥 [SVGZ] Downloading and decompressing: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download SVGZ: ${response.status}`)
    }

    const compressedSvg = await response.arrayBuffer()
    const zlib = await import('zlib')
    const svgBuffer = zlib.gunzipSync(Buffer.from(compressedSvg))
    const svgContent = svgBuffer.toString('utf-8')

    console.log(`✅ [SVGZ] Successfully decompressed SVG (${svgContent.length} chars)`)
    return svgContent
  } catch (error) {
    console.error('❌ [SVGZ] Decompression failed:', error)
    return '' // Fallback if decompression fails
  }
}

// Main Function: Handle response and return SVG (matches your code exactly)
async function getVehicleSvgFromHaynesResponse(responseData: any): Promise<{
  vehicleId: number;
  vehicleName: string;
  svg: string;
} | null> {
  try {
    const data = responseData?.["0"]?.TechnicalData

    if (!data || !data.modelPictureMimeDataName) {
      console.log(`❌ [HAYNES-SVG] Missing TechnicalData fields`)
      return null
    }

    const imageUrl = data.modelPictureMimeDataName
    const vehicleId = data.id || -1
    const vehicleName = data.fullName || 'Unknown Vehicle'

    console.log(`🔍 [HAYNES-SVG] Processing vehicle: ${vehicleName} (ID: ${vehicleId})`)
    console.log(`🖼️ [HAYNES-SVG] Image URL: ${imageUrl}`)

    let svg = ''
    if (imageUrl && imageUrl.endsWith('.svgz')) {
      svg = await decompressSvgzFromUrl(imageUrl)
    }

    if (!svg) {
      console.log(`❌ [HAYNES-SVG] No SVG content extracted`)
      return null
    }

    return {
      vehicleId,
      vehicleName,
      svg,
    }
  } catch (err) {
    console.error('❌ [HAYNES-SVG] Failed to extract or decompress SVG:', err)
    return null
  }
}

// Function to recursively scan API response data for any SVGZ image links (fallback)
function findSvgzIds(data: any): string[] {
  const results: string[] = []

  function recurse(obj: any): void {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        // Search through array items
        for (const item of obj) {
          recurse(item)
        }
      } else {
        // Search through object properties
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.endsWith('.svgz') && value.includes('/workshop/images/')) {
            const imageId = value.split('/').pop()?.replace('.svgz', '')
            if (imageId) {
              console.log(`✅ [HAYNES-SVGZ] Found SVGZ image ID: ${imageId}`)
              results.push(imageId)
            }
          } else if (typeof value === 'object') {
            recurse(value)
          }
        }
      }
    }
  }

  recurse(data)
  return results
}

// Function to construct the full HaynesPro URL from the image ID
function getSvgzUrl(imageId: string): string {
  return `https://www.haynespro-assets.com/workshop/images/${imageId}.svgz`
}

// Function to fetch and decompress SVGZ file
async function fetchAndDecompressSvgz(url: string): Promise<string | null> {
  try {
    console.log(`🔍 [HAYNES-SVGZ] Fetching: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Encoding': 'gzip, deflate',
        'Accept': '*/*'
      }
    })

    if (!response.ok) {
      console.log(`❌ [HAYNES-SVGZ] Failed to fetch ${url}: ${response.status}`)
      return null
    }

    const buffer = await response.arrayBuffer()

    // Decompress the SVGZ (gzip compressed SVG)
    const zlib = await import('zlib')
    const compressed = Buffer.from(buffer)
    const decompressed = zlib.gunzipSync(compressed)
    const svgContent = decompressed.toString('utf-8')

    console.log(`⚠️ [HAYNES-SVGZ] Skipping SVG diagram from ${url} - only real photos allowed`)
    return null

  } catch (error) {
    console.log(`❌ [HAYNES-SVGZ] Error fetching ${url}:`, error)
    return null
  }
}

// Function to extract vehicle image from API response
function extractVehicleImageFromResponse(apiResponse: any): string | null {
  // First try the specific TechnicalData path
  const directImageUrl = getVehicleImageUrl(apiResponse)
  if (directImageUrl) {
    return directImageUrl
  }

  // Fallback: search recursively for SVGZ IDs
  const imageIds = findSvgzIds(apiResponse)
  if (imageIds.length > 0) {
    console.log(`✅ [HAYNES-IMAGE] Found ${imageIds.length} SVGZ image(s), using first: ${imageIds[0]}`)
    return getSvgzUrl(imageIds[0]) // Return first valid image found
  }

  return null
}

/**
 * Sends a POST request to SWS Solutions API using your exact working implementation
 * @param {string} action - API action (e.g., 'GETMOTHISTORY', 'TSB')
 * @param {string} vrm - Vehicle Registration Mark (e.g., 'S31STK')
 * @returns {Promise<any>} - API response (text or parsed JSON)
 */
async function callSWS(action: string, vrm: string): Promise<any> {
  const body = new URLSearchParams({
    APIKey: "C94A0F3F12E88DB916C008B069E34F65",
    ACTION: action,
    REPID: "",
    NODEID: "",
    query: "",
    VRM: vrm,
    
  })

  const response = await fetch(SWS_API_CONFIG.endpoint, {
    method: 'POST',
    headers: SWS_API_CONFIG.headers,
    body
  })

  const text = await response.text()

  try {
    return JSON.parse(text) // Try to parse as JSON if possible
  } catch {
    return { raw: text } // Return raw string if not JSON
  }
}

// Function to fetch vehicle image SVG using your exact working SWS implementation
async function fetchVehicleImageSVG(vrm: string): Promise<{ svgString: string, technicalData: any } | null> {
  try {
    console.log(`🔍 [SWS-WORKING] Fetching vehicle image SVG for ${vrm} using working SWS implementation`)

    // Use your exact working SWS call
    const swsData = await callSWS("GET_INITIAL_SUBJECTS", vrm)

    // Check for API errors
    if (swsData?.raw) {
      console.log(`⚠️ [SWS-WORKING] Got raw response for ${vrm}:`, swsData.raw.substring(0, 200))
      return null
    }

    const carData = swsData?.["0"]?.TechnicalData
    const imageUrl = carData?.modelPictureMimeDataName

    if (!imageUrl || !imageUrl.endsWith(".svgz")) {
      console.warn(`⚠️ [SWS-WORKING] No SVGZ image found for vehicle: ${vrm}`)
      return null
    }

    console.log(`📥 [SWS-WORKING] Found SVGZ image URL: ${imageUrl}`)

    // Download and decompress the SVGZ file
    const compressedResponse = await fetch(imageUrl, {
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'Garage Assistant/4.0'
      }
    })

    if (!compressedResponse.ok) {
      console.error(`❌ [SWS-WORKING] Failed to download SVGZ: ${compressedResponse.status}`)
      return null
    }

    const compressedData = await compressedResponse.arrayBuffer()
    const buffer = Buffer.from(compressedData)
    
    // Check if file is already uncompressed SVG
    const fileStart = buffer.toString("utf-8", 0, 20)
    let svgString
    
    if (fileStart.includes("<?xml") || fileStart.includes("<svg")) {
      // File is already uncompressed
      svgString = buffer.toString("utf-8")
      console.log(`✅ [SWS-WORKING] SVGZ is uncompressed: ${svgString.length} chars`)
    } else {
      // Try to decompress
      try {
        const zlib = await import("zlib")
        const decompressedBuffer = zlib.gunzipSync(buffer)
        svgString = decompressedBuffer.toString("utf-8")
        console.log(`✅ [SWS-WORKING] SVGZ decompressed: ${svgString.length} chars`)
      } catch (decompressError) {
        console.error(`❌ [SWS-WORKING] Decompression failed:`, decompressError.message)
        return null
      }
    }

    return {
      svgString,
      technicalData: swsData
    }

  } catch (error: any) {
    console.error(`❌ [SWS-WORKING] Error fetching SVGZ image:`, error.message || error)
    return null
  }
}

// Function to get vehicle image from SWS/HaynesPro integration with protection
async function getVehicleImageFromSWS(vrm: string): Promise<{ imageUrl: string, source: string, technicalData?: any } | null> {
  try {
    console.log(`🔍 [SWS-API] Fetching vehicle image for ${vrm}`)

    // Check cache first to avoid unnecessary API calls
    const cached = await getCachedVehicleImage(vrm)
    if (cached) {
      return cached
    }

    // Enforce rate limiting before making API call
    await enforceRateLimit()

    // Skip SVG diagrams - we only want real vehicle photos
    console.log(`⚠️ [SWS-TSB] Skipping SVG diagram for ${vrm} - only real photos allowed`)

    // Fallback: Use our existing comprehensive technical data endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vin-technical-data?vrm=${encodeURIComponent(vrm)}`)
    const data = await response.json()

    if (!data.success) {
      console.log(`❌ [SWS-API] Failed to get technical data for ${vrm}, generating placeholder`)
      handleApiError(new Error('Failed to get technical data'))

      // No technical data available - return null instead of fake images
      console.log(`❌ [NO-DATA] No technical data available for ${vrm}, no real image available`)

      // Add to blacklist to prevent repeated attempts
      addToBlacklist(vrm)

      return { imageUrl: null, source: 'No technical data available' }
    }

    console.log(`📊 [SWS-API] Received comprehensive technical data for ${vrm}`)
    resetErrorCount()

    // Search for SVGZ image IDs in the comprehensive API response
    const svgzUrl = extractVehicleImageFromResponse(data)
    if (svgzUrl) {
      console.log(`✅ [SWS-API] Found SVGZ URL in comprehensive response: ${svgzUrl}`)

      // Try to fetch and decompress the SVGZ file
      await enforceRateLimit() // Rate limit the SVGZ fetch
      const decompressedImage = await fetchAndDecompressSvgz(svgzUrl)

      if (decompressedImage) {
        const result = { imageUrl: decompressedImage, source: 'HaynesPro Comprehensive SVGZ' }
        await cacheVehicleImage(vrm, decompressedImage, result.source)
        return result
      }
    }

    // Fallback: Search through technical data categories for images in HTML
    for (const [category, categoryData] of Object.entries(data.data)) {
      if (typeof categoryData === 'object' && categoryData !== null && 'raw' in categoryData) {
        const htmlContent = (categoryData as any).raw
        if (typeof htmlContent === 'string') {
          console.log(`🔍 [SWS-API] Checking ${category} for vehicle images`)

          // Look for SVGZ IDs in the HTML content
          const categoryImageIds = findSvgzIds(htmlContent)
          if (categoryImageIds.length > 0) {
            const svgzUrl = getSvgzUrl(categoryImageIds[0])
            console.log(`✅ [SWS-API] Found SVGZ in ${category}: ${svgzUrl}`)

            await enforceRateLimit()
            const decompressedImage = await fetchAndDecompressSvgz(svgzUrl)

            if (decompressedImage) {
              const result = { imageUrl: decompressedImage, source: `HaynesPro SVGZ (${category})` }
              await cacheVehicleImage(vrm, decompressedImage, result.source)
              return result
            }
          }

          // Also try submitting the form to HaynesPro to get more detailed data
          const haynesImageUrl = await tryHaynesProFormWithRateLimit(htmlContent)
          if (haynesImageUrl) {
            console.log(`✅ [SWS-API] Found vehicle image in HaynesPro form for ${category}: ${haynesImageUrl}`)
            const result = { imageUrl: haynesImageUrl, source: `HaynesPro Form (${category})` }

            await cacheVehicleImage(vrm, haynesImageUrl, result.source)
            return result
          }
        }
      }
    }

    // Tier 1.5: Try SWS API for additional vehicle data and images
    console.log(`🔍 [SWS-TIER] No HaynesPro image found for ${vrm}, trying SWS API`)
    try {
      const swsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sws-vehicle-data?vrm=${vrm}&include_image=true`)
      const swsData = await swsResponse.json()

      if (swsData.success && swsData.data.imageUrl) {
        console.log(`✅ [SWS-SUCCESS] Found SWS image for ${vrm}: ${swsData.data.imageUrl}`)
        const result = {
          imageUrl: swsData.data.imageUrl,
          source: `SWS API - ${swsData.data.source}`
        }
        await cacheVehicleImage(vrm, result.imageUrl, result.source)
        return result
      }

      console.log(`❌ [SWS-TIER] No SWS image found for ${vrm}`)
    } catch (swsError) {
      console.error(`❌ [SWS-TIER] SWS API error for ${vrm}:`, swsError)
    }

    // No real images found - return null instead of fake images
    console.log(`❌ [NO-IMAGE] No real vehicle image found for ${vrm} from any source (HaynesPro/SWS)`)
    return { imageUrl: null, source: 'No real image available' }

  } catch (error) {
    console.error(`❌ [SWS-API] Error fetching vehicle image:`, error)
    handleApiError(error)

    // Return null when API errors occur - no fake images
    console.log(`❌ [ERROR] API error for ${vrm}, no real image available`)
    return { imageUrl: null, source: 'API Error - No real image available' }
  }
}

// Function to generate a professional vehicle placeholder image as SVG data URL
function generateVehiclePlaceholder(vrm: string): string {
  const svg = `
    <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.1"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="400" height="300" fill="url(#bgGradient)"/>

      <!-- Main container with shadow -->
      <rect x="40" y="40" width="320" height="220" rx="12" fill="white" filter="url(#shadow)" stroke="#e2e8f0" stroke-width="1"/>

      <!-- Header -->
      <rect x="40" y="40" width="320" height="50" rx="12" fill="#1e293b"/>
      <rect x="40" y="75" width="320" height="15" fill="#1e293b"/>

      <!-- Vehicle icon area -->
      <circle cx="200" cy="140" r="40" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>

      <!-- Simple car icon -->
      <g transform="translate(200, 140)">
        <!-- Car body -->
        <rect x="-25" y="-8" width="50" height="16" rx="8" fill="#64748b"/>
        <!-- Car windows -->
        <rect x="-20" y="-6" width="15" height="12" rx="2" fill="#94a3b8"/>
        <rect x="5" y="-6" width="15" height="12" rx="2" fill="#94a3b8"/>
        <!-- Wheels -->
        <circle cx="-15" cy="12" r="6" fill="#374151"/>
        <circle cx="15" cy="12" r="6" fill="#374151"/>
        <circle cx="-15" cy="12" r="3" fill="#6b7280"/>
        <circle cx="15" cy="12" r="3" fill="#6b7280"/>
      </g>

      <!-- VRM display -->
      <rect x="140" y="190" width="120" height="30" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="200" y="210" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="white">${vrm}</text>

      <!-- Status text -->
      <text x="200" y="65" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="white">Vehicle Image</text>

      <!-- Info text -->
      <text x="200" y="245" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">Image not available from HaynesPro</text>
    </svg>
  `

  // Convert SVG to data URL
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg.trim()).toString('base64')}`
  console.log(`🎨 [PLACEHOLDER] Generated professional vehicle placeholder for ${vrm}`)
  return dataUrl
}

// Function to try submitting HaynesPro forms to get more detailed data with rate limiting
async function tryHaynesProFormWithRateLimit(htmlContent: string): Promise<string | null> {
  try {
    // Extract form data
    const actionMatch = htmlContent.match(/action=["']([^"']*)["']/)
    if (!actionMatch) return null

    const actionUrl = actionMatch[1]
    const formData: Record<string, string> = {}

    const inputMatches = htmlContent.matchAll(/<input[^>]*name=["']([^"']*)["'][^>]*value=["']([^"']*)["']/g)
    for (const match of inputMatches) {
      formData[match[1]] = match[2]
    }

    // Enforce rate limiting before making HaynesPro call
    await enforceRateLimit()

    // Submit to our HaynesPro proxy
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/haynespro-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionUrl, formData })
    })

    const result = await response.json()
    if (result.success) {
      resetErrorCount()

      // First try to find SVGZ IDs in the HaynesPro response
      const imageIds = findSvgzIds(result.html)
      if (imageIds.length > 0) {
        const svgzUrl = getSvgzUrl(imageIds[0])
        console.log(`✅ [HAYNESPRO-FORM] Found SVGZ in form response: ${svgzUrl}`)

        await enforceRateLimit()
        const decompressedImage = await fetchAndDecompressSvgz(svgzUrl)
        if (decompressedImage) {
          return decompressedImage
        }
      }

      // Fallback to HTML image extraction
      return extractImageFromHTML(result.html)
    } else {
      handleApiError(new Error('HaynesPro proxy failed'))
    }

    return null
  } catch (error) {
    console.error('Error trying HaynesPro form:', error)
    handleApiError(error)
    return null
  }
}

// Function to extract image URLs from HTML content
function extractImageFromHTML(html: string): string | null {
  // Look for various image patterns that might contain vehicle images
  const imagePatterns = [
    // Direct image tags with vehicle-related sources
    /<img[^>]*src=["']([^"']*vehicle[^"']*\.(?:jpg|jpeg|png|gif|svg|webp))["']/gi,
    /<img[^>]*src=["']([^"']*car[^"']*\.(?:jpg|jpeg|png|gif|svg|webp))["']/gi,
    /<img[^>]*src=["']([^"']*auto[^"']*\.(?:jpg|jpeg|png|gif|svg|webp))["']/gi,

    // HaynesPro asset URLs
    /(https?:\/\/[^"'\s]*haynespro[^"'\s]*\.(?:jpg|jpeg|png|gif|svg|webp|svgz))/gi,
    /(https?:\/\/[^"'\s]*assets[^"'\s]*\.(?:jpg|jpeg|png|gif|svg|webp|svgz))/gi,

    // Any image URLs that might be vehicle-related
    /(https?:\/\/[^"'\s]*\.(?:jpg|jpeg|png|gif|svg|webp|svgz))/gi
  ]

  for (const pattern of imagePatterns) {
    const matches = html.matchAll(pattern)
    for (const match of matches) {
      const imageUrl = match[1] || match[0]

      // Filter out obvious non-vehicle images
      if (imageUrl &&
          !imageUrl.includes('logo') &&
          !imageUrl.includes('icon') &&
          !imageUrl.includes('button') &&
          !imageUrl.includes('banner')) {
        return imageUrl
      }
    }
  }

  return null
}



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm')
    const resetCooldownParam = searchParams.get('resetCooldown')

    // Allow resetting cooldown for development
    if (resetCooldownParam === 'true') {
      resetCooldown()
    }

    if (!vrm) {
      return NextResponse.json({
        success: false,
        error: 'VRM parameter is required'
      }, { status: 400 })
    }

    console.log(`🖼️ [HAYNES-IMAGE] Fetching vehicle image for ${vrm}`)

    // Check if VRM is blacklisted (known to fail)
    if (isBlacklisted(vrm)) {
      console.log(`🚫 [BLACKLIST] VRM ${vrm} is blacklisted, skipping`)
      return NextResponse.json({
        success: false,
        error: 'No real vehicle image found',
        vrm,
        source: 'Blacklisted - Known to fail',
        message: 'This vehicle is known to not have technical data available'
      }, { status: 404 })
    }

    // Check database cache first
    const cachedData = await getCachedSWSData(vrm)
    if (cachedData && cachedData.imageUrl) {
      console.log(`💾 [HAYNES-IMAGE] Returning cached image for ${vrm}`)
      return NextResponse.json({
        success: true,
        vrm,
        imageUrl: cachedData.imageUrl,
        source: 'SWS TSB SVGZ - Real Vehicle Image (Cached)',
        cached: true,
        cachedAt: cachedData.cachedAt
      })
    }

    // Check if we're in cooldown period
    if (isInCooldown) {
      const remainingCooldown = Math.ceil((cooldownUntil - Date.now()) / 1000)
      return NextResponse.json({
        success: false,
        error: `API temporarily unavailable. Cooldown for ${remainingCooldown} seconds.`,
        cooldown: true,
        retryAfter: remainingCooldown
      }, { status: 429 })
    }

    const result = await getVehicleImageFromSWS(vrm)

    if (result && result.imageUrl) {
      // Cache the successful result in database
      await cacheSWSData(vrm, result.technicalData || {}, result.imageUrl)

      return NextResponse.json({
        success: true,
        vrm,
        imageUrl: result.imageUrl,
        source: result.source,
        cached: false
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No real vehicle image found',
        vrm,
        source: result?.source || 'Unknown',
        message: 'Only real vehicle images are provided - no AI or placeholder images'
      }, { status: 404 })
    }

  } catch (error) {
    console.error('❌ [HAYNES-IMAGE] Error:', error)

    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('cooldown')) {
      return NextResponse.json({
        success: false,
        error: error.message,
        cooldown: true
      }, { status: 429 })
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'This endpoint only accepts GET requests'
  }, { status: 405 })
}
