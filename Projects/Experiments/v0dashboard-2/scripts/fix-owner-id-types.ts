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

async function fixOwnerIdTypes() {
  try {
    console.log('Fixing owner ID column types in vehicle_ownership_changes table...')
    
    // Change previous_owner_id from integer to VARCHAR
    await sql`
      ALTER TABLE vehicle_ownership_changes 
      ALTER COLUMN previous_owner_id TYPE VARCHAR(255)
    `
    console.log('✅ previous_owner_id column type changed to VARCHAR(255)')
    
    // Check final table structure
    const result = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'vehicle_ownership_changes'
      ORDER BY ordinal_position
    `
    
    console.log('📋 Final table schema:')
    result.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`)
    })
    
  } catch (error) {
    console.error('❌ Error updating vehicle_ownership_changes table:', error)
    throw error
  }
}

// Run the script
fixOwnerIdTypes()
  .then(() => {
    console.log('🎉 Vehicle ownership changes table type fix complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to update table:', error)
    process.exit(1)
  })
