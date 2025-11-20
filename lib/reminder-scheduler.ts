/**
 * MOT Reminder Scheduling System
 * This handles the automatic creation and sending of MOT reminders
 */

import { isInReminderWindow } from "./date-utils"
import { createMOTReminders } from "./db/queries"

export interface ReminderConfig {
  reminderDays: number // Days before expiry to send reminder
  enableEmail: boolean
  enableSMS: boolean
  businessHours: {
    start: string // "09:00"
    end: string // "17:00"
  }
  workingDays: number[] // [1,2,3,4,5] for Mon-Fri
}

const defaultConfig: ReminderConfig = {
  reminderDays: 30,
  enableEmail: true,
  enableSMS: true,
  businessHours: {
    start: "09:00",
    end: "17:00",
  },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
}

/**
 * Process vehicles and create reminders for those that need them
 */
export async function processVehiclesForReminders(vehicles: any[], config: ReminderConfig = defaultConfig) {
  console.log(`Processing ${vehicles.length} vehicles for MOT reminders`)

  const vehiclesNeedingReminders = vehicles.filter((vehicle) => {
    // Skip if no MOT expiry date
    if (!vehicle.motExpiryDate) return false

    // Skip if already archived
    if (vehicle.archived) return false

    // Skip if reminder already sent
    if (vehicle.reminderSent) return false

    // Check if vehicle is in reminder window
    return isInReminderWindow(vehicle.motExpiryDate, config.reminderDays)
  })

  console.log(`Found ${vehiclesNeedingReminders.length} vehicles needing reminders`)

  if (vehiclesNeedingReminders.length > 0) {
    const reminders = await createMOTReminders(vehiclesNeedingReminders)
    console.log(`Created ${reminders.length} MOT reminders`)
    return reminders
  }

  return []
}

/**
 * Check if we should send reminders now (based on business hours and working days)
 */
export function shouldSendRemindersNow(config: ReminderConfig = defaultConfig): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"

  // Check if today is a working day
  if (!config.workingDays.includes(dayOfWeek)) {
    console.log("Not sending reminders - not a working day")
    return false
  }

  // Check if current time is within business hours
  if (currentTime < config.businessHours.start || currentTime > config.businessHours.end) {
    console.log("Not sending reminders - outside business hours")
    return false
  }

  return true
}

/**
 * Main function to run the reminder system
 * This would typically be called by a cron job or scheduled task
 */
export async function runReminderSystem(vehicles: any[], config: ReminderConfig = defaultConfig) {
  console.log("Running MOT reminder system...")

  try {
    // Step 1: Process vehicles and create reminders
    await processVehiclesForReminders(vehicles, config)

    // Step 2: Check if we should send reminders now
    if (!shouldSendRemindersNow(config)) {
      console.log("Skipping reminder sending - outside business hours or non-working day")
      return { success: true, message: "Reminders processed but not sent (outside business hours)" }
    }

    // Step 3: Send reminders that are due today
    const response = await fetch("/api/mot/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    const result = await response.json()

    if (result.success) {
      console.log(`Reminder system completed: ${result.data.sent} sent, ${result.data.failed} failed`)
      return result
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error("Reminder system failed:", error)
    return {
      success: false,
      error: "Reminder system failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get reminder statistics for dashboard
 */
export async function getReminderSystemStats() {
  try {
    const response = await fetch("/api/mot/reminders/stats")
    const result = await response.json()
    return result.success ? result.data : null
  } catch (error) {
    console.error("Failed to get reminder stats:", error)
    return null
  }
}
