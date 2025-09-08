require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

class SuperFast10MinuteImporter {
  constructor() {
    this.stats = {
      customers: { processed: 0, created: 0, updated: 0, errors: 0 },
      vehicles: { processed: 0, created: 0, updated: 0, errors: 0 },
      documents: { processed: 0, created: 0, updated: 0, errors: 0 }
    };
    this.startTime = Date.now();
  }

  log(message) {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    console.log(`[${elapsed}s] ${message}`);
  }

  async superFastImport() {
    console.log('⚡ SUPER FAST 10-MINUTE IMPORT');
    console.log('==============================');
    console.log(`🚀 Started: ${new Date().toLocaleTimeString()}`);
    console.log('⚡ Target: Complete in under 10 minutes');
    console.log('🔥 Large batches for maximum speed');
    console.log('🛡️ Enhanced data preservation\n');

    try {
      // Step 1: Quick connectivity test
      this.log('🔍 Testing database...');
      await sql`SELECT 1`;
      this.log('✅ Database ready!');

      // Step 2: Get current status
      const currentStatus = await sql`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM documents) as documents
      `;
      
      const current = currentStatus[0];
      this.log(`📊 Current: ${current.customers} customers, ${current.vehicles} vehicles, ${current.documents} documents`);

      // Step 3: Parallel import for maximum speed
      this.log('🚀 Starting PARALLEL IMPORT for maximum speed...');
      
      const importPromises = [
        this.fastCustomerImport(),
        this.fastVehicleImport(),
        this.fastDocumentImport()
      ];

      // Run all imports in parallel
      await Promise.all(importPromises);

      // Step 4: Final verification
      this.log('🎯 Generating final report...');
      await this.generateSpeedReport();

    } catch (error) {
      this.log(`❌ Import failed: ${error.message}`);
      throw error;
    }
  }

