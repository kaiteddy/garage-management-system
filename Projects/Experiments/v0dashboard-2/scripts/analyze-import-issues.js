import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

console.log('🔍 ANALYZING IMPORT BLOCKING ISSUES');
console.log('==================================');

try {
  // 1. Check current database status
  const stats = await sql`
    SELECT 
      COUNT(*) as total_items,
      COUNT(DISTINCT id) as unique_ids,
      MAX(created_at) as last_import_time
    FROM line_items
  `;

  console.log('📊 DATABASE STATUS:');
  console.log(`  Total records: ${stats[0].total_items}`);
  console.log(`  Unique IDs: ${stats[0].unique_ids}`);
  console.log(`  Last import: ${stats[0].last_import_time}`);

  // 2. Analyze CSV file structure
  console.log('\n📄 CSV ANALYSIS:');
  const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.log('❌ CSV file not found at expected path');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');

  console.log(`  Total CSV lines: ${lines.length}`);
  console.log(`  Header: ${lines[0]}`);

  // 3. Get all imported IDs for comparison
  console.log('\n🔍 LOADING IMPORTED IDS...');
  const dbRecords = await sql`SELECT id FROM line_items`;
  const importedIds = new Set(dbRecords.map(record => record.id));
  console.log(`  Loaded ${importedIds.size} imported IDs`);

  // 4. Analyze CSV records
  console.log('\n📊 ANALYZING CSV RECORDS:');
  let totalValidRecords = 0;
  let emptyCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let alreadyImportedCount = 0;
  let needsImportCount = 0;
  const seenIds = new Set();
  const sampleNotImported = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      emptyCount++;
      continue;
    }
    
    const values = line.split(',');
    const id = values[0] ? values[0].replace(/"/g, '') : '';
    
    if (!id || id.length < 10) {
      invalidCount++;
      continue;
    }
    
    if (seenIds.has(id)) {
      duplicateCount++;
      continue;
    }
    
    seenIds.add(id);
    totalValidRecords++;
    
    if (importedIds.has(id)) {
      alreadyImportedCount++;
    } else {
      needsImportCount++;
      if (sampleNotImported.length < 10) {
        sampleNotImported.push({ id, line: line.substring(0, 150) });
      }
    }
  }

  console.log(`  Total CSV lines: ${lines.length - 1} (excluding header)`);
  console.log(`  Empty lines: ${emptyCount}`);
  console.log(`  Invalid IDs: ${invalidCount}`);
  console.log(`  Duplicate IDs: ${duplicateCount}`);
  console.log(`  Valid unique records: ${totalValidRecords}`);
  console.log(`  Already imported: ${alreadyImportedCount}`);
  console.log(`  NEEDS IMPORT: ${needsImportCount}`);

  // 5. Show sample records that need importing
  console.log('\n🔍 SAMPLE RECORDS NEEDING IMPORT:');
  sampleNotImported.forEach((record, i) => {
    console.log(`  ${i + 1}. ${record.id} - ${record.line}...`);
  });

  // 6. Calculate real completion percentage
  const realCompletionPercentage = (alreadyImportedCount / totalValidRecords * 100);
  console.log(`\n📈 REAL IMPORT STATUS:`);
  console.log(`  Valid CSV records: ${totalValidRecords}`);
  console.log(`  Successfully imported: ${alreadyImportedCount}`);
  console.log(`  Real completion: ${realCompletionPercentage.toFixed(1)}%`);
  console.log(`  Remaining to import: ${needsImportCount}`);

  // 7. Test import capability with a sample record
  if (sampleNotImported.length > 0) {
    console.log('\n🧪 TESTING IMPORT CAPABILITY:');
    const testRecord = sampleNotImported[0];
    const values = testRecord.line.split(',');
    
    try {
      // Parse the record to see if there are any data issues
      const parsedRecord = {
        id: values[0]?.replace(/"/g, '') || '',
        document_id: values[1]?.replace(/"/g, '') || '',
        line_type: values[2]?.replace(/"/g, '') || '',
        description: values[3]?.replace(/"/g, '') || '',
        quantity: parseFloat(values[4]?.replace(/"/g, '') || '0'),
        unit_price: parseFloat(values[5]?.replace(/"/g, '') || '0'),
        total_amount: parseFloat(values[6]?.replace(/"/g, '') || '0')
      };
      
      console.log(`  Test record parsed successfully:`);
      console.log(`    ID: ${parsedRecord.id}`);
      console.log(`    Document: ${parsedRecord.document_id}`);
      console.log(`    Type: ${parsedRecord.line_type}`);
      console.log(`    Description: ${parsedRecord.description.substring(0, 50)}...`);
      console.log(`    Quantity: ${parsedRecord.quantity}`);
      console.log(`    Unit Price: ${parsedRecord.unit_price}`);
      console.log(`    Total: ${parsedRecord.total_amount}`);
      
      // Check if document exists
      const docExists = await sql`
        SELECT id FROM documents WHERE id = ${parsedRecord.document_id}
      `;
      
      if (docExists.length === 0) {
        console.log(`  ⚠️  Document ${parsedRecord.document_id} does not exist in documents table`);
        console.log(`  💡 This may be blocking the import due to foreign key constraints`);
      } else {
        console.log(`  ✅ Document ${parsedRecord.document_id} exists`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error parsing test record: ${error.message}`);
    }
  }

  console.log('\n💡 ANALYSIS COMPLETE');
  console.log(`📊 Summary: ${needsImportCount} records need to be imported`);

} catch (error) {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
}
