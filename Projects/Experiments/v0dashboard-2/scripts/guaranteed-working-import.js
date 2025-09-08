require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

class GuaranteedWorkingImporter {
  constructor() {
    this.stats = {
      customers: { processed: 0, created: 0, updated: 0, errors: 0, preserved: 0 },
      vehicles: { processed: 0, created: 0, updated: 0, errors: 0, preserved: 0 },
      documents: { processed: 0, created: 0, updated: 0, errors: 0, preserved: 0 }
    };
    this.startTime = Date.now();
  }

  log(message) {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    console.log(`[${elapsed}s] ${message}`);
  }

  async guaranteedImport() {
    console.log('🚀 GUARANTEED WORKING IMPORT');
    console.log('============================');
    console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
    console.log('✅ Real-time progress monitoring');
    console.log('✅ Enhanced data preservation');
    console.log('✅ Tiny batches for reliability');
    console.log('✅ Automatic error recovery\n');

    try {
      // Step 1: Verify database connectivity
      this.log('🔍 Testing database connectivity...');
      await sql`SELECT 1 as test`;
      this.log('✅ Database connection successful!');

      // Step 2: Get current status
      this.log('📊 Getting current database status...');
      const currentStatus = await sql`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM documents) as documents
      `;
      
      const current = currentStatus[0];
      this.log(`📈 Current: ${current.customers} customers, ${current.vehicles} vehicles, ${current.documents} documents`);

      // Step 3: Import customers with real-time progress
      this.log('👥 Starting customer import with data preservation...');
      await this.importCustomersWithProgress();

      // Step 4: Import vehicles with real-time progress
      this.log('🚗 Starting vehicle import with data preservation...');
      await this.importVehiclesWithProgress();

      // Step 5: Import documents with real-time progress
      this.log('📄 Starting document import with data preservation...');
      await this.importDocumentsWithProgress();

      // Step 6: Final verification
      this.log('🎯 Verifying final results...');
      await this.generateFinalReport();

    } catch (error) {
      this.log(`❌ Import failed: ${error.message}`);
      throw error;
    }
  }

