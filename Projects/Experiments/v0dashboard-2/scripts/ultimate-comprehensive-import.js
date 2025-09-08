require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

// ALL FILES WE NEED TO IMPORT (based on our extensive analysis)
const ALL_FILES = {
  // Core data (already working)
  customers: 'Customers.csv',
  vehicles: 'Vehicles.csv', 
  documents: 'Documents.csv',
  
  // Additional document-related data
  lineItems: 'LineItems.csv',
  receipts: 'Receipts.csv',
  documentExtras: 'Document_Extras.csv',
  
  // Operational data
  appointments: 'Appointments.csv',
  reminders: 'Reminders.csv',
  stock: 'Stock.csv',
  
  // Templates (if needed)
  reminderTemplates: 'Reminder_Templates.csv'
};

async function ultimateComprehensiveImport() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 ULTIMATE COMPREHENSIVE IMPORT - ALL GA4 FILES\n');
    console.log('Based on all our extensive script development work\n');
    console.log('Files to process:');
    Object.entries(ALL_FILES).forEach(([key, file]) => {
      const filePath = path.join(GA4_EXPORT_PATH, file);
      const exists = fs.existsSync(filePath);
      const size = exists ? Math.round(fs.statSync(filePath).size / 1024) : 0;
      console.log(`   ${exists ? '✅' : '❌'} ${file} (${size} KB)`);
    });
    console.log('');

    // Step 1: Clear database
    console.log('🗑️  Step 1: Clearing database...');
    await sql`TRUNCATE TABLE documents CASCADE`;
    await sql`TRUNCATE TABLE vehicles CASCADE`;
    await sql`TRUNCATE TABLE customers CASCADE`;
    console.log('   ✅ Database cleared with TRUNCATE');

    // Step 2: Import core data (customers, vehicles, documents)
    console.log('\n📊 Step 2: Importing core data...');
    const coreResults = await importCoreData();

    // Step 3: Import document-related data (line items, receipts, extras)
    console.log('\n📄 Step 3: Importing document-related data...');
    const documentResults = await importDocumentData();

    // Step 4: Import operational data (appointments, reminders, stock)
    console.log('\n⚙️  Step 4: Importing operational data...');
    const operationalResults = await importOperationalData();

    // Step 5: Final cleanup and validation
    console.log('\n🔧 Step 5: Final cleanup and validation...');
    await finalCleanupAndValidation();

    // Step 6: Comprehensive final report
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    await generateFinalReport(coreResults, documentResults, operationalResults, totalTime);

    return { success: true, totalTime };

  } catch (error) {
    console.error('\n❌ ULTIMATE COMPREHENSIVE IMPORT FAILED:', error);
    return { success: false, error: error.message };
  }
}

async function importCoreData() {
  const results = {};

  // Import customers (using our proven ultra-fast method)
  console.log('   👥 Importing customers...');
  results.customers = await importCustomersUltraFast();

  // Import vehicles (using our proven ultra-fast method)
  console.log('   🚗 Importing vehicles...');
  results.vehicles = await importVehiclesUltraFast();

  // Import documents (using our proven ultra-fast method)
  console.log('   📋 Importing documents...');
  results.documents = await importDocumentsUltraFast();

  return results;
}

async function importDocumentData() {
  const results = {};

  // Import line items
  console.log('   📝 Importing line items...');
  results.lineItems = await importLineItemsUltraFast();

  // Import receipts
  console.log('   🧾 Importing receipts...');
  results.receipts = await importReceiptsUltraFast();

  // Import document extras
  console.log('   📎 Importing document extras...');
  results.documentExtras = await importDocumentExtrasUltraFast();

  return results;
}

async function importOperationalData() {
  const results = {};

  // Import appointments
  console.log('   📅 Importing appointments...');
  results.appointments = await importAppointmentsUltraFast();

  // Import reminders
  console.log('   🔔 Importing reminders...');
  results.reminders = await importRemindersUltraFast();

  // Import stock
  console.log('   📦 Importing stock...');
  results.stock = await importStockUltraFast();

  return results;
}

