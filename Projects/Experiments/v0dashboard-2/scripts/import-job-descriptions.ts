import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface DocumentExtra {
  _ID: string;
  'Labour Description': string;
  docNotes: string;
}

async function importJobDescriptions() {
  console.log('🔍 IMPORTING JOB DESCRIPTIONS FROM DOCUMENT_EXTRAS.CSV');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // Read and parse the CSV file
    const fileContent = readFileSync('./data/Document_Extras.csv', 'utf-8');
    const records: DocumentExtra[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`📊 Found ${records.length} document extras in CSV`);

    // Create document_extras table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        labour_description TEXT,
        doc_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    let imported = 0;
    let jobSheetDescriptions = 0;

    for (const record of records) {
      try {
        if (!record._ID) continue;

        // Insert document extra
        await client.query(`
          INSERT INTO document_extras (
            id, document_id, labour_description, doc_notes
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            labour_description = EXCLUDED.labour_description,
            doc_notes = EXCLUDED.doc_notes
        `, [
          record._ID,
          record._ID, // Use _ID as both id and document_id for now
          record['Labour Description'] || null,
          record.docNotes || null
        ]);

        imported++;

        // Check if this is linked to a job sheet
        const jobSheetCheck = await client.query(`
          SELECT cd.document_type, cd.vehicle_registration, cd.document_number
          FROM customer_documents cd
          WHERE cd.id = $1 AND cd.document_type = 'JS'
        `, [record._ID]);

        if (jobSheetCheck.rows.length > 0) {
          jobSheetDescriptions++;
          const js = jobSheetCheck.rows[0];
          console.log(`   ✅ Job Sheet: ${js.vehicle_registration} (${js.document_number}) - ${record['Labour Description']?.substring(0, 80)}...`);
        }

        if (imported % 1000 === 0) {
          console.log(`   📊 Processed ${imported} document extras...`);
        }

      } catch (error) {
        console.error(`   ❌ Error importing record ${record._ID}:`, error);
      }
    }

    console.log(`\n✅ Import Complete!`);
    console.log(`   📊 Total imported: ${imported}`);
    console.log(`   🚗 Job sheet descriptions: ${jobSheetDescriptions}`);

    // Verify the import by checking job sheets with descriptions
    const verifyQuery = await client.query(`
      SELECT 
        cd.vehicle_registration,
        cd.document_number,
        de.labour_description
      FROM customer_documents cd
      JOIN document_extras de ON cd.id = de.document_id
      WHERE cd.document_type = 'JS'
      ORDER BY cd.vehicle_registration
      LIMIT 5
    `);

    if (verifyQuery.rows.length > 0) {
      console.log(`\n📋 Sample Job Sheet Descriptions:`);
      verifyQuery.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.vehicle_registration} (${row.document_number})`);
        console.log(`      ${row.labour_description?.substring(0, 100)}...`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await importJobDescriptions();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import
main();
