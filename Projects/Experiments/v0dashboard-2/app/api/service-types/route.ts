import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// GET /api/service-types - List all service types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    let serviceTypes

    if (activeOnly) {
      serviceTypes = await sql`
        SELECT * FROM service_types
        WHERE is_active = true
        ORDER BY name ASC
      `
    } else {
      serviceTypes = await sql`
        SELECT * FROM service_types
        ORDER BY name ASC
      `
    }

    return NextResponse.json({
      success: true,
      data: serviceTypes
    })

  } catch (error) {
    console.error('❌ [SERVICE-TYPES] Error fetching service types:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/service-types - Create new service type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      duration_minutes = 60,
      price = 0.00,
      color = '#3B82F6',
      requires_mot_bay = false,
      requires_lift = false,
      max_concurrent = 1
    } = body

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Service name is required'
      }, { status: 400 })
    }

    const serviceType = await sql`
      INSERT INTO service_types (
        name,
        description,
        duration_minutes,
        price,
        color,
        requires_mot_bay,
        requires_lift,
        max_concurrent
      ) VALUES (
        ${name},
        ${description},
        ${duration_minutes},
        ${price},
        ${color},
        ${requires_mot_bay},
        ${requires_lift},
        ${max_concurrent}
      )
      RETURNING *
    `

    console.log(`✅ [SERVICE-TYPES] Created service type: ${name}`)

    return NextResponse.json({
      success: true,
      data: serviceType[0],
      message: 'Service type created successfully'
    })

  } catch (error) {
    console.error('❌ [SERVICE-TYPES] Error creating service type:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/service-types - Update service type
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Service type ID is required'
      }, { status: 400 })
    }

    const serviceType = await sql`
      UPDATE service_types 
      SET ${sql(updateData)}
      WHERE id = ${id}
      RETURNING *
    `

    if (serviceType.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Service type not found'
      }, { status: 404 })
    }

    console.log(`✅ [SERVICE-TYPES] Updated service type: ${serviceType[0].name}`)

    return NextResponse.json({
      success: true,
      data: serviceType[0],
      message: 'Service type updated successfully'
    })

  } catch (error) {
    console.error('❌ [SERVICE-TYPES] Error updating service type:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