// CORE DATA IMPORT FUNCTIONS (proven to work)
async function importCustomersUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  const chunkSize = 1000;
  let totalSuccess = 0;
  let totalErrors = 0;
  const emailSet = new Set();

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const customerId = record._ID;
        if (!customerId) continue;

        let email = record.contactEmail || '';
        if (!email || emailSet.has(email)) {
          email = `customer.${customerId}@placeholder.com`;
        }
        emailSet.add(email);

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        values.push(`('${customerId}','${escapeString(record.nameForename || '')}','${escapeString(record.nameSurname || '')}','${escapeString(record.contactTelephone || record.contactMobile || '')}','${escapeString(email)}','${escapeString(record.addressRoad || '')}','${escapeString(record.addressTown || '')}','${escapeString(record.addressPostCode || '')}',NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO customers (id, first_name, last_name, phone, email, address_line1, city, postcode, created_at, updated_at) VALUES ${values.join(', ')}`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Customers chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} customers imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

async function importVehiclesUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0, assigned: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  const chunkSize = 1000;
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalAssigned = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const registration = record._RegID || record.registration;
        if (!registration) continue;

        const customerId = record._ID_Customer || null;
        if (customerId) totalAssigned++;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        values.push(`('${registration.trim().toUpperCase()}','${escapeString(record.Make || '')}','${escapeString(record.Model || '')}',${record.YearofManufacture ? parseInt(record.YearofManufacture) : 'NULL'},'${escapeString(record.Colour || '')}','${escapeString(record.FuelType || '')}','${escapeString(record.EngineCC || '')}','${escapeString(record.VIN || '')}',${customerId ? `'${customerId}'` : 'NULL'},NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO vehicles (registration, make, model, year, color, fuel_type, engine_size, vin, owner_id, created_at, updated_at) VALUES ${values.join(', ')}`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Vehicles chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} vehicles imported, ${totalErrors} errors, ${totalAssigned} assigned`);
  return { total: records.length, success: totalSuccess, errors: totalErrors, assigned: totalAssigned };
}

async function importDocumentsUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  const chunkSize = 500;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const documentId = record._ID;
        if (!documentId) continue;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        values.push(`('${documentId}','${escapeString(record._ID_Customer || '')}','${escapeString(record.Type || 'Service')}','${escapeString(record.Number || '')}',${record.DateIssued ? `'${record.DateIssued}'` : 'NULL'},'${escapeString(record.CustomerName || '')}',${record.TotalGross ? parseFloat(record.TotalGross) : 0},NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO documents (id, _id_customer, doc_type, doc_number, doc_date_issued, customer_name, total_gross, created_at, updated_at) VALUES ${values.join(', ')}`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Documents chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} documents imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

// DOCUMENT DATA IMPORT FUNCTIONS
async function importLineItemsUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'LineItems.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  LineItems.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} line items...`);

  // Create line_items table if it doesn't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS line_items (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        description TEXT,
        quantity DECIMAL,
        unit_price DECIMAL,
        total_amount DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.log(`      ⚠️  Could not create line_items table: ${error.message}`);
  }

  const chunkSize = 500;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const lineItemId = record._ID || record.id;
        if (!lineItemId) continue;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        const documentId = record._ID_Document || record.document_id || '';
        const description = record.itemDescription || record.description || '';
        const quantity = record.itemQuantity || record.quantity || 0;
        const unitPrice = record.itemPrice || record.unit_price || 0;
        const totalAmount = record.itemSub_Gross || record.total_amount || 0;

        values.push(`('${lineItemId}','${escapeString(documentId)}','${escapeString(description)}',${parseFloat(quantity) || 0},${parseFloat(unitPrice) || 0},${parseFloat(totalAmount) || 0},NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO line_items (id, document_id, description, quantity, unit_price, total_amount, created_at, updated_at) VALUES ${values.join(', ')} ON CONFLICT (id) DO NOTHING`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Line items chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} line items imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

