require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function fixImportStall() {
  try {
    console.log('🔧 FIXING IMPORT STALL ISSUE\n');

    // 1. Check what customer IDs are already in the database
    console.log('1. Analyzing existing customer IDs...');
    const existingCustomers = await sql`
      SELECT id, first_name, last_name, created_at
      FROM customers 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('   📋 Last 10 customers in database:');
    existingCustomers.forEach((customer, index) => {
      console.log(`      ${index + 1}. ${customer.id} - ${customer.first_name} ${customer.last_name} (${customer.created_at})`);
    });

    // 2. Check the CSV for duplicate IDs
    console.log('\n2. Checking CSV for duplicate customer IDs...');
    const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });

    const idCounts = new Map();
    records.forEach(record => {
      if (record._ID) {
        idCounts.set(record._ID, (idCounts.get(record._ID) || 0) + 1);
      }
    });

    const duplicates = Array.from(idCounts.entries()).filter(([id, count]) => count > 1);
    console.log(`   📊 Found ${duplicates.length} duplicate IDs in CSV:`);
    duplicates.slice(0, 5).forEach(([id, count]) => {
      console.log(`      - ${id}: appears ${count} times`);
    });

    // 3. Find which records from CSV are already in database
    console.log('\n3. Checking which CSV records are already imported...');
    
    const existingIds = await sql`SELECT id FROM customers`;
    const existingIdSet = new Set(existingIds.map(row => row.id));
    
    const newRecords = records.filter(record => record._ID && !existingIdSet.has(record._ID));
    const alreadyImported = records.filter(record => record._ID && existingIdSet.has(record._ID));
    
    console.log(`   📊 Import status:`);
    console.log(`      - Total CSV records: ${records.length}`);
    console.log(`      - Already imported: ${alreadyImported.length}`);
    console.log(`      - Still need to import: ${newRecords.length}`);

    // 4. The solution: Use UPSERT instead of INSERT
    console.log('\n4. SOLUTION: Using UPSERT to handle duplicates...');
    console.log(`   🚀 Importing remaining ${newRecords.length} customers with UPSERT...`);

    let success = 0;
    let errors = 0;
    const batchSize = 50; // Smaller batches for reliability

    for (let i = 0; i < newRecords.length; i += batchSize) {
      const batch = newRecords.slice(i, i + batchSize);
      
      try {
        await sql`BEGIN`;
        
        for (const record of batch) {
          try {
            const customerId = record._ID;
            if (!customerId) continue;

            let email = record.contactEmail || '';
            if (!email) {
              email = `customer.${customerId}@placeholder.com`;
            }

            // Use UPSERT (INSERT ... ON CONFLICT DO UPDATE)
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
              ON CONFLICT (id) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                address_line1 = EXCLUDED.address_line1,
                city = EXCLUDED.city,
                postcode = EXCLUDED.postcode,
                updated_at = NOW()
            `;

            success++;

          } catch (error) {
            console.log(`      ❌ Record error: ${error.message}`);
            errors++;
          }
        }

        await sql`COMMIT`;

        // Progress reporting
        if ((i + batchSize) % 500 === 0 || i + batchSize >= newRecords.length) {
          const progress = Math.round(((i + batchSize) / newRecords.length) * 100);
          console.log(`      📈 Progress: ${progress}% (${success}/${newRecords.length} imported)`);
        }

      } catch (error) {
        await sql`ROLLBACK`;
        console.error(`      ❌ Batch error: ${error.message}`);
        errors += batch.length;
      }
    }

    // 5. Final verification
    console.log('\n5. Final verification...');
    const finalStats = await sql`
      SELECT COUNT(*) as total_customers
      FROM customers
    `;
    
    console.log(`   📊 Final customer count: ${finalStats[0].total_customers}`);
    console.log(`   ✅ Successfully imported: ${success} new customers`);
    console.log(`   ❌ Errors: ${errors}`);

    if (parseInt(finalStats[0].total_customers) >= 7000) {
      console.log('\n🎉 IMPORT STALL FIXED!');
      console.log('✅ Customer import is now complete');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Import vehicles with proper customer assignments');
      console.log('2. Import documents');
      console.log('3. Proceed with WhatsApp integration');
      
      return { success: true, totalCustomers: parseInt(finalStats[0].total_customers) };
    } else {
      console.log('\n⚠️  Import still incomplete - may need further investigation');
      return { success: false, totalCustomers: parseInt(finalStats[0].total_customers) };
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
    return { success: false, error: error.message };
  }
}

fixImportStall()
  .then(result => {
    if (result.success) {
      console.log(`\n🎯 SUCCESS! ${result.totalCustomers} customers ready for vehicles import!`);
    } else {
      console.log(`\n❌ Still need to resolve import issues`);
    }
  })
  .catch(console.error);
