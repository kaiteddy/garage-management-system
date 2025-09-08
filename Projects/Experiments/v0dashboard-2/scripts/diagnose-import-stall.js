require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function diagnoseImportStall() {
  try {
    console.log('🔍 DIAGNOSING IMPORT STALL ISSUE\n');

    // 1. Check current database state
    console.log('1. Current database state:');
    const currentStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    console.log(`   - Customers: ${currentStats[0].customers}`);
    console.log(`   - Vehicles: ${currentStats[0].vehicles}`);
    console.log(`   - Documents: ${currentStats[0].documents}`);

    // 2. Test single record insertion to see if database is responsive
    console.log('\n2. Testing database responsiveness...');
    const testStart = Date.now();
    
    try {
      await sql`
        INSERT INTO customers (
          id, first_name, last_name, phone, email, created_at, updated_at
        ) VALUES (
          'TEST_CUSTOMER_' || EXTRACT(EPOCH FROM NOW()),
          'Test',
          'Customer',
          '1234567890',
          'test@example.com',
          NOW(),
          NOW()
        )
      `;
      
      const testTime = Date.now() - testStart;
      console.log(`   ✅ Single INSERT took ${testTime}ms - Database is responsive`);
      
      // Clean up test record
      await sql`DELETE FROM customers WHERE first_name = 'Test' AND last_name = 'Customer'`;
      
    } catch (error) {
      console.log(`   ❌ Single INSERT failed: ${error.message}`);
      return;
    }

    // 3. Test batch insertion to see where the bottleneck is
    console.log('\n3. Testing batch insertion performance...');
    
    const batchStart = Date.now();
    const testBatch = [];
    for (let i = 0; i < 10; i++) {
      testBatch.push({
        id: `TEST_BATCH_${i}_${Date.now()}`,
        first_name: `TestBatch${i}`,
        last_name: 'Customer',
        phone: `123456789${i}`,
        email: `testbatch${i}@example.com`
      });
    }

    try {
      await sql`BEGIN`;
      
      for (const record of testBatch) {
        await sql`
          INSERT INTO customers (
            id, first_name, last_name, phone, email, created_at, updated_at
          ) VALUES (
            ${record.id},
            ${record.first_name},
            ${record.last_name},
            ${record.phone},
            ${record.email},
            NOW(),
            NOW()
          )
        `;
      }
      
      await sql`COMMIT`;
      
      const batchTime = Date.now() - batchStart;
      console.log(`   ✅ Batch of 10 INSERTs took ${batchTime}ms (${batchTime/10}ms per record)`);
      
      // Clean up test records
      await sql`DELETE FROM customers WHERE first_name LIKE 'TestBatch%'`;
      
    } catch (error) {
      await sql`ROLLBACK`;
      console.log(`   ❌ Batch INSERT failed: ${error.message}`);
    }

    // 4. Analyze the actual CSV data for issues
    console.log('\n4. Analyzing CSV data for potential issues...');
    
    const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });

    console.log(`   📊 Total records in CSV: ${records.length}`);

    // Check for problematic records
    let emptyIds = 0;
    let duplicateEmails = 0;
    let longFields = 0;
    let specialChars = 0;
    const emailSet = new Set();
    const idSet = new Set();

    for (let i = 0; i < Math.min(records.length, 1000); i++) { // Check first 1000 records
      const record = records[i];
      
      // Check for empty IDs
      if (!record._ID || record._ID.trim() === '') {
        emptyIds++;
      }
      
      // Check for duplicate IDs
      if (record._ID && idSet.has(record._ID)) {
        console.log(`   ⚠️  Duplicate ID found: ${record._ID}`);
      }
      idSet.add(record._ID);
      
      // Check for duplicate emails
      if (record.contactEmail && emailSet.has(record.contactEmail)) {
        duplicateEmails++;
      }
      if (record.contactEmail) emailSet.add(record.contactEmail);
      
      // Check for unusually long fields
      Object.values(record).forEach(value => {
        if (typeof value === 'string' && value.length > 255) {
          longFields++;
        }
      });
      
      // Check for special characters that might cause issues
      const fullRecord = JSON.stringify(record);
      if (/[^\x00-\x7F]/.test(fullRecord)) {
        specialChars++;
      }
    }

    console.log(`   📋 Data quality analysis (first 1000 records):`);
    console.log(`      - Empty IDs: ${emptyIds}`);
    console.log(`      - Duplicate emails: ${duplicateEmails}`);
    console.log(`      - Long fields (>255 chars): ${longFields}`);
    console.log(`      - Records with special characters: ${specialChars}`);

    // 5. Test importing a small subset to see where it fails
    console.log('\n5. Testing import of first 50 records...');
    
    const testRecords = records.slice(0, 50);
    let testSuccess = 0;
    let testErrors = 0;
    const testStart2 = Date.now();

    try {
      await sql`BEGIN`;
      
      for (const record of testRecords) {
        try {
          const customerId = record._ID;
          if (!customerId) continue;

          let email = record.contactEmail || '';
          if (!email) {
            email = `customer.${customerId}@placeholder.com`;
          }

          await sql`
            INSERT INTO customers (
              id, first_name, last_name, phone, email, address_line1, city, postcode, created_at, updated_at
            ) VALUES (
              ${customerId},
              ${record.nameForename || ''},
              ${record.nameSurname || ''},
              ${record.contactTelephone || record.contactMobile || ''},
              ${email},
              ${record.addressRoad || ''},
              ${record.addressTown || ''},
              ${record.addressPostCode || ''},
              NOW(),
              NOW()
            )
          `;

          testSuccess++;

        } catch (error) {
          console.log(`      ❌ Record ${testSuccess + testErrors + 1} failed: ${error.message}`);
          testErrors++;
          
          if (testErrors > 5) {
            console.log(`      🛑 Stopping test after 5 errors`);
            break;
          }
        }
      }
      
      await sql`COMMIT`;
      
      const testTime2 = Date.now() - testStart2;
      console.log(`   📊 Test import results:`);
      console.log(`      - Success: ${testSuccess}/${testRecords.length}`);
      console.log(`      - Errors: ${testErrors}`);
      console.log(`      - Time: ${testTime2}ms (${testTime2/testSuccess}ms per successful record)`);
      
      // Clean up test records
      const testIds = testRecords.map(r => r._ID).filter(Boolean);
      if (testIds.length > 0) {
        await sql`DELETE FROM customers WHERE id = ANY(${testIds})`;
      }
      
    } catch (error) {
      await sql`ROLLBACK`;
      console.log(`   ❌ Test import transaction failed: ${error.message}`);
    }

    // 6. Check database constraints and indexes
    console.log('\n6. Checking database constraints and indexes...');
    
    try {
      const constraints = await sql`
        SELECT 
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'customers'::regclass
      `;
      
      console.log(`   📋 Customer table constraints:`);
      constraints.forEach(constraint => {
        console.log(`      - ${constraint.constraint_name} (${constraint.constraint_type}): ${constraint.definition}`);
      });
      
    } catch (error) {
      console.log(`   ⚠️  Could not check constraints: ${error.message}`);
    }

    // 7. Final diagnosis
    console.log('\n🔍 DIAGNOSIS SUMMARY:');
    console.log('Based on the tests above, the stall is likely caused by:');
    
    if (testErrors > testSuccess / 2) {
      console.log('❌ HIGH ERROR RATE - Data quality issues in CSV');
    } else if (testTime2 / testSuccess > 100) {
      console.log('⏱️  SLOW PERFORMANCE - Database or network latency');
    } else {
      console.log('🤔 UNKNOWN - Need deeper investigation');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check Neon database performance metrics');
    console.log('2. Verify network connectivity to Neon');
    console.log('3. Consider using COPY command instead of INSERTs');
    console.log('4. Check for database connection limits');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

diagnoseImportStall();