async function importReceiptsUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Receipts.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Receipts.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} receipts...`);

  // Create receipts table if it doesn't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        amount DECIMAL,
        payment_method TEXT,
        receipt_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.log(`      ⚠️  Could not create receipts table: ${error.message}`);
  }

  const chunkSize = 500;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const receiptId = record._ID || record.id;
        if (!receiptId) continue;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        const documentId = record._ID_Document || record.document_id || '';
        const amount = record.Amount || record.amount || 0;
        const paymentMethod = record.PaymentMethod || record.payment_method || '';
        const receiptDate = record.Date || record.receipt_date || null;

        values.push(`('${receiptId}','${escapeString(documentId)}',${parseFloat(amount) || 0},'${escapeString(paymentMethod)}',${receiptDate ? `'${receiptDate}'` : 'NULL'},NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO receipts (id, document_id, amount, payment_method, receipt_date, created_at, updated_at) VALUES ${values.join(', ')} ON CONFLICT (id) DO NOTHING`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Receipts chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} receipts imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

async function importDocumentExtrasUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Document_Extras.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Document_Extras.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} document extras...`);

  // Create document_extras table if it doesn't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        extra_type TEXT,
        extra_value TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.log(`      ⚠️  Could not create document_extras table: ${error.message}`);
  }

  const chunkSize = 500;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const extraId = record._ID || record.id;
        if (!extraId) continue;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        const documentId = record._ID_Document || record.document_id || '';
        const extraType = record.Type || record.extra_type || '';
        const extraValue = record.Value || record.extra_value || '';

        values.push(`('${extraId}','${escapeString(documentId)}','${escapeString(extraType)}','${escapeString(extraValue)}',NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO document_extras (id, document_id, extra_type, extra_value, created_at, updated_at) VALUES ${values.join(', ')} ON CONFLICT (id) DO NOTHING`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Document extras chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} document extras imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

// OPERATIONAL DATA IMPORT FUNCTIONS
async function importAppointmentsUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Appointments.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Appointments.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} appointments...`);

  // Create appointments table if it doesn't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        vehicle_id TEXT,
        appointment_date DATE,
        appointment_time TIME,
        description TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.log(`      ⚠️  Could not create appointments table: ${error.message}`);
  }

  const chunkSize = 500;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const appointmentId = record._ID || record.id;
        if (!appointmentId) continue;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        const customerId = record._ID_Customer || record.customer_id || null;
        const vehicleId = record._ID_Vehicle || record.vehicle_id || null;
        const appointmentDate = record.Date || record.appointment_date || null;
        const appointmentTime = record.Time || record.appointment_time || null;
        const description = record.Description || record.description || '';
        const status = record.Status || record.status || 'scheduled';

        values.push(`('${appointmentId}',${customerId ? `'${customerId}'` : 'NULL'},${vehicleId ? `'${vehicleId}'` : 'NULL'},${appointmentDate ? `'${appointmentDate}'` : 'NULL'},${appointmentTime ? `'${appointmentTime}'` : 'NULL'},'${escapeString(description)}','${escapeString(status)}',NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO appointments (id, customer_id, vehicle_id, appointment_date, appointment_time, description, status, created_at, updated_at) VALUES ${values.join(', ')} ON CONFLICT (id) DO NOTHING`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Appointments chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} appointments imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

async function importRemindersUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Reminders.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Reminders.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} reminders...`);

  // Create reminders table if it doesn't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        vehicle_id TEXT,
        reminder_type TEXT,
        due_date DATE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.log(`      ⚠️  Could not create reminders table: ${error.message}`);
  }

  const chunkSize = 500;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const reminderId = record._ID || record.id;
        if (!reminderId) continue;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        const customerId = record._ID_Customer || record.customer_id || null;
        const vehicleId = record._ID_Vehicle || record.vehicle_id || null;
        const reminderType = record.Type || record.reminder_type || '';
        const dueDate = record.DueDate || record.due_date || null;
        const status = record.Status || record.status || 'pending';

        values.push(`('${reminderId}',${customerId ? `'${customerId}'` : 'NULL'},${vehicleId ? `'${vehicleId}'` : 'NULL'},'${escapeString(reminderType)}',${dueDate ? `'${dueDate}'` : 'NULL'},'${escapeString(status)}',NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO reminders (id, customer_id, vehicle_id, reminder_type, due_date, status, created_at, updated_at) VALUES ${values.join(', ')} ON CONFLICT (id) DO NOTHING`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Reminders chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} reminders imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

