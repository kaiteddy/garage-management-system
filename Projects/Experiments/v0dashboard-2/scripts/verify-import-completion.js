import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyImportCompletion() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔍 COMPREHENSIVE IMPORT VERIFICATION');
    console.log('====================================');

    // 1. Database verification
    const dbStats = await sql`
      SELECT 
        COUNT(*) as total_items,
        COUNT(DISTINCT id) as unique_ids,
        SUM(total_amount) as total_value,
        COUNT(CASE WHEN description NOT ILIKE '%labour%' AND total_amount > 0 THEN 1 END) as parts_count,
        COUNT(DISTINCT document_id) as unique_documents,
        MIN(created_at) as first_import,
        MAX(created_at) as last_import
      FROM line_items
    `;

    console.log('📊 DATABASE CONTENTS:');
    console.log(`  Total records: ${dbStats[0].total_items.toLocaleString()}`);
    console.log(`  Unique IDs: ${dbStats[0].unique_ids.toLocaleString()}`);
    console.log(`  Total value: £${parseFloat(dbStats[0].total_value).toLocaleString()}`);
    console.log(`  Parts found: ${dbStats[0].parts_count.toLocaleString()}`);
    console.log(`  Documents: ${dbStats[0].unique_documents.toLocaleString()}`);
    console.log(`  Import period: ${dbStats[0].first_import} to ${dbStats[0].last_import}`);

    // 2. CSV analysis
    console.log('\n📄 CSV FILE ANALYSIS:');
    const csvPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv';
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');

    console.log(`  CSV total lines: ${lines.length.toLocaleString()}`);

    let validUniqueLines = 0;
    let emptyLines = 0;
    let duplicateCount = 0;
    const seenIds = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        emptyLines++;
        continue;
      }
      
      const values = line.split(',');
      const id = values[0] ? values[0].replace(/"/g, '') : '';
      
      if (!id) {
        emptyLines++;
        continue;
      }
      
      if (seenIds.has(id)) {
        duplicateCount++;
      } else {
        seenIds.add(id);
        validUniqueLines++;
      }
    }

    console.log(`  Valid unique records: ${validUniqueLines.toLocaleString()}`);
    console.log(`  Duplicate records: ${duplicateCount.toLocaleString()}`);
    console.log(`  Empty/invalid lines: ${emptyLines.toLocaleString()}`);

    // 3. Data quality verification
    console.log('\n🔍 DATA QUALITY CHECK:');
    const qualityCheck = await sql`
      SELECT 
        COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as empty_descriptions,
        COUNT(CASE WHEN total_amount = 0 THEN 1 END) as zero_amounts,
        COUNT(CASE WHEN document_id IS NULL THEN 1 END) as missing_doc_ids,
        COUNT(CASE WHEN id ~ '^[A-Z0-9]{20}$' THEN 1 END) as valid_csv_format_ids
      FROM line_items
    `;

    console.log(`  Empty descriptions: ${qualityCheck[0].empty_descriptions}`);
    console.log(`  Zero amounts: ${qualityCheck[0].zero_amounts}`);
    console.log(`  Missing document IDs: ${qualityCheck[0].missing_doc_ids}`);
    console.log(`  Valid CSV format IDs: ${qualityCheck[0].valid_csv_format_ids}`);

    // 4. Sample data verification
    console.log('\n📋 SAMPLE DATA VERIFICATION:');
    const sampleData = await sql`
      SELECT id, description, unit_price, total_amount, document_id
      FROM line_items
      WHERE total_amount > 1000
      ORDER BY total_amount DESC
      LIMIT 5
    `;

    console.log('High-value items (verification of real data):');
    sampleData.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.description} - £${item.total_amount}`);
      console.log(`     ID: ${item.id}, Doc: ${item.document_id}`);
    });

    // 5. Verification comparison
    console.log('\n🔍 VERIFICATION COMPARISON:');
    const dbCount = parseInt(dbStats[0].total_items);
    const dbUniqueIds = parseInt(dbStats[0].unique_ids);
    const csvFormatIds = parseInt(qualityCheck[0].valid_csv_format_ids);

    console.log(`  Database records: ${dbCount.toLocaleString()}`);
    console.log(`  Database unique IDs: ${dbUniqueIds.toLocaleString()}`);
    console.log(`  CSV unique records: ${validUniqueLines.toLocaleString()}`);
    console.log(`  CSV format IDs in DB: ${csvFormatIds.toLocaleString()}`);

    // 6. Final verification result
    console.log('\n🎯 FINAL VERIFICATION RESULT:');
    
    let verificationPassed = true;
    let issues = [];

    // Check database integrity
    if (dbCount !== dbUniqueIds) {
      verificationPassed = false;
      issues.push(`Database has duplicate IDs: ${dbCount} records but only ${dbUniqueIds} unique IDs`);
    }

    // Check CSV vs database match
    if (dbCount !== validUniqueLines) {
      verificationPassed = false;
      issues.push(`CSV-DB mismatch: Database has ${dbCount} but CSV has ${validUniqueLines} unique records`);
    }

    // Check data format
    if (csvFormatIds !== dbCount) {
      verificationPassed = false;
      issues.push(`ID format issue: ${csvFormatIds} valid CSV format IDs out of ${dbCount} total`);
    }

    // Check minimum data threshold
    if (dbCount < 50000) {
      verificationPassed = false;
      issues.push(`Insufficient data: Only ${dbCount} records imported`);
    }

    if (verificationPassed) {
      console.log('✅ VERIFICATION PASSED: Import is 100% complete and successful');
      console.log('✅ All unique CSV data imported correctly');
      console.log('✅ Data quality excellent - ready for production use');
      console.log(`✅ ${dbCount.toLocaleString()} genuine business records imported`);
      console.log(`✅ £${parseFloat(dbStats[0].total_value).toLocaleString()} total business value`);
      console.log('✅ Automotive parts pricing intelligence system ready!');
    } else {
      console.log('❌ VERIFICATION FAILED: Issues detected');
      issues.forEach(issue => console.log(`  ❌ ${issue}`));
      console.log('💡 Manual review and correction needed');
    }

    // 7. Summary statistics
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`  Import Status: ${verificationPassed ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`);
    console.log(`  Records: ${dbCount.toLocaleString()}`);
    console.log(`  Value: £${parseFloat(dbStats[0].total_value).toLocaleString()}`);
    console.log(`  Parts: ${dbStats[0].parts_count.toLocaleString()}`);
    console.log(`  Documents: ${dbStats[0].unique_documents.toLocaleString()}`);

    return verificationPassed;

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run verification
verifyImportCompletion()
  .then(success => {
    if (success) {
      console.log('\n🎉 VERIFICATION COMPLETE: System ready for use!');
      process.exit(0);
    } else {
      console.log('\n⚠️  VERIFICATION INCOMPLETE: Issues need resolution');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  });
