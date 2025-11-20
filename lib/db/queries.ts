import { sql } from "@/lib/database/neon-client"

// Vehicle-related queries
export async function getAllVehicleRegistrations(): Promise<string[]> {
  try {
    const result = await sql`
      SELECT registration 
      FROM vehicles 
      WHERE registration IS NOT NULL 
      AND registration != ''
      ORDER BY registration
    `
    return result.map((row) => row.registration as string)
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching vehicle registrations:", error)
    return []
  }
}

export async function getVehicleByRegistration(registration: string) {
  try {
    const result = await sql`
      SELECT * FROM vehicles 
      WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
      LIMIT 1
    `
    return result[0] || null
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching vehicle by registration:", error)
    return null
  }
}

export async function updateVehicleMOTData(
  vehicleId: number,
  motData: {
    motStatus: string
    motExpiryDate?: string
    lastChecked?: Date
  },
) {
  try {
    await sql`
      UPDATE vehicles 
      SET 
        mot_status = ${motData.motStatus},
        mot_expiry_date = ${motData.motExpiryDate || null},
        mot_last_checked = ${motData.lastChecked || new Date()},
        updated_at = NOW()
      WHERE id = ${vehicleId}
    `
    return { success: true }
  } catch (error) {
    console.error("[DB-QUERIES] Error updating vehicle MOT data:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function batchUpdateVehicleMOTData(
  updates: Array<{
    registration: string
    motStatus: string
    motExpiryDate?: string
    error?: string
  }>,
) {
  try {
    for (const update of updates) {
      await sql`
        UPDATE vehicles 
        SET 
          mot_status = ${update.motStatus},
          mot_expiry_date = ${update.motExpiryDate || null},
          mot_last_checked = NOW(),
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${update.registration}, ' ', ''))
      `
    }
    return { success: true, updated: updates.length }
  } catch (error) {
    console.error("[DB-QUERIES] Error batch updating vehicle MOT data:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// MOT reminder queries
export async function createMOTReminders(vehicleIds: number[], reminderDate: Date, reminderType: string) {
  try {
    const values = vehicleIds.map((id) => `(${id}, '${reminderDate.toISOString().split("T")[0]}', '${reminderType}')`)

    await sql.unsafe(`
      INSERT INTO reminders (vehicle_id, reminder_date, reminder_type)
      VALUES ${values.join(", ")}
      ON CONFLICT (vehicle_id, reminder_date, reminder_type) DO NOTHING
    `)

    return { success: true, created: vehicleIds.length }
  } catch (error) {
    console.error("[DB-QUERIES] Error creating MOT reminders:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getUpcomingMOTReminders(days = 30) {
  try {
    const result = await sql`
      SELECT 
        r.*,
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        c.forename,
        c.surname,
        c.email,
        c.mobile
      FROM reminders r
      JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE r.reminder_date <= CURRENT_DATE + INTERVAL '${days} days'
      AND r.status = 'pending'
      ORDER BY r.reminder_date ASC
    `
    return result
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching upcoming MOT reminders:", error)
    return []
  }
}

export async function getRemindersToSendToday() {
  try {
    const result = await sql`
      SELECT 
        r.*,
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        c.forename,
        c.surname,
        c.email,
        c.mobile
      FROM reminders r
      JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE r.reminder_date = CURRENT_DATE
      AND r.status = 'pending'
      ORDER BY r.reminder_date ASC
    `
    return result
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching today's reminders:", error)
    return []
  }
}

export async function markReminderSent(reminderId: number, method: "email" | "sms" | "both") {
  try {
    const updates: any = {
      status: "sent",
      sent_date: new Date(),
    }

    if (method === "email" || method === "both") {
      updates.email_sent = true
    }

    if (method === "sms" || method === "both") {
      updates.sms_sent = true
    }

    await sql`
      UPDATE reminders 
      SET 
        status = ${updates.status},
        sent_date = ${updates.sent_date},
        email_sent = ${updates.email_sent || false},
        sms_sent = ${updates.sms_sent || false}
      WHERE id = ${reminderId}
    `

    return { success: true }
  } catch (error) {
    console.error("[DB-QUERIES] Error marking reminder as sent:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getReminderStats() {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_reminders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reminders,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_reminders,
        COUNT(CASE WHEN reminder_date = CURRENT_DATE AND status = 'pending' THEN 1 END) as due_today
      FROM reminders
    `

    return (
      result[0] || {
        total_reminders: 0,
        pending_reminders: 0,
        sent_reminders: 0,
        due_today: 0,
      }
    )
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching reminder stats:", error)
    return {
      total_reminders: 0,
      pending_reminders: 0,
      sent_reminders: 0,
      due_today: 0,
    }
  }
}

// MOT scan statistics
export async function getMOTScanStats() {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_last_checked IS NOT NULL THEN 1 END) as scanned_vehicles,
        COUNT(CASE WHEN mot_status = 'valid' THEN 1 END) as valid_mots,
        COUNT(CASE WHEN mot_status = 'due_soon' THEN 1 END) as due_soon,
        COUNT(CASE WHEN mot_status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN mot_status = 'unknown' OR mot_status IS NULL THEN 1 END) as unknown,
        COUNT(CASE WHEN mot_status = 'error' THEN 1 END) as errors,
        MAX(mot_last_checked) as last_scan_date
      FROM vehicles
      WHERE registration IS NOT NULL AND registration != ''
    `

    return (
      result[0] || {
        total_vehicles: 0,
        scanned_vehicles: 0,
        valid_mots: 0,
        due_soon: 0,
        expired: 0,
        unknown: 0,
        errors: 0,
        last_scan_date: null,
        scan_in_progress: false,
      }
    )
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching MOT scan stats:", error)
    return {
      total_vehicles: 0,
      scanned_vehicles: 0,
      valid_mots: 0,
      due_soon: 0,
      expired: 0,
      unknown: 0,
      errors: 0,
      last_scan_date: null,
      scan_in_progress: false,
    }
  }
}

// Customer queries
export async function getAllCustomers() {
  try {
    const result = await sql`
      SELECT * FROM customers 
      ORDER BY surname, forename
    `
    return result
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching customers:", error)
    return []
  }
}

export async function getCustomerById(id: number) {
  try {
    const result = await sql`
      SELECT * FROM customers 
      WHERE id = ${id}
      LIMIT 1
    `
    return result[0] || null
  } catch (error) {
    console.error("[DB-QUERIES] Error fetching customer by ID:", error)
    return null
  }
}

// General database health check
export async function getDatabaseHealth() {
  try {
    const tables = ["customers", "vehicles", "appointments", "reminders", "documents", "stock_items"]
    const health: Record<string, number> = {}

    for (const table of tables) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
        health[table] = Number(result[0]?.count || 0)
      } catch (error) {
        health[table] = -1 // Indicates table doesn't exist or error
      }
    }

    return { success: true, tables: health }
  } catch (error) {
    console.error("[DB-QUERIES] Error checking database health:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
