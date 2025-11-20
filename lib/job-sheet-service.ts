import { sql } from '@/lib/database/neon-client'

export class JobSheetService {
  static async getJobSheetAuditTrail(jobSheetId: string) {
    try {
      const auditTrail = await sql`
        SELECT * FROM job_sheet_audit
        WHERE job_sheet_id = ${jobSheetId}
        ORDER BY created_at DESC
      `
      return auditTrail
    } catch (error) {
      console.error('Error fetching job sheet audit trail:', error)
      throw error
    }
  }

  static async createJobSheet(data: any) {
    try {
      const result = await sql`
        INSERT INTO job_sheets (
          doc_number, customer_name, vehicle_registration, 
          total_net, total_tax, total_gross, status
        ) VALUES (
          ${data.docNumber},
          ${data.customerName},
          ${data.vehicleRegistration},
          ${data.totalNet || 0},
          ${data.totalTax || 0},
          ${data.totalGross || 0},
          ${data.status || 'draft'}
        )
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error creating job sheet:', error)
      throw error
    }
  }

  static async updateJobSheet(id: string, data: any) {
    try {
      const result = await sql`
        UPDATE job_sheets
        SET 
          customer_name = COALESCE(${data.customerName}, customer_name),
          vehicle_registration = COALESCE(${data.vehicleRegistration}, vehicle_registration),
          total_net = COALESCE(${data.totalNet}, total_net),
          total_tax = COALESCE(${data.totalTax}, total_tax),
          total_gross = COALESCE(${data.totalGross}, total_gross),
          status = COALESCE(${data.status}, status),
          updated_at = NOW()
        WHERE _id = ${id}
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error updating job sheet:', error)
      throw error
    }
  }

  static async getJobSheet(id: string) {
    try {
      const result = await sql`
        SELECT * FROM job_sheets
        WHERE _id = ${id}
      `
      return result[0]
    } catch (error) {
      console.error('Error fetching job sheet:', error)
      throw error
    }
  }

  static async listJobSheets(filters?: any) {
    try {
      const result = await sql`
        SELECT * FROM job_sheets
        ORDER BY created_at DESC
        LIMIT 100
      `
      return result
    } catch (error) {
      console.error('Error listing job sheets:', error)
      throw error
    }
  }
}
