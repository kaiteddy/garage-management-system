import { NextResponse } from "next/server"

interface ComprehensivePart {
  name: string
  category: string
  averagePrice: number
  minPrice: number
  maxPrice: number
  unit: string
  supplier: string
  partNumber?: string
  usageFrequency: 'Very High' | 'High' | 'Medium' | 'Low'
  description: string
  vatRate: number
}

export async function GET() {
  console.log("🔧 Generating comprehensive parts list with pricing intelligence...")

  // Comprehensive parts database based on common garage usage
  const comprehensivePartsList: ComprehensivePart[] = [
    
    // ENGINE OILS - Very High Usage
    {
      name: "5W-30 Fully Synthetic Engine Oil",
      category: "Engine Oil",
      averagePrice: 10.95,
      minPrice: 8.95,
      maxPrice: 12.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "5W30-1L",
      usageFrequency: "Very High",
      description: "Most common engine oil specification",
      vatRate: 20
    },
    {
      name: "5W-20 Fully Synthetic Engine Oil",
      category: "Engine Oil",
      averagePrice: 10.95,
      minPrice: 8.95,
      maxPrice: 12.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "5W20-1L",
      usageFrequency: "High",
      description: "Modern low-viscosity engine oil",
      vatRate: 20
    },
    {
      name: "0W-20 Fully Synthetic Engine Oil",
      category: "Engine Oil",
      averagePrice: 11.95,
      minPrice: 9.95,
      maxPrice: 13.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "0W20-1L",
      usageFrequency: "High",
      description: "Ultra-low viscosity for fuel economy",
      vatRate: 20
    },
    {
      name: "10W-40 Semi-Synthetic Engine Oil",
      category: "Engine Oil",
      averagePrice: 9.95,
      minPrice: 7.95,
      maxPrice: 11.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "10W40-1L",
      usageFrequency: "High",
      description: "Popular semi-synthetic grade",
      vatRate: 20
    },
    {
      name: "15W-40 Mineral Engine Oil",
      category: "Engine Oil",
      averagePrice: 8.95,
      minPrice: 6.95,
      maxPrice: 10.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "15W40-1L",
      usageFrequency: "Medium",
      description: "Traditional mineral oil for older engines",
      vatRate: 20
    },

    // OIL FILTERS - Very High Usage
    {
      name: "Oil Filter - Ford Focus/Fiesta",
      category: "Oil Filters",
      averagePrice: 8.50,
      minPrice: 6.50,
      maxPrice: 12.50,
      unit: "Each",
      supplier: "Mann/Mahle",
      partNumber: "W712/75",
      usageFrequency: "Very High",
      description: "Common Ford oil filter",
      vatRate: 20
    },
    {
      name: "Oil Filter - VW/Audi 1.4/1.6/2.0",
      category: "Oil Filters",
      averagePrice: 9.50,
      minPrice: 7.50,
      maxPrice: 13.50,
      unit: "Each",
      supplier: "Mann/Mahle",
      partNumber: "W712/94",
      usageFrequency: "Very High",
      description: "Common VAG group oil filter",
      vatRate: 20
    },
    {
      name: "Oil Filter - BMW/Mini",
      category: "Oil Filters",
      averagePrice: 12.50,
      minPrice: 9.50,
      maxPrice: 16.50,
      unit: "Each",
      supplier: "Mann/Mahle",
      partNumber: "W712/83",
      usageFrequency: "High",
      description: "BMW/Mini oil filter",
      vatRate: 20
    },
    {
      name: "Oil Filter - Toyota/Lexus",
      category: "Oil Filters",
      averagePrice: 10.50,
      minPrice: 8.50,
      maxPrice: 14.50,
      unit: "Each",
      supplier: "Mann/Mahle",
      partNumber: "W610/3",
      usageFrequency: "High",
      description: "Toyota/Lexus oil filter",
      vatRate: 20
    },

    // AIR FILTERS - High Usage
    {
      name: "Air Filter - Ford Focus/Fiesta",
      category: "Air Filters",
      averagePrice: 12.95,
      minPrice: 9.95,
      maxPrice: 16.95,
      unit: "Each",
      supplier: "Mann/Mahle",
      partNumber: "C25114",
      usageFrequency: "High",
      description: "Ford Focus/Fiesta air filter",
      vatRate: 20
    },
    {
      name: "Air Filter - VW Golf/Polo",
      category: "Air Filters",
      averagePrice: 14.95,
      minPrice: 11.95,
      maxPrice: 18.95,
      unit: "Each",
      supplier: "Mann/Mahle",
      partNumber: "C3698/3",
      usageFrequency: "High",
      description: "VW Golf/Polo air filter",
      vatRate: 20
    },
    {
      name: "Air Filter - BMW 1/3 Series",
      category: "Air Filters",
      averagePrice: 18.95,
      minPrice: 14.95,
      maxPrice: 24.95,
      unit: "Each",
      supplier: "Mann/Mahle",
      partNumber: "C3175",
      usageFrequency: "Medium",
      description: "BMW 1/3 Series air filter",
      vatRate: 20
    },

    // BRAKE PARTS - Very High Usage
    {
      name: "Front Brake Pads - Ford Focus",
      category: "Brake Parts",
      averagePrice: 35.95,
      minPrice: 25.95,
      maxPrice: 55.95,
      unit: "Set",
      supplier: "Brembo/Ferodo",
      partNumber: "P24054",
      usageFrequency: "Very High",
      description: "Ford Focus front brake pads",
      vatRate: 20
    },
    {
      name: "Rear Brake Pads - Ford Focus",
      category: "Brake Parts",
      averagePrice: 28.95,
      minPrice: 19.95,
      maxPrice: 45.95,
      unit: "Set",
      supplier: "Brembo/Ferodo",
      partNumber: "P24055",
      usageFrequency: "High",
      description: "Ford Focus rear brake pads",
      vatRate: 20
    },
    {
      name: "Front Brake Discs - Ford Focus (Pair)",
      category: "Brake Parts",
      averagePrice: 65.95,
      minPrice: 45.95,
      maxPrice: 95.95,
      unit: "Pair",
      supplier: "Brembo/ATE",
      partNumber: "09.5584.11",
      usageFrequency: "High",
      description: "Ford Focus front brake discs",
      vatRate: 20
    },
    {
      name: "Rear Brake Discs - Ford Focus (Pair)",
      category: "Brake Parts",
      averagePrice: 55.95,
      minPrice: 35.95,
      maxPrice: 85.95,
      unit: "Pair",
      supplier: "Brembo/ATE",
      partNumber: "08.5584.12",
      usageFrequency: "Medium",
      description: "Ford Focus rear brake discs",
      vatRate: 20
    },

    // BRAKE FLUIDS - High Usage
    {
      name: "DOT 4 Brake Fluid",
      category: "Brake Fluid",
      averagePrice: 9.95,
      minPrice: 7.95,
      maxPrice: 12.95,
      unit: "Litre",
      supplier: "ATE/Castrol",
      partNumber: "DOT4-1L",
      usageFrequency: "Very High",
      description: "Standard DOT 4 brake fluid",
      vatRate: 20
    },
    {
      name: "DOT 5.1 Brake Fluid",
      category: "Brake Fluid",
      averagePrice: 12.95,
      minPrice: 9.95,
      maxPrice: 16.95,
      unit: "Litre",
      supplier: "ATE/Castrol",
      partNumber: "DOT51-1L",
      usageFrequency: "High",
      description: "High performance brake fluid",
      vatRate: 20
    },

    // SPARK PLUGS - High Usage
    {
      name: "Spark Plugs - Ford 1.0 EcoBoost (Set of 3)",
      category: "Ignition Parts",
      averagePrice: 24.95,
      minPrice: 18.95,
      maxPrice: 32.95,
      unit: "Set",
      supplier: "NGK/Bosch",
      partNumber: "LKAR7AIX",
      usageFrequency: "High",
      description: "Ford EcoBoost spark plugs",
      vatRate: 20
    },
    {
      name: "Spark Plugs - VW/Audi 1.4 TSI (Set of 4)",
      category: "Ignition Parts",
      averagePrice: 32.95,
      minPrice: 24.95,
      maxPrice: 42.95,
      unit: "Set",
      supplier: "NGK/Bosch",
      partNumber: "LZKAR6AP",
      usageFrequency: "High",
      description: "VAG TSI spark plugs",
      vatRate: 20
    },

    // BATTERIES - Medium Usage
    {
      name: "Car Battery 12V 60Ah",
      category: "Electrical Parts",
      averagePrice: 85.95,
      minPrice: 65.95,
      maxPrice: 115.95,
      unit: "Each",
      supplier: "Bosch/Varta",
      partNumber: "S4024",
      usageFrequency: "Medium",
      description: "Standard car battery",
      vatRate: 20
    },
    {
      name: "Car Battery 12V 74Ah",
      category: "Electrical Parts",
      averagePrice: 105.95,
      minPrice: 85.95,
      maxPrice: 135.95,
      unit: "Each",
      supplier: "Bosch/Varta",
      partNumber: "S4028",
      usageFrequency: "Medium",
      description: "Higher capacity battery",
      vatRate: 20
    },

    // TYRES - High Usage
    {
      name: "Tyre 205/55R16",
      category: "Tyres",
      averagePrice: 75.95,
      minPrice: 55.95,
      maxPrice: 125.95,
      unit: "Each",
      supplier: "Various",
      partNumber: "205/55R16",
      usageFrequency: "High",
      description: "Common tyre size",
      vatRate: 20
    },
    {
      name: "Tyre 225/45R17",
      category: "Tyres",
      averagePrice: 95.95,
      minPrice: 75.95,
      maxPrice: 155.95,
      unit: "Each",
      supplier: "Various",
      partNumber: "225/45R17",
      usageFrequency: "High",
      description: "Performance tyre size",
      vatRate: 20
    },

    // WIPERS - High Usage
    {
      name: "Front Wiper Blades (Pair)",
      category: "Wipers",
      averagePrice: 18.95,
      minPrice: 12.95,
      maxPrice: 28.95,
      unit: "Pair",
      supplier: "Bosch/Valeo",
      partNumber: "A929S",
      usageFrequency: "High",
      description: "Standard front wiper blades",
      vatRate: 20
    },
    {
      name: "Rear Wiper Blade",
      category: "Wipers",
      averagePrice: 12.95,
      minPrice: 8.95,
      maxPrice: 18.95,
      unit: "Each",
      supplier: "Bosch/Valeo",
      partNumber: "H840",
      usageFrequency: "Medium",
      description: "Rear wiper blade",
      vatRate: 20
    },

    // COOLANT - Medium Usage
    {
      name: "Universal Coolant/Antifreeze",
      category: "Coolant",
      averagePrice: 7.95,
      minPrice: 5.95,
      maxPrice: 10.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "COOL-UNI",
      usageFrequency: "Medium",
      description: "Universal antifreeze coolant",
      vatRate: 20
    },
    {
      name: "G12++ Long Life Coolant",
      category: "Coolant",
      averagePrice: 9.95,
      minPrice: 7.95,
      maxPrice: 12.95,
      unit: "Litre",
      supplier: "VAG/Febi",
      partNumber: "G12PP-1L",
      usageFrequency: "Medium",
      description: "VW/Audi specific coolant",
      vatRate: 20
    },

    // TRANSMISSION OILS - Medium Usage
    {
      name: "ATF Automatic Transmission Fluid",
      category: "Transmission Oil",
      averagePrice: 12.95,
      minPrice: 9.95,
      maxPrice: 16.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "ATF-1L",
      usageFrequency: "Medium",
      description: "Automatic transmission fluid",
      vatRate: 20
    },
    {
      name: "Manual Gearbox Oil 75W-90",
      category: "Transmission Oil",
      averagePrice: 11.95,
      minPrice: 8.95,
      maxPrice: 15.95,
      unit: "Litre",
      supplier: "Various",
      partNumber: "75W90-1L",
      usageFrequency: "Medium",
      description: "Manual transmission oil",
      vatRate: 20
    },

    // BELTS - Medium Usage
    {
      name: "Auxiliary Drive Belt",
      category: "Belts",
      averagePrice: 25.95,
      minPrice: 18.95,
      maxPrice: 35.95,
      unit: "Each",
      supplier: "Gates/Continental",
      partNumber: "6PK1193",
      usageFrequency: "Medium",
      description: "Multi-rib auxiliary belt",
      vatRate: 20
    },
    {
      name: "Timing Belt Kit",
      category: "Belts",
      averagePrice: 85.95,
      minPrice: 65.95,
      maxPrice: 125.95,
      unit: "Kit",
      supplier: "Gates/INA",
      partNumber: "K015578XS",
      usageFrequency: "Low",
      description: "Complete timing belt kit",
      vatRate: 20
    },

    // LIGHTING - High Usage
    {
      name: "H7 Headlight Bulb",
      category: "Lighting",
      averagePrice: 8.95,
      minPrice: 5.95,
      maxPrice: 15.95,
      unit: "Each",
      supplier: "Osram/Philips",
      partNumber: "H7-12V55W",
      usageFrequency: "High",
      description: "Standard H7 headlight bulb",
      vatRate: 20
    },
    {
      name: "H4 Headlight Bulb",
      category: "Lighting",
      averagePrice: 7.95,
      minPrice: 4.95,
      maxPrice: 12.95,
      unit: "Each",
      supplier: "Osram/Philips",
      partNumber: "H4-12V60/55W",
      usageFrequency: "High",
      description: "Standard H4 headlight bulb",
      vatRate: 20
    },

    // LABOUR CHARGES - Very High Usage
    {
      name: "Standard Labour Rate",
      category: "Labour",
      averagePrice: 70.00,
      minPrice: 60.00,
      maxPrice: 85.00,
      unit: "Hour",
      supplier: "Internal",
      usageFrequency: "Very High",
      description: "Standard hourly labour rate",
      vatRate: 20
    },
    {
      name: "Diagnostic Time",
      category: "Labour",
      averagePrice: 75.00,
      minPrice: 65.00,
      maxPrice: 90.00,
      unit: "Hour",
      supplier: "Internal",
      usageFrequency: "High",
      description: "Diagnostic labour rate",
      vatRate: 20
    },

    // MOT TESTS - Very High Usage
    {
      name: "MOT Test",
      category: "MOT Test",
      averagePrice: 54.85,
      minPrice: 54.85,
      maxPrice: 54.85,
      unit: "Test",
      supplier: "DVSA",
      usageFrequency: "Very High",
      description: "Standard MOT test fee",
      vatRate: 0
    },
    {
      name: "MOT Re-test (Partial)",
      category: "MOT Test",
      averagePrice: 27.40,
      minPrice: 27.40,
      maxPrice: 27.40,
      unit: "Test",
      supplier: "DVSA",
      usageFrequency: "Medium",
      description: "Partial MOT re-test fee",
      vatRate: 0
    }
  ]

  // Group by category and calculate statistics
  const categoryStats = comprehensivePartsList.reduce((acc, part) => {
    if (!acc[part.category]) {
      acc[part.category] = {
        count: 0,
        totalValue: 0,
        averagePrice: 0,
        parts: []
      }
    }
    acc[part.category].count++
    acc[part.category].totalValue += part.averagePrice
    acc[part.category].parts.push(part)
    return acc
  }, {} as Record<string, any>)

  // Calculate average prices per category
  Object.keys(categoryStats).forEach(category => {
    categoryStats[category].averagePrice = 
      Math.round((categoryStats[category].totalValue / categoryStats[category].count) * 100) / 100
  })

  // Sort parts by usage frequency and price
  const sortedParts = comprehensivePartsList.sort((a, b) => {
    const frequencyOrder = { 'Very High': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
    const aScore = frequencyOrder[a.usageFrequency] * 1000 + (100 - a.averagePrice)
    const bScore = frequencyOrder[b.usageFrequency] * 1000 + (100 - b.averagePrice)
    return bScore - aScore
  })

  return NextResponse.json({
    success: true,
    totalParts: comprehensivePartsList.length,
    categories: Object.keys(categoryStats),
    categoryStats,
    topParts: sortedParts.slice(0, 50),
    allParts: sortedParts,
    analysis: {
      mostCommonCategory: Object.entries(categoryStats)
        .sort(([,a], [,b]) => b.count - a.count)[0]?.[0] || 'None',
      averagePartPrice: Math.round((comprehensivePartsList.reduce((sum, p) => sum + p.averagePrice, 0) / comprehensivePartsList.length) * 100) / 100,
      highestPricedPart: sortedParts.reduce((max, part) => part.averagePrice > max.averagePrice ? part : max, sortedParts[0]),
      mostUsedParts: sortedParts.filter(p => p.usageFrequency === 'Very High').length
    },
    priceRanges: {
      under10: comprehensivePartsList.filter(p => p.averagePrice < 10).length,
      between10and50: comprehensivePartsList.filter(p => p.averagePrice >= 10 && p.averagePrice < 50).length,
      between50and100: comprehensivePartsList.filter(p => p.averagePrice >= 50 && p.averagePrice < 100).length,
      over100: comprehensivePartsList.filter(p => p.averagePrice >= 100).length
    }
  })
}
