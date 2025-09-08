import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration() {
  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    console.log('🔄 Connecting to database...');
    const sql = neon(databaseUrl);

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'create-parts-pricing-history-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📊 Running parts pricing history migration...');

    // Execute the entire SQL as one statement
    try {
      await sql.unsafe(migrationSQL);
      console.log('✅ Migration SQL executed successfully');
    } catch (error) {
      console.error('❌ Error executing migration:', error.message);
      throw error;
    }

    console.log('🎉 Parts pricing history migration completed successfully!');

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('parts_master', 'parts_pricing_history', 'parts_pricing_analytics', 'parts_pricing_suggestions')
      ORDER BY table_name
    `;

    console.log('📋 Created tables:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.table_name}`);
    });

    // Check sample data
    const sampleData = await sql`SELECT COUNT(*) as count FROM parts_pricing_history`;
    console.log(`📊 Sample pricing history records: ${sampleData[0].count}`);

    console.log('🎯 Migration verification complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();
