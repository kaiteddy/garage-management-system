import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Setting up vehicle data storage system...')
    
    // 1. Add new columns to vehicles table
    const vehicleColumns = [
      { name: 'derivative', type: 'VARCHAR(200)' },
      { name: 'body_style', type: 'VARCHAR(100)' },
      { name: 'doors', type: 'INTEGER' },
      { name: 'transmission', type: 'VARCHAR(50)' },
      { name: 'engine_capacity_cc', type: 'INTEGER' },
      { name: 'power_bhp', type: 'INTEGER' },
      { name: 'torque_nm', type: 'INTEGER' },
      { name: 'fuel_economy_combined_mpg', type: 'DECIMAL(5,2)' },
      { name: 'co2_emissions', type: 'INTEGER' },
      { name: 'euro_status', type: 'VARCHAR(10)' },
      { name: 'image_url', type: 'TEXT' },
      { name: 'image_expiry_date', type: 'TIMESTAMP' },
      { name: 'technical_specs', type: 'JSONB' },
      { name: 'service_data', type: 'JSONB' },
      { name: 'factory_options', type: 'JSONB' },
      { name: 'data_sources', type: 'JSONB DEFAULT \'{}\'::jsonb' },
      { name: 'last_data_update', type: 'TIMESTAMP' },
      { name: 'data_completeness_score', type: 'INTEGER DEFAULT 0' }
    ]
    
    for (const column of vehicleColumns) {
      try {
        await client.query(`
          ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `)
        console.log(`✓ Added column: ${column.name}`)
      } catch (error) {
        console.log(`⚠️ Column ${column.name} might already exist`)
      }
    }
    
    // 2. Create API usage log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_usage_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        registration VARCHAR(20) NOT NULL,
        vehicle_id UUID,
        api_provider VARCHAR(50) NOT NULL,
        api_package VARCHAR(100),
        cost_amount DECIMAL(10,4) NOT NULL DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'GBP',
        request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        response_status VARCHAR(20),
        data_retrieved BOOLEAN DEFAULT false,
        cached_hit BOOLEAN DEFAULT false,
        request_details JSONB,
        response_summary JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Created api_usage_log table')
    
    // 3. Create API budgets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        budget_name VARCHAR(100) NOT NULL,
        api_provider VARCHAR(50) NOT NULL,
        monthly_budget_limit DECIMAL(10,2) NOT NULL,
        current_month_spend DECIMAL(10,2) DEFAULT 0,
        budget_month DATE NOT NULL,
        alert_threshold_percentage INTEGER DEFAULT 80,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(api_provider, budget_month)
      )
    `)
    console.log('✓ Created api_budgets table')
    
    // 4. Create vehicle data cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_data_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        registration VARCHAR(20) NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        api_source VARCHAR(50) NOT NULL,
        cached_data JSONB NOT NULL,
        cache_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_timestamp TIMESTAMP,
        is_valid BOOLEAN DEFAULT true,
        access_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(registration, data_type, api_source)
      )
    `)
    console.log('✓ Created vehicle_data_cache table')
    
    // 5. Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_vehicles_registration_lookup ON vehicles(registration)',
      'CREATE INDEX IF NOT EXISTS idx_vehicles_data_sources ON vehicles USING GIN (data_sources)',
      'CREATE INDEX IF NOT EXISTS idx_vehicles_technical_specs ON vehicles USING GIN (technical_specs)',
      'CREATE INDEX IF NOT EXISTS idx_vehicles_service_data ON vehicles USING GIN (service_data)',
      'CREATE INDEX IF NOT EXISTS idx_vehicles_last_data_update ON vehicles(last_data_update)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_registration ON api_usage_log(registration)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_log(api_provider)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_log(request_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_api_budgets_provider ON api_budgets(api_provider)',
      'CREATE INDEX IF NOT EXISTS idx_api_budgets_month ON api_budgets(budget_month)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_cache_registration ON vehicle_data_cache(registration)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_cache_type_source ON vehicle_data_cache(data_type, api_source)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_cache_expiry ON vehicle_data_cache(expiry_timestamp)'
    ]
    
    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL)
      } catch (error) {
        console.log(`⚠️ Index might already exist: ${error}`)
      }
    }
    console.log('✓ Created indexes')
    
    // 6. Insert default budgets
    await client.query(`
      INSERT INTO api_budgets (budget_name, api_provider, monthly_budget_limit, budget_month) 
      VALUES 
        ('VDG Monthly Budget', 'VDG', 100.00, DATE_TRUNC('month', CURRENT_DATE)),
        ('SWS Monthly Budget', 'SWS', 200.00, DATE_TRUNC('month', CURRENT_DATE))
      ON CONFLICT (api_provider, budget_month) DO NOTHING
    `)
    console.log('✓ Created default budgets')
    
    // 7. Create views (using registration as primary key)
    await client.query(`
      CREATE OR REPLACE VIEW vehicle_data_summary AS
      SELECT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.data_completeness_score,
        v.last_data_update,
        v.data_sources,
        CASE
          WHEN v.image_url IS NOT NULL AND (v.image_expiry_date IS NULL OR v.image_expiry_date > NOW()) THEN true
          ELSE false
        END as has_valid_image,
        CASE
          WHEN v.technical_specs IS NOT NULL THEN true
          ELSE false
        END as has_technical_specs,
        CASE
          WHEN v.service_data IS NOT NULL THEN true
          ELSE false
        END as has_service_data
      FROM vehicles v
    `)
    console.log('✓ Created vehicle_data_summary view')
    
    await client.query(`
      CREATE OR REPLACE VIEW api_cost_summary AS
      SELECT 
        api_provider,
        DATE_TRUNC('month', request_timestamp) as month,
        COUNT(*) as total_requests,
        SUM(cost_amount) as total_cost,
        AVG(cost_amount) as avg_cost_per_request,
        COUNT(CASE WHEN cached_hit = true THEN 1 END) as cache_hits,
        COUNT(CASE WHEN response_status = 'success' THEN 1 END) as successful_requests
      FROM api_usage_log 
      GROUP BY api_provider, DATE_TRUNC('month', request_timestamp)
      ORDER BY month DESC, api_provider
    `)
    console.log('✓ Created api_cost_summary view')
    
    // 8. Test the setup
    const testQueries = [
      'SELECT COUNT(*) FROM api_usage_log',
      'SELECT COUNT(*) FROM api_budgets',
      'SELECT COUNT(*) FROM vehicle_data_cache',
      'SELECT COUNT(*) FROM vehicle_data_summary',
      'SELECT COUNT(*) FROM api_cost_summary'
    ]
    
    for (const query of testQueries) {
      const result = await client.query(query)
      console.log(`✓ Test query successful: ${query} -> ${result.rows[0].count} rows`)
    }
    
    console.log('🎉 Vehicle data storage system setup completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Vehicle data storage system setup completed successfully',
      features: [
        'Enhanced vehicle table with comprehensive data fields',
        'API usage logging and cost tracking',
        'Budget management system',
        'Intelligent data caching',
        'Performance indexes',
        'Analytics views'
      ]
    })
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to setup vehicle data storage system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
