import { NextResponse } from 'next/server'
import { getVehiclesNeedingServiceReminders } from '@/lib/service-reminder-scheduler'

export async function GET() {
  try {
    console.log('🔧 [TEST] Getting service reminders preview...')

    // Get vehicles needing service reminders
    const vehicles = await getVehiclesNeedingServiceReminders()

    // Group by service type
    const groupedByType = {
      mot_service_combo: vehicles.filter(v => v.serviceType === 'mot_service_combo'),
      full_service: vehicles.filter(v => v.serviceType === 'full_service'),
      small_service: vehicles.filter(v => v.serviceType === 'small_service'),
      aircon_service: vehicles.filter(v => v.serviceType === 'aircon_service')
    }

    // Group by urgency
    const groupedByUrgency = {
      critical: vehicles.filter(v => v.urgencyLevel === 'critical'),
      high: vehicles.filter(v => v.urgencyLevel === 'high'),
      medium: vehicles.filter(v => v.urgencyLevel === 'medium'),
      low: vehicles.filter(v => v.urgencyLevel === 'low')
    }

    // Create sample messages for each type
    const sampleMessages = {
      mot_service_combo: groupedByType.mot_service_combo.slice(0, 3).map(v => ({
        customer: v.customerName,
        vehicle: `${v.make} ${v.model} (${v.registration})`,
        motExpiry: v.motExpiryDate ? new Date(v.motExpiryDate).toLocaleDateString('en-GB') : 'Unknown',
        lastService: v.lastFullService ? new Date(v.lastFullService).toLocaleDateString('en-GB') : 'Over 12 months ago',
        urgency: v.urgencyLevel,
        sampleMessage: `🚗 Eli Motors Ltd - MOT & Service Reminder

Hi ${v.customerName},

Your vehicle ${v.registration} needs both MOT and service attention:
• MOT expires: ${v.motExpiryDate ? new Date(v.motExpiryDate).toLocaleDateString('en-GB') : 'Unknown'}
• Last service: ${v.lastFullService ? new Date(v.lastFullService).toLocaleDateString('en-GB') : 'Over 12 months ago'}

📅 Book both services together and save time!
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Book today for peace of mind and optimal performance.`
      })),

      small_service: groupedByType.small_service.slice(0, 3).map(v => ({
        customer: v.customerName,
        vehicle: `${v.make} ${v.model} (${v.registration})`,
        lastService: v.lastSmallService ? new Date(v.lastSmallService).toLocaleDateString('en-GB') : 'Over 6 months ago',
        monthsOverdue: v.monthsOverdue,
        urgency: v.urgencyLevel,
        sampleMessage: `🔧 Eli Motors Ltd - Service Reminder

Hi ${v.customerName},

Your vehicle ${v.registration} is due for a service:
• Last service: ${v.lastSmallService ? new Date(v.lastSmallService).toLocaleDateString('en-GB') : 'Over 6 months ago'}
• Overdue by: ${v.monthsOverdue} months

🛠️ Oil change, filters & safety checks
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Keep your vehicle running smoothly - book today!`
      })),

      full_service: groupedByType.full_service.slice(0, 3).map(v => ({
        customer: v.customerName,
        vehicle: `${v.make} ${v.model} (${v.registration})`,
        lastService: v.lastFullService ? new Date(v.lastFullService).toLocaleDateString('en-GB') : 'Over 12 months ago',
        monthsOverdue: v.monthsOverdue,
        urgency: v.urgencyLevel,
        sampleMessage: `🛠️ Eli Motors Ltd - Full Service Due

Hi ${v.customerName},

Your vehicle ${v.registration} needs a comprehensive service:
• Last full service: ${v.lastFullService ? new Date(v.lastFullService).toLocaleDateString('en-GB') : 'Over 12 months ago'}
• Overdue by: ${v.monthsOverdue} months

🔍 Complete inspection, fluids, brakes & more
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Ensure safety and reliability - book your full service today!`
      })),

      aircon_service: groupedByType.aircon_service.slice(0, 3).map(v => ({
        customer: v.customerName,
        vehicle: `${v.make} ${v.model} (${v.registration})`,
        lastAirCon: v.lastAirConService ? new Date(v.lastAirConService).toLocaleDateString('en-GB') : 'Over 12 months ago',
        urgency: v.urgencyLevel,
        sampleMessage: `❄️ Eli Motors Ltd - Air-Con Service

Hi ${v.customerName},

Time to service your vehicle's air conditioning ${v.registration}:
• Last A/C service: ${v.lastAirConService ? new Date(v.lastAirConService).toLocaleDateString('en-GB') : 'Over 12 months ago'}
• Perfect timing: before summer arrives

🌡️ Stay cool with efficient air conditioning
📞 Call: 0208 203 6449
🌐 Visit: www.elimotors.co.uk
📍 Hendon, London

Beat the heat - book your air-con service today!`
      }))
    }

    const summary = {
      total: vehicles.length,
      byType: {
        mot_service_combo: groupedByType.mot_service_combo.length,
        full_service: groupedByType.full_service.length,
        small_service: groupedByType.small_service.length,
        aircon_service: groupedByType.aircon_service.length
      },
      byUrgency: {
        critical: groupedByUrgency.critical.length,
        high: groupedByUrgency.high.length,
        medium: groupedByUrgency.medium.length,
        low: groupedByUrgency.low.length
      },
      estimatedCosts: {
        whatsapp: vehicles.length * 0.005,
        sms: vehicles.length * 0.04,
        savings: vehicles.length * (0.04 - 0.005)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found ${vehicles.length} vehicles needing service reminders`,
      data: {
        summary,
        sampleMessages,
        templateStatus: {
          mot_reminder: '✅ Approved and working',
          mot_service_combo: '⏳ Needs approval',
          small_service: '⏳ Needs approval',
          full_service: '⏳ Needs approval',
          aircon_service: '⏳ Needs approval'
        },
        nextSteps: [
          '1. Submit 4 new templates to Twilio for WhatsApp approval',
          '2. Update template SIDs in lib/twilio-service.ts',
          '3. Test each template with testMode: true',
          '4. Launch comprehensive service reminder system'
        ]
      }
    })

  } catch (error) {
    console.error('🔧 [TEST] Error getting service reminders preview:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get service reminders preview',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
