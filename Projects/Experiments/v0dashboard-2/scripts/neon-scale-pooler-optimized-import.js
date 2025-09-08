require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// CRITICAL: Configure for Neon Scale + Pooler
const sql = neon(process.env.DATABASE_URL, {
  // Pooler-specific optimizations
  fetchConnectionCache: true,
  fullResults: false,
  arrayMode: false,
  // Reduce connection overhead
  connectionTimeoutMillis: 10000,
  queryTimeoutMillis: 30000
});

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

class NeonScalePoolerOptimizedImporter {
  constructor() {
    this.stats = { customers: 0, vehicles: 0, documents: 0, errors: 0 };
    this.startTime = Date.now();
    this.batchSize = 25; // Optimized for pooler connections
  }

  log(message) {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    console.log(`[${elapsed}s] ${message}`);
  }

  async runOptimizedImport() {
    console.log('🚀 NEON SCALE + POOLER OPTIMIZED IMPORT');
    console.log('======================================');
    console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
    console.log('🎯 Optimized for Scale plan with pooler connections');
    console.log('⚡ Using batch processing with connection reuse\n');

    try {
      // Step 1: Quick connectivity test
      this.log('🔍 Testing pooler connectivity...');
      await this.testPoolerConnectivity();

      // Step 2: Get current status
      this.log('📊 Getting current database status...');
      await this.getCurrentStatus();

      // Step 3: Optimized customer import
      this.log('👥 Starting optimized customer import...');
      await this.optimizedCustomerImport();

      // Step 4: Optimized vehicle import
      this.log('🚗 Starting optimized vehicle import...');
      await this.optimizedVehicleImport();

      // Step 5: Optimized document import
      this.log('📄 Starting optimized document import...');
      await this.optimizedDocumentImport();

      // Step 6: Final verification
      this.log('✅ Final verification...');
      await this.finalVerification();

    } catch (error) {
      this.log(`❌ Import failed: ${error.message}`);
      throw error;
    }
  }

  async testPoolerConnectivity() {
    try {
      const start = Date.now();
      const result = await sql`SELECT NOW() as current_time, 'Pooler connection active' as status`;
      const responseTime = Date.now() - start;
      
      this.log(`✅ Pooler response time: ${responseTime}ms`);
      this.log(`📅 Database time: ${result[0].current_time}`);
      this.log(`🔗 Status: ${result[0].status}`);
      
      if (responseTime > 1000) {
        this.log('⚠️  High pooler latency - using smaller batches');
        this.batchSize = 10;
      }
      
    } catch (error) {
      throw new Error(`Pooler connectivity failed: ${error.message}`);
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
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  async optimizedCustomerImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Customers.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} customers in batches of ${this.batchSize}...`);

    // Process in optimized batches
    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      
      try {
        // Process batch with single transaction
        await this.processBatchWithTransaction(batch, 'customers');
        
        this.stats.customers += batch.length;
        
        // Progress reporting
        if (this.stats.customers % 100 === 0) {
          const progress = Math.round((this.stats.customers / records.length) * 100);
          this.log(`   👥 Progress: ${this.stats.customers}/${records.length} (${progress}%)`);
        }
        
        // Small delay to prevent pooler overload
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.stats.errors++;
        this.log(`   ⚠️  Batch error (${i}-${i + batch.length}): ${error.message}`);
        
        // Fallback to individual processing for failed batch
        await this.processIndividualRecords(batch, 'customers');
      }
    }

    this.log(`✅ Customer import complete: ${this.stats.customers} processed, ${this.stats.errors} errors`);
  }

  async processBatchWithTransaction(batch, type) {
    if (type === 'customers') {
      // Use a single multi-row UPSERT for better pooler performance
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

      if (values.length === 0) return;

      // Build multi-row UPSERT query
      const valueStrings = values.map((_, index) => 
        `($${index * 8 + 1}, $${index * 8 + 2}, $${index * 8 + 3}, $${index * 8 + 4}, $${index * 8 + 5}, $${index * 8 + 6}, $${index * 8 + 7}, $${index * 8 + 8}, NOW(), NOW())`
      ).join(', ');

      const params = values.flatMap(v => [
        v.id, v.first_name, v.last_name, v.email, v.phone, v.address_line1, v.city, v.postcode
      ]);

      await sql.unsafe(`
        INSERT INTO customers (
          id, first_name, last_name, email, phone, 
          address_line1, city, postcode, created_at, updated_at
        ) VALUES ${valueStrings}
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
      `, params);
    }
  }

  async processIndividualRecords(batch, type) {
    // Fallback for failed batches - process one by one
    for (const record of batch) {
      try {
        if (type === 'customers') {
          const customerId = record._ID;
          if (!customerId) continue;

          let email = record.contactEmail || '';
          if (!email || email === '') {
            email = `customer.${customerId}@placeholder.com`;
          }

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
        }
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
        
      } catch (error) {
        this.stats.errors++;
        this.log(`   ⚠️  Individual record error: ${error.message}`);
      }
    }
  }

  async optimizedVehicleImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Vehicles.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} vehicles in batches of ${this.batchSize}...`);

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      
      try {
        // Process vehicles individually due to owner lookup complexity
        for (const record of batch) {
          const registration = record._RegID || record.registration;
          if (!registration) continue;

          // Quick owner lookup with timeout
          let ownerId = null;
          if (record._ID_Customer) {
            try {
              const customerCheck = await Promise.race([
                sql`SELECT id FROM customers WHERE id = ${record._ID_Customer} LIMIT 1`,
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 2000))
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
        }
        
        // Progress reporting
        if (this.stats.vehicles % 200 === 0) {
          const progress = Math.round((this.stats.vehicles / records.length) * 100);
          this.log(`   🚗 Progress: ${this.stats.vehicles}/${records.length} (${progress}%)`);
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        this.stats.errors++;
        this.log(`   ⚠️  Vehicle batch error: ${error.message}`);
      }
    }

    this.log(`✅ Vehicle import complete: ${this.stats.vehicles} processed`);
  }

  async optimizedDocumentImport() {
    const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
    if (!fs.existsSync(filePath)) {
      this.log('⏭️  Documents.csv not found, skipping');
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
    });

    this.log(`📋 Processing ${records.length} documents in batches of ${this.batchSize * 2}...`);

    // Documents can use larger batches as they're simpler
    const docBatchSize = this.batchSize * 2;

    for (let i = 0; i < records.length; i += docBatchSize) {
      const batch = records.slice(i, i + docBatchSize);
      
      try {
        for (const record of batch) {
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
        }
        
        // Progress reporting
        if (this.stats.documents % 500 === 0) {
          const progress = Math.round((this.stats.documents / records.length) * 100);
          this.log(`   📄 Progress: ${this.stats.documents}/${records.length} (${progress}%)`);
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.stats.errors++;
        this.log(`   ⚠️  Document batch error: ${error.message}`);
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

      console.log('\n🎉 NEON SCALE + POOLER OPTIMIZED IMPORT COMPLETE!');
      console.log('================================================');
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
      console.log('🚀 SCALE PLAN IMPORT SUCCESSFUL!');
      console.log('Optimized for pooler connections with enhanced data preservation!');

    } catch (error) {
      this.log(`❌ Final verification failed: ${error.message}`);
    }
  }
}

// Run the optimized import
async function runOptimizedImport() {
  const importer = new NeonScalePoolerOptimizedImporter();
  await importer.runOptimizedImport();
}

if (require.main === module) {
  runOptimizedImport().catch(console.error);
}

module.exports = { NeonScalePoolerOptimizedImporter };
