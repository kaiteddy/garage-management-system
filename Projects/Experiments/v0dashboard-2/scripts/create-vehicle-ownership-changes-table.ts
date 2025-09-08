import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'
import * as dotenvExpand from 'dotenv-expand'

// Load environment variables from .env.local if it exists
const envPath = `${process.cwd()}/.env.local`
const env = dotenv.config({ path: envPath })
dotenvExpand.expand(env)

console.log(`✅ Loaded environment variables from ${envPath}`)

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function createVehicleOwnershipChangesTable() {
  try {
    console.log('Creating vehicle_ownership_changes table...')
    
    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS vehicle_ownership_changes (
        id SERIAL PRIMARY KEY,
        vehicle_registration VARCHAR(20) NOT NULL,
        previous_owner_id VARCHAR(255),
        new_owner_id VARCHAR(255),
        change_type VARCHAR(50) DEFAULT 'transferred',
        change_date DATE NOT NULL,
        reported_by VARCHAR(100) DEFAULT 'manual',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        verified BOOLEAN DEFAULT true
      )
    `
    
    console.log('✅ vehicle_ownership_changes table created successfully')

    // Check if table was created and get its structure
    const tableCheck = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicle_ownership_changes'
      ORDER BY ordinal_position
    `

    if (tableCheck.length > 0) {
      console.log('📋 Table schema confirmed:')
      tableCheck.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`)
      })

      // Create indexes for better performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_vehicle_ownership_changes_registration
        ON vehicle_ownership_changes(vehicle_registration)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_vehicle_ownership_changes_new_owner
        ON vehicle_ownership_changes(new_owner_id)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_vehicle_ownership_changes_previous_owner
        ON vehicle_ownership_changes(previous_owner_id)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_vehicle_ownership_changes_date
        ON vehicle_ownership_changes(change_date)
      `

      console.log('✅ Indexes created successfully')
    } else {
      console.log('⚠️ Table creation may have failed - no columns found')
    }
    
  } catch (error) {
    console.error('❌ Error creating vehicle_ownership_changes table:', error)
    throw error
  }
}

// Run the script
createVehicleOwnershipChangesTable()
  .then(() => {
    console.log('🎉 Vehicle ownership changes table setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to create table:', error)
    process.exit(1)
  })
