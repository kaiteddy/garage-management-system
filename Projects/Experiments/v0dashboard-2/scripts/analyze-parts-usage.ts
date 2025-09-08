import { sql } from "@/lib/database/neon-client"

interface PartUsage {
  description: string
  totalQuantity: number
  averagePrice: number
  minPrice: number
  maxPrice: number
  usageCount: number
  category: string
  lastUsed: string
}

async function analyzePartsUsage() {
  console.log("🔍 Analyzing parts usage across all job sheets...")

  try {
    // Get all line items with parts data
    const lineItemsData = await sql`
      SELECT 
        li.description,
        li.quantity,
        li.unit_price,
        li.total_amount,
        li.line_type,
        li.created_at,
        cd.document_number,
        cd.vehicle_registration
      FROM line_items li
      LEFT JOIN customer_documents cd ON li.document_id = cd.id
      WHERE li.description IS NOT NULL 
        AND li.description != ''
        AND li.quantity > 0
      ORDER BY li.created_at DESC
    `

    // Also get from document_line_items table
    const docLineItemsData = await sql`
      SELECT 
        dli.description,
        dli.quantity,
        dli.unit_price,
        dli.total_price as total_amount,
        dli.item_type as line_type,
        dli.created_at,
        cd.document_number,
        cd.vehicle_registration
      FROM document_line_items dli
      LEFT JOIN customer_documents cd ON dli.document_id = cd.id
      WHERE dli.description IS NOT NULL 
        AND dli.description != ''
        AND dli.quantity > 0
      ORDER BY dli.created_at DESC
    `

    // Get stock data for reference
    const stockData = await sql`
      SELECT 
        description,
        part_number,
        unit_price,
        quantity_in_stock
      FROM stock
      WHERE description IS NOT NULL
      ORDER BY description
    `

    console.log(`📊 Found ${lineItemsData.length} line items and ${docLineItemsData.length} document line items`)
    console.log(`📦 Found ${stockData.length} stock items`)

    // Combine all data
    const allItems = [...lineItemsData, ...docLineItemsData]

    // Analyze parts usage
    const partsMap = new Map<string, PartUsage>()

    allItems.forEach(item => {
      const description = item.description.trim()
      const quantity = parseFloat(item.quantity) || 0
      const unitPrice = parseFloat(item.unit_price) || 0
      
      if (!partsMap.has(description)) {
        partsMap.set(description, {
          description,
          totalQuantity: 0,
          averagePrice: 0,
          minPrice: unitPrice > 0 ? unitPrice : Infinity,
          maxPrice: 0,
          usageCount: 0,
          category: categorizeItem(description, item.line_type),
          lastUsed: item.created_at
        })
      }

      const part = partsMap.get(description)!
      part.totalQuantity += quantity
      part.usageCount += 1
      
      if (unitPrice > 0) {
        part.minPrice = Math.min(part.minPrice, unitPrice)
        part.maxPrice = Math.max(part.maxPrice, unitPrice)
      }
      
      if (new Date(item.created_at) > new Date(part.lastUsed)) {
        part.lastUsed = item.created_at
      }
    })

    // Calculate average prices
    partsMap.forEach(part => {
      const relevantItems = allItems.filter(item => 
        item.description.trim() === part.description && 
        parseFloat(item.unit_price) > 0
      )
      
      if (relevantItems.length > 0) {
        const totalValue = relevantItems.reduce((sum, item) => 
          sum + (parseFloat(item.unit_price) * parseFloat(item.quantity)), 0
        )
        const totalQty = relevantItems.reduce((sum, item) => 
          sum + parseFloat(item.quantity), 0
        )
        part.averagePrice = totalValue / totalQty
      }
      
      if (part.minPrice === Infinity) part.minPrice = 0
    })

    // Sort by usage frequency and total quantity
    const sortedParts = Array.from(partsMap.values())
      .sort((a, b) => (b.usageCount * b.totalQuantity) - (a.usageCount * a.totalQuantity))

    // Generate comprehensive parts list
    console.log("\n🎯 COMPREHENSIVE PARTS LIST WITH PRICING INTELLIGENCE")
    console.log("=" .repeat(80))

    const categories = groupByCategory(sortedParts)
    
    Object.entries(categories).forEach(([category, parts]) => {
      console.log(`\n📦 ${category.toUpperCase()}`)
      console.log("-".repeat(60))
      
      parts.slice(0, 20).forEach((part, index) => {
        console.log(`${index + 1}. ${part.description}`)
        console.log(`   Usage: ${part.usageCount} times, Total Qty: ${part.totalQuantity.toFixed(2)}`)
        console.log(`   Price: £${part.averagePrice.toFixed(2)} avg (£${part.minPrice.toFixed(2)}-£${part.maxPrice.toFixed(2)})`)
        console.log(`   Last Used: ${new Date(part.lastUsed).toLocaleDateString()}`)
        console.log("")
      })
    })

    // Generate JSON output for system use
    const partsListForSystem = sortedParts.slice(0, 200).map(part => ({
      name: part.description,
      category: part.category,
      averagePrice: Math.round(part.averagePrice * 100) / 100,
      minPrice: Math.round(part.minPrice * 100) / 100,
      maxPrice: Math.round(part.maxPrice * 100) / 100,
      usageFrequency: part.usageCount,
      totalQuantityUsed: Math.round(part.totalQuantity * 100) / 100,
      lastUsed: part.lastUsed,
      unit: determineUnit(part.description)
    }))

    return {
      success: true,
      totalParts: partsMap.size,
      topParts: partsListForSystem,
      categories: Object.keys(categories),
      analysis: {
        mostUsedPart: sortedParts[0]?.description || 'None',
        totalTransactions: allItems.length,
        averagePartPrice: sortedParts.reduce((sum, p) => sum + p.averagePrice, 0) / sortedParts.length
      }
    }

  } catch (error) {
    console.error("❌ Error analyzing parts usage:", error)
    return { success: false, error: error.message }
  }
}