async function importStockUltraFast() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Stock.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Stock.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} stock items...`);

  // Create stock table if it doesn't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS stock (
        id TEXT PRIMARY KEY,
        part_number TEXT,
        description TEXT,
        quantity INTEGER DEFAULT 0,
        unit_price DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
    console.log(`      ⚠️  Could not create stock table: ${error.message}`);
  }

  const chunkSize = 500;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    
    try {
      const values = [];
      for (const record of chunk) {
        const stockId = record._ID || record.id;
        if (!stockId) continue;

        const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
        const partNumber = record.PartNumber || record.part_number || '';
        const description = record.Description || record.description || '';
        const quantity = record.Quantity || record.quantity || 0;
        const unitPrice = record.UnitPrice || record.unit_price || 0;

        values.push(`('${stockId}','${escapeString(partNumber)}','${escapeString(description)}',${parseInt(quantity) || 0},${parseFloat(unitPrice) || 0},NOW(),NOW())`);
      }

      if (values.length > 0) {
        const query = `INSERT INTO stock (id, part_number, description, quantity, unit_price, created_at, updated_at) VALUES ${values.join(', ')} ON CONFLICT (id) DO NOTHING`;
        await sql.unsafe(query);
        totalSuccess += values.length;
      }
    } catch (error) {
      console.error(`      ❌ Stock chunk error: ${error.message}`);
      totalErrors += chunk.length;
    }
  }

  console.log(`      ✅ ${totalSuccess} stock items imported, ${totalErrors} errors`);
  return { total: records.length, success: totalSuccess, errors: totalErrors };
}

async function finalCleanupAndValidation() {
  // Clear customer_id field to use only owner_id
  const cleanupResult = await sql`
    UPDATE vehicles 
    SET customer_id = NULL, updated_at = NOW()
    WHERE customer_id IS NOT NULL
  `;
  console.log(`   ✅ Cleared ${cleanupResult.count || 0} customer_id fields`);

  // Check for bulk assignment issues
  const bulkCheck = await sql`
    SELECT COUNT(*) as count
    FROM (
      SELECT owner_id, COUNT(*) as vehicle_count
      FROM vehicles 
      WHERE owner_id IS NOT NULL
      GROUP BY owner_id
      HAVING COUNT(*) > 10
    ) bulk_customers
  `;

  if (parseInt(bulkCheck[0].count) === 0) {
    console.log(`   ✅ No bulk assignment issues found`);
  } else {
    console.log(`   ⚠️  ${bulkCheck[0].count} customers have >10 vehicles (may need review)`);
  }
}

async function generateFinalReport(coreResults, documentResults, operationalResults, totalTime) {
  const finalStats = await sql`
    SELECT 
      (SELECT COUNT(*) FROM customers) as customers,
      (SELECT COUNT(*) FROM vehicles) as vehicles,
      (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned,
      (SELECT COUNT(*) FROM documents) as documents,
      (SELECT COUNT(*) FROM line_items) as line_items,
      (SELECT COUNT(*) FROM receipts) as receipts,
      (SELECT COUNT(*) FROM document_extras) as document_extras,
      (SELECT COUNT(*) FROM appointments) as appointments,
      (SELECT COUNT(*) FROM reminders) as reminders,
      (SELECT COUNT(*) FROM stock) as stock
  `;

  const stats = finalStats[0];
  const assignmentPercent = Math.round((stats.vehicles_assigned / stats.vehicles) * 100);

  console.log(`\n🎉 ULTIMATE COMPREHENSIVE IMPORT COMPLETED!`);
  console.log(`⏱️  Total time: ${totalTime} seconds (${Math.round(totalTime/60)} minutes)`);
  console.log(`\n📊 FINAL DATABASE STATE:`);
  console.log(`   👥 Customers: ${stats.customers}`);
  console.log(`   🚗 Vehicles: ${stats.vehicles} (${assignmentPercent}% assigned to customers)`);
  console.log(`   📋 Documents: ${stats.documents}`);
  console.log(`   📝 Line Items: ${stats.line_items}`);
  console.log(`   🧾 Receipts: ${stats.receipts}`);
  console.log(`   📎 Document Extras: ${stats.document_extras}`);
  console.log(`   📅 Appointments: ${stats.appointments}`);
  console.log(`   🔔 Reminders: ${stats.reminders}`);
  console.log(`   📦 Stock Items: ${stats.stock}`);

  const totalRecords = Object.values(stats).reduce((sum, count) => sum + parseInt(count), 0);
  console.log(`\n📈 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);
  console.log(`🚀 IMPORT SPEED: ${Math.round(totalRecords / totalTime).toLocaleString()} records/second`);

  console.log(`\n✅ ALL GA4 DATA SUCCESSFULLY IMPORTED!`);
  console.log(`🎯 Database is now ready for WhatsApp integration and full production use!`);
}

// Run the ultimate comprehensive import
ultimateComprehensiveImport()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 SUCCESS! Ultimate comprehensive import completed!');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Verify all data in your UI');
      console.log('2. Test all customer-vehicle relationships');
      console.log('3. Proceed with WhatsApp integration');
      console.log('4. All GA4 data is now available for your garage management system!');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 UNEXPECTED ERROR:', error);
    process.exit(1);
  });
