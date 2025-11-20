import { sql } from "./neon-client"
import { CustomerService } from "./customer-service"
import { VehicleService } from "./vehicle-service"
import { getUploadedData } from "./upload-store"

export class MigrationService {
  // Migrate existing in-memory data to database
  static async migrateExistingData(): Promise<{
    customers: number
    vehicles: number
    errors: string[]
  }> {
    const uploadedData = getUploadedData()
    const errors: string[] = []
    let customersCreated = 0
    let vehiclesCreated = 0

    console.log("🔄 Starting data migration...")

    try {
      // Migrate customers first
      for (const customer of uploadedData.customers || []) {
        try {
          await CustomerService.createCustomer({
            account_number: customer.accountNumber,
            title: customer.title,
            forename: customer.forename,
            surname: customer.surname,
            company_name: customer.companyName,
            house_no: customer.address?.houseNo,
            road: customer.address?.road,
            locality: customer.address?.locality,
            town: customer.address?.town,
            county: customer.address?.county,
            post_code: customer.address?.postCode,
            telephone: customer.contact?.telephone,
            mobile: customer.contact?.mobile,
            email: customer.contact?.email,
            last_invoice_date: customer.lastInvoiceDate,
            notes: customer.notes,
          })
          customersCreated++
        } catch (error) {
          errors.push(`Customer migration error: ${error}`)
        }
      }

      // Migrate vehicles
      for (const vehicle of uploadedData.vehicles || []) {
        try {
          // Find customer by ID if available
          let customerId = null
          if (vehicle._ID_Customer) {
            const customers = await CustomerService.getAllCustomers()
            const customer = customers.find((c) => c.account_number === vehicle._ID_Customer)
            customerId = customer?.id || null
          }

          await VehicleService.createVehicle({
            customer_id: customerId,
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            colour: vehicle.colour,
            fuel_type: vehicle.fuelType,
            vin: vehicle.vin,
            engine_code: vehicle.engineCode,
            date_of_reg: vehicle.dateOfReg,
            mot_expiry_date: vehicle.motExpiry,
            last_invoice_date: vehicle.lastInvoiceDate,
            reminder_notes: vehicle.reminderNotes,
          })
          vehiclesCreated++
        } catch (error) {
          errors.push(`Vehicle migration error: ${error}`)
        }
      }

      console.log(`✅ Migration complete: ${customersCreated} customers, ${vehiclesCreated} vehicles`)

      return {
        customers: customersCreated,
        vehicles: vehiclesCreated,
        errors,
      }
    } catch (error) {
      console.error("❌ Migration failed:", error)
      throw error
    }
  }

  // Clear all data (for testing)
  static async clearAllData(): Promise<void> {
    await sql`TRUNCATE TABLE receipts CASCADE`
    await sql`TRUNCATE TABLE line_items CASCADE`
    await sql`TRUNCATE TABLE documents CASCADE`
    await sql`TRUNCATE TABLE appointments CASCADE`
    await sql`TRUNCATE TABLE reminders CASCADE`
    await sql`TRUNCATE TABLE mot_history CASCADE`
    await sql`TRUNCATE TABLE vehicles CASCADE`
    await sql`TRUNCATE TABLE customers CASCADE`
    await sql`TRUNCATE TABLE stock CASCADE`
    console.log("🗑️ All data cleared")
  }

  // Get database statistics
  static async getDatabaseStats(): Promise<any> {
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM appointments) as appointments,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM reminders) as reminders,
        (SELECT COUNT(*) FROM stock) as stock_items
    `
    return stats[0]
  }
}
