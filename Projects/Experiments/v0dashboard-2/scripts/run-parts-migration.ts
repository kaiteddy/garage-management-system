import { sql } from '../lib/database/neon-client';
import fs from 'fs';
import path from 'path';

async function runPartsMigration() {
  try {
    console.log('🚀 Starting parts database migration...');

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'create-parts-database.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
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
    }

    // Verify the migration by checking if tables exist
    console.log('🔍 Verifying migration...');
    
    const tableCheck = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('parts', 'parts_suppliers', 'parts_pricing_history', 'parts_vehicle_compatibility', 'parts_usage_history', 'partsouq_api_usage')
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    tableCheck.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check if the stock view was created
    const viewCheck = await sql.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'stock'
    `);

    if (viewCheck.rows.length > 0) {
      console.log('  ✅ stock (view)');
    }

    // Insert some sample data
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

    console.log('🎉 Parts database migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  • Enhanced parts table with comprehensive automotive data');
    console.log('  • Parts suppliers management');
    console.log('  • Parts pricing history tracking');
    console.log('  • Vehicle compatibility system');
    console.log('  • Parts usage/sales history');
    console.log('  • PartSouq API integration tracking');
    console.log('  • Backward compatibility with existing stock table (as view)');
    console.log('');
    console.log('🔗 Next steps:');
    console.log('  • Test the new parts API endpoints');
    console.log('  • Import existing parts data');
    console.log('  • Configure PartSouq integration');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runPartsMigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
