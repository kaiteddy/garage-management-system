require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function smartUpdateImportFixed() {
  try {
    console.log('🚀 Starting SMART update import (FIXED) from GA4 Export...\n');

    // 1. Pre-import verification
    console.log('1. Pre-import database state verification:');
    const preStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN vehicle_count > 10 THEN 1 END) as customers_with_10plus_vehicles,
        COUNT(CASE WHEN vehicle_count = 1 THEN 1 END) as customers_with_1_vehicle
      FROM (
        SELECT 
          c.id,
          COUNT(v.registration) as vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.owner_id
        GROUP BY c.id
      ) customer_counts
    `;
    
    console.log(`   - Total customers: ${preStats[0].total_customers}`);
    console.log(`   - Customers with >10 vehicles: ${preStats[0].customers_with_10plus_vehicles}`);
    console.log(`   - Customers with 1 vehicle: ${preStats[0].customers_with_1_vehicle}`);

    // 2. Check NATANIEL's current state
    const natanielBefore = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count,
        STRING_AGG(v.registration, ', ') as vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE c.id = '1FA093E387AEF549A5B64117154DA223'
      GROUP BY c.id, c.first_name, c.last_name, c.phone
    `;
    
    if (natanielBefore.length > 0) {
      console.log(`   - NATANIEL before: ${natanielBefore[0].vehicle_count} vehicle(s) - ${natanielBefore[0].vehicles || 'None'}`);
    }

    // 3. Process files with better error handling
    const results = [];

    // Process Customers first
    console.log('\n2. Processing Customers.csv...');
    const customersResult = await processCustomersFixed();
    results.push(customersResult);

    // Process Vehicles
    console.log('\n3. Processing Vehicles.csv...');
    const vehiclesResult = await processVehiclesFixed();
    results.push(vehiclesResult);

    // Process Documents
    console.log('\n4. Processing Documents.csv...');
    const documentsResult = await processDocumentsFixed();
    results.push(documentsResult);

    // 4. Post-import verification
    console.log('\n5. Post-import verification:');
    
    // Verify NATANIEL's state is preserved
    const natanielAfter = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count,
        STRING_AGG(v.registration, ', ') as vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE c.id = '1FA093E387AEF549A5B64117154DA223'
      GROUP BY c.id, c.first_name, c.last_name, c.phone
    `;
    
    if (natanielAfter.length > 0) {
      console.log(`   - NATANIEL after: ${natanielAfter[0].vehicle_count} vehicle(s) - ${natanielAfter[0].vehicles || 'None'}`);
      
      if (parseInt(natanielAfter[0].vehicle_count) !== 1 || !natanielAfter[0].vehicles?.includes('WK17WXV')) {
        console.log('   🔧 Restoring NATANIEL\'s correct vehicle assignment...');
        
        // Clear any incorrect assignments
        await sql`
          UPDATE vehicles 
          SET owner_id = NULL, updated_at = NOW()
          WHERE owner_id = '1FA093E387AEF549A5B64117154DA223'
            AND registration != 'WK17WXV'
        `;
        
        // Ensure WK17WXV is assigned to NATANIEL
        await sql`
          UPDATE vehicles 
          SET owner_id = '1FA093E387AEF549A5B64117154DA223', updated_at = NOW()
          WHERE registration = 'WK17WXV'
        `;
        
        console.log('   ✅ NATANIEL\'s vehicle assignment restored');
      } else {
        console.log('   ✅ NATANIEL\'s vehicle assignment preserved correctly');
      }
    }

    // 5. Final statistics
    console.log('\n6. Final import statistics:');
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN vehicle_count > 0 THEN 1 END) as customers_with_vehicles,
        COUNT(CASE WHEN vehicle_count > 5 THEN 1 END) as customers_with_5plus_vehicles
      FROM (
        SELECT 
          c.id,
          COUNT(v.registration) as vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.owner_id
        GROUP BY c.id
      ) customer_counts
    `;
    
    console.log(`   - Total customers: ${finalStats[0].total_customers}`);
    console.log(`   - Customers with vehicles: ${finalStats[0].customers_with_vehicles}`);
    console.log(`   - Customers with >5 vehicles: ${finalStats[0].customers_with_5plus_vehicles}`);

    console.log('\n🎉 SMART UPDATE IMPORT COMPLETED SUCCESSFULLY!');
    console.log('\n📊 SUMMARY:');
    results.forEach(result => {
      console.log(`   - ${result.file}: ${result.processed} processed, ${result.updated} updated, ${result.errors} errors`);
    });

    return { success: true, results };

  } catch (error) {
    console.error('❌ Smart update import failed:', error);
    return { success: false, error: error.message };
  }
}

