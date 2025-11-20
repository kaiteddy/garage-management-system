import { format, parseISO, isValid, differenceInDays, subDays } from "date-fns"

/**
 * Safely parse a date string and return a Date object or null
 */
export function safeParseDate(dateString?: string | null): Date | null {
  if (!dateString) return null

  try {
    // Try parsing as ISO string first
    const isoDate = parseISO(dateString)
    if (isValid(isoDate)) return isoDate

    // Try parsing as regular Date
    const regularDate = new Date(dateString)
    if (isValid(regularDate)) return regularDate

    return null
  } catch {
    return null
  }
}

/**
 * Format a date for display, returning "-" for invalid dates
 */
export function formatDisplayDate(dateString?: string | null): string {
  const date = safeParseDate(dateString)
  if (!date) return "-"

  try {
    return format(date, "dd/MM/yyyy")
  } catch {
    return "-"
  }
}

/**
 * Calculate days between a date string and today
 */
export function daysBetween(dateString?: string | null, fromDate: Date = new Date()): number | null {
  const date = safeParseDate(dateString)
  if (!date) return null

  return differenceInDays(date, fromDate)
}

/**
 * Determine MOT status based on expiry date
 */
export function getMotStatus(expiryDate?: string | null): "valid" | "due-soon" | "expired" | "unknown" {
  if (!expiryDate) return "unknown"

  const days = daysBetween(expiryDate)
  if (days === null) return "unknown"

  if (days < 0) return "expired"
  if (days <= 30) return "due-soon"
  return "valid"
}

// Alias for compatibility
export const getMOTStatus = getMotStatus

/**
 * Check if a date is within the reminder window (30 days before expiry)
 */
export function isInReminderWindow(expiryDate?: string | null, reminderDays = 30): boolean {
  if (!expiryDate) return false

  const days = daysBetween(expiryDate)
  if (days === null) return false

  return days >= 0 && days <= reminderDays
}

/**
 * Get the reminder date (X days before expiry)
 */
export function getReminderDate(expiryDate?: string | null, reminderDays = 30): string | null {
  const date = safeParseDate(expiryDate)
  if (!date) return null

  const reminderDate = subDays(date, reminderDays)
  return reminderDate.toISOString().split("T")[0]
}

/**
 * Check if today is the reminder date
 */
export function isTodayReminderDate(expiryDate?: string | null, reminderDays = 30): boolean {
  const reminderDate = getReminderDate(expiryDate, reminderDays)
  if (!reminderDate) return false

  const today = format(new Date(), "yyyy-MM-dd")
  return reminderDate === today
}
