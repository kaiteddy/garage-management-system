import { sql } from '@/lib/database/neon-client'

export interface JobSheetData {
  id?: string
  jobNumber?: string
  customerId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  vehicleId: string
  vehicleRegistration: string
  vehicleMake: string
  vehicleModel: string
  vehicleYear?: number
  vehicleDerivative?: string
  vehicleColor?: string
  vehicleVin?: string
  odometerReading?: number
  odometerUnit?: string
  jobType: string
  jobDescription?: string
  workRequested: string
  workPerformed?: string
  datePromised?: Date
  dateStarted?: Date
  dateCompleted?: Date
  status?: string
  customerAuthorizationSignature?: string
  customerAuthorizationDate?: Date
  customerAuthorizationMethod?: string
  customerAuthorizationNotes?: string
  primaryTechnicianId?: string
  primaryTechnicianName?: string
  technicianSignature?: string
  technicianCompletionDate?: Date
  additionalTechnicians?: any[]
  laborHours?: number
  laborRate?: number
  laborTotal?: number
  partsTotal?: number
  subtotal?: number
  vatRate?: number
  vatAmount?: number
  totalAmount?: number
  paymentMethod?: string
  paymentStatus?: string
  paymentDate?: Date
  specialInstructions?: string
  internalNotes?: string
  warrantyPeriod?: number
  warrantyNotes?: string
  createdBy?: string
  updatedBy?: string
}

export interface JobSheetLineItem {
  id?: string
  jobSheetId: string
  lineNumber: number
  itemType: 'labor' | 'part' | 'service' | 'diagnostic'
  description: string
  laborHours?: number
  laborRate?: number
  partNumber?: string
  partName?: string
  partBrand?: string
  partCondition?: 'new' | 'used' | 'rebuilt' | 'reconditioned'
  quantity?: number
  unitPrice?: number
  lineTotal: number
}

export interface AuditLogEntry {
  id?: string
  jobSheetId: string
  action: string
  tableName: string
  recordId: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  changeReason?: string
  userId?: string
  userName: string
  userRole?: string
  changedAt?: Date
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

export class JobSheetService {
  