function categorizeItem(description: string, lineType: string): string {
  const desc = description.toLowerCase()
  
  if (desc.includes('oil') && (desc.includes('engine') || desc.includes('motor'))) return 'Engine Oil'
  if (desc.includes('oil') && desc.includes('transmission')) return 'Transmission Oil'
  if (desc.includes('oil') && desc.includes('brake')) return 'Brake Fluid'
  if (desc.includes('brake') && (desc.includes('pad') || desc.includes('disc'))) return 'Brake Parts'
  if (desc.includes('filter') && desc.includes('oil')) return 'Oil Filters'
  if (desc.includes('filter') && desc.includes('air')) return 'Air Filters'
  if (desc.includes('filter') && desc.includes('fuel')) return 'Fuel Filters'
  if (desc.includes('spark') && desc.includes('plug')) return 'Ignition Parts'
  if (desc.includes('battery')) return 'Electrical Parts'
  if (desc.includes('bulb') || desc.includes('light')) return 'Lighting'
  if (desc.includes('tyre') || desc.includes('tire')) return 'Tyres'
  if (desc.includes('wiper')) return 'Wipers'
  if (desc.includes('coolant') || desc.includes('antifreeze')) return 'Coolant'
  if (desc.includes('belt')) return 'Belts'
  if (desc.includes('hose')) return 'Hoses'
  if (desc.includes('gasket') || desc.includes('seal')) return 'Gaskets & Seals'
  if (desc.includes('suspension') || desc.includes('shock') || desc.includes('strut')) return 'Suspension'
  if (desc.includes('exhaust')) return 'Exhaust Parts'
  if (desc.includes('clutch')) return 'Clutch Parts'
  if (desc.includes('mot') || lineType === 'MOT') return 'MOT Test'
  if (lineType === 'Labour' || desc.includes('labour') || desc.includes('labor')) return 'Labour'
  
  return 'General Parts'
}

function groupByCategory(parts: PartUsage[]): Record<string, PartUsage[]> {
  return parts.reduce((groups, part) => {
    const category = part.category
    if (!groups[category]) groups[category] = []
    groups[category].push(part)
    return groups
  }, {} as Record<string, PartUsage[]>)
}

function determineUnit(description: string): string {
  const desc = description.toLowerCase()
  if (desc.includes('oil') || desc.includes('fluid') || desc.includes('coolant')) return 'Litre'
  if (desc.includes('labour') || desc.includes('labor')) return 'Hour'
  if (desc.includes('mot')) return 'Test'
  return 'Each'
}

// Run the analysis
analyzePartsUsage().then(result => {
  if (result.success) {
    console.log(`\n✅ Analysis complete! Found ${result.totalParts} unique parts`)
    console.log(`📊 Most used part: ${result.analysis.mostUsedPart}`)
    console.log(`💰 Average part price: £${result.analysis.averagePartPrice.toFixed(2)}`)
  } else {
    console.log(`❌ Analysis failed: ${result.error}`)
  }
  process.exit(0)
})
