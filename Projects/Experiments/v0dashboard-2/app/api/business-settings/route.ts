import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[BUSINESS-SETTINGS] Fetching all business settings...")

    // Get all business settings
    const settings = await sql`
      SELECT setting_key, setting_value, setting_type, category, description, is_active
      FROM business_settings
      WHERE is_active = true
      ORDER BY category, setting_key
    `

    // Get all technicians
    const technicians = await sql`
      SELECT id, name, email, phone, specialization, is_active
      FROM technicians
      WHERE is_active = true
      ORDER BY name
    `

    // Get all service bays
    const serviceBays = await sql`
      SELECT id, name, description, bay_type, is_active
      FROM service_bays
      WHERE is_active = true
      ORDER BY name
    `

    // Transform settings into a more usable format
    const settingsMap = settings.reduce((acc: any, setting: any) => {
      let value = setting.setting_value
      
      // Parse values based on type
      switch (setting.setting_type) {
        case 'boolean':
          value = value === 'true'
          break
        case 'integer':
          value = parseInt(value) || 0
          break
        case 'decimal':
          value = parseFloat(value) || 0
          break
        case 'array':
          value = value ? value.split(',').map((v: string) => v.trim()) : []
          break
        case 'json':
          try {
            value = JSON.parse(value)
          } catch {
            value = {}
          }
          break
      }

      acc[setting.setting_key] = {
        value,
        type: setting.setting_type,
        category: setting.category,
        description: setting.description
      }
      return acc
    }, {})

    // Group settings by category
    const settingsByCategory = settings.reduce((acc: any, setting: any) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {}
      }
      
      let value = setting.setting_value
      switch (setting.setting_type) {
        case 'boolean':
          value = value === 'true'
          break
        case 'integer':
          value = parseInt(value) || 0
          break
        case 'decimal':
          value = parseFloat(value) || 0
          break
        case 'array':
          value = value ? value.split(',').map((v: string) => v.trim()) : []
          break
        case 'json':
          try {
            value = JSON.parse(value)
          } catch {
            value = {}
          }
          break
      }

      acc[setting.category][setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description
      }
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      settingsByCategory,
      technicians,
      serviceBays,
      counts: {
        settings: settings.length,
        technicians: technicians.length,
        serviceBays: serviceBays.length
      }
    })

  } catch (error) {
    console.error("[BUSINESS-SETTINGS] Error fetching settings:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch business settings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'update_setting') {
      const { key, value, type } = data
      
      // Convert value to string for storage
      let stringValue = value
      if (type === 'array') {
        stringValue = Array.isArray(value) ? value.join(',') : value
      } else if (type === 'json') {
        stringValue = JSON.stringify(value)
      } else {
        stringValue = String(value)
      }

      await sql`
        UPDATE business_settings
        SET setting_value = ${stringValue}, updated_at = CURRENT_TIMESTAMP
        WHERE setting_key = ${key}
      `

      return NextResponse.json({
        success: true,
        message: `Setting ${key} updated successfully`
      })
    }

    if (action === 'add_technician') {
      const { name, email, phone, specialization } = data
      
      const result = await sql`
        INSERT INTO technicians (name, email, phone, specialization)
        VALUES (${name}, ${email || ''}, ${phone || ''}, ${specialization || ''})
        RETURNING id, name
      `

      return NextResponse.json({
        success: true,
        message: "Technician added successfully",
        technician: result[0]
      })
    }

    if (action === 'update_technician') {
      const { id, name, email, phone, specialization, is_active } = data
      
      await sql`
        UPDATE technicians
        SET name = ${name}, email = ${email || ''}, phone = ${phone || ''}, 
            specialization = ${specialization || ''}, is_active = ${is_active !== false},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Technician updated successfully"
      })
    }

    if (action === 'delete_technician') {
      const { id } = data
      
      await sql`
        UPDATE technicians
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Technician deactivated successfully"
      })
    }

    if (action === 'add_service_bay') {
      const { name, description, bay_type } = data
      
      const result = await sql`
        INSERT INTO service_bays (name, description, bay_type)
        VALUES (${name}, ${description || ''}, ${bay_type || 'general'})
        RETURNING id, name
      `

      return NextResponse.json({
        success: true,
        message: "Service bay added successfully",
        serviceBay: result[0]
      })
    }

    if (action === 'update_service_bay') {
      const { id, name, description, bay_type, is_active } = data
      
      await sql`
        UPDATE service_bays
        SET name = ${name}, description = ${description || ''}, 
            bay_type = ${bay_type || 'general'}, is_active = ${is_active !== false},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Service bay updated successfully"
      })
    }

    if (action === 'delete_service_bay') {
      const { id } = data
      
      await sql`
        UPDATE service_bays
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Service bay deactivated successfully"
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action"
    }, { status: 400 })

  } catch (error) {
    console.error("[BUSINESS-SETTINGS] Error updating settings:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to update business settings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
