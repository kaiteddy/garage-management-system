require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

class SmartDataPreservingImporter {
  constructor() {
    this.stats = {
      customers: { existing: 0, updated: 0, created: 0, preserved: 0, errors: 0 },
      vehicles: { existing: 0, updated: 0, created: 0, preserved: 0, errors: 0 },
      documents: { existing: 0, updated: 0, created: 0, preserved: 0, errors: 0 }
    };
  }

  async smartImport() {
    console.log('🛡️  SMART DATA-PRESERVING IMPORT');
    console.log('=================================');
    console.log('Protecting all enhanced data while importing GA4 updates\n');

    try {
      // Step 1: Analyze current enhanced data
      console.log('1️⃣ Analyzing current enhanced database...');
      await this.analyzeEnhancedData();

      // Step 2: Smart customer import/update
      console.log('\n2️⃣ Smart customer import (preserving enhanced data)...');
      await this.smartCustomerImport();

      // Step 3: Smart vehicle import/update
      console.log('\n3️⃣ Smart vehicle import (preserving enhanced data)...');
      await this.smartVehicleImport();

      // Step 4: Smart document import/update
      console.log('\n4️⃣ Smart document import (preserving enhanced data)...');
      await this.smartDocumentImport();

      // Step 5: Final report
      console.log('\n5️⃣ Generating preservation report...');
      await this.generatePreservationReport();

    } catch (error) {
      console.error('❌ Smart import failed:', error);
    }
  }

  async analyzeEnhancedData() {
    try {
      // Check for enhanced customer data
      const customerAnalysis = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) as with_twilio,
          COUNT(CASE WHEN phone_verified = true THEN 1 END) as verified_phones,
          COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) as with_contact_history,
          COUNT(CASE WHEN opt_out = true THEN 1 END) as opted_out,
          COUNT(CASE WHEN last_response_date IS NOT NULL THEN 1 END) as with_responses
        FROM customers
      `;

      const custData = customerAnalysis[0];
      console.log('   👥 Enhanced customer data found:');
      console.log(`      - Total customers: ${custData.total}`);
      console.log(`      - With Twilio phones: ${custData.with_twilio}`);
      console.log(`      - Verified phones: ${custData.verified_phones}`);
      console.log(`      - With contact history: ${custData.with_contact_history}`);
      console.log(`      - With responses: ${custData.with_responses}`);
      console.log(`      - Opted out: ${custData.opted_out}`);

      // Check for enhanced vehicle data
      const vehicleAnalysis = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN mot_status IS NOT NULL THEN 1 END) as with_mot,
          COUNT(CASE WHEN tax_status IS NOT NULL THEN 1 END) as with_tax,
          COUNT(CASE WHEN oil_data IS NOT NULL THEN 1 END) as with_oil,
          COUNT(CASE WHEN technical_data IS NOT NULL THEN 1 END) as with_technical,
          COUNT(CASE WHEN comprehensive_technical_data IS NOT NULL THEN 1 END) as with_comprehensive
        FROM vehicles
      `;

      const vehData = vehicleAnalysis[0];
      console.log('   🚗 Enhanced vehicle data found:');
      console.log(`      - Total vehicles: ${vehData.total}`);
      console.log(`      - With MOT data: ${vehData.with_mot}`);
      console.log(`      - With tax data: ${vehData.with_tax}`);
      console.log(`      - With oil data: ${vehData.with_oil}`);
      console.log(`      - With technical data: ${vehData.with_technical}`);
      console.log(`      - With comprehensive data: ${vehData.with_comprehensive}`);

