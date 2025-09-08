import { NextRequest, NextResponse } from "next/server"
import { sql } from '@/lib/database/neon-client'
import { Part, PartSearchFilters, PartSearchResult, PartApiResponse } from '@/types/parts'

// Legacy Parts interface for backward compatibility
export interface LegacyPart {
  id: string
  name: string
  description: string
  category: string
  price: number
  unit: string
  supplier?: string
  partNumber?: string
  inStock?: number
  minStock?: number
  created_at?: string
  updated_at?: string
}

// Oil parts database with pricing
const oilPartsDatabase: { [key: string]: Omit<Part, 'id' | 'created_at' | 'updated_at'> } = {
  // Engine Oils
  '5W-30': {
    name: '5W-30 Engine Oil',
    description: '5W-30 Fully Synthetic Engine Oil',
    category: 'Engine Oil',
    price: 10.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: '5W30-1L',
    inStock: 100,
    minStock: 10
  },
  '5W-20': {
    name: '5W-20 Engine Oil',
    description: '5W-20 Fully Synthetic Engine Oil',
    category: 'Engine Oil',
    price: 10.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: '5W20-1L',
    inStock: 80,
    minStock: 10
  },
  '0W-20': {
    name: '0W-20 Engine Oil',
    description: '0W-20 Fully Synthetic Engine Oil',
    category: 'Engine Oil',
    price: 10.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: '0W20-1L',
    inStock: 60,
    minStock: 10
  },
  '10W-40': {
    name: '10W-40 Engine Oil',
    description: '10W-40 Semi-Synthetic Engine Oil',
    category: 'Engine Oil',
    price: 10.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: '10W40-1L',
    inStock: 90,
    minStock: 10
  },
  '15W-40': {
    name: '15W-40 Engine Oil',
    description: '15W-40 Mineral Engine Oil',
    category: 'Engine Oil',
    price: 10.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: '15W40-1L',
    inStock: 70,
    minStock: 10
  },

  // Transmission Oils
  'ATF': {
    name: 'ATF Transmission Oil',
    description: 'Automatic Transmission Fluid',
    category: 'Transmission Oil',
    price: 12.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'ATF-1L',
    inStock: 50,
    minStock: 5
  },
  'Manual Transmission Oil': {
    name: 'Manual Transmission Oil',
    description: 'Manual Gearbox Oil',
    category: 'Transmission Oil',
    price: 11.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'MTO-1L',
    inStock: 40,
    minStock: 5
  },

  // Brake Fluids
  'DOT 3': {
    name: 'DOT 3 Brake Fluid',
    description: 'DOT 3 Brake Fluid',
    category: 'Brake Fluid',
    price: 8.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'DOT3-1L',
    inStock: 30,
    minStock: 5
  },
  'DOT 4': {
    name: 'DOT 4 Brake Fluid',
    description: 'DOT 4 Brake Fluid',
    category: 'Brake Fluid',
    price: 9.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'DOT4-1L',
    inStock: 35,
    minStock: 5
  },
  'DOT 5.1': {
    name: 'DOT 5.1 Brake Fluid',
    description: 'DOT 5.1 High Performance Brake Fluid',
    category: 'Brake Fluid',
    price: 12.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'DOT51-1L',
    inStock: 20,
    minStock: 3
  },

  // Coolants
  'Universal': {
    name: 'Universal Coolant',
    description: 'Universal Antifreeze Coolant',
    category: 'Coolant',
    price: 7.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'COOL-UNI-1L',
    inStock: 60,
    minStock: 10
  },
  'G12++': {
    name: 'G12++ Coolant',
    description: 'G12++ Long Life Coolant',
    category: 'Coolant',
    price: 9.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'G12PP-1L',
    inStock: 40,
    minStock: 8
  },
  'Ford Orange': {
    name: 'Ford Orange Coolant',
    description: 'Ford Specific Orange Coolant',
    category: 'Coolant',
    price: 11.95,
    unit: 'Litre',
    supplier: 'Ford',
    partNumber: 'FORD-ORG-1L',
    inStock: 25,
    minStock: 5
  },

  // Power Steering Fluids
  'Power Steering ATF': {
    name: 'Power Steering Fluid (ATF)',
    description: 'ATF Type Power Steering Fluid',
    category: 'Power Steering Fluid',
    price: 8.95,
    unit: 'Litre',
    supplier: 'Various',
    partNumber: 'PSF-ATF-1L',
    inStock: 30,
    minStock: 5
  },

  // Air Con Refrigerants
  'R134a': {
    name: 'R134a Refrigerant',
    description: 'R134a Air Conditioning Refrigerant',
    category: 'Air Con Refrigerant',
    price: 15.95,
    unit: '500g',
    supplier: 'Various',
    partNumber: 'R134A-500G',
    inStock: 20,
    minStock: 3
  },
  'R1234yf': {
    name: 'R1234yf Refrigerant',
    description: 'R1234yf New Generation Refrigerant',
    category: 'Air Con Refrigerant',
    price: 25.95,
    unit: '500g',
    supplier: 'Various',
    partNumber: 'R1234YF-500G',
    inStock: 15,
    minStock: 2
  }
}

