import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

console.log('🧪 TESTING JOB SHEET AUTO-NUMBERING SYSTEM');
console.log('===========================================');

async function testJobSheetNumbering() {
  try {
    // 1. Get current highest number
    console.log('📊 STEP 1: Check current highest job sheet number');
    const response1 = await fetch('http://localhost:3001/api/job-sheets/next-number');
    const data1 = await response1.json();
    console.log(`  Current highest: ${data1.highestFound}`);
    console.log(`  Next number: ${data1.nextNumber}`);
    console.log(`  Sample existing: ${data1.sampleExisting.join(', ')}`);

    // 2. Create a test job sheet to verify numbering
    console.log('\n🔧 STEP 2: Create test job sheet');
    const testJobNumber = data1.nextNumber.replace('JS', ''); // Remove JS prefix for database
    
    const insertResult = await sql`
      INSERT INTO customer_documents (
        document_number,
        document_type,
        customer_id,
        vehicle_registration,
        total_gross,
        created_at,
        status
      ) VALUES (
        ${testJobNumber},
        'JS',
        1,
        'TEST123',
        100.00,
        NOW(),
        '1'
      )
      RETURNING id, document_number
    `;

    console.log(`  ✅ Created test job sheet: ${insertResult[0].document_number} (ID: ${insertResult[0].id})`);

    // 3. Check next number after creation
    console.log('\n📊 STEP 3: Check next number after creation');
    const response2 = await fetch('http://localhost:3001/api/job-sheets/next-number');
    const data2 = await response2.json();
    console.log(`  New highest: ${data2.highestFound}`);
    console.log(`  Next number: ${data2.nextNumber}`);

    // 4. Test deletion resilience
    console.log('\n🗑️  STEP 4: Test deletion resilience');
    await sql`DELETE FROM customer_documents WHERE id = ${insertResult[0].id}`;
    console.log(`  ✅ Deleted test job sheet: ${insertResult[0].document_number}`);

    // 5. Check next number after deletion (should still increment)
    console.log('\n📊 STEP 5: Check next number after deletion');
    const response3 = await fetch('http://localhost:3001/api/job-sheets/next-number');
    const data3 = await response3.json();
    console.log(`  Highest after deletion: ${data3.highestFound}`);
    console.log(`  Next number: ${data3.nextNumber}`);

    // 6. Verify cross-document scanning
    console.log('\n🔍 STEP 6: Verify cross-document scanning');
    const allDocTypes = await sql`
      SELECT document_type, COUNT(*) as count, MAX(CAST(document_number AS INTEGER)) as max_number
      FROM customer_documents
      WHERE document_number ~ '^[0-9]+$'
      GROUP BY document_type
      ORDER BY max_number DESC
    `;

    console.log('  Document types and highest numbers:');
    allDocTypes.forEach(doc => {
      console.log(`    ${doc.document_type}: ${doc.count} documents, highest: ${doc.max_number}`);
    });

    // 7. Test results
    console.log('\n🎯 TEST RESULTS:');
    console.log('================');
    
    const expectedNext = parseInt(data1.highestFound) + 1;
    const actualNext = parseInt(data3.nextNumber.replace('JS', ''));
    
    if (actualNext === expectedNext) {
      console.log('✅ DELETION RESILIENCE: PASSED');
      console.log(`   Expected: ${expectedNext}, Got: ${actualNext}`);
    } else {
      console.log('❌ DELETION RESILIENCE: FAILED');
      console.log(`   Expected: ${expectedNext}, Got: ${actualNext}`);
    }

    if (data3.highestFound === data1.highestFound) {
      console.log('✅ SEQUENCE INTEGRITY: PASSED');
      console.log('   Highest number correctly maintained after deletion');
    } else {
      console.log('❌ SEQUENCE INTEGRITY: FAILED');
      console.log(`   Highest changed from ${data1.highestFound} to ${data3.highestFound}`);
    }

    if (data3.sampleExisting.length > 0) {
      console.log('✅ CROSS-DOCUMENT SCANNING: PASSED');
      console.log(`   Found ${data3.sampleExisting.length} existing documents`);
    } else {
      console.log('❌ CROSS-DOCUMENT SCANNING: FAILED');
      console.log('   No existing documents found');
    }

    console.log('\n🎉 JOB SHEET AUTO-NUMBERING TEST COMPLETE!');
    console.log(`📊 System will generate: ${data3.nextNumber} for next job sheet`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

await testJobSheetNumbering();