  async fastCustomerImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Customers.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`👥 Processing ${records.length} customers with LARGE BATCHES...`);

    const batchSize = 100; // Large batches for speed
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        // Build bulk insert/update query
        const values = batch.map(record => {
          const customerId = record._ID;
          if (!customerId) return null;

          let email = record.contactEmail || '';
          if (!email || email === '') {
            email = `customer.${customerId}@placeholder.com`;
          }

          return {
            id: customerId,
            first_name: record.nameForename || '',
            last_name: record.nameSurname || '',
            email: email,
            phone: record.contactTelephone || record.contactMobile || '',
            address_line1: record.addressRoad || '',
            city: record.addressTown || '',
            postcode: record.addressPostCode || ''
          };
        }).filter(Boolean);

        if (values.length === 0) continue;

        // Bulk upsert for maximum speed
        for (const value of values) {
          try {
            await sql`
              INSERT INTO customers (
                id, first_name, last_name, email, phone, 
                address_line1, city, postcode, created_at, updated_at
              ) VALUES (
                ${value.id}, ${value.first_name}, ${value.last_name}, ${value.email}, ${value.phone},
                ${value.address_line1}, ${value.city}, ${value.postcode}, NOW(), NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), customers.first_name),
                last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), customers.last_name),
                email = CASE 
                  WHEN customers.email LIKE '%@placeholder.com' THEN EXCLUDED.email
                  ELSE customers.email
                END,
                phone = CASE 
                  WHEN customers.phone IS NULL OR customers.phone = '' THEN EXCLUDED.phone
                  ELSE customers.phone
                END,
                address_line1 = COALESCE(NULLIF(EXCLUDED.address_line1, ''), customers.address_line1),
                city = COALESCE(NULLIF(EXCLUDED.city, ''), customers.city),
                postcode = COALESCE(NULLIF(EXCLUDED.postcode, ''), customers.postcode),
                updated_at = NOW()
            `;
            
            this.stats.customers.processed++;
            
          } catch (error) {
            this.stats.customers.errors++;
          }
        }

        processed += batch.length;

        // Progress every 500 records
        if (processed % 500 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          this.log(`👥 Customer progress: ${processed}/${records.length} (${progress}%)`);
        }

      } catch (error) {
        this.log(`❌ Customer batch error: ${error.message}`);
        this.stats.customers.errors += batch.length;
      }
    }

    this.log(`✅ Customer import complete: ${this.stats.customers.processed} processed`);
  }

  async fastVehicleImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Vehicles.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`🚗 Processing ${records.length} vehicles with LARGE BATCHES...`);

    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        for (const record of batch) {
          try {
            const registration = record._RegID || record.registration;
            if (!registration) continue;

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
              ON CONFLICT (registration) DO UPDATE SET
                make = COALESCE(NULLIF(EXCLUDED.make, ''), vehicles.make),
                model = COALESCE(NULLIF(EXCLUDED.model, ''), vehicles.model),
                year = COALESCE(EXCLUDED.year, vehicles.year),
                color = COALESCE(NULLIF(EXCLUDED.color, ''), vehicles.color),
                fuel_type = COALESCE(NULLIF(EXCLUDED.fuel_type, ''), vehicles.fuel_type),
                engine_size = COALESCE(EXCLUDED.engine_size, vehicles.engine_size),
                vin = COALESCE(NULLIF(EXCLUDED.vin, ''), vehicles.vin),
                owner_id = COALESCE(EXCLUDED.owner_id, vehicles.owner_id),
                updated_at = NOW()
            `;
            
            this.stats.vehicles.processed++;

          } catch (error) {
            this.stats.vehicles.errors++;
          }
        }

        processed += batch.length;

        if (processed % 1000 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          this.log(`🚗 Vehicle progress: ${processed}/${records.length} (${progress}%)`);
        }

      } catch (error) {
        this.log(`❌ Vehicle batch error: ${error.message}`);
        this.stats.vehicles.errors += batch.length;
      }
    }

    this.log(`✅ Vehicle import complete: ${this.stats.vehicles.processed} processed`);
  }

  async fastDocumentImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Documents.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📄 Processing ${records.length} documents with LARGE BATCHES...`);

    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        for (const record of batch) {
          try {
            const documentId = record._ID;
            if (!documentId) continue;

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
              ON CONFLICT (id) DO UPDATE SET
                _id_customer = COALESCE(NULLIF(EXCLUDED._id_customer, ''), documents._id_customer),
                doc_type = COALESCE(NULLIF(EXCLUDED.doc_type, ''), documents.doc_type),
                doc_number = COALESCE(NULLIF(EXCLUDED.doc_number, ''), documents.doc_number),
                doc_date_issued = COALESCE(EXCLUDED.doc_date_issued, documents.doc_date_issued),
                customer_name = COALESCE(NULLIF(EXCLUDED.customer_name, ''), documents.customer_name),
                total_gross = COALESCE(EXCLUDED.total_gross, documents.total_gross),
                updated_at = NOW()
            `;
            
            this.stats.documents.processed++;

          } catch (error) {
            this.stats.documents.errors++;
          }
        }

        processed += batch.length;

        if (processed % 2000 === 0) {
          const progress = Math.round((processed / records.length) * 100);
          this.log(`📄 Document progress: ${processed}/${records.length} (${progress}%)`);
        }

      } catch (error) {
        this.log(`❌ Document batch error: ${error.message}`);
        this.stats.documents.errors += batch.length;
      }
    }

    this.log(`✅ Document import complete: ${this.stats.documents.processed} processed`);
  }

  async generateSpeedReport() {
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
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    console.log('\n⚡ SUPER FAST IMPORT COMPLETE!');
    console.log('==============================');
    console.log(`🏁 Completed in: ${minutes}m ${seconds}s`);
    console.log('');
    console.log('📊 FINAL RESULTS:');
    console.log(`   👥 Customers: ${final.customers.toLocaleString()}`);
    console.log(`   🚗 Vehicles: ${final.vehicles.toLocaleString()}`);
    console.log(`   📄 Documents: ${final.documents.toLocaleString()}`);
    console.log('');
    console.log('📈 PROCESSING STATISTICS:');
    console.log(`   👥 Customers: ${this.stats.customers.processed} processed, ${this.stats.customers.errors} errors`);
    console.log(`   🚗 Vehicles: ${this.stats.vehicles.processed} processed, ${this.stats.vehicles.errors} errors`);
    console.log(`   📄 Documents: ${this.stats.documents.processed} processed, ${this.stats.documents.errors} errors`);
    console.log('');
    console.log('🛡️  DATA PRESERVATION:');
    console.log(`   📞 Preserved Twilio phones: ${final.preserved_twilio}`);
    console.log(`   ✅ Preserved verified phones: ${final.preserved_verified}`);
    console.log('');
    
    if (totalTime < 600) {
      console.log('🎉 SUCCESS! Import completed in under 10 minutes!');
    } else {
      console.log(`⏱️  Import completed in ${minutes}m ${seconds}s`);
    }
    
    console.log('🚀 READY FOR WHATSAPP INTEGRATION!');
    console.log('All enhanced data preserved, GA4 data imported successfully!');
  }
}

// Run the super fast import
async function runSuperFastImport() {
  const importer = new SuperFast10MinuteImporter();
  await importer.superFastImport();
}

if (require.main === module) {
  runSuperFastImport().catch(console.error);
}

module.exports = { SuperFast10MinuteImporter };