// Get all parts with advanced search and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Check if this is a legacy request (for backward compatibility)
    const isLegacyRequest = searchParams.get('legacy') === 'true' ||
                           searchParams.get('includeStock') === 'true'

    if (isLegacyRequest) {
      return await getLegacyParts(request)
    }

    // Parse search filters from query parameters
    const filters: PartSearchFilters = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      subcategory: searchParams.get('subcategory') || undefined,
      manufacturer: searchParams.get('manufacturer') || undefined,
      brand: searchParams.get('brand') || undefined,
      supplier_id: searchParams.get('supplier_id') || undefined,
      vehicle_make: searchParams.get('vehicle_make') || undefined,
      vehicle_model: searchParams.get('vehicle_model') || undefined,
      engine_code: searchParams.get('engine_code') || undefined,
      year_from: searchParams.get('year_from') ? parseInt(searchParams.get('year_from')!) : undefined,
      year_to: searchParams.get('year_to') ? parseInt(searchParams.get('year_to')!) : undefined,
      in_stock_only: searchParams.get('in_stock_only') === 'true',
      is_active: searchParams.get('is_active') !== 'false', // Default to true
      price_min: searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : undefined,
      price_max: searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'part_number',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    }

    console.log(`🔧 [PARTS-API] Getting parts with filters:`, filters)

    // Build WHERE clause
    const whereConditions: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (filters.search) {
      whereConditions.push(`(
        part_number ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex} OR
        oem_part_number ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${filters.search}%`)
      paramIndex++
    }

    if (filters.category) {
      whereConditions.push(`category = $${paramIndex}`)
      queryParams.push(filters.category)
      paramIndex++
    }

    if (filters.subcategory) {
      whereConditions.push(`subcategory = $${paramIndex}`)
      queryParams.push(filters.subcategory)
      paramIndex++
    }

    if (filters.manufacturer) {
      whereConditions.push(`manufacturer ILIKE $${paramIndex}`)
      queryParams.push(`%${filters.manufacturer}%`)
      paramIndex++
    }

    if (filters.brand) {
      whereConditions.push(`brand ILIKE $${paramIndex}`)
      queryParams.push(`%${filters.brand}%`)
      paramIndex++
    }

    if (filters.supplier_id) {
      whereConditions.push(`supplier_id = $${paramIndex}`)
      queryParams.push(filters.supplier_id)
      paramIndex++
    }

    if (filters.vehicle_make) {
      whereConditions.push(`$${paramIndex} = ANY(vehicle_makes)`)
      queryParams.push(filters.vehicle_make)
      paramIndex++
    }

    if (filters.vehicle_model) {
      whereConditions.push(`$${paramIndex} = ANY(vehicle_models)`)
      queryParams.push(filters.vehicle_model)
      paramIndex++
    }

    if (filters.engine_code) {
      whereConditions.push(`$${paramIndex} = ANY(engine_codes)`)
      queryParams.push(filters.engine_code)
      paramIndex++
    }

    if (filters.year_from) {
      whereConditions.push(`(year_to IS NULL OR year_to >= $${paramIndex})`)
      queryParams.push(filters.year_from)
      paramIndex++
    }

    if (filters.year_to) {
      whereConditions.push(`(year_from IS NULL OR year_from <= $${paramIndex})`)
      queryParams.push(filters.year_to)
      paramIndex++
    }

    if (filters.in_stock_only) {
      whereConditions.push(`quantity_in_stock > 0`)
    }

    if (filters.is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`)
      queryParams.push(filters.is_active)
      paramIndex++
    }

    if (filters.price_min) {
      whereConditions.push(`price_retail_net >= $${paramIndex}`)
      queryParams.push(filters.price_min)
      paramIndex++
    }

    if (filters.price_max) {
      whereConditions.push(`price_retail_net <= $${paramIndex}`)
      queryParams.push(filters.price_max)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Build ORDER BY clause
    const validSortColumns = ['part_number', 'description', 'price_retail_net', 'quantity_in_stock', 'created_at']
    const sortBy = validSortColumns.includes(filters.sort_by!) ? filters.sort_by : 'part_number'
    const sortOrder = filters.sort_order === 'desc' ? 'DESC' : 'ASC'
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`

    // Calculate pagination
    const offset = (filters.page! - 1) * filters.limit!

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM parts ${whereClause}`
    const countResult = await sql.query(countQuery, queryParams)
    const totalCount = countResult.rows && countResult.rows.length > 0 ? parseInt(countResult.rows[0].total) : 0

    // Get parts data
    const dataQuery = `
      SELECT
        id, part_number, oem_part_number, description, category, subcategory,
        cost_net, price_retail_net, price_trade_net, margin_percentage,
        quantity_in_stock, minimum_stock_level, location, bin_location,
        supplier_id, supplier_name, supplier_part_number, manufacturer, brand,
        vehicle_makes, vehicle_models, year_from, year_to, engine_codes,
        weight_kg, dimensions_length_mm, dimensions_width_mm, dimensions_height_mm, warranty_months,
        partsouq_id, partsouq_url, partsouq_last_updated, partsouq_price, partsouq_availability,
        notes, tags, is_active, is_hazardous, requires_core_exchange,
        created_at, updated_at, created_by, updated_by
      FROM parts
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(filters.limit, offset)
    const dataResult = await sql.query(dataQuery, queryParams)

    const result: PartSearchResult = {
      parts: (dataResult.rows || []) as Part[],
      total_count: totalCount,
      page: filters.page!,
      limit: filters.limit!,
      total_pages: Math.ceil(totalCount / filters.limit!)
    }

    console.log(`✅ [PARTS-API] Found ${result.parts.length} parts (${totalCount} total)`)

    const response: PartApiResponse<PartSearchResult> = {
      success: true,
      data: result
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [PARTS-API] Error getting parts:', error)
    const response: PartApiResponse = {
      success: false,
      error: 'Failed to fetch parts'
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// Legacy parts function for backward compatibility
async function getLegacyParts(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const includeStock = searchParams.get('includeStock') === 'true'

    console.log(`🔧 [PARTS-API] Getting legacy parts - Category: ${category}, Search: ${search}, Include Stock: ${includeStock}`)

    let allParts: LegacyPart[] = []

    // Get oil parts from our database
    const oilParts = Object.entries(oilPartsDatabase).map(([key, part]) => ({
      id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      ...part
    }))
    allParts.push(...oilParts)

    // Get stock items from new database if requested
    if (includeStock) {
      try {
        const stockQuery = `
          SELECT
            id, part_number, description, category,
            price_retail_net as price, quantity_in_stock, minimum_stock_level,
            supplier_name, manufacturer
          FROM parts
          WHERE is_active = true
        `
        const stockResult = await sql.query(stockQuery)
        const stockItems = stockResult.rows.map(item => ({
          id: `stock-${item.id}`,
          name: item.description || 'Unknown Item',
          description: item.description || '',
          category: item.category || 'Stock Item',
          price: item.price || 0,
          unit: 'Each',
          supplier: item.supplier_name || 'Unknown',
          partNumber: item.part_number || '',
          inStock: item.quantity_in_stock || 0,
          minStock: item.minimum_stock_level || 0
        }))
        allParts.push(...stockItems)
      } catch (error) {
        console.warn('Could not load stock items from database:', error)
      }
    }

    // Filter by category if specified
    if (category) {
      allParts = allParts.filter(part =>
        part.category.toLowerCase().includes(category.toLowerCase())
      )
    }

    // Filter by search term if specified
    if (search) {
      const searchLower = search.toLowerCase()
      allParts = allParts.filter(part =>
        part.name.toLowerCase().includes(searchLower) ||
        part.description.toLowerCase().includes(searchLower) ||
        part.category.toLowerCase().includes(searchLower)
      )
    }

    console.log(`✅ [PARTS-API] Found ${allParts.length} legacy parts`)

    return NextResponse.json({
      success: true,
      data: allParts,
      count: allParts.length,
      message: `Found ${allParts.length} parts`
    })

  } catch (error) {
    console.error('❌ [PARTS-API] Error getting legacy parts:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get parts",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Create new part or search for existing part
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a legacy search request
    if (body.partId || body.viscosity || body.type) {
      return await handleLegacyPartSearch(body)
    }

    // This is a new part creation request
    return await createNewPart(body)

  } catch (error) {
    console.error('❌ [PARTS-API] Error in POST:', error)
    const response: PartApiResponse = {
      success: false,
      error: 'Failed to process request'
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// Handle legacy part search
async function handleLegacyPartSearch(body: any) {
  try {
    const { partId, viscosity, type, category } = body

    console.log(`🔧 [PARTS-API] Finding legacy part - ID: ${partId}, Viscosity: ${viscosity}, Type: ${type}, Category: ${category}`)

    let part = null

    // Try to find by exact ID first
    if (partId && oilPartsDatabase[partId]) {
      part = {
        id: partId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ...oilPartsDatabase[partId]
      }
    }
    // Try to find by viscosity (for engine oils)
    else if (viscosity && oilPartsDatabase[viscosity]) {
      part = {
        id: viscosity.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ...oilPartsDatabase[viscosity]
      }
    }
    // Try to find by type (for other fluids)
    else if (type && oilPartsDatabase[type]) {
      part = {
        id: type.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ...oilPartsDatabase[type]
      }
    }
    // Search through all parts for a match
    else {
      const searchTerm = partId || viscosity || type || ''
      const matchingEntry = Object.entries(oilPartsDatabase).find(([key, partData]) =>
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partData.description.toLowerCase().includes(searchTerm.toLowerCase())
      )

      if (matchingEntry) {
        part = {
          id: matchingEntry[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
          ...matchingEntry[1]
        }
      }
    }

    if (!part) {
      return NextResponse.json(
        { success: false, error: "Part not found" },
        { status: 404 }
      )
    }

    console.log(`✅ [PARTS-API] Found legacy part: ${part.name}`)

    return NextResponse.json({
      success: true,
      data: part,
      message: `Found part: ${part.name}`
    })

  } catch (error) {
    console.error('❌ [PARTS-API] Error finding legacy part:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to find part",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Create new part in database
async function createNewPart(partData: any) {
  try {
    console.log(`🔧 [PARTS-API] Creating new part:`, partData.part_number)

    // Validate required fields
    if (!partData.part_number || !partData.description) {
      const response: PartApiResponse = {
        success: false,
        error: 'Part number and description are required'
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Insert new part
    const insertQuery = `
      INSERT INTO parts (
        part_number, oem_part_number, description, category, subcategory,
        cost_net, price_retail_net, price_trade_net, margin_percentage,
        quantity_in_stock, minimum_stock_level, location, bin_location,
        supplier_id, supplier_name, supplier_part_number, manufacturer, brand,
        vehicle_makes, vehicle_models, year_from, year_to, engine_codes,
        weight_kg, dimensions_length_mm, dimensions_width_mm, dimensions_height_mm, warranty_months,
        partsouq_id, partsouq_url, partsouq_price, partsouq_availability,
        notes, tags, is_active, is_hazardous, requires_core_exchange,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37
      ) RETURNING *
    `

    const values = [
      partData.part_number,
      partData.oem_part_number || null,
      partData.description,
      partData.category || null,
      partData.subcategory || null,
      partData.cost_net || 0,
      partData.price_retail_net || 0,
      partData.price_trade_net || 0,
      partData.margin_percentage || null,
      partData.quantity_in_stock || 0,
      partData.minimum_stock_level || 0,
      partData.location || null,
      partData.bin_location || null,
      partData.supplier_id || null,
      partData.supplier_name || null,
      partData.supplier_part_number || null,
      partData.manufacturer || null,
      partData.brand || null,
      partData.vehicle_makes || null,
      partData.vehicle_models || null,
      partData.year_from || null,
      partData.year_to || null,
      partData.engine_codes || null,
      partData.weight_kg || null,
      partData.dimensions_length_mm || null,
      partData.dimensions_width_mm || null,
      partData.dimensions_height_mm || null,
      partData.warranty_months || null,
      partData.partsouq_id || null,
      partData.partsouq_url || null,
      partData.partsouq_price || null,
      partData.partsouq_availability || null,
      partData.notes || null,
      partData.tags || null,
      partData.is_active !== undefined ? partData.is_active : true,
      partData.is_hazardous || false,
      partData.requires_core_exchange || false,
      partData.created_by || 'system'
    ]

    const result = await sql.query(insertQuery, values)
    const newPart = result.rows[0] as Part

    console.log(`✅ [PARTS-API] Created new part: ${newPart.part_number}`)

    const response: PartApiResponse<Part> = {
      success: true,
      data: newPart,
      message: 'Part created successfully'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('❌ [PARTS-API] Error creating part:', error)

    let errorMessage = 'Failed to create part'
    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'Part number already exists'
    }

    const response: PartApiResponse = {
      success: false,
      error: errorMessage
    }
    return NextResponse.json(response, { status: 500 })
  }
}
