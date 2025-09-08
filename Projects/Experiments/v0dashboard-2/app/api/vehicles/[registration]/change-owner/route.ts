import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration } = await params
    const body = await request.json()
    const { 
      newCustomerId, 
      changeType, 
      changeDate, 
      notes,
      newCustomerInfo // For creating new customer if needed
    } = body

    console.log(`[CHANGE-OWNER] Processing ownership change for ${registration}`)

    // Get current vehicle and owner information
    const currentVehicle = await sql`
      SELECT v.*, c.first_name, c.last_name, c.phone, c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE UPPER(v.registration) = UPPER(${registration})
      ORDER BY v.created_at DESC
      LIMIT 1
    `

    if (currentVehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Vehicle not found'
      }, { status: 404 })
    }

    const vehicle = currentVehicle[0]
    const previousOwnerId = vehicle.customer_id

    let finalNewCustomerId = newCustomerId

    // If creating a new customer
    if (newCustomerInfo && !newCustomerId) {
      console.log('[CHANGE-OWNER] Creating new customer')
      
      // Generate a unique customer ID
      const customerId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      const newCustomer = await sql`
        INSERT INTO customers (
          id,
          first_name,
          last_name,
          phone,
          email,
          address_line1,
          postcode,
          created_at,
          updated_at
        ) VALUES (
          ${customerId},
          ${newCustomerInfo.firstName},
          ${newCustomerInfo.lastName},
          ${newCustomerInfo.phone},
          ${newCustomerInfo.email},
          ${newCustomerInfo.address || ''},
          ${newCustomerInfo.postcode || ''},
          NOW(),
          NOW()
        )
        RETURNING id, first_name, last_name
      `
      
      finalNewCustomerId = newCustomer[0].id
      console.log(`[CHANGE-OWNER] Created new customer with ID: ${finalNewCustomerId}`)
    }

    // Record the ownership change
    const ownershipChange = await sql`
      INSERT INTO vehicle_ownership_changes (
        vehicle_registration,
        previous_owner_id,
        new_owner_id,
        change_type,
        change_date,
        reported_by,
        notes,
        created_at,
        verified
      ) VALUES (
        ${registration},
        ${previousOwnerId},
        ${finalNewCustomerId},
        ${changeType || 'transferred'},
        ${changeDate || new Date().toISOString().split('T')[0]},
        'manual',
        ${notes || ''},
        NOW(),
        true
      )
      RETURNING id
    `

    // Update the vehicle record
    if (changeType === 'sold' || changeType === 'transferred') {
      // Mark old vehicle as inactive
      await sql`
        UPDATE vehicles 
        SET 
          active = FALSE,
          ownership_status = ${changeType},
          updated_at = NOW()
        WHERE UPPER(registration) = UPPER(${registration}) 
          AND customer_id = ${previousOwnerId}
      `

      // Update existing vehicle record with new owner if provided
      if (finalNewCustomerId) {
        await sql`
          UPDATE vehicles
          SET
            customer_id = ${finalNewCustomerId},
            updated_at = NOW()
          WHERE UPPER(registration) = UPPER(${registration})
        `
      }
    } else if (changeType === 'scrapped' || changeType === 'exported') {
      // Just mark as inactive, no new owner
      await sql`
        UPDATE vehicles 
        SET 
          active = FALSE,
          ownership_status = ${changeType},
          updated_at = NOW()
        WHERE UPPER(registration) = UPPER(${registration}) 
          AND customer_id = ${previousOwnerId}
      `
    }

    // Get updated vehicle information
    const updatedVehicle = await sql`
      SELECT v.*, c.first_name, c.last_name, c.phone, c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE UPPER(v.registration) = UPPER(${registration})
        AND v.active = true
      ORDER BY v.created_at DESC
      LIMIT 1
    `

    console.log('[CHANGE-OWNER] Updated vehicle query result:', updatedVehicle)

    // Get previous owner info
    const previousOwner = await sql`
      SELECT first_name, last_name, phone, email
      FROM customers
      WHERE id = ${previousOwnerId}
    `

    // Get new owner info
    const newOwnerInfo = await sql`
      SELECT first_name, last_name, phone, email
      FROM customers
      WHERE id = ${finalNewCustomerId}
    `

    return NextResponse.json({
      success: true,
      message: 'Vehicle ownership changed successfully',
      ownershipChangeId: ownershipChange[0].id,
      vehicle: {
        registration: registration,
        previousOwner: previousOwner[0] ? {
          id: previousOwnerId,
          name: `${previousOwner[0].first_name} ${previousOwner[0].last_name}`,
          phone: previousOwner[0].phone,
          email: previousOwner[0].email
        } : null,
        newOwner: newOwnerInfo[0] ? {
          id: finalNewCustomerId,
          name: `${newOwnerInfo[0].first_name} ${newOwnerInfo[0].last_name}`,
          phone: newOwnerInfo[0].phone || '',
          email: newOwnerInfo[0].email || ''
        } : {
          id: finalNewCustomerId,
          name: 'Unknown Customer',
          phone: '',
          email: ''
        },
        changeType: changeType,
        changeDate: changeDate || new Date().toISOString().split('T')[0]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CHANGE-OWNER] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration } = await params

    // Get ownership history
    const ownershipHistory = await sql`
      SELECT 
        voc.*,
        prev_c.first_name as prev_first_name,
        prev_c.last_name as prev_last_name,
        prev_c.phone as prev_phone,
        new_c.first_name as new_first_name,
        new_c.last_name as new_last_name,
        new_c.phone as new_phone
      FROM vehicle_ownership_changes voc
      LEFT JOIN customers prev_c ON voc.previous_owner_id = prev_c.id
      LEFT JOIN customers new_c ON voc.new_owner_id = new_c.id
      WHERE UPPER(voc.vehicle_registration) = UPPER(${registration})
      ORDER BY voc.change_date DESC, voc.created_at DESC
    `

    // Get current vehicle status
    const currentVehicle = await sql`
      SELECT v.*, c.first_name, c.last_name, c.phone, c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE UPPER(v.registration) = UPPER(${registration})
        AND v.active = true
      ORDER BY v.created_at DESC
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      registration: registration,
      currentOwner: currentVehicle[0] ? {
        id: currentVehicle[0].customer_id,
        name: `${currentVehicle[0].first_name} ${currentVehicle[0].last_name}`,
        phone: currentVehicle[0].phone,
        email: currentVehicle[0].email,
        ownershipStatus: currentVehicle[0].ownership_status
      } : null,
      ownershipHistory: ownershipHistory.map(change => ({
        id: change.id,
        changeType: change.change_type,
        changeDate: change.change_date,
        reportedBy: change.reported_by,
        verified: change.verified,
        notes: change.notes,
        previousOwner: change.prev_first_name ? {
          name: `${change.prev_first_name} ${change.prev_last_name}`,
          phone: change.prev_phone
        } : null,
        newOwner: change.new_first_name ? {
          name: `${change.new_first_name} ${change.new_last_name}`,
          phone: change.new_phone
        } : null
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CHANGE-OWNER] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
