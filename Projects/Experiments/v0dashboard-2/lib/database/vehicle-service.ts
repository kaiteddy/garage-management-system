import { sql } from "./neon-client"
import type { Vehicle } from "./types"

// Define a type that matches our database schema
type DatabaseVehicle = Vehicle & {
  year?: number;
  color?: string;
  engine_size?: number;
  tax_status?: string;
  tax_due_date?: string;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
};

export class VehicleService {
  // Create a new vehicle
  static async createVehicle(vehicleData: Partial<DatabaseVehicle>): Promise<DatabaseVehicle> {
    try {
      const result = await sql`
        INSERT INTO vehicles (
          registration, make, model, year, color, fuel_type,
          engine_size, vin, mot_status, mot_expiry_date,
          tax_status, tax_due_date, customer_id
        ) VALUES (
          ${vehicleData.registration},
          ${vehicleData.make || null},
          ${vehicleData.model || null},
          ${vehicleData.year || null},
          ${vehicleData.color || null},
          ${vehicleData.fuelType || null},
          ${vehicleData.engine_size || null},
          ${vehicleData.vin || null},
          ${vehicleData.motStatus || "unknown"},
          ${vehicleData.motExpiry || null},
          ${vehicleData.tax_status || null},
          ${vehicleData.tax_due_date || null},
          ${vehicleData.customer_id || null}
        )
        RETURNING *
      `
      return result[0] as DatabaseVehicle
    } catch (error) {
      console.error('Error in createVehicle:', error)
      throw error
    }
  }

  // Get a sample of vehicles for testing
  static async getSampleVehicles(limit: number = 5): Promise<DatabaseVehicle[]> {
    try {
      const result = await sql`
        SELECT registration as id, * FROM vehicles
        WHERE registration IS NOT NULL
        AND registration != ''
        ORDER BY RANDOM()
        LIMIT ${limit}
      `
      return result as DatabaseVehicle[]
    } catch (error) {
      console.error('Error in getSampleVehicles:', error)
      throw error
    }
  }

  // Get all vehicles with customer info
  static async getAllVehicles(): Promise<DatabaseVehicle[]> {
    try {
      const result = await sql`
        SELECT
          v.registration as id,
          v.*,
          c.first_name,
          c.last_name,
          c.phone,
          c.email
        FROM vehicles v
        LEFT JOIN customers c ON v.owner_id = c.id
        ORDER BY v.created_at DESC
      `
      return result as DatabaseVehicle[]
    } catch (error) {
      console.error('Error in getAllVehicles:', error)
      throw error
    }
  }

  // Get vehicle by registration
  static async getVehicleByRegistration(registration: string): Promise<DatabaseVehicle | null> {
    try {
      const cleanReg = registration.toUpperCase().replace(/\s/g, "");
      const result = await sql`
        SELECT
          v.registration as id,
          v.*,
          c.first_name,
          c.last_name,
          c.phone,
          c.email
        FROM vehicles v
        LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
        WHERE v.registration = ${cleanReg}
      `
      return (result[0] as DatabaseVehicle) || null
    } catch (error) {
      console.error('Error in getVehicleByRegistration:', error)
      throw error
    }
  }

