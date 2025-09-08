/**
 * Service Reminder Scheduling System
 * This handles the automatic detection and sending of service reminders
 */

import { sql } from '@/lib/database/neon-client'
import { TwilioService } from './twilio-service'

export interface ServiceReminderConfig {
  smallServiceIntervalMonths: number // 6 months for oil changes, basic service
  fullServiceIntervalMonths: number // 12 months for comprehensive service
  airConServiceIntervalMonths: number // 12 months for air-con service
  reminderAdvanceDays: number // Days before service due to send reminder
  enableWhatsApp: boolean
  enableSMS: boolean
  businessHours: {
    start: string // "09:00"
    end: string // "17:00"
  }
  workingDays: number[] // [1,2,3,4,5] for Mon-Fri
}

const defaultConfig: ServiceReminderConfig = {
  smallServiceIntervalMonths: 6,
  fullServiceIntervalMonths: 12,
  airConServiceIntervalMonths: 12,
  reminderAdvanceDays: 14, // 2 weeks advance notice
  enableWhatsApp: true,
  enableSMS: false,
  businessHours: {
    start: "09:00",
    end: "17:00",
  },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
}

export interface VehicleServiceData {
  vehicleId: string
  registration: string
  make: string
  model: string
  customerId: string
  customerName: string
  phone: string
  lastSmallService?: string
  lastFullService?: string
  lastAirConService?: string
  motExpiryDate?: string
  serviceType: 'small_service' | 'full_service' | 'aircon_service' | 'mot_service_combo'
  daysOverdue: number
  monthsOverdue: number
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Detect service type from document description
 */
function detectServiceType(description: string): 'full_service' | 'small_service' | 'aircon_service' | 'mot' | 'repair' | 'other' {
  const desc = description.toLowerCase()

  // MOT test detection
  if (desc.includes('mot') || desc.includes('m.o.t')) {
    return 'mot'
  }

  // Air-con service detection
  if (desc.includes('air con') || desc.includes('aircon') || desc.includes('air-con') || 
      desc.includes('a/c') || desc.includes('air conditioning') || desc.includes('refrigerant')) {
    return 'aircon_service'
  }

  // Full service detection
  if (desc.includes('full service') || desc.includes('major service') ||
      desc.includes('annual service') || desc.includes('comprehensive service') ||
      desc.includes('complete service')) {
    return 'full_service'
  }

  // Small service detection
  if (desc.includes('basic service') || desc.includes('minor service') ||
      desc.includes('oil change') || desc.includes('interim service') ||
      desc.includes('oil and filter') || desc.includes('small service')) {
    return 'small_service'
  }

  // Repair detection
  if (desc.includes('repair') || desc.includes('replace') || desc.includes('fix')) {
    return 'repair'
  }

  return 'other'
}

/**
 * Get vehicles needing service reminders
 */
export async function getVehiclesNeedingServiceReminders(config: ServiceReminderConfig = defaultConfig): Promise<VehicleServiceData[]> {
  try {
    console.log('🔧 [SERVICE-SCHEDULER] Getting vehicles needing service reminders...')

    // Get all vehicles with their service history
    const vehiclesWithServiceHistory = await sql`
      WITH vehicle_service_summary AS (
        SELECT 
          v.id as vehicle_id,
          v.registration,
          v.make,
          v.model,
          v.customer_id,
          v.owner_id,
          v.mot_expiry_date,
          c.first_name,
          c.last_name,
          COALESCE(c.twilio_phone, c.phone) as phone,
          
          -- Get last service dates by type
          MAX(CASE WHEN d.labour_description ILIKE '%oil%' OR d.labour_description ILIKE '%basic%' OR d.labour_description ILIKE '%minor%' 
                   THEN d.document_date END) as last_small_service,
          MAX(CASE WHEN d.labour_description ILIKE '%full%' OR d.labour_description ILIKE '%major%' OR d.labour_description ILIKE '%annual%' 
                   THEN d.document_date END) as last_full_service,
          MAX(CASE WHEN d.labour_description ILIKE '%air%con%' OR d.labour_description ILIKE '%a/c%' OR d.labour_description ILIKE '%refrigerant%' 
                   THEN d.document_date END) as last_aircon_service,
          
          -- Calculate months since last services
          EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(CASE WHEN d.labour_description ILIKE '%oil%' OR d.labour_description ILIKE '%basic%' OR d.labour_description ILIKE '%minor%' 
                                                       THEN d.document_date END))) / (30.44 * 24 * 3600) as months_since_small_service,
          EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(CASE WHEN d.labour_description ILIKE '%full%' OR d.labour_description ILIKE '%major%' OR d.labour_description ILIKE '%annual%' 
                                                       THEN d.document_date END))) / (30.44 * 24 * 3600) as months_since_full_service,
          EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(CASE WHEN d.labour_description ILIKE '%air%con%' OR d.labour_description ILIKE '%a/c%' OR d.labour_description ILIKE '%refrigerant%' 
                                                       THEN d.document_date END))) / (30.44 * 24 * 3600) as months_since_aircon_service
          
        FROM vehicles v
        LEFT JOIN customers c ON (v.customer_id = c.id OR v.owner_id = c.id)
        LEFT JOIN documents d ON (c.id = d.customer_id)
        WHERE COALESCE(c.twilio_phone, c.phone) IS NOT NULL
          AND COALESCE(c.twilio_phone, c.phone) != ''
          AND (c.opt_out = FALSE OR c.opt_out IS NULL)
        GROUP BY v.id, v.registration, v.make, v.model, v.customer_id, v.owner_id, v.mot_expiry_date, 
                 c.first_name, c.last_name, c.twilio_phone, c.phone
      )
      
      SELECT *
      FROM vehicle_service_summary
      WHERE (
        -- Small service overdue (6+ months)
        (months_since_small_service IS NULL OR months_since_small_service >= ${config.smallServiceIntervalMonths}) OR
        -- Full service overdue (12+ months)
        (months_since_full_service IS NULL OR months_since_full_service >= ${config.fullServiceIntervalMonths}) OR
        -- Air-con service overdue (12+ months)
        (months_since_aircon_service IS NULL OR months_since_aircon_service >= ${config.airConServiceIntervalMonths})
      )
      ORDER BY months_since_full_service DESC NULLS FIRST, months_since_small_service DESC NULLS FIRST
      LIMIT 100
    `

    const serviceReminders: VehicleServiceData[] = []

    for (const vehicle of vehiclesWithServiceHistory) {
      const customerName = `${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim()
      
      // Determine primary service needed and urgency
      let serviceType: VehicleServiceData['serviceType'] = 'small_service'
      let monthsOverdue = 0
      let urgencyLevel: VehicleServiceData['urgencyLevel'] = 'medium'

      // Check if MOT is also due soon (combo opportunity)
      const motDueSoon = vehicle.mot_expiry_date && 
        new Date(vehicle.mot_expiry_date) <= new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)) // 60 days

      // Determine service priority
      if (vehicle.months_since_full_service >= config.fullServiceIntervalMonths || !vehicle.last_full_service) {
        serviceType = motDueSoon ? 'mot_service_combo' : 'full_service'
        monthsOverdue = Math.floor(vehicle.months_since_full_service || 12)
        urgencyLevel = monthsOverdue > 18 ? 'critical' : monthsOverdue > 15 ? 'high' : 'medium'
      } else if (vehicle.months_since_small_service >= config.smallServiceIntervalMonths || !vehicle.last_small_service) {
        serviceType = 'small_service'
        monthsOverdue = Math.floor(vehicle.months_since_small_service || 6)
        urgencyLevel = monthsOverdue > 9 ? 'high' : 'medium'
      } else if (vehicle.months_since_aircon_service >= config.airConServiceIntervalMonths || !vehicle.last_aircon_service) {
        // Only suggest air-con in spring/early summer (March-June)
        const currentMonth = new Date().getMonth() + 1
        if (currentMonth >= 3 && currentMonth <= 6) {
          serviceType = 'aircon_service'
          monthsOverdue = Math.floor(vehicle.months_since_aircon_service || 12)
          urgencyLevel = 'low'
        } else {
          continue // Skip air-con reminders outside of season
        }
      }

      serviceReminders.push({
        vehicleId: vehicle.vehicle_id,
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        customerId: vehicle.customer_id || vehicle.owner_id,
        customerName,
        phone: vehicle.phone,
        lastSmallService: vehicle.last_small_service,
        lastFullService: vehicle.last_full_service,
        lastAirConService: vehicle.last_aircon_service,
        motExpiryDate: vehicle.mot_expiry_date,
        serviceType,
        daysOverdue: Math.floor(monthsOverdue * 30.44),
        monthsOverdue,
        urgencyLevel
      })
    }

    console.log(`🔧 [SERVICE-SCHEDULER] Found ${serviceReminders.length} vehicles needing service reminders`)
    return serviceReminders

  } catch (error) {
    console.error('🔧 [SERVICE-SCHEDULER] Error getting vehicles needing service reminders:', error)
    throw error
  }
}

/**
 * Send service reminders via WhatsApp
 */
export async function sendServiceReminders(
  vehicles: VehicleServiceData[], 
  config: ServiceReminderConfig = defaultConfig
): Promise<{
  success: boolean
  sent: number
  failed: number
  results: any[]
}> {
  const results = []
  let sent = 0
  let failed = 0

  console.log(`🔧 [SERVICE-SCHEDULER] Sending ${vehicles.length} service reminders...`)

  for (const vehicle of vehicles) {
    try {
      let result

      switch (vehicle.serviceType) {
        case 'mot_service_combo':
          result = await TwilioService.sendWhatsAppMOTServiceCombo({
            to: vehicle.phone,
            customerName: vehicle.customerName,
            vehicleRegistration: vehicle.registration,
            motExpiryDate: vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB') : 'Unknown',
            lastServiceDate: vehicle.lastFullService ? new Date(vehicle.lastFullService).toLocaleDateString('en-GB') : 'Over 12 months ago',
            customerId: vehicle.customerId,
            urgencyLevel: vehicle.urgencyLevel
          })
          break

        case 'small_service':
          result = await TwilioService.sendWhatsAppSmallServiceReminder({
            to: vehicle.phone,
            customerName: vehicle.customerName,
            vehicleRegistration: vehicle.registration,
            lastServiceDate: vehicle.lastSmallService ? new Date(vehicle.lastSmallService).toLocaleDateString('en-GB') : 'Over 6 months ago',
            monthsOverdue: vehicle.monthsOverdue.toString(),
            customerId: vehicle.customerId,
            urgencyLevel: vehicle.urgencyLevel
          })
          break

        case 'full_service':
          result = await TwilioService.sendWhatsAppFullServiceReminder({
            to: vehicle.phone,
            customerName: vehicle.customerName,
            vehicleRegistration: vehicle.registration,
            lastServiceDate: vehicle.lastFullService ? new Date(vehicle.lastFullService).toLocaleDateString('en-GB') : 'Over 12 months ago',
            monthsOverdue: vehicle.monthsOverdue.toString(),
            customerId: vehicle.customerId,
            urgencyLevel: vehicle.urgencyLevel
          })
          break

        case 'aircon_service':
          const seasonalMessage = 'before summer arrives'
          result = await TwilioService.sendWhatsAppAirConReminder({
            to: vehicle.phone,
            customerName: vehicle.customerName,
            vehicleRegistration: vehicle.registration,
            lastAirConService: vehicle.lastAirConService ? new Date(vehicle.lastAirConService).toLocaleDateString('en-GB') : 'Over 12 months ago',
            seasonalMessage,
            customerId: vehicle.customerId,
            urgencyLevel: vehicle.urgencyLevel
          })
          break

        default:
          console.warn(`🔧 [SERVICE-SCHEDULER] Unknown service type: ${vehicle.serviceType}`)
          continue
      }

      if (result.success) {
        sent++
        console.log(`✅ [SERVICE-SCHEDULER] Sent ${vehicle.serviceType} reminder to ${vehicle.customerName} (${vehicle.registration})`)
      } else {
        failed++
        console.error(`❌ [SERVICE-SCHEDULER] Failed to send ${vehicle.serviceType} reminder to ${vehicle.customerName}: ${result.error}`)
      }

      results.push({
        vehicle: vehicle.registration,
        customer: vehicle.customerName,
        serviceType: vehicle.serviceType,
        success: result.success,
        error: result.error
      })

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      failed++
      console.error(`🔧 [SERVICE-SCHEDULER] Error sending reminder for ${vehicle.registration}:`, error)
      results.push({
        vehicle: vehicle.registration,
        customer: vehicle.customerName,
        serviceType: vehicle.serviceType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  console.log(`🔧 [SERVICE-SCHEDULER] Service reminders complete: ${sent} sent, ${failed} failed`)

  return {
    success: true,
    sent,
    failed,
    results
  }
}

/**
 * Check if we should send service reminders now (based on business hours and working days)
 */
export function shouldSendServiceRemindersNow(config: ServiceReminderConfig = defaultConfig): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"

  // Check if today is a working day
  if (!config.workingDays.includes(dayOfWeek)) {
    console.log("🔧 [SERVICE-SCHEDULER] Not sending reminders - not a working day")
    return false
  }

  // Check if current time is within business hours
  if (currentTime < config.businessHours.start || currentTime > config.businessHours.end) {
    console.log("🔧 [SERVICE-SCHEDULER] Not sending reminders - outside business hours")
    return false
  }

  return true
}

/**
 * Main service reminder processing function
 */
export async function processServiceReminders(config: ServiceReminderConfig = defaultConfig): Promise<{
  success: boolean
  message: string
  data?: any
}> {
  try {
    console.log('🔧 [SERVICE-SCHEDULER] Starting service reminder processing...')

    // Step 1: Get vehicles needing service reminders
    const vehicles = await getVehiclesNeedingServiceReminders(config)

    if (vehicles.length === 0) {
      return {
        success: true,
        message: 'No vehicles currently need service reminders'
      }
    }

    // Step 2: Check if we should send reminders now
    if (!shouldSendServiceRemindersNow(config)) {
      return {
        success: true,
        message: `Found ${vehicles.length} vehicles needing service reminders, but outside business hours`
      }
    }

    // Step 3: Send service reminders
    const results = await sendServiceReminders(vehicles, config)

    return {
      success: true,
      message: `Service reminders processed: ${results.sent} sent, ${results.failed} failed`,
      data: results
    }

  } catch (error) {
    console.error('🔧 [SERVICE-SCHEDULER] Error processing service reminders:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error processing service reminders'
    }
  }
}
