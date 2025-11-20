import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

// Log the database URL (masking the password for security)
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error("[NEON-CLIENT] ERROR: DATABASE_URL environment variable is not set")
} else {
  const maskedUrl = dbUrl.replace(/:[^:]*@/, ":***@")
  console.log(`[NEON-CLIENT] Using database URL: ${maskedUrl}`)
}

// Initialize Neon client with warning suppression
let sql: NeonQueryFunction<false, false>

try {
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set in environment variables")
  }

  // Create a connection string with SSL parameters
  const connectionString = `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}sslmode=require`

  sql = neon(connectionString, {
    disableWarningInBrowsers: true,
  })

  console.log("[NEON-CLIENT] Database client created successfully")
} catch (error) {
  console.error("[NEON-CLIENT] Failed to create database client:", error)
  throw error // Re-throw to prevent the app from starting with a broken database connection
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log("[NEON-CLIENT] Testing database connection...")
    const result = await sql`SELECT 1 as test`

    // Log the raw result for debugging
    console.log("[NEON-CLIENT] Database connection test result:", result)

    // Check if the result is in the expected format
    if (Array.isArray(result) && result.length > 0) {
      console.log("[NEON-CLIENT] Database connection test successful (array result)")
      return true
    } else if (result && typeof result === "object") {
      // Handle case where the result is a command result or row object
      if ("command" in result || "rowCount" in result) {
        console.log("[NEON-CLIENT] Database connection test successful (command result)")
        return true
      }

      // Handle case where the result is a single row object
      if ("test" in result) {
        console.log("[NEON-CLIENT] Database connection test successful (row result)")
        return true
      }
    }

    // If we get here, the response format was unexpected
    console.error("[NEON-CLIENT] Unexpected database response format:", result)
    return false
  } catch (error) {
    console.error("[NEON-CLIENT] Database connection test failed:", error)
    return false
  }
}

/**
 * Initialize database schema with all required tables
 */
export async function initializeDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[NEON-CLIENT] Initializing database schema...")

    // Create customers table
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create vehicles table with all necessary columns for MOT scanning
    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        registration VARCHAR(20) NOT NULL UNIQUE,
        make VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        color VARCHAR(50),
        fuel_type VARCHAR(50),
        engine_size VARCHAR(20),
        customer_id INTEGER REFERENCES customers(id),
        mot_expiry_date DATE,
        mot_status VARCHAR(50) DEFAULT 'unknown',
        mot_last_checked TIMESTAMP,
        mot_test_number VARCHAR(50),
        mot_mileage INTEGER,
        mot_test_result VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create appointments table
    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        vehicle_id INTEGER REFERENCES vehicles(id),
        appointment_date TIMESTAMP NOT NULL,
        service_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create reminders table
    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id),
        customer_id INTEGER REFERENCES customers(id),
        reminder_type VARCHAR(50) NOT NULL,
        reminder_date DATE NOT NULL,
        message TEXT,
        sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create reminder_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS reminder_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        days_before INTEGER DEFAULT 30,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create receipts table
    await sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        vehicle_id INTEGER REFERENCES vehicles(id),
        receipt_number VARCHAR(50) UNIQUE,
        total_amount DECIMAL(10,2),
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'pending',
        issued_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create stock table
    await sql`
      CREATE TABLE IF NOT EXISTS stock (
        id SERIAL PRIMARY KEY,
        part_number VARCHAR(100) NOT NULL,
        description TEXT,
        quantity INTEGER DEFAULT 0,
        unit_price DECIMAL(10,2),
        supplier VARCHAR(255),
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create document_extras table
    await sql`
      CREATE TABLE IF NOT EXISTS document_extras (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        vehicle_id INTEGER REFERENCES vehicles(id),
        document_type VARCHAR(100),
        file_name VARCHAR(255),
        file_path TEXT,
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create line_items table
    await sql`
      CREATE TABLE IF NOT EXISTS line_items (
        id SERIAL PRIMARY KEY,
        receipt_id INTEGER REFERENCES receipts(id),
        description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create MOT history table for detailed MOT data
    await sql`
      CREATE TABLE IF NOT EXISTS mot_history (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id),
        registration VARCHAR(20) NOT NULL,
        test_date DATE,
        test_result VARCHAR(50),
        expiry_date DATE,
        odometer_value INTEGER,
        odometer_unit VARCHAR(10),
        mot_test_number VARCHAR(50),
        defects JSONB,
        advisories JSONB,
        test_class VARCHAR(10),
        test_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_mot_status ON vehicles(mot_status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reminders_sent ON reminders(sent)`
    await sql`CREATE INDEX IF NOT EXISTS idx_mot_history_registration ON mot_history(registration)`
    await sql`CREATE INDEX IF NOT EXISTS idx_mot_history_vehicle_id ON mot_history(vehicle_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_mot_history_test_date ON mot_history(test_date)`

    console.log("[NEON-CLIENT] Database schema initialized successfully")
    return { success: true }
  } catch (error) {
    console.error("[NEON-CLIENT] Database initialization failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown initialization error",
    }
  }
}

/**
 * Get database statistics with safe error handling
 */
export async function getDatabaseStats() {
  const safeCount = async (tableName: string): Promise<number> => {
    try {
      const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
      return Number(result[0]?.count || 0)
    } catch (error) {
      // If table doesn't exist, return 0
      if (error instanceof Error && error.message.includes("does not exist")) {
        return 0
      }
      throw error
    }
  }

  try {
    const [
      customers,
      vehicles,
      appointments,
      reminders,
      reminderTemplates,
      receipts,
      stock,
      documentExtras,
      documents,
      lineItems,
      motHistory,
    ] = await Promise.all([
      safeCount("customers"),
      safeCount("vehicles"),
      safeCount("appointments"),
      safeCount("reminders"),
      safeCount("reminder_templates"),
      safeCount("receipts"),
      safeCount("stock"),
      safeCount("document_extras"),
      safeCount("documents"),
      safeCount("line_items"),
      safeCount("mot_history"),
    ])

    return {
      customers,
      vehicles,
      appointments,
      reminders,
      reminderTemplates,
      receipts,
      stock,
      documentExtras,
      documents,
      lineItems,
      motHistory,
    }
  } catch (error) {
    console.error("[NEON-CLIENT] Error getting database stats:", error)
    // Return zeros if there's an error
    return {
      customers: 0,
      vehicles: 0,
      appointments: 0,
      reminders: 0,
      reminderTemplates: 0,
      receipts: 0,
      stock: 0,
      documentExtras: 0,
      documents: 0,
      lineItems: 0,
      motHistory: 0,
    }
  }
}

// Database type definitions
export interface DatabaseCustomer {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  country?: string
  date_of_birth?: string
  created_at?: string
  updated_at?: string
  twilio_phone?: string
  phone_verified?: boolean
  last_contact_date?: string
  contact_preference?: string
  opt_out?: boolean
  vehicle_count?: number
  // Legacy fields
  account_number?: string
  title?: string
  forename?: string
  surname?: string
  company_name?: string
  house_no?: string
  road?: string
  locality?: string
  town?: string
  county?: string
  post_code?: string
  telephone?: string
  mobile?: string
  last_invoice_date?: string
  notes?: string
}

export interface DatabaseVehicle {
  id: string
  registration: string
  make?: string
  model?: string
  year?: number
  color?: string
  fuel_type?: string
  engine_size?: string
  vin?: string
  mot_status?: string
  mot_expiry_date?: string
  tax_status?: string
  tax_due_date?: string
  owner_id?: string
  created_at?: string
  updated_at?: string
}

export { sql }
