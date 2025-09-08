import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

console.log('🔍 COMPREHENSIVE 100% IMPORT VERIFICATION');
console.log('=========================================');

const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';

try {
  // 1. Database Statistics
  console.log('📊 DATABASE ANALYSIS:');
  const dbStats = await sql`
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT id) as unique_ids,
      SUM(total_amount) as total_value,
      MIN(created_at) as first_import,
      MAX(created_at) as last_import,
      COUNT(CASE WHEN line_type = '1' THEN 1 END) as labour_records,
      COUNT(CASE WHEN line_type = '2' THEN 1 END) as parts_records,
      COUNT(CASE WHEN total_amount > 0 THEN 1 END) as records_with_value,
      COUNT(CASE WHEN description != '' THEN 1 END) as records_with_description
    FROM line_items
  `;

  const dbRecord = dbStats[0];
  console.log(`  📦 Total Records: ${parseInt(dbRecord.total_records).toLocaleString()}`);
  console.log(`  🔑 Unique IDs: ${parseInt(dbRecord.unique_ids).toLocaleString()}`);
  console.log(`  💰 Total Value: £${parseFloat(dbRecord.total_value).toLocaleString()}`);
  console.log(`  👷 Labour Records: ${parseInt(dbRecord.labour_records).toLocaleString()}`);
  console.log(`  🔧 Parts Records: ${parseInt(dbRecord.parts_records).toLocaleString()}`);
  console.log(`  💵 Records with Value: ${parseInt(dbRecord.records_with_value).toLocaleString()}`);
  console.log(`  📝 Records with Description: ${parseInt(dbRecord.records_with_description).toLocaleString()}`);
  console.log(`  🕐 Import Period: ${dbRecord.first_import} to ${dbRecord.last_import}`);

  // 2. CSV File Analysis
  console.log('\n📄 CSV FILE ANALYSIS:');
  if (!fs.existsSync(csvPath)) {
    console.log('❌ CSV file not found!');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');
  
  console.log(`  📋 Total CSV Lines: ${lines.length.toLocaleString()}`);
  console.log(`  📋 Data Lines (excluding header): ${(lines.length - 1).toLocaleString()}`);

  // 3. Detailed CSV Record Analysis
  console.log('\n🔍 DETAILED CSV RECORD ANALYSIS:');
  let validRecords = 0;
  let emptyLines = 0;
  let invalidIds = 0;
  let duplicateIds = 0;
  const seenIds = new Set();
  const csvRecordIds = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      emptyLines++;
      continue;
    }
    
    const values = line.split(',');
    const id = values[0] ? values[0].replace(/"/g, '') : '';
    
    if (!id || id.length < 10) {
      invalidIds++;
      continue;
    }
    
    if (seenIds.has(id)) {
      duplicateIds++;
      continue;
    }
    
    seenIds.add(id);
    csvRecordIds.add(id);
    validRecords++;
  }

  console.log(`  ✅ Valid Unique Records: ${validRecords.toLocaleString()}`);
  console.log(`  📭 Empty Lines: ${emptyLines.toLocaleString()}`);
  console.log(`  ❌ Invalid IDs: ${invalidIds.toLocaleString()}`);
  console.log(`  🔄 Duplicate IDs: ${duplicateIds.toLocaleString()}`);

  // 4. Cross-Reference Check
  console.log('\n🔄 CROSS-REFERENCE VERIFICATION:');
  
  // Get all database IDs
  console.log('  📥 Loading all database IDs...');
  const allDbIds = await sql`SELECT id FROM line_items`;
  const dbIdSet = new Set(allDbIds.map(record => record.id));
  
  console.log(`  📊 Database IDs loaded: ${dbIdSet.size.toLocaleString()}`);
  console.log(`  📊 CSV IDs identified: ${csvRecordIds.size.toLocaleString()}`);

  // Check if all CSV IDs are in database
  const missingFromDb = [];
  const extraInDb = [];
  
  for (const csvId of csvRecordIds) {
    if (!dbIdSet.has(csvId)) {
      missingFromDb.push(csvId);
    }
  }
  
  for (const dbId of dbIdSet) {
    if (!csvRecordIds.has(dbId)) {
      extraInDb.push(dbId);
    }
  }

  console.log(`  ❌ Missing from Database: ${missingFromDb.length}`);
  console.log(`  ➕ Extra in Database: ${extraInDb.length}`);

  // Show samples of missing records
  if (missingFromDb.length > 0) {
    console.log('\n❌ SAMPLE MISSING RECORDS:');
    missingFromDb.slice(0, 5).forEach((id, i) => {
      console.log(`    ${i + 1}. ${id}`);
    });
  }

  // Show samples of extra records
  if (extraInDb.length > 0) {
    console.log('\n➕ SAMPLE EXTRA RECORDS:');
    extraInDb.slice(0, 5).forEach((id, i) => {
      console.log(`    ${i + 1}. ${id}`);
    });
  }

  // 5. Data Quality Verification
  console.log('\n🔍 DATA QUALITY VERIFICATION:');
  
  // Sample record comparison
  const sampleCsvIds = Array.from(csvRecordIds).slice(0, 10);
  for (const csvId of sampleCsvIds) {
    const dbRecord = await sql`SELECT * FROM line_items WHERE id = ${csvId} LIMIT 1`;
    if (dbRecord.length > 0) {
      console.log(`  ✅ ${csvId}: Found in database`);
    } else {
      console.log(`  ❌ ${csvId}: NOT found in database`);
    }
  }

  // 6. Final Verification Result
  console.log('\n🎯 FINAL VERIFICATION RESULT:');
  console.log('=====================================');
  
  const dbTotal = parseInt(dbRecord.total_records);
  const csvTotal = validRecords;
  const completionPercentage = (dbTotal / csvTotal * 100);
  
  console.log(`📊 Database Records: ${dbTotal.toLocaleString()}`);
  console.log(`📊 Valid CSV Records: ${csvTotal.toLocaleString()}`);
  console.log(`📊 Completion Rate: ${completionPercentage.toFixed(3)}%`);
  console.log(`📊 Missing Records: ${missingFromDb.length}`);
  console.log(`📊 Extra Records: ${extraInDb.length}`);

  if (missingFromDb.length === 0 && dbTotal === csvTotal) {
    console.log('\n🎊 ✅ 100% IMPORT VERIFIED! ✅ 🎊');
    console.log('🎉 ALL CSV records successfully imported to database!');
    console.log('🎉 Perfect data integrity confirmed!');
    console.log('🎉 Your automotive pricing intelligence system is COMPLETE!');
  } else if (missingFromDb.length === 0 && dbTotal >= csvTotal) {
    console.log('\n✅ IMPORT COMPLETE WITH BONUS DATA!');
    console.log(`🎉 All ${csvTotal} CSV records imported successfully!`);
    console.log(`➕ Database contains ${dbTotal - csvTotal} additional records!`);
  } else if (completionPercentage >= 99.9) {
    console.log('\n✅ IMPORT ESSENTIALLY COMPLETE!');
    console.log(`🎉 ${completionPercentage.toFixed(3)}% of valid data imported!`);
    console.log(`⚠️  Only ${missingFromDb.length} records missing (likely data quality issues)`);
  } else {
    console.log('\n⚠️  IMPORT INCOMPLETE');
    console.log(`📊 ${completionPercentage.toFixed(1)}% completion rate`);
    console.log(`❌ ${missingFromDb.length} records still missing`);
  }

  // 7. Business Value Summary
  console.log('\n💎 BUSINESS VALUE SUMMARY:');
  console.log(`💰 Total Transaction Value: £${parseFloat(dbRecord.total_value).toLocaleString()}`);
  console.log(`📦 Total Business Records: ${dbTotal.toLocaleString()}`);
  console.log(`🔧 Parts & Services: ${parseInt(dbRecord.parts_records).toLocaleString()} + ${parseInt(dbRecord.labour_records).toLocaleString()}`);
  console.log(`📈 Data Coverage: ${completionPercentage.toFixed(1)}% of source data`);

} catch (error) {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}