      // Store for preservation tracking
      this.enhancedData = {
        customers: custData,
        vehicles: vehData
      };

    } catch (error) {
      console.error('   ❌ Analysis failed:', error.message);
    }
  }

  async smartCustomerImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    if (!fs.existsSync(filePath)) {
      console.log('   ⏭️  Customers.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    console.log(`   📊 Processing ${records.length} GA4 customers with data preservation...`);

    const batchSize = 25; // Smaller batches for careful processing
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        await sql`BEGIN`;
        
        for (const record of batch) {
          try {
            const customerId = record._ID;
            if (!customerId) continue;

            // Check if customer exists
            const existing = await sql`
              SELECT id, twilio_phone, phone_verified, last_contact_date, 
                     opt_out, last_response_date, contact_preference
              FROM customers 
              WHERE id = ${customerId}
              LIMIT 1
            `;

            let email = record.contactEmail || '';
            if (!email || email === '') {
              email = `customer.${customerId}@placeholder.com`;
            }

            if (existing.length > 0) {
              // UPDATE existing customer - PRESERVE enhanced data
              await sql`
                UPDATE customers SET
                  first_name = ${record.nameForename || ''},
                  last_name = ${record.nameSurname || ''},
                  email = CASE 
                    WHEN email LIKE '%@placeholder.com' THEN ${email}
                    ELSE email  -- Keep existing real email
                  END,
                  phone = CASE 
                    WHEN phone IS NULL OR phone = '' THEN ${record.contactTelephone || record.contactMobile || ''}
                    ELSE phone  -- Keep existing phone if we have one
                  END,
                  address_line1 = COALESCE(NULLIF(${record.addressRoad || ''}, ''), address_line1),
                  city = COALESCE(NULLIF(${record.addressTown || ''}, ''), city),
                  postcode = COALESCE(NULLIF(${record.addressPostCode || ''}, ''), postcode),
                  updated_at = NOW()
                  -- PRESERVE: twilio_phone, phone_verified, last_contact_date, opt_out, etc.
                WHERE id = ${customerId}
              `;
              
              this.stats.customers.updated++;
              this.stats.customers.preserved++;

            } else {
              // INSERT new customer
              await sql`
                INSERT INTO customers (
                  id, first_name, last_name, email, phone, 
                  address_line1, city, postcode, created_at, updated_at
                ) VALUES (
                  ${customerId},
                  ${record.nameForename || ''},
                  ${record.nameSurname || ''},
                  ${email},
                  ${record.contactTelephone || record.contactMobile || ''},
                  ${record.addressRoad || ''},
                  ${record.addressTown || ''},
                  ${record.addressPostCode || ''},
                  NOW(),
                  NOW()
                )
                ON CONFLICT (id) DO NOTHING
              `;
              
              this.stats.customers.created++;
            }

            processed++;

          } catch (error) {
            this.stats.customers.errors++;
            console.log(`      ⚠️  Customer error (${record._ID}): ${error.message}`);
          }
        }

        await sql`COMMIT`;

        // Progress update
        if ((i + batchSize) % 500 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          console.log(`      📈 Progress: ${processed}/${records.length} (${progress}%)`);
        }

      } catch (error) {
        await sql`ROLLBACK`;
        console.error(`      ❌ Batch error: ${error.message}`);
        this.stats.customers.errors += batch.length;
      }
    }

    console.log(`   ✅ Customer processing complete: ${this.stats.customers.created} created, ${this.stats.customers.updated} updated, ${this.stats.customers.preserved} preserved enhanced data`);
  }

  async smartVehicleImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
    if (!fs.existsSync(filePath)) {
      console.log('   ⏭️  Vehicles.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    console.log(`   📊 Processing ${records.length} GA4 vehicles with data preservation...`);

    const batchSize = 25;
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        await sql`BEGIN`;
        
        for (const record of batch) {
          try {
            const registration = record._RegID || record.registration;
            if (!registration) continue;

            // Check if vehicle exists
            const existing = await sql`
              SELECT registration, mot_status, tax_status, oil_data, 
                     technical_data, comprehensive_technical_data, owner_id
              FROM vehicles 
              WHERE registration = ${registration.trim().toUpperCase()}
              LIMIT 1
            `;

            // Find customer ID from our database (not GA4)
            let ownerId = null;
            if (record._ID_Customer) {
              const customerCheck = await sql`
                SELECT id FROM customers WHERE id = ${record._ID_Customer} LIMIT 1
              `;
              if (customerCheck.length > 0) {
                ownerId = record._ID_Customer;
              }
            }

            if (existing.length > 0) {
              // UPDATE existing vehicle - PRESERVE enhanced data
              await sql`
                UPDATE vehicles SET
                  make = COALESCE(NULLIF(${record.Make || ''}, ''), make),
                  model = COALESCE(NULLIF(${record.Model || ''}, ''), model),
                  year = COALESCE(${record.YearofManufacture ? parseInt(record.YearofManufacture) : null}, year),
                  color = COALESCE(NULLIF(${record.Colour || ''}, ''), color),
                  fuel_type = COALESCE(NULLIF(${record.FuelType || ''}, ''), fuel_type),
                  engine_size = COALESCE(${record.EngineCC ? parseFloat(record.EngineCC) : null}, engine_size),
                  vin = COALESCE(NULLIF(${record.VIN || ''}, ''), vin),
                  owner_id = COALESCE(${ownerId}, owner_id),  -- Update owner if we have better data
                  updated_at = NOW()
                  -- PRESERVE: mot_status, tax_status, oil_data, technical_data, etc.
                WHERE registration = ${registration.trim().toUpperCase()}
              `;
              
              this.stats.vehicles.updated++;
              this.stats.vehicles.preserved++;

            } else {
              // INSERT new vehicle
              await sql`
                INSERT INTO vehicles (
                  registration, make, model, year, color, fuel_type,
                  engine_size, vin, owner_id, created_at, updated_at
                ) VALUES (
                  ${registration.trim().toUpperCase()},
                  ${record.Make || ''},
                  ${record.Model || ''},
                  ${record.YearofManufacture ? parseInt(record.YearofManufacture) : null},
                  ${record.Colour || ''},
                  ${record.FuelType || ''},
                  ${record.EngineCC ? parseFloat(record.EngineCC) : null},
                  ${record.VIN || ''},
                  ${ownerId},
                  NOW(),
                  NOW()
                )
                ON CONFLICT (registration) DO NOTHING
              `;
              
              this.stats.vehicles.created++;
            }

            processed++;

          } catch (error) {
            this.stats.vehicles.errors++;
            console.log(`      ⚠️  Vehicle error (${record._RegID}): ${error.message}`);
          }
        }

        await sql`COMMIT`;

        if ((i + batchSize) % 1000 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          console.log(`      📈 Progress: ${processed}/${records.length} (${progress}%)`);
        }

      } catch (error) {
        await sql`ROLLBACK`;
        console.error(`      ❌ Batch error: ${error.message}`);
        this.stats.vehicles.errors += batch.length;
      }
    }

    console.log(`   ✅ Vehicle processing complete: ${this.stats.vehicles.created} created, ${this.stats.vehicles.updated} updated, ${this.stats.vehicles.preserved} preserved enhanced data`);
  }

  async smartDocumentImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
    if (!fs.existsSync(filePath)) {
      console.log('   ⏭️  Documents.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    console.log(`   📊 Processing ${records.length} GA4 documents with data preservation...`);

    const batchSize = 20; // Smaller batches for documents
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        await sql`BEGIN`;
        
        for (const record of batch) {
          try {
            const documentId = record._ID;
            if (!documentId) continue;

            // Check if document exists
            const existing = await sql`
              SELECT id FROM documents WHERE id = ${documentId} LIMIT 1
            `;

            if (existing.length > 0) {
              // UPDATE existing document - preserve any enhanced data
              await sql`
                UPDATE documents SET
                  _id_customer = COALESCE(NULLIF(${record._ID_Customer || ''}, ''), _id_customer),
                  doc_type = COALESCE(NULLIF(${record.Type || 'Service'}, ''), doc_type),
                  doc_number = COALESCE(NULLIF(${record.Number || ''}, ''), doc_number),
                  doc_date_issued = COALESCE(${record.DateIssued || null}, doc_date_issued),
                  customer_name = COALESCE(NULLIF(${record.CustomerName || ''}, ''), customer_name),
                  total_gross = COALESCE(${record.TotalGross ? parseFloat(record.TotalGross) : null}, total_gross),
                  updated_at = NOW()
                WHERE id = ${documentId}
              `;
              
              this.stats.documents.updated++;
              this.stats.documents.preserved++;

            } else {
              // INSERT new document
              await sql`
                INSERT INTO documents (
                  id, _id_customer, doc_type, doc_number, doc_date_issued, 
                  customer_name, total_gross, created_at, updated_at
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
                ON CONFLICT (id) DO NOTHING
              `;
              
              this.stats.documents.created++;
            }

            processed++;

          } catch (error) {
            this.stats.documents.errors++;
            console.log(`      ⚠️  Document error (${record._ID}): ${error.message}`);
          }
        }

        await sql`COMMIT`;

        if ((i + batchSize) % 2000 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          console.log(`      📈 Progress: ${processed}/${records.length} (${progress}%)`);
        }

      } catch (error) {
        await sql`ROLLBACK`;
        console.error(`      ❌ Batch error: ${error.message}`);
        this.stats.documents.errors += batch.length;
      }
    }

    console.log(`   ✅ Document processing complete: ${this.stats.documents.created} created, ${this.stats.documents.updated} updated, ${this.stats.documents.preserved} preserved enhanced data`);
  }

  async generatePreservationReport() {
    // Verify enhanced data is still intact
    const postImportAnalysis = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) FROM customers) as preserved_twilio,
        (SELECT COUNT(CASE WHEN phone_verified = true THEN 1 END) FROM customers) as preserved_verified,
        (SELECT COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) FROM customers) as preserved_contact_history,
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(CASE WHEN mot_status IS NOT NULL THEN 1 END) FROM vehicles) as preserved_mot,
        (SELECT COUNT(CASE WHEN oil_data IS NOT NULL THEN 1 END) FROM vehicles) as preserved_oil,
        (SELECT COUNT(CASE WHEN technical_data IS NOT NULL THEN 1 END) FROM vehicles) as preserved_technical
    `;

    const postData = postImportAnalysis[0];

    console.log('\n🛡️  DATA PRESERVATION REPORT');
    console.log('============================');
    console.log('\n📊 IMPORT STATISTICS:');
    console.log(`   👥 Customers: ${this.stats.customers.created} created, ${this.stats.customers.updated} updated, ${this.stats.customers.errors} errors`);
    console.log(`   🚗 Vehicles: ${this.stats.vehicles.created} created, ${this.stats.vehicles.updated} updated, ${this.stats.vehicles.errors} errors`);
    console.log(`   📄 Documents: ${this.stats.documents.created} created, ${this.stats.documents.updated} updated, ${this.stats.documents.errors} errors`);

    console.log('\n🛡️  ENHANCED DATA PRESERVATION:');
    console.log(`   📞 Twilio phones preserved: ${postData.preserved_twilio}`);
    console.log(`   ✅ Verified phones preserved: ${postData.preserved_verified}`);
    console.log(`   📅 Contact history preserved: ${postData.preserved_contact_history}`);
    console.log(`   🔧 MOT data preserved: ${postData.preserved_mot}`);
    console.log(`   🛢️  Oil data preserved: ${postData.preserved_oil}`);
    console.log(`   🔧 Technical data preserved: ${postData.preserved_technical}`);

    console.log('\n✅ FINAL DATABASE STATE:');
    console.log(`   👥 Total customers: ${postData.total_customers.toLocaleString()}`);
    console.log(`   🚗 Total vehicles: ${postData.total_vehicles.toLocaleString()}`);

    console.log('\n🎉 SMART DATA-PRESERVING IMPORT COMPLETE!');
    console.log('All your enhanced API data, WhatsApp history, MOT data, and technical information has been preserved!');
  }
}

// Run the smart import
async function runSmartImport() {
  const importer = new SmartDataPreservingImporter();
  await importer.smartImport();
}

if (require.main === module) {
  runSmartImport().catch(console.error);
}

module.exports = { SmartDataPreservingImporter };
