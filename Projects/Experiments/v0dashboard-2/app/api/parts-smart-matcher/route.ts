import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Smart part matching algorithm
function calculateSimilarity(str1: string, str2: string): number {
  // Normalize strings
  const normalize = (str: string) => 
    str.toLowerCase()
       .replace(/[^a-z0-9]/g, ' ')
       .replace(/\s+/g, ' ')
       .trim()

  const norm1 = normalize(str1)
  const norm2 = normalize(str2)

  // Exact match after normalization
  if (norm1 === norm2) return 1.0

  // Levenshtein distance
  const levenshtein = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        )
      }
    }
    
    return matrix[b.length][a.length]
  }

  const distance = levenshtein(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)
  const similarity = 1 - (distance / maxLength)

  // Boost similarity for common automotive part patterns
  const words1 = norm1.split(' ')
  const words2 = norm2.split(' ')
  const commonWords = words1.filter(word => words2.includes(word))
  const wordBoost = commonWords.length / Math.max(words1.length, words2.length)

  return Math.min(1.0, similarity + (wordBoost * 0.2))
}

// Generate canonical name suggestions
function suggestCanonicalName(variations: any[]): string {
  if (variations.length === 0) return ""

  // Find the most common words across all variations
  const wordCounts: { [key: string]: number } = {}
  const wordPositions: { [key: string]: number[] } = {}

  variations.forEach(variation => {
    const words = variation.description.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((word: string) => word.length > 1)

    words.forEach((word: string, index: number) => {
      wordCounts[word] = (wordCounts[word] || 0) + variation.usage_count
      if (!wordPositions[word]) wordPositions[word] = []
      wordPositions[word].push(index)
    })
  })

  // Sort words by frequency and typical position
  const sortedWords = Object.entries(wordCounts)
    .map(([word, count]) => ({
      word,
      count,
      avgPosition: wordPositions[word].reduce((sum, pos) => sum + pos, 0) / wordPositions[word].length
    }))
    .sort((a, b) => {
      // Prioritize by count first, then by typical position
      if (b.count !== a.count) return b.count - a.count
      return a.avgPosition - b.avgPosition
    })

  // Build canonical name from most important words
  const canonicalWords = sortedWords
    .slice(0, 4) // Take top 4 words
    .sort((a, b) => a.avgPosition - b.avgPosition) // Sort by position
    .map(item => item.word.toUpperCase())

  return canonicalWords.join(' ')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partName = searchParams.get('part_name')

    if (!partName) {
      return NextResponse.json({
        success: false,
        error: "Part name is required"
      }, { status: 400 })
    }

    console.log(`[SMART-MATCHER] Finding variations for: ${partName}`)

    // Get all parts that might be similar
    const allParts = await sql`
      SELECT 
        description,
        COUNT(*) as usage_count,
        AVG(unit_price) as avg_price,
        MIN(unit_price) as min_price,
        MAX(unit_price) as max_price
      FROM line_items 
      WHERE description NOT ILIKE '%labour%' 
      AND total_amount > 0
      AND description IS NOT NULL
      AND LENGTH(description) > 2
      GROUP BY description
      HAVING COUNT(*) >= 1
      ORDER BY usage_count DESC
    `

    // Calculate similarity scores
    const variations = allParts
      .map(part => ({
        ...part,
        similarity_score: calculateSimilarity(partName, part.description),
        suggested_canonical: ""
      }))
      .filter(part => 
        part.similarity_score >= 0.5 && // Minimum similarity threshold
        part.description !== partName    // Exclude exact match
      )
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 20) // Limit to top 20 matches

    // Generate canonical name suggestion
    const allVariations = [
      { description: partName, usage_count: 1 },
      ...variations
    ]
    const suggestedCanonical = suggestCanonicalName(allVariations)

    console.log(`[SMART-MATCHER] Found ${variations.length} variations for "${partName}"`)

    return NextResponse.json({
      success: true,
      data: {
        original_part: partName,
        suggested_canonical: suggestedCanonical,
        variations: variations,
        total_found: variations.length
      }
    })

  } catch (error) {
    console.error("[SMART-MATCHER] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to find part variations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// POST - Merge part variations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { canonical_name, variations } = body

    if (!canonical_name || !variations || !Array.isArray(variations)) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: canonical_name, variations"
      }, { status: 400 })
    }

    console.log(`[SMART-MATCHER] Merging ${variations.length} variations under: ${canonical_name}`)

    // Start transaction to update all variations
    await sql.begin(async (sql) => {
      // Update parts_pricing_history
      for (const variation of variations) {
        await sql`
          UPDATE parts_pricing_history 
          SET part_name = ${canonical_name}
          WHERE part_name = ${variation}
        `
      }

      // Update parts_master
      for (const variation of variations) {
        await sql`
          UPDATE parts_master 
          SET part_name = ${canonical_name}
          WHERE part_name = ${variation}
        `
      }

      // Update line_items
      for (const variation of variations) {
        await sql`
          UPDATE line_items 
          SET description = ${canonical_name}
          WHERE description = ${variation}
        `
      }

      // Recalculate analytics for the canonical part
      // This will be handled by the existing analytics system
    })

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${variations.length} variations under "${canonical_name}"`,
      data: {
        canonical_name,
        merged_variations: variations.length
      }
    })

  } catch (error) {
    console.error("[SMART-MATCHER] Merge error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to merge part variations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