  static async generateJobNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    // Get the next sequence number for today
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM job_sheets 
      WHERE job_number LIKE ${`ELI-${year}${month}${day}-%`}
    `
    
    const sequence = (parseInt(result[0].count) + 1).toString().padStart(3, '0')
    return `ELI-${year}${month}${day}-${sequence}`
  }

  static async createJobSheet(
    jobSheetData: JobSheetData, 
    lineItems: JobSheetLineItem[] = [],
    auditInfo: { userId?: string, userName: string, changeReason?: string, ipAddress?: string, userAgent?: string }
  ): Promise<{ success: boolean, jobSheetId?: string, jobNumber?: string, error?: string }> {
    try {
      // Set audit context
      if (auditInfo.userId) {
        await sql`SELECT set_config('app.current_user_id', ${auditInfo.userId}, true)`
      }
      await sql`SELECT set_config('app.current_user_name', ${auditInfo.userName}, true)`

      // Generate job number if not provided
      if (!jobSheetData.jobNumber) {
        jobSheetData.jobNumber = await this.generateJobNumber()
      }

      // Create the job sheet
      const result = await sql`
        INSERT INTO job_sheets (
          job_number, customer_id, customer_name, customer_phone, customer_email, customer_address,
          vehicle_id, vehicle_registration, vehicle_make, vehicle_model, vehicle_year, 
          vehicle_derivative, vehicle_color, vehicle_vin, odometer_reading, odometer_unit,
          job_type, job_description, work_requested, work_performed,
          date_promised, date_started, date_completed, status,
          customer_authorization_signature, customer_authorization_date, 
          customer_authorization_method, customer_authorization_notes,
          primary_technician_id, primary_technician_name, technician_signature, technician_completion_date,
          additional_technicians, labor_hours, labor_rate, labor_total, parts_total,
          subtotal, vat_rate, vat_amount, total_amount,
          payment_method, payment_status, payment_date,
          special_instructions, internal_notes, warranty_period, warranty_notes,
          created_by, updated_by
        ) VALUES (
          ${jobSheetData.jobNumber}, ${jobSheetData.customerId}, ${jobSheetData.customerName}, 
          ${jobSheetData.customerPhone}, ${jobSheetData.customerEmail}, ${jobSheetData.customerAddress},
          ${jobSheetData.vehicleId}, ${jobSheetData.vehicleRegistration}, ${jobSheetData.vehicleMake}, 
          ${jobSheetData.vehicleModel}, ${jobSheetData.vehicleYear}, ${jobSheetData.vehicleDerivative}, 
          ${jobSheetData.vehicleColor}, ${jobSheetData.vehicleVin}, ${jobSheetData.odometerReading}, 
          ${jobSheetData.odometerUnit || 'miles'},
          ${jobSheetData.jobType}, ${jobSheetData.jobDescription}, ${jobSheetData.workRequested}, 
          ${jobSheetData.workPerformed},
          ${jobSheetData.datePromised}, ${jobSheetData.dateStarted}, ${jobSheetData.dateCompleted}, 
          ${jobSheetData.status || 'created'},
          ${jobSheetData.customerAuthorizationSignature}, ${jobSheetData.customerAuthorizationDate},
          ${jobSheetData.customerAuthorizationMethod}, ${jobSheetData.customerAuthorizationNotes},
          ${jobSheetData.primaryTechnicianId}, ${jobSheetData.primaryTechnicianName}, 
          ${jobSheetData.technicianSignature}, ${jobSheetData.technicianCompletionDate},
          ${JSON.stringify(jobSheetData.additionalTechnicians || [])},
          ${jobSheetData.laborHours || 0}, ${jobSheetData.laborRate || 0}, ${jobSheetData.laborTotal || 0}, 
          ${jobSheetData.partsTotal || 0}, ${jobSheetData.subtotal || 0}, ${jobSheetData.vatRate || 20.00}, 
          ${jobSheetData.vatAmount || 0}, ${jobSheetData.totalAmount || 0},
          ${jobSheetData.paymentMethod}, ${jobSheetData.paymentStatus || 'pending'}, ${jobSheetData.paymentDate},
          ${jobSheetData.specialInstructions}, ${jobSheetData.internalNotes}, 
          ${jobSheetData.warrantyPeriod}, ${jobSheetData.warrantyNotes},
          ${auditInfo.userId}, ${auditInfo.userId}
        )
        RETURNING id, job_number
      `

      const jobSheetId = result[0].id
      const jobNumber = result[0].job_number

      // Add line items if provided
      if (lineItems.length > 0) {
        for (const item of lineItems) {
          await sql`
            INSERT INTO job_sheet_line_items (
              job_sheet_id, line_number, item_type, description,
              labor_hours, labor_rate, part_number, part_name, part_brand, part_condition,
              quantity, unit_price, line_total
            ) VALUES (
              ${jobSheetId}, ${item.lineNumber}, ${item.itemType}, ${item.description},
              ${item.laborHours}, ${item.laborRate}, ${item.partNumber}, ${item.partName}, 
              ${item.partBrand}, ${item.partCondition}, ${item.quantity || 1}, 
              ${item.unitPrice}, ${item.lineTotal}
            )
          `
        }
      }

      // Log the creation
      await this.logAuditEntry({
        jobSheetId,
        action: 'create',
        tableName: 'job_sheets',
        recordId: jobSheetId,
        fieldName: 'job_sheet_created',
        newValue: `Job sheet ${jobNumber} created`,
        changeReason: auditInfo.changeReason || 'Job sheet creation',
        userId: auditInfo.userId,
        userName: auditInfo.userName,
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent
      })

      console.log(`[JOB-SHEET] ✅ Created job sheet ${jobNumber} (${jobSheetId})`)

      return {
        success: true,
        jobSheetId,
        jobNumber
      }

    } catch (error) {
      console.error('[JOB-SHEET] Error creating job sheet:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async logAuditEntry(entry: AuditLogEntry): Promise<void> {
    try {
      await sql`
        INSERT INTO job_sheet_audit_log (
          job_sheet_id, action, table_name, record_id, field_name,
          old_value, new_value, change_reason, user_id, user_name, user_role,
          ip_address, user_agent, session_id
        ) VALUES (
          ${entry.jobSheetId}, ${entry.action}, ${entry.tableName}, ${entry.recordId},
          ${entry.fieldName}, ${entry.oldValue}, ${entry.newValue}, ${entry.changeReason},
          ${entry.userId}, ${entry.userName}, ${entry.userRole},
          ${entry.ipAddress}, ${entry.userAgent}, ${entry.sessionId}
        )
      `
    } catch (error) {
      console.error('[JOB-SHEET-AUDIT] Error logging audit entry:', error)
    }
  }

  static async getJobSheetAuditTrail(jobSheetId: string): Promise<AuditLogEntry[]> {
    try {
      const result = await sql`
        SELECT * FROM job_sheet_audit_log 
        WHERE job_sheet_id = ${jobSheetId}
        ORDER BY changed_at DESC
      `
      
      return result.map(row => ({
        id: row.id,
        jobSheetId: row.job_sheet_id,
        action: row.action,
        tableName: row.table_name,
        recordId: row.record_id,
        fieldName: row.field_name,
        oldValue: row.old_value,
        newValue: row.new_value,
        changeReason: row.change_reason,
        userId: row.user_id,
        userName: row.user_name,
        userRole: row.user_role,
        changedAt: row.changed_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        sessionId: row.session_id
      }))
    } catch (error) {
      console.error('[JOB-SHEET-AUDIT] Error getting audit trail:', error)
      return []
    }
  }
}