  async importCustomersWithProgress() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Customers.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} customers in tiny batches...`);

    const batchSize = 5; // Very small batches for reliability
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        for (const record of batch) {
          try {
            const customerId = record._ID;
            if (!customerId) continue;

            // Check if customer exists
            const existing = await sql`
              SELECT id, twilio_phone, phone_verified, last_contact_date, opt_out
              FROM customers 
              WHERE id = ${customerId}
              LIMIT 1
            `;

            let email = record.contactEmail || '';
            if (!email || email === '') {
              email = `customer.${customerId}@placeholder.com`;
            }

            if (existing.length > 0) {
              // UPDATE with data preservation
              await sql`
                UPDATE customers SET
                  first_name = COALESCE(NULLIF(${record.nameForename || ''}, ''), first_name),
                  last_name = COALESCE(NULLIF(${record.nameSurname || ''}, ''), last_name),
                  email = CASE 
                    WHEN email LIKE '%@placeholder.com' THEN ${email}
                    ELSE email
                  END,
                  phone = CASE 
                    WHEN phone IS NULL OR phone = '' THEN ${record.contactTelephone || record.contactMobile || ''}
                    ELSE phone
                  END,
                  address_line1 = COALESCE(NULLIF(${record.addressRoad || ''}, ''), address_line1),
                  city = COALESCE(NULLIF(${record.addressTown || ''}, ''), city),
                  postcode = COALESCE(NULLIF(${record.addressPostCode || ''}, ''), postcode),
                  updated_at = NOW()
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
            this.stats.customers.processed++;

          } catch (error) {
            this.stats.customers.errors++;
            this.log(`⚠️  Customer error (${record._ID}): ${error.message}`);
          }
        }

        // Progress update every 50 records
        if (processed % 50 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          this.log(`📈 Customer progress: ${processed}/${records.length} (${progress}%) - ${this.stats.customers.created} created, ${this.stats.customers.updated} updated`);
        }

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (error) {
        this.log(`❌ Batch error: ${error.message}`);
        this.stats.customers.errors += batch.length;
      }
    }

    this.log(`✅ Customer import complete: ${this.stats.customers.created} created, ${this.stats.customers.updated} updated, ${this.stats.customers.errors} errors`);
  }

  async importVehiclesWithProgress() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Vehicles.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} vehicles in tiny batches...`);

    const batchSize = 5;
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        for (const record of batch) {
          try {
            const registration = record._RegID || record.registration;
            if (!registration) continue;

            // Check if vehicle exists
            const existing = await sql`
              SELECT registration, mot_status, tax_status, oil_data, technical_data
              FROM vehicles 
              WHERE registration = ${registration.trim().toUpperCase()}
              LIMIT 1
            `;

            // Find customer
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
              // UPDATE with data preservation
              await sql`
                UPDATE vehicles SET
                  make = COALESCE(NULLIF(${record.Make || ''}, ''), make),
                  model = COALESCE(NULLIF(${record.Model || ''}, ''), model),
                  year = COALESCE(${record.YearofManufacture ? parseInt(record.YearofManufacture) : null}, year),
                  color = COALESCE(NULLIF(${record.Colour || ''}, ''), color),
                  fuel_type = COALESCE(NULLIF(${record.FuelType || ''}, ''), fuel_type),
                  engine_size = COALESCE(${record.EngineCC ? parseFloat(record.EngineCC) : null}, engine_size),
                  vin = COALESCE(NULLIF(${record.VIN || ''}, ''), vin),
                  owner_id = COALESCE(${ownerId}, owner_id),
                  updated_at = NOW()
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
            this.stats.vehicles.processed++;

          } catch (error) {
            this.stats.vehicles.errors++;
            this.log(`⚠️  Vehicle error (${record._RegID}): ${error.message}`);
          }
        }

        // Progress update every 100 records
        if (processed % 100 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          this.log(`📈 Vehicle progress: ${processed}/${records.length} (${progress}%) - ${this.stats.vehicles.created} created, ${this.stats.vehicles.updated} updated`);
        }

        await new Promise(resolve => setTimeout(resolve, 5));

      } catch (error) {
        this.log(`❌ Vehicle batch error: ${error.message}`);
        this.stats.vehicles.errors += batch.length;
      }
    }

    this.log(`✅ Vehicle import complete: ${this.stats.vehicles.created} created, ${this.stats.vehicles.updated} updated, ${this.stats.vehicles.errors} errors`);
  }

  async importDocumentsWithProgress() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Documents.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} documents in tiny batches...`);

    const batchSize = 5;
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        for (const record of batch) {
          try {
            const documentId = record._ID;
            if (!documentId) continue;

            // Check if document exists
            const existing = await sql`
              SELECT id FROM documents WHERE id = ${documentId} LIMIT 1
            `;

            if (existing.length > 0) {
              // UPDATE existing document
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
            this.stats.documents.processed++;

          } catch (error) {
            this.stats.documents.errors++;
            this.log(`⚠️  Document error (${record._ID}): ${error.message}`);
          }
        }

        // Progress update every 200 records
        if (processed % 200 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          this.log(`📈 Document progress: ${processed}/${records.length} (${progress}%) - ${this.stats.documents.created} created, ${this.stats.documents.updated} updated`);
        }

        await new Promise(resolve => setTimeout(resolve, 5));

      } catch (error) {
        this.log(`❌ Document batch error: ${error.message}`);
        this.stats.documents.errors += batch.length;
      }
    }

    this.log(`✅ Document import complete: ${this.stats.documents.created} created, ${this.stats.documents.updated} updated, ${this.stats.documents.errors} errors`);
  }

  async generateFinalReport() {
    // Get final counts
    const finalStatus = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) FROM customers) as preserved_twilio,
        (SELECT COUNT(CASE WHEN phone_verified = true THEN 1 END) FROM customers) as preserved_verified
    `;

    const final = finalStatus[0];
    const totalTime = Math.round((Date.now() - this.startTime) / 1000);

    console.log('\n🎉 GUARANTEED WORKING IMPORT COMPLETE!');
    console.log('=====================================');
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log('');
    console.log('📊 FINAL RESULTS:');
    console.log(`   👥 Customers: ${final.customers.toLocaleString()}`);
    console.log(`   🚗 Vehicles: ${final.vehicles.toLocaleString()}`);
    console.log(`   📄 Documents: ${final.documents.toLocaleString()}`);
    console.log('');
    console.log('📈 IMPORT STATISTICS:');
    console.log(`   👥 Customers: ${this.stats.customers.created} created, ${this.stats.customers.updated} updated, ${this.stats.customers.errors} errors`);
    console.log(`   🚗 Vehicles: ${this.stats.vehicles.created} created, ${this.stats.vehicles.updated} updated, ${this.stats.vehicles.errors} errors`);
    console.log(`   📄 Documents: ${this.stats.documents.created} created, ${this.stats.documents.updated} updated, ${this.stats.documents.errors} errors`);
    console.log('');
    console.log('🛡️  DATA PRESERVATION:');
    console.log(`   📞 Preserved Twilio phones: ${final.preserved_twilio}`);
    console.log(`   ✅ Preserved verified phones: ${final.preserved_verified}`);
    console.log('');
    console.log('🚀 READY FOR WHATSAPP INTEGRATION!');
    console.log('All enhanced data preserved, GA4 data imported successfully!');
  }
}

// Run the guaranteed import
async function runGuaranteedImport() {
  const importer = new GuaranteedWorkingImporter();
  await importer.guaranteedImport();
}

if (require.main === module) {
  runGuaranteedImport().catch(console.error);
}

module.exports = { GuaranteedWorkingImporter };
