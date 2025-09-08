import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Automotive job categorization
const JOB_CATEGORIES = {
  mechanical: ['mechanical', 'engine', 'transmission', 'clutch', 'gearbox', 'motor', 'timing', 'belt', 'chain'],
  bodywork: ['body', 'bodyshop', 'panel', 'paint', 'dent', 'scratch', 'bumper', 'door', 'wing', 'bonnet'],
  electrical: ['electrical', 'electric', 'wiring', 'battery', 'alternator', 'starter', 'lights', 'headlamp'],
  braking: ['brake', 'brakes', 'disc', 'pad', 'caliper', 'handbrake', 'abs'],
  suspension: ['suspension', 'shock', 'strut', 'spring', 'damper', 'coil'],
  steering: ['steering', 'pas', 'rack', 'pump', 'wheel', 'alignment'],
  exhaust: ['exhaust', 'silencer', 'manifold', 'cat', 'dpf', 'egr'],
  cooling: ['cooling', 'radiator', 'thermostat', 'coolant', 'fan'],
  service: ['service', 'oil', 'filter', 'mot', 'annual', 'interim'],
  diagnostic: ['diagnostic', 'diagnos', 'scan', 'fault', 'code', 'ecu'],
  tyres: ['tyre', 'tire', 'wheel', 'puncture', 'balance'],
  aircon: ['aircon', 'air con', 'ac', 'conditioning', 'climate']
}

const WORK_TYPES = {
  repair: ['repair', 'fix', 'mend'],
  replace: ['replace', 'change', 'fit', 'install', 'new'],
  service: ['service', 'maintain', 'check', 'inspect'],
  diagnostic: ['diagnostic', 'diagnos', 'scan', 'test', 'investigate'],
  remove: ['remove', 'take off', 'strip'],
  adjust: ['adjust', 'set', 'calibrate', 'align'],
  clean: ['clean', 'flush', 'wash']
}

// Enhanced similarity calculation for job descriptions
function calculateJobSimilarity(str1: string, str2: string): number {
  // Normalize strings - more aggressive for job descriptions
  const normalize = (str: string) => 
    str.toLowerCase()
       .replace(/[^a-z0-9]/g, ' ')
       .replace(/\s+/g, ' ')
       .replace(/labour/g, 'labor') // Normalize spelling
       .replace(/\d+/g, '') // Remove numbers (like "LABOUR1")
       .trim()

  const norm1 = normalize(str1)
  const norm2 = normalize(str2)

  // Exact match after normalization
  if (norm1 === norm2) return 1.0

  // Word-based similarity for job descriptions
  const words1 = norm1.split(' ').filter(w => w.length > 1)
  const words2 = norm2.split(' ').filter(w => w.length > 1)
  
  // Calculate word overlap
  const commonWords = words1.filter(word => words2.includes(word))
  const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length)

  // Levenshtein distance for typos
  const levenshtein = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        )
      }
    }
    
    return matrix[b.length][a.length]
  }

  const distance = levenshtein(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)
  const editSimilarity = 1 - (distance / maxLength)

  // Combine word similarity and edit similarity
  return Math.max(wordSimilarity, editSimilarity * 0.7)
}

// Categorize job description
function categorizeJob(description: string): { category: string, workType: string } {
  const normalized = description.toLowerCase()
  
  let category = 'general'
  let workType = 'other'
  
  // Find category
  for (const [cat, keywords] of Object.entries(JOB_CATEGORIES)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      category = cat
      break
    }
  }
  
  // Find work type
  for (const [type, keywords] of Object.entries(WORK_TYPES)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      workType = type
      break
    }
  }
  
  return { category, workType }
}