  // Update vehicle data (comprehensive update)
  static async updateVehicleData(
    registration: string,
    updates: Partial<DatabaseVehicle & { chassis?: string; oilData?: any }>
  ): Promise<DatabaseVehicle | null> {
    try {
      const cleanReg = registration.toUpperCase().replace(/\s/g, '');
      const now = new Date().toISOString();

      console.log(`🔄 [VehicleService] Updating vehicle data for: ${cleanReg}`);
      console.log(`📝 [VehicleService] Updates:`, updates);

      // Build the update query dynamically based on provided fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Map frontend field names to database column names
      const fieldMapping: Record<string, string> = {
        chassis: 'vin',
        make: 'make',
        model: 'model',
        year: 'year',
        color: 'color',
        fuelType: 'fuel_type',
        engineSize: 'engine_size',
        transmission: 'transmission',
        motStatus: 'mot_status',
        motExpiry: 'mot_expiry_date',
        taxStatus: 'tax_status',
        taxDueDate: 'tax_due_date'
      };

      // Add fields to update
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'oilData') {
          // Store oil data as JSON
          updateFields.push(`oil_data = $${paramIndex}`);
          values.push(JSON.stringify(value));
          paramIndex++;
        } else if (fieldMapping[key] && value !== undefined) {
          updateFields.push(`${fieldMapping[key]} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      // Always update the timestamp
      updateFields.push(`updated_at = $${paramIndex}`);
      values.push(now);
      paramIndex++;

      if (updateFields.length === 1) { // Only timestamp update
        console.log('⚠️ [VehicleService] No fields to update');
        return null;
      }

      // Add the WHERE clause parameter
      values.push(cleanReg);

      const query = `
        UPDATE vehicles
        SET ${updateFields.join(', ')}
        WHERE REPLACE(UPPER(registration), ' ', '') = $${paramIndex}
        RETURNING *
      `;

      console.log(`📝 [VehicleService] Query:`, query);
      console.log(`📝 [VehicleService] Values:`, values);

      const result = await sql.unsafe(query, values);

      if (result.length > 0) {
        console.log('✅ [VehicleService] Vehicle updated successfully');
        return result[0] as DatabaseVehicle;
      } else {
        console.log('⚠️ [VehicleService] No vehicle found to update');
        return null;
      }
    } catch (error) {
      console.error('❌ [VehicleService] Error in updateVehicleData:', error);
      throw error;
    }
  }

  // Update vehicle MOT status
  static async updateVehicleMOT(
    registration: string,
    motData: {
      motExpiry?: string;
      motStatus?: string;
    },
  ): Promise<DatabaseVehicle | null> {
    try {
      const cleanReg = registration.toUpperCase().replace(/\s/g, '');
      const now = new Date().toISOString();

      // Update the vehicle with the new MOT data using parameterized query
      const result = await sql`
        UPDATE vehicles
        SET
          mot_expiry_date = COALESCE(${motData.motExpiry || null}, mot_expiry_date),
          mot_status = COALESCE(${motData.motStatus || null}, mot_status),
          updated_at = ${now}::timestamptz
        WHERE REPLACE(UPPER(registration), ' ', '') = ${cleanReg}
        RETURNING *
      `;

      return (result[0] as DatabaseVehicle) || null;
    } catch (error) {
      console.error('Error in updateVehicleMOT:', error);
      throw error;
    }
  }

  // Batch update MOT data
  static async batchUpdateMOTData(
    motResults: Array<{
      registration: string
      motExpiryDate?: string
      motStatus?: string
    }>,
  ): Promise<number> {
    let updated = 0

    for (const mot of motResults) {
      try {
        const result = await this.updateVehicleMOT(mot.registration, {
          motExpiry: mot.motExpiryDate,
          motStatus: mot.motStatus,
        })
        if (result) updated++
      } catch (error) {
        console.error(`Failed to update MOT for ${mot.registration}:`, error)
      }
    }

    return updated
  }

  // Get vehicles needing MOT soon
  static async getVehiclesDueSoon(days = 30): Promise<DatabaseVehicle[]> {
    try {
      const result = await sql`
        SELECT
          v.*,
          c.first_name,
          c.last_name,
          c.phone,
          c.email
        FROM vehicles v
        LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
        WHERE v.mot_expiry_date IS NOT NULL
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND v.mot_expiry_date >= CURRENT_DATE
        ORDER BY v.mot_expiry_date ASC
      `;
      return result as DatabaseVehicle[];
    } catch (error) {
      console.error('Error in getVehiclesDueSoon:', error);
      throw error;
    }
  }

  // Get expired MOTs
  static async getExpiredMOTs(): Promise<DatabaseVehicle[]> {
    try {
      const result = await sql`
        SELECT
          v.*,
          c.first_name,
          c.last_name,
          c.phone,
          c.email
        FROM vehicles v
        LEFT JOIN customers c ON v.owner_id = c.id
        WHERE v.mot_expiry_date IS NOT NULL
        AND v.mot_expiry_date < CURRENT_DATE
        ORDER BY v.mot_expiry_date ASC
      `;
      return result as DatabaseVehicle[];
    } catch (error) {
      console.error('Error in getExpiredMOTs:', error);
      throw error;
    }
  }

  // Get critical MOTs (expired within last 6 months OR expiring in next 14 days)
  static async getCriticalMOTs(): Promise<DatabaseVehicle[]> {
    try {
      const result = await sql`
        SELECT
          v.*,
          c.first_name,
          c.last_name,
          c.phone,
          c.email,
          c.address_line1,
          c.city,
          c.postcode,
          CASE
            WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'expiring_soon'
            ELSE 'other'
          END as mot_urgency,
          CASE
            WHEN v.mot_expiry_date < CURRENT_DATE THEN
              CURRENT_DATE - v.mot_expiry_date
            ELSE
              v.mot_expiry_date - CURRENT_DATE
          END as days_difference
        FROM vehicles v
        LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
        WHERE v.mot_expiry_date IS NOT NULL
        AND (
          -- Expired within last 6 months
          (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
          OR
          -- Expiring in next 14 days
          (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
        )
        ORDER BY
          CASE
            WHEN v.mot_expiry_date < CURRENT_DATE THEN 0  -- Expired first
            ELSE 1  -- Then expiring soon
          END,
          v.mot_expiry_date ASC
      `;
      return result as DatabaseVehicle[];
    } catch (error) {
      console.error('Error in getCriticalMOTs:', error);
      throw error;
    }
  }

  // Get all registrations for batch processing
  static async getAllRegistrations(): Promise<string[]> {
    try {
      const result = await sql`
        SELECT registration
        FROM vehicles
        WHERE registration IS NOT NULL
        AND registration != ''
        ORDER BY registration
      `;
      return result.map(row => row.registration);
    } catch (error) {
      console.error('Error in getAllRegistrations:', error);
      throw error;
    }
  }
}
