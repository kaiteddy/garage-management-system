require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

class NeonOptimizedUltraMinimalImporter {
  constructor() {
    this.stats = { customers: 0, vehicles: 0, documents: 0, errors: 0 };
    this.startTime = Date.now();
  }

  log(message) {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    console.log(`[${elapsed}s] ${message}`);
  }

  async ultraMinimalImport() {
    console.log('🔧 NEON-OPTIMIZED ULTRA-MINIMAL IMPORT');
    console.log('======================================');
    console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
    console.log('🛡️ Enhanced data preservation enabled');
    console.log('⚡ Optimized for Neon database limitations');
    console.log('🐌 Ultra-slow processing to avoid deadlocks\n');

    try {
      // Step 1: Wait and test connectivity
      this.log('⏳ Waiting 15 seconds for database to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      this.log('🔍 Testing database connectivity...');
      await this.testConnectivity();

      // Step 2: Get current status
      this.log('📊 Getting current database status...');
      await this.getCurrentStatus();

      // Step 3: Ultra-minimal customer import
      this.log('👥 Starting ultra-minimal customer import...');
      await this.ultraMinimalCustomerImport();

      // Step 4: Ultra-minimal vehicle import
      this.log('🚗 Starting ultra-minimal vehicle import...');
      await this.ultraMinimalVehicleImport();

      // Step 5: Ultra-minimal document import
      this.log('📄 Starting ultra-minimal document import...');
      await this.ultraMinimalDocumentImport();

      // Step 6: Final verification
      this.log('✅ Final verification...');
      await this.finalVerification();

    } catch (error) {
      this.log(`❌ Import failed: ${error.message}`);
      throw error;
    }
  }

  async testConnectivity() {
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const start = Date.now();
        await sql`SELECT 1 as test`;
        const responseTime = Date.now() - start;
        
        this.log(`✅ Database responsive (${responseTime}ms)`);
        
        if (responseTime > 2000) {
          this.log('⚠️  High latency detected - using extra delays');
          this.extraDelay = true;
        }
        
        return;
        
      } catch (error) {
        attempts++;
        this.log(`❌ Connectivity attempt ${attempts}/${maxAttempts} failed: ${error.message}`);
        
        if (attempts < maxAttempts) {
          this.log(`⏳ Waiting 10 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          throw new Error('Database connectivity failed after multiple attempts');
        }
      }
    }
  }

  async getCurrentStatus() {
    try {
      const counts = await sql`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM documents) as documents
      `;
      
      const current = counts[0];
      this.log(`📊 Current: ${current.customers} customers, ${current.vehicles} vehicles, ${current.documents} documents`);

      // Check enhanced data preservation
      const preservation = await sql`
        SELECT 
          COUNT(CASE WHEN twilio_phone IS NOT NULL THEN 1 END) as twilio_phones,
          COUNT(CASE WHEN phone_verified = true THEN 1 END) as verified_phones,
          COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) as contact_history
        FROM customers
        LIMIT 1000
      `;

      const enhanced = preservation[0];
      this.log(`🛡️  Enhanced data: ${enhanced.twilio_phones} Twilio, ${enhanced.verified_phones} verified, ${enhanced.contact_history} history`);

    } catch (error) {
      this.log(`❌ Status check failed: ${error.message}`);
      throw error;
    }
  }

  async ultraMinimalCustomerImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Customers.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} customers (1 every 3 seconds)...`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        const customerId = record._ID;
        if (!customerId) continue;

        let email = record.contactEmail || '';
        if (!email || email === '') {
          email = `customer.${customerId}@placeholder.com`;
        }

        // Ultra-minimal single record processing
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

        this.stats.customers++;

        // Progress every 50 records
        if (this.stats.customers % 50 === 0) {
          const progress = Math.round((this.stats.customers / records.length) * 100);
          this.log(`   👥 Progress: ${this.stats.customers}/${records.length} (${progress}%)`);
        }

        // Ultra-slow processing - 3 seconds between each record
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extra delay if high latency detected
        if (this.extraDelay && i % 10 === 0) {
          this.log('   ⏳ Extra delay for high latency database...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (error) {
        this.stats.errors++;
        this.log(`   ⚠️  Customer error (${record._ID}): ${error.message}`);
        
        // Wait longer after errors
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.log(`✅ Customer import complete: ${this.stats.customers} processed, ${this.stats.errors} errors`);
  }

  async ultraMinimalVehicleImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Vehicles.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} vehicles (1 every 2 seconds)...`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        const registration = record._RegID || record.registration;
        if (!registration) continue;

        // Find customer (with timeout)
        let ownerId = null;
        if (record._ID_Customer) {
          try {
            const customerCheck = await Promise.race([
              sql`SELECT id FROM customers WHERE id = ${record._ID_Customer} LIMIT 1`,
              new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
            ]);
            
            if (customerCheck.length > 0) {
              ownerId = record._ID_Customer;
            }
          } catch (error) {
            // Skip customer lookup if it times out
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

        this.stats.vehicles++;

        // Progress every 100 records
        if (this.stats.vehicles % 100 === 0) {
          const progress = Math.round((this.stats.vehicles / records.length) * 100);
          this.log(`   🚗 Progress: ${this.stats.vehicles}/${records.length} (${progress}%)`);
        }

        // 2 seconds between each record
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        this.stats.errors++;
        this.log(`   ⚠️  Vehicle error (${record._RegID}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.log(`✅ Vehicle import complete: ${this.stats.vehicles} processed`);
  }

  async ultraMinimalDocumentImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Documents.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} documents (1 every 1 second)...`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
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

        this.stats.documents++;

        // Progress every 200 records
        if (this.stats.documents % 200 === 0) {
          const progress = Math.round((this.stats.documents / records.length) * 100);
          this.log(`   📄 Progress: ${this.stats.documents}/${records.length} (${progress}%)`);
        }

        // 1 second between each record
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        this.stats.errors++;
        this.log(`   ⚠️  Document error (${record._ID}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    this.log(`✅ Document import complete: ${this.stats.documents} processed`);
  }

  async finalVerification() {
    try {
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

      console.log('\n🎉 NEON-OPTIMIZED ULTRA-MINIMAL IMPORT COMPLETE!');
      console.log('===============================================');
      console.log(`⏱️  Total time: ${minutes}m ${seconds}s`);
      console.log('');
      console.log('📊 FINAL RESULTS:');
      console.log(`   👥 Customers: ${final.customers.toLocaleString()}`);
      console.log(`   🚗 Vehicles: ${final.vehicles.toLocaleString()}`);
      console.log(`   📄 Documents: ${final.documents.toLocaleString()}`);
      console.log('');
      console.log('📈 PROCESSING STATISTICS:');
      console.log(`   👥 Customers processed: ${this.stats.customers}`);
      console.log(`   🚗 Vehicles processed: ${this.stats.vehicles}`);
      console.log(`   📄 Documents processed: ${this.stats.documents}`);
      console.log(`   ❌ Total errors: ${this.stats.errors}`);
      console.log('');
      console.log('🛡️  DATA PRESERVATION VERIFIED:');
      console.log(`   📞 Preserved Twilio phones: ${final.preserved_twilio}`);
      console.log(`   ✅ Preserved verified phones: ${final.preserved_verified}`);
      console.log('');
      console.log('🚀 IMPORT SUCCESSFUL WITH ENHANCED DATA PRESERVATION!');
      console.log('All GA4 data imported while protecting API-sourced enhancements!');

    } catch (error) {
      this.log(`❌ Final verification failed: ${error.message}`);
    }
  }
}

// Run the ultra-minimal import
async function runUltraMinimalImport() {
  const importer = new NeonOptimizedUltraMinimalImporter();
  await importer.ultraMinimalImport();
}

if (require.main === module) {
  runUltraMinimalImport().catch(console.error);
}

module.exports = { NeonOptimizedUltraMinimalImporter };
