import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Starting vehicle data storage system migration...')
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrations', 'vehicle_data_storage_system.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Execute the migration
    await client.query(migrationSQL)
    
    console.log('✅ Vehicle data storage system migration completed successfully!')
    
    // Verify the new tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('api_usage_log', 'api_budgets', 'vehicle_data_cache')
    `)
    
    console.log('📋 New tables created:')
    tableCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`)
    })
    
    // Check if vehicle table columns were added
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name IN ('technical_specs', 'service_data', 'data_sources', 'image_url')
    `)
    
    console.log('📋 Vehicle table enhancements:')
    columnCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} column added`)
    })
    
    // Insert sample budget data if not exists
    const budgetCheck = await client.query('SELECT COUNT(*) FROM api_budgets')
    if (parseInt(budgetCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO api_budgets (budget_name, api_provider, monthly_budget_limit, budget_month) 
        VALUES 
          ('VDG Monthly Budget', 'VDG', 100.00, DATE_TRUNC('month', CURRENT_DATE)),
          ('SWS Monthly Budget', 'SWS', 200.00, DATE_TRUNC('month', CURRENT_DATE))
      `)
      console.log('💰 Default API budgets created')
    }
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the migration
runMigration().catch(console.error)
