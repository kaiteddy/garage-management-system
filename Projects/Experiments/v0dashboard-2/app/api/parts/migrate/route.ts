import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database/neon-client';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting parts database migration...');

    // SQL statements for migration
    const migrationStatements = [
      // Enable UUID extension
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      
      // Don't drop existing stock table - we'll create parts table alongside it
      
      // Enhanced Parts table
      `CREATE TABLE IF NOT EXISTS parts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        part_number VARCHAR(100) UNIQUE NOT NULL,
        oem_part_number VARCHAR(100),
        description TEXT NOT NULL,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        
        -- Pricing information
        cost_net DECIMAL(10,2) DEFAULT 0,
        price_retail_net DECIMAL(10,2) DEFAULT 0,
        price_trade_net DECIMAL(10,2) DEFAULT 0,
        margin_percentage DECIMAL(5,2),
        
        -- Stock information
        quantity_in_stock INTEGER DEFAULT 0,
        minimum_stock_level INTEGER DEFAULT 0,
        location VARCHAR(100),
        bin_location VARCHAR(50),
        
        -- Supplier information
        supplier_id UUID,
        supplier_name VARCHAR(200),
        supplier_part_number VARCHAR(100),
        manufacturer VARCHAR(200),
        brand VARCHAR(100),
        
        -- Vehicle compatibility
        vehicle_makes TEXT[],
        vehicle_models TEXT[],
        year_from INTEGER,
        year_to INTEGER,
        engine_codes TEXT[],
        
        -- Part specifications
        weight_kg DECIMAL(8,3),
        dimensions_length_mm INTEGER,
        dimensions_width_mm INTEGER,
        dimensions_height_mm INTEGER,
        warranty_months INTEGER,
        
        -- PartSouq integration
        partsouq_id VARCHAR(100),
        partsouq_url TEXT,
        partsouq_last_updated TIMESTAMP,
        partsouq_price DECIMAL(10,2),
        partsouq_availability VARCHAR(50),
        
        -- Additional metadata
        notes TEXT,
        tags TEXT[],
        is_active BOOLEAN DEFAULT true,
        is_hazardous BOOLEAN DEFAULT false,
        requires_core_exchange BOOLEAN DEFAULT false,
        
        -- Audit fields
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        updated_by VARCHAR(100)
      )`,
      
      // Parts suppliers table
      `CREATE TABLE IF NOT EXISTS parts_suppliers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        website VARCHAR(255),
        address TEXT,
        payment_terms VARCHAR(100),
        delivery_days INTEGER,
        minimum_order_value DECIMAL(10,2),
        discount_percentage DECIMAL(5,2),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Parts pricing history table
      `CREATE TABLE IF NOT EXISTS parts_pricing_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
        supplier_id UUID REFERENCES parts_suppliers(id) ON DELETE SET NULL,
        price_type VARCHAR(20),
        old_price DECIMAL(10,2),
        new_price DECIMAL(10,2),
        change_reason VARCHAR(100),
        effective_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100)
      )`,
      
      // Parts vehicle compatibility table
      `CREATE TABLE IF NOT EXISTS parts_vehicle_compatibility (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
        make VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        variant VARCHAR(100),
        year_from INTEGER,
        year_to INTEGER,
        engine_code VARCHAR(50),
        engine_size VARCHAR(20),
        fuel_type VARCHAR(50),
        transmission VARCHAR(50),
        body_style VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Parts usage/sales history
      `CREATE TABLE IF NOT EXISTS parts_usage_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
        document_id UUID,
        vehicle_id UUID,
        quantity_used INTEGER NOT NULL,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        usage_date DATE,
        usage_type VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // PartSouq API usage tracking
      `CREATE TABLE IF NOT EXISTS partsouq_api_usage (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_type VARCHAR(50),
        search_query TEXT,
        part_number VARCHAR(100),
        vehicle_registration VARCHAR(20),
        results_count INTEGER,
        api_cost DECIMAL(10,4),
        response_time_ms INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        method_used VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Add method_used column if it doesn't exist (for existing installations)
      `ALTER TABLE partsouq_api_usage
       ADD COLUMN IF NOT EXISTS method_used VARCHAR(50)`,
      
      // Create backward compatibility view (only if stock table doesn't exist)
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock') THEN
          CREATE VIEW stock AS
          SELECT
            id,
            part_number,
            description,
            category,
            cost_net,
            price_retail_net,
            quantity_in_stock,
            location,
            supplier_name as supplier,
            manufacturer,
            created_at,
            updated_at
          FROM parts;
        END IF;
      END $$`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_oem_part_number ON parts(oem_part_number)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_supplier_id ON parts(supplier_id)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_manufacturer ON parts(manufacturer)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_brand ON parts(brand)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_is_active ON parts(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_partsouq_id ON parts(partsouq_id)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_vehicle_makes ON parts USING GIN(vehicle_makes)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_vehicle_models ON parts USING GIN(vehicle_models)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_engine_codes ON parts USING GIN(engine_codes)`,
      `CREATE INDEX IF NOT EXISTS idx_parts_tags ON parts USING GIN(tags)`,
      
      // Create updated_at trigger function
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'`,
      
      // Apply triggers
      `CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      `CREATE TRIGGER update_parts_suppliers_updated_at BEFORE UPDATE ON parts_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
    ];

    console.log(`📝 Executing ${migrationStatements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < migrationStatements.length; i++) {
      const statement = migrationStatements[i];
      try {
        console.log(`⚡ Executing statement ${i + 1}/${migrationStatements.length}...`);
        await sql.query(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
      } catch (error: any) {
        // Some errors are expected (like table already exists)
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Insert sample data
    console.log('📦 Inserting sample data...');
    
    try {
      await sql.query(`
        INSERT INTO parts_suppliers (name, email, phone, is_active) VALUES
        ('PartSouq', 'info@partsouq.com', '+44 20 1234 5678', true),
        ('Euro Car Parts', 'sales@eurocarparts.com', '+44 20 8765 4321', true),
        ('GSF Car Parts', 'orders@gsfcarparts.com', '+44 20 5555 1234', true)
        ON CONFLICT DO NOTHING
      `);

      await sql.query(`
        INSERT INTO parts (
          part_number, description, category, subcategory,
          cost_net, price_retail_net, quantity_in_stock,
          supplier_name, manufacturer, is_active, created_by
        ) VALUES
        ('BP-001', 'Brake Pads Front Set', 'Brakes', 'Brake Pads', 25.00, 45.99, 10, 'PartSouq', 'Brembo', true, 'migration'),
        ('OF-001', 'Oil Filter', 'Engine', 'Filters', 5.00, 12.50, 25, 'Euro Car Parts', 'Mann', true, 'migration'),
        ('AF-001', 'Air Filter', 'Engine', 'Filters', 8.00, 18.99, 15, 'GSF Car Parts', 'Bosch', true, 'migration')
        ON CONFLICT (part_number) DO NOTHING
      `);

      console.log('✅ Sample data inserted successfully');
    } catch (error) {
      console.log('⚠️  Sample data already exists or error inserting:', error);
    }

    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const tableCheck = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('parts', 'parts_suppliers', 'parts_pricing_history', 'parts_vehicle_compatibility', 'parts_usage_history', 'partsouq_api_usage')
      ORDER BY table_name
    `);

    const createdTables = tableCheck.rows ? tableCheck.rows.map(row => row.table_name) : [];

    console.log('🎉 Parts database migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Parts database migration completed successfully',
      data: {
        created_tables: createdTables,
        statements_executed: migrationStatements.length,
        summary: [
          'Enhanced parts table with comprehensive automotive data',
          'Parts suppliers management',
          'Parts pricing history tracking',
          'Vehicle compatibility system',
          'Parts usage/sales history',
          'PartSouq API integration tracking',
          'Backward compatibility with existing stock table (as view)'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
