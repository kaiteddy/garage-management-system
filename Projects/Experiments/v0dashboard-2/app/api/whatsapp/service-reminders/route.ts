import { NextRequest, NextResponse } from 'next/server'
import { getVehiclesNeedingServiceReminders, sendServiceReminders, processServiceReminders } from '@/lib/service-reminder-scheduler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'preview'
    const serviceType = searchParams.get('serviceType') // 'small', 'full', 'aircon', 'combo'
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log(`🔧 [SERVICE-REMINDERS-API] ${action} request for service reminders`)

    if (action === 'preview') {
      // Get vehicles needing service reminders for preview
      const vehicles = await getVehiclesNeedingServiceReminders()
      
      // Filter by service type if specified
      let filteredVehicles = vehicles
      if (serviceType) {
        switch (serviceType) {
          case 'small':
            filteredVehicles = vehicles.filter(v => v.serviceType === 'small_service')
            break
          case 'full':
            filteredVehicles = vehicles.filter(v => v.serviceType === 'full_service')
            break
          case 'aircon':
            filteredVehicles = vehicles.filter(v => v.serviceType === 'aircon_service')
            break
          case 'combo':
            filteredVehicles = vehicles.filter(v => v.serviceType === 'mot_service_combo')
            break
        }
      }

      // Apply limit
      filteredVehicles = filteredVehicles.slice(0, limit)

      // Calculate summary statistics
      const summary = {
        total: vehicles.length,
        filtered: filteredVehicles.length,
        byType: {
          small_service: vehicles.filter(v => v.serviceType === 'small_service').length,
          full_service: vehicles.filter(v => v.serviceType === 'full_service').length,
          aircon_service: vehicles.filter(v => v.serviceType === 'aircon_service').length,
          mot_service_combo: vehicles.filter(v => v.serviceType === 'mot_service_combo').length
        },
        byUrgency: {
          low: vehicles.filter(v => v.urgencyLevel === 'low').length,
          medium: vehicles.filter(v => v.urgencyLevel === 'medium').length,
          high: vehicles.filter(v => v.urgencyLevel === 'high').length,
          critical: vehicles.filter(v => v.urgencyLevel === 'critical').length
        },
        estimatedCost: filteredVehicles.length * 0.005 // £0.005 per WhatsApp message
      }

      return NextResponse.json({
        success: true,
        message: `Found ${summary.total} vehicles needing service reminders`,
        data: {
          vehicles: filteredVehicles,
          summary,
          preview: filteredVehicles.slice(0, 5).map(v => ({
            customer: v.customerName,
            vehicle: `${v.make} ${v.model} (${v.registration})`,
            serviceType: v.serviceType,
            monthsOverdue: v.monthsOverdue,
            urgency: v.urgencyLevel,
            phone: v.phone.replace(/(\d{5})\d{6}(\d{3})/, '$1******$2') // Mask phone number
          }))
        }
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action. Use ?action=preview'
    }, { status: 400 })

  } catch (error) {
    console.error('🔧 [SERVICE-REMINDERS-API] Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process service reminders request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action = 'send',
      serviceType,
      limit = 50,
      testMode = false,
      urgencyFilter // 'low', 'medium', 'high', 'critical'
    } = body

    console.log(`🔧 [SERVICE-REMINDERS-API] POST ${action} request:`, { serviceType, limit, testMode, urgencyFilter })

    if (action === 'send') {
      if (testMode) {
        // Test mode - just preview what would be sent
        const vehicles = await getVehiclesNeedingServiceReminders()
        
        let filteredVehicles = vehicles
        
        // Apply service type filter
        if (serviceType) {
          switch (serviceType) {
            case 'small':
              filteredVehicles = vehicles.filter(v => v.serviceType === 'small_service')
              break
            case 'full':
              filteredVehicles = vehicles.filter(v => v.serviceType === 'full_service')
              break
            case 'aircon':
              filteredVehicles = vehicles.filter(v => v.serviceType === 'aircon_service')
              break
            case 'combo':
              filteredVehicles = vehicles.filter(v => v.serviceType === 'mot_service_combo')
              break
          }
        }

        // Apply urgency filter
        if (urgencyFilter) {
          filteredVehicles = filteredVehicles.filter(v => v.urgencyLevel === urgencyFilter)
        }

        // Apply limit
        filteredVehicles = filteredVehicles.slice(0, limit)

        return NextResponse.json({
          success: true,
          message: `TEST MODE: Would send ${filteredVehicles.length} service reminders`,
          data: {
            testMode: true,
            wouldSend: filteredVehicles.length,
            estimatedCost: filteredVehicles.length * 0.005,
            preview: filteredVehicles.slice(0, 10).map(v => ({
              customer: v.customerName,
              vehicle: `${v.make} ${v.model} (${v.registration})`,
              serviceType: v.serviceType,
              monthsOverdue: v.monthsOverdue,
              urgency: v.urgencyLevel
            }))
          }
        })
      } else {
        // Live mode - actually send reminders
        const result = await processServiceReminders()
        
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.data
        })
      }
    }

    if (action === 'send_specific') {
      // Send reminders for specific vehicles
      const { vehicleIds } = body
      
      if (!vehicleIds || !Array.isArray(vehicleIds)) {
        return NextResponse.json({
          success: false,
          message: 'vehicleIds array is required for send_specific action'
        }, { status: 400 })
      }

      const allVehicles = await getVehiclesNeedingServiceReminders()
      const specificVehicles = allVehicles.filter(v => vehicleIds.includes(v.vehicleId))

      if (specificVehicles.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No matching vehicles found for the provided IDs'
        }, { status: 404 })
      }

      const result = await sendServiceReminders(specificVehicles)

      return NextResponse.json({
        success: result.success,
        message: `Sent ${result.sent} service reminders, ${result.failed} failed`,
        data: result
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action. Use "send", "send_specific", or include ?action=preview for GET'
    }, { status: 400 })

  } catch (error) {
    console.error('🔧 [SERVICE-REMINDERS-API] POST Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to send service reminders',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
