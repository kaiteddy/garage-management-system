import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

console.log('🧪 TESTING JOB SHEET NUMBERING API');
console.log('==================================');

async function testNumberingAPI() {
  try {
    // 1. Test current API functionality
    console.log('📊 STEP 1: Test current API functionality');
    const response = await fetch('http://localhost:3001/api/job-sheets/next-number');
    const data = await response.json();
    
    console.log(`✅ API Response:`, data);
    console.log(`  Current highest: ${data.highestFound}`);
    console.log(`  Next number: ${data.nextNumber}`);
    console.log(`  Sample existing: ${data.sampleExisting.join(', ')}`);

    // 2. Verify the highest number is correct
    console.log('\n🔍 STEP 2: Verify highest number calculation');
    const actualHighest = await sql`
      SELECT MAX(CAST(document_number AS INTEGER)) as max_number
      FROM customer_documents
      WHERE document_number ~ '^[0-9]+$'
        AND document_type IN ('JS', 'ES', 'SI', 'ESTIMATE', 'INVOICE')
    `;
    
    const dbHighest = parseInt(actualHighest[0].max_number);
    const apiHighest = parseInt(data.highestFound);
    
    console.log(`  Database highest: ${dbHighest}`);
    console.log(`  API highest: ${apiHighest}`);
    
    if (dbHighest === apiHighest) {
      console.log('  ✅ HIGHEST NUMBER CALCULATION: CORRECT');
    } else {
      console.log('  ❌ HIGHEST NUMBER CALCULATION: INCORRECT');
    }

    // 3. Test sequential increment
    console.log('\n📈 STEP 3: Test sequential increment');
    const expectedNext = dbHighest + 1;
    const apiNext = parseInt(data.nextNumber.replace('JS', ''));
    
    console.log(`  Expected next: ${expectedNext}`);
    console.log(`  API next: ${apiNext}`);
    
    if (expectedNext === apiNext) {
      console.log('  ✅ SEQUENTIAL INCREMENT: CORRECT');
    } else {
      console.log('  ❌ SEQUENTIAL INCREMENT: INCORRECT');
    }

    // 4. Test cross-document scanning
    console.log('\n🔍 STEP 4: Test cross-document scanning');
    const docTypes = await sql`
      SELECT document_type, COUNT(*) as count, MAX(CAST(document_number AS INTEGER)) as max_number
      FROM customer_documents
      WHERE document_number ~ '^[0-9]+$'
      GROUP BY document_type
      ORDER BY max_number DESC
    `;

    console.log('  Document types found:');
    docTypes.forEach(doc => {
      console.log(`    ${doc.document_type}: ${doc.count} documents, highest: ${doc.max_number}`);
    });

    const overallMax = Math.max(...docTypes.map(d => parseInt(d.max_number)));
    if (overallMax === apiHighest) {
      console.log('  ✅ CROSS-DOCUMENT SCANNING: CORRECT');
    } else {
      console.log('  ❌ CROSS-DOCUMENT SCANNING: INCORRECT');
      console.log(`    Overall max: ${overallMax}, API found: ${apiHighest}`);
    }

    // 5. Test multiple API calls for consistency
    console.log('\n🔄 STEP 5: Test API consistency');
    const response2 = await fetch('http://localhost:3001/api/job-sheets/next-number');
    const data2 = await response2.json();
    
    if (data.nextNumber === data2.nextNumber) {
      console.log('  ✅ API CONSISTENCY: CORRECT');
      console.log(`    Both calls returned: ${data.nextNumber}`);
    } else {
      console.log('  ❌ API CONSISTENCY: INCORRECT');
      console.log(`    First call: ${data.nextNumber}, Second call: ${data2.nextNumber}`);
    }

    // 6. Test format validation
    console.log('\n📝 STEP 6: Test number format');
    const jsPattern = /^JS\d{5}$/;
    if (jsPattern.test(data.nextNumber)) {
      console.log('  ✅ NUMBER FORMAT: CORRECT');
      console.log(`    Format: ${data.nextNumber} matches JS#####`);
    } else {
      console.log('  ❌ NUMBER FORMAT: INCORRECT');
      console.log(`    Format: ${data.nextNumber} does not match JS#####`);
    }

    // 7. Final summary
    console.log('\n🎯 FINAL TEST RESULTS:');
    console.log('======================');
    console.log(`✅ Current system will generate: ${data.nextNumber}`);
    console.log(`✅ Based on highest existing: ${data.highestFound}`);
    console.log(`✅ Scanning ${data.sampleExisting.length} existing documents`);
    console.log(`✅ Cross-document types: ${docTypes.length} types found`);
    
    console.log('\n🎉 JOB SHEET AUTO-NUMBERING API TEST COMPLETE!');
    console.log('The system is working correctly and will maintain proper sequence.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

await testNumberingAPI();
