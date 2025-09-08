// Simple Database Client for Job Sheets
// Uses standard pg client instead of Neon serverless to avoid fetch issues

import { Pool } from 'pg'

// Create a connection pool
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    console.log('[SIMPLE-DB] Database pool created')
  }

  return pool
}

/**
 * Execute a simple query
 */
export async function query(text: string, params?: any[]): Promise<any[]> {
  const client = getPool()
  
  try {
    console.log(`[SIMPLE-DB] Executing query: ${text.substring(0, 100)}...`)
    const result = await client.query(text, params)
    console.log(`[SIMPLE-DB] Query returned ${result.rows.length} rows`)
    return result.rows
  } catch (error) {
    console.error('[SIMPLE-DB] Query failed:', error)
    throw error
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('[SIMPLE-DB] Testing database connection...')
    const result = await query('SELECT 1 as test')
    
    if (result.length > 0 && result[0].test === 1) {
      console.log('[SIMPLE-DB] ✅ Database connection successful')
      return true
    } else {
      console.log('[SIMPLE-DB] ❌ Unexpected test result:', result)
      return false
    }
  } catch (error) {
    console.error('[SIMPLE-DB] ❌ Database connection failed:', error)
    return false
  }
}

/**
 * Get job sheets with proper error handling
 */
export async function getJobSheets(): Promise<any[]> {
  try {
    console.log('[SIMPLE-DB] Fetching job sheets...')

    // First, check if customer_documents table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_documents'
      )
    `)

    if (!tableCheck[0]?.exists) {
      console.log('[SIMPLE-DB] customer_documents table does not exist')
      return []
    }

    // Get basic job sheet data
    const jobSheets = await query(`
      SELECT 
        id,
        document_number,
        vehicle_registration,
        customer_id,
        created_at,
        status,
        COALESCE(total_gross::numeric, 0) as total_gross
      FROM customer_documents 
      WHERE document_type = 'JS'
      ORDER BY created_at DESC
      LIMIT 50
    `)

    console.log(`[SIMPLE-DB] Found ${jobSheets.length} job sheets`)

    // Enrich with customer and vehicle data
    const enrichedJobSheets = []
    
    for (const jobSheet of jobSheets) {
      try {
        let customer = null
        let vehicle = null

        // Get customer data if customer_id exists
        if (jobSheet.customer_id) {
          try {
            const customerResult = await query(`
              SELECT first_name, last_name, phone, email, address_line1, city, postcode
              FROM customers 
              WHERE id = $1
            `, [jobSheet.customer_id])
            
            customer = customerResult[0] || null
          } catch (customerError) {
            console.warn(`[SIMPLE-DB] Failed to get customer ${jobSheet.customer_id}:`, customerError)
          }
        }

        // Get vehicle data if registration exists
        if (jobSheet.vehicle_registration) {
          try {
            const vehicleResult = await query(`
              SELECT make, model, year, fuel_type, engine_size
              FROM vehicles 
              WHERE registration = $1
            `, [jobSheet.vehicle_registration])
            
            vehicle = vehicleResult[0] || null
          } catch (vehicleError) {
            console.warn(`[SIMPLE-DB] Failed to get vehicle ${jobSheet.vehicle_registration}:`, vehicleError)
          }
        }

        // Format the enriched job sheet
        enrichedJobSheets.push({
          id: jobSheet.id,
          document_number: jobSheet.document_number,
          vehicle_registration: jobSheet.vehicle_registration || 'NO REGISTRATION',
          customer_id: jobSheet.customer_id,
          created_at: jobSheet.created_at,
          status: jobSheet.status,
          total_gross: jobSheet.total_gross,
          
          // Customer info
          customer: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim().toUpperCase() : null,
          customerPhone: customer?.phone || null,
          customerEmail: customer?.email || null,
          addressInfo: customer ? {
            houseNumber: "",
            road: customer.address_line1 || "",
            locality: "",
            town: customer.city || "",
            county: "",
            postCode: customer.postcode || "",
            country: ""
          } : null,

          // Vehicle info - format as "MAKE MODEL" in caps, no year
          vehicleMakeModel: vehicle ?
            `${vehicle.make || ''} ${vehicle.model || ''}`.trim().toUpperCase() :
            null
        })

      } catch (enrichError) {
        console.warn(`[SIMPLE-DB] Failed to enrich job sheet ${jobSheet.id}:`, enrichError)
        
        // Add basic job sheet without enrichment
        enrichedJobSheets.push({
          ...jobSheet,
          customer: null,
          customerPhone: null,
          customerEmail: null,
          addressInfo: null,
          vehicleMakeModel: null
        })
      }
    }

    console.log(`[SIMPLE-DB] Successfully enriched ${enrichedJobSheets.length} job sheets`)
    return enrichedJobSheets

  } catch (error) {
    console.error('[SIMPLE-DB] Failed to get job sheets:', error)
    throw error
  }
}

/**
 * Get table information for debugging
 */
export async function getTableInfo(): Promise<any> {
  try {
    console.log('[SIMPLE-DB] Getting table information...')

    // Get all tables
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    const tableInfo: any = {
      tables: tables.map(t => t.table_name),
      counts: {}
    }

    // Get row counts for key tables
    const keyTables = ['customer_documents', 'customers', 'vehicles', 'line_items']
    
    for (const tableName of keyTables) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`)
        tableInfo.counts[tableName] = parseInt(countResult[0]?.count || '0')
      } catch (error) {
        tableInfo.counts[tableName] = 0
        console.warn(`[SIMPLE-DB] Table ${tableName} not accessible:`, error)
      }
    }

    console.log('[SIMPLE-DB] Table info:', tableInfo)
    return tableInfo

  } catch (error) {
    console.error('[SIMPLE-DB] Failed to get table info:', error)
    return { tables: [], counts: {} }
  }
}

/**
 * Close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('[SIMPLE-DB] Database pool closed')
  }
}