// Generate canonical job description
function suggestCanonicalJobDescription(variations: any[]): { canonical: string, category: string, workType: string } {
  if (variations.length === 0) return { canonical: "", category: "", workType: "" }

  // Analyze all variations to find common patterns
  const allDescriptions = variations.map(v => v.description)
  const categories = variations.map(v => categorizeJob(v.description))
  
  // Find most common category and work type
  const categoryCount: { [key: string]: number } = {}
  const workTypeCount: { [key: string]: number } = {}
  
  categories.forEach(({ category, workType }) => {
    categoryCount[category] = (categoryCount[category] || 0) + 1
    workTypeCount[workType] = (workTypeCount[workType] || 0) + 1
  })
  
  const mostCommonCategory = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'general'
  const mostCommonWorkType = Object.entries(workTypeCount)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'other'

  // Find the cleanest, most complete description
  const sortedByUsage = variations.sort((a, b) => b.usage_count - a.usage_count)
  const mostUsed = sortedByUsage[0].description

  // Clean up the most used description
  const canonical = mostUsed
    .replace(/\s+/g, ' ') // Fix spacing
    .replace(/\d+$/, '') // Remove trailing numbers
    .trim()
    .toUpperCase() // Standardize case

  return { 
    canonical, 
    category: mostCommonCategory, 
    workType: mostCommonWorkType 
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobDescription = searchParams.get('job_description')

    if (!jobDescription) {
      return NextResponse.json({
        success: false,
        error: "Job description is required"
      }, { status: 400 })
    }

    console.log(`[JOB-SMART-MATCHER] Finding variations for: ${jobDescription}`)

    // Get all job descriptions that might be similar
    const allJobs = await sql`
      SELECT 
        description,
        COUNT(*) as usage_count,
        AVG(unit_price) as avg_price,
        MIN(unit_price) as min_price,
        MAX(unit_price) as max_price
      FROM line_items 
      WHERE total_amount > 0
      AND description IS NOT NULL
      AND LENGTH(description) > 3
      GROUP BY description
      HAVING COUNT(*) >= 1
      ORDER BY usage_count DESC
    `

    // Calculate similarity scores and categorize
    const variations = allJobs
      .map(job => {
        const similarity = calculateJobSimilarity(jobDescription, job.description)
        const { category, workType } = categorizeJob(job.description)
        
        return {
          ...job,
          similarity_score: similarity,
          job_category: category,
          work_type: workType,
          suggested_canonical: ""
        }
      })
      .filter(job => 
        job.similarity_score >= 0.4 && // Lower threshold for job descriptions
        job.description !== jobDescription
      )
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 25) // More results for job descriptions

    // Generate canonical description and categorization
    const allVariations = [
      { description: jobDescription, usage_count: 1 },
      ...variations
    ]
    const { canonical, category, workType } = suggestCanonicalJobDescription(allVariations)

    console.log(`[JOB-SMART-MATCHER] Found ${variations.length} variations for "${jobDescription}"`)

    return NextResponse.json({
      success: true,
      data: {
        original_job: jobDescription,
        suggested_canonical: canonical,
        suggested_category: category,
        suggested_work_type: workType,
        variations: variations,
        total_found: variations.length
      }
    })

  } catch (error) {
    console.error("[JOB-SMART-MATCHER] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to find job description variations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// POST - Merge job description variations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { canonical_description, variations, category, work_type } = body

    if (!canonical_description || !variations || !Array.isArray(variations)) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: canonical_description, variations"
      }, { status: 400 })
    }

    console.log(`[JOB-SMART-MATCHER] Merging ${variations.length} job variations under: ${canonical_description}`)

    // Start transaction to update all variations
    await sql.begin(async (sql) => {
      // Update line_items with canonical description
      for (const variation of variations) {
        await sql`
          UPDATE line_items 
          SET description = ${canonical_description}
          WHERE description = ${variation}
        `
      }

      // Create or update job description master record
      await sql`
        INSERT INTO job_descriptions_master (
          canonical_description, 
          category, 
          work_type, 
          created_at, 
          updated_at
        ) VALUES (
          ${canonical_description}, 
          ${category || 'general'}, 
          ${work_type || 'other'}, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (canonical_description) DO UPDATE SET
          category = EXCLUDED.category,
          work_type = EXCLUDED.work_type,
          updated_at = NOW()
      `
    })

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${variations.length} job description variations under "${canonical_description}"`,
      data: {
        canonical_description,
        category,
        work_type,
        merged_variations: variations.length
      }
    })

  } catch (error) {
    console.error("[JOB-SMART-MATCHER] Merge error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to merge job description variations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
