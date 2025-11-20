import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function inspectSchema() {
  const client = await pool.connect();
  try {
    console.log('🔍 Inspecting database schema...\n');

    // Get all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);

    console.log(`📋 Found ${tables.length} tables in the database:`);
    console.log('----------------------------------------');

    // Get columns and constraints for each table
    for (const table of tables) {
      const columnsQuery = `
        SELECT 
          column_name, 
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `;

      const constraintsQuery = `
        SELECT 
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE 
          tc.table_name = $1
        ORDER BY 
          tc.constraint_type,
          kcu.column_name;
      `;

      const [columnsResult, constraintsResult] = await Promise.all([
        client.query(columnsQuery, [table]),
        client.query(constraintsQuery, [table]),
      ]);

      console.log(`\n📊 Table: ${table}`);
      console.log('----------------------------------------');
      
      // Display columns
      console.log('\n  Columns:');
      console.log('  -------------------------');
      if (columnsResult.rows.length === 0) {
        console.log('  No columns found');
      } else {
        for (const col of columnsResult.rows) {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          const maxLength = col.character_maximum_length 
            ? `(${col.character_maximum_length})` 
            : '';
          console.log(`  • ${col.column_name.padEnd(30)} ${col.data_type}${maxLength} ${nullable}${defaultValue}`);
        }
      }

      // Display constraints
      console.log('\n  Constraints:');
      console.log('  -------------------------');
      if (constraintsResult.rows.length === 0) {
        console.log('  No constraints found');
      } else {
        const constraints = constraintsResult.rows;
        for (const con of constraints) {
          if (con.constraint_type === 'FOREIGN KEY') {
            console.log(`  • FOREIGN KEY (${con.column_name}) REFERENCES ${con.foreign_table_name}(${con.foreign_column_name})`);
          } else if (con.constraint_type === 'PRIMARY KEY') {
            console.log(`  • PRIMARY KEY (${con.column_name})`);
          } else if (con.constraint_type === 'UNIQUE') {
            console.log(`  • UNIQUE (${con.column_name})`);
          } else {
            console.log(`  • ${con.constraint_type} (${con.column_name})`);
          }
        }
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error inspecting schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the inspection
inspectSchema()
  .then(() => console.log('\n✅ Database schema inspection completed!'))
  .catch(console.error);