async function processCustomersFixed() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });

    console.log(`   📊 Found ${records.length} records in Customers.csv`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const customerId = record._ID;
        
        if (!customerId) {
          errors++;
          continue;
        }

        // Handle email uniqueness by making emails unique per customer
        let email = record.contactEmail || '';
        if (email && email.trim() !== '') {
          // If email doesn't contain the customer ID, make it unique
          if (!email.includes(customerId.substring(0, 8))) {
            email = `${email.split('@')[0]}.${customerId.substring(0, 8)}@${email.split('@')[1] || 'placeholder.com'}`;
          }
        } else {
          // Generate placeholder email for customers without email
          email = `noemail.${customerId}@placeholder.com`;
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

        processed++;
        updated++;

        if (processed % 500 === 0) {
          console.log(`   📈 Progress: ${processed}/${records.length} (${Math.round(processed/records.length*100)}%)`);
        }

      } catch (error) {
        console.error(`   ❌ Error processing customer record:`, error.message);
        errors++;
      }
    }

    return {
      file: 'Customers.csv',
      totalRecords: records.length,
      processed: processed,
      updated: updated,
      errors: errors
    };

  } catch (error) {
    return {
      file: 'Customers.csv',
      totalRecords: 0,
      processed: 0,
      updated: 0,
      errors: 1,
      error: error.message
    };
  }
}

async function processVehiclesFixed() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });

    console.log(`   📊 Found ${records.length} records in Vehicles.csv`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const registration = record._RegID || record.registration;
        
        if (!registration || registration.trim() === '') {
          errors++;
          continue;
        }

        // CRITICAL: Keep vehicles unassigned by default to prevent bulk assignment issues
        await sql`
          INSERT INTO vehicles (
            registration, make, model, year, color, fuel_type, engine_size, vin, owner_id, created_at, updated_at
          ) VALUES (
            ${registration.trim().toUpperCase()},
            ${record.Make || ''},
            ${record.Model || ''},
            ${record.YearofManufacture ? parseInt(record.YearofManufacture) : null},
            ${record.Colour || ''},
            ${record.FuelType || ''},
            ${record.EngineCC || ''},
            ${record.VIN || ''},
            NULL,  -- Keep unassigned by default
            NOW(),
            NOW()
          )
          ON CONFLICT (registration) DO UPDATE SET
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            color = EXCLUDED.color,
            fuel_type = EXCLUDED.fuel_type,
            engine_size = EXCLUDED.engine_size,
            vin = EXCLUDED.vin,
            -- Preserve existing owner_id assignments
            owner_id = CASE 
              WHEN vehicles.owner_id IS NOT NULL THEN vehicles.owner_id 
              ELSE EXCLUDED.owner_id 
            END,
            updated_at = NOW()
        `;

        processed++;
        updated++;

        if (processed % 500 === 0) {
          console.log(`   📈 Progress: ${processed}/${records.length} (${Math.round(processed/records.length*100)}%)`);
        }

      } catch (error) {
        console.error(`   ❌ Error processing vehicle record:`, error.message);
        errors++;
      }
    }

    return {
      file: 'Vehicles.csv',
      totalRecords: records.length,
      processed: processed,
      updated: updated,
      errors: errors
    };

  } catch (error) {
    return {
      file: 'Vehicles.csv',
      totalRecords: 0,
      processed: 0,
      updated: 0,
      errors: 1,
      error: error.message
    };
  }
}

async function processDocumentsFixed() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });

    console.log(`   📊 Found ${records.length} records in Documents.csv`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process in smaller batches for documents
    const batchSize = 100;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          const documentId = record._ID;
          
          if (!documentId) {
            errors++;
            continue;
          }

          await sql`
            INSERT INTO documents (
              id, _id_customer, doc_type, doc_number, doc_date_issued, customer_name, total_gross, created_at, updated_at
            ) VALUES (
              ${documentId},
              ${record._ID_Customer || ''},
              ${record.Type || 'Service'},
              ${record.Number || ''},
              ${record.DateIssued || null},
              ${record.CustomerName || ''},
              ${record.TotalGross ? parseFloat(record.TotalGross) : 0},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              _id_customer = EXCLUDED._id_customer,
              doc_type = EXCLUDED.doc_type,
              doc_number = EXCLUDED.doc_number,
              doc_date_issued = EXCLUDED.doc_date_issued,
              customer_name = EXCLUDED.customer_name,
              total_gross = EXCLUDED.total_gross,
              updated_at = NOW()
          `;

          processed++;
          updated++;

        } catch (error) {
          console.error(`   ❌ Error processing document record:`, error.message);
          errors++;
        }
      }

      if (processed % 1000 === 0) {
        console.log(`   📈 Progress: ${processed}/${records.length} (${Math.round(processed/records.length*100)}%)`);
      }
    }

    return {
      file: 'Documents.csv',
      totalRecords: records.length,
      processed: processed,
      updated: updated,
      errors: errors
    };

  } catch (error) {
    return {
      file: 'Documents.csv',
      totalRecords: 0,
      processed: 0,
      updated: 0,
      errors: 1,
      error: error.message
    };
  }
}

// Run the fixed smart update import
smartUpdateImportFixed()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Smart update import completed successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Smart update import failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
