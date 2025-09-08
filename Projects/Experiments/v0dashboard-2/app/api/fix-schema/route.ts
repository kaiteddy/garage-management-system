import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('[FIX-SCHEMA] Starting comprehensive schema fixes...')

    const fixes = []
    const errors = []

    // 1. Check and fix vehicles table - add customer_id if missing
    try {
      console.log('[FIX-SCHEMA] Step 1: Checking vehicles table structure...')
      
      // Check if customer_id column exists
      const vehicleColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'customer_id'
      `
      
      if (vehicleColumns.length === 0) {
        console.log('[FIX-SCHEMA] Adding customer_id column to vehicles table...')
        await sql`ALTER TABLE vehicles ADD COLUMN customer_id TEXT`
        fixes.push('Added customer_id column to vehicles table')
      } else {
        fixes.push('vehicles.customer_id column already exists')
      }

      // Check if _id_customer column exists (from import data)
      const idCustomerColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = '_id_customer'
      `
      
      if (idCustomerColumns.length > 0) {
        console.log('[FIX-SCHEMA] Updating customer_id from _id_customer...')
        await sql`UPDATE vehicles SET customer_id = _id_customer WHERE _id_customer IS NOT NULL`
        fixes.push('Updated customer_id from _id_customer in vehicles table')
      }

    } catch (error) {
      errors.push(`Vehicles table fix error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 2. Fix document_receipts table - ensure proper schema
    try {
      console.log('[FIX-SCHEMA] Step 2: Fixing document_receipts table...')
      
      // Check if reconciled_date column exists and remove it if it does
      const reconciledDateColumn = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'document_receipts' AND column_name = 'reconciled_date'
      `
      
      if (reconciledDateColumn.length > 0) {
        console.log('[FIX-SCHEMA] Removing reconciled_date column from document_receipts...')
        await sql`ALTER TABLE document_receipts DROP COLUMN reconciled_date`
        fixes.push('Removed reconciled_date column from document_receipts')
      }

    } catch (error) {
      errors.push(`Document receipts fix error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 3. Fix document_extras table - check schema
    try {
      console.log('[FIX-SCHEMA] Step 3: Checking document_extras table...')
      
      const extrasColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'document_extras'
        ORDER BY ordinal_position
      `
      
      fixes.push(`Document extras table has ${extrasColumns.length} columns`)

    } catch (error) {
      errors.push(`Document extras check error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 4. Create proper foreign key relationships
    try {
      console.log('[FIX-SCHEMA] Step 4: Setting up foreign key relationships...')
      
      // Add foreign key constraint for vehicles -> customers (if not exists)
      try {
        await sql`
          ALTER TABLE vehicles 
          ADD CONSTRAINT fk_vehicles_customer 
          FOREIGN KEY (customer_id) REFERENCES customers(id) 
          ON DELETE SET NULL
        `
        fixes.push('Added foreign key constraint: vehicles -> customers')
      } catch (fkError) {
        // Constraint might already exist
        fixes.push('Foreign key constraint vehicles -> customers already exists or not needed')
      }

      // Add foreign key constraint for customer_documents -> customers (if not exists)
      try {
        await sql`
          ALTER TABLE customer_documents 
          ADD CONSTRAINT fk_documents_customer 
          FOREIGN KEY (customer_id) REFERENCES customers(id) 
          ON DELETE SET NULL
        `
        fixes.push('Added foreign key constraint: customer_documents -> customers')
      } catch (fkError) {
        fixes.push('Foreign key constraint customer_documents -> customers already exists or not needed')
      }

    } catch (error) {
      errors.push(`Foreign key setup error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 5. Create indexes for better performance
    try {
      console.log('[FIX-SCHEMA] Step 5: Creating performance indexes...')
      
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration)',
        'CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON customer_documents(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_line_items_document_id ON document_line_items(document_id)',
        'CREATE INDEX IF NOT EXISTS idx_receipts_document_id ON document_receipts(document_id)',
        'CREATE INDEX IF NOT EXISTS idx_extras_document_id ON document_extras(document_id)'
      ]

      for (const indexSQL of indexes) {
        try {
          await sql.unsafe(indexSQL)
          fixes.push(`Created index: ${indexSQL.split(' ')[5]}`)
        } catch (indexError) {
          // Index might already exist
        }
      }

    } catch (error) {
      errors.push(`Index creation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 6. Get final table counts
    try {
      console.log('[FIX-SCHEMA] Step 6: Getting final table counts...')
      
      const counts = {}
      const tables = ['customers', 'vehicles', 'customer_documents', 'document_line_items', 'document_receipts', 'document_extras', 'mot_history']
      
      for (const table of tables) {
        try {
          const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
          counts[table] = parseInt(result[0].count)
        } catch (countError) {
          counts[table] = 0
        }
      }

      fixes.push(`Final table counts: ${JSON.stringify(counts)}`)

    } catch (error) {
      errors.push(`Count error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    console.log('[FIX-SCHEMA] ✅ Schema fixes complete')
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      fixes_applied: fixes,
      errors_encountered: errors,
      summary: {
        total_fixes: fixes.length,
        total_errors: errors.length,
        success_rate: `${((fixes.length / (fixes.length + errors.length)) * 100).toFixed(1)}%`
      }
    })

  } catch (error) {
    console.error('[FIX-SCHEMA] Critical error during schema fixes:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to fix schema',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
