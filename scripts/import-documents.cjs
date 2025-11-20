const { Pool } = require('pg');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

async function createDocumentsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        _id VARCHAR(255) UNIQUE,
        _id_customer VARCHAR(255),
        _id_vehicle VARCHAR(255),
        doc_type VARCHAR(50),
        doc_number VARCHAR(100),
        doc_date_created DATE,
        doc_date_issued DATE,
        doc_date_paid DATE,
        doc_status VARCHAR(50),
        customer_name VARCHAR(255),
        customer_company VARCHAR(255),
        customer_address TEXT,
        customer_phone VARCHAR(50),
        customer_mobile VARCHAR(50),
        vehicle_make VARCHAR(100),
        vehicle_model VARCHAR(100),
        vehicle_registration VARCHAR(50),
        vehicle_mileage INT,
        total_gross DECIMAL(12, 2),
        total_net DECIMAL(12, 2),
        total_tax DECIMAL(12, 2),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Documents table created or already exists');
  } catch (error) {
    console.error('Error creating documents table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function importDocuments() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read and parse the CSV file
    const fileContent = fs.readFileSync('data/Documents.csv', 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      quote: '"',
      escape: '\\',
      relax_quotes: true,
      relax_column_count: true
    });

    console.log(`Found ${records.length} records in Documents.csv`);

    // Process in batches to avoid memory issues
    const batchSize = 100;
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values = [];
      const valuePlaceholders = [];
      let paramIndex = 1;

      const query = {
        text: `
          INSERT INTO documents (
            _id, _id_customer, _id_vehicle, doc_type, doc_number, 
            doc_date_created, doc_date_issued, doc_date_paid, doc_status,
            customer_name, customer_company, customer_address, customer_phone, customer_mobile,
            vehicle_make, vehicle_model, vehicle_registration, vehicle_mileage,
            total_gross, total_net, total_tax, status
          ) VALUES 
          ${batch.map((_, idx) => {
            const placeholders = [];
            for (let j = 0; j < 21; j++) {
              placeholders.push(`$${paramIndex++}`);
            }
            return `(${placeholders.join(', ')})`;
          }).join(', ')}
          ON CONFLICT (_id) DO UPDATE SET
            _id_customer = EXCLUDED._id_customer,
            _id_vehicle = EXCLUDED._id_vehicle,
            doc_type = EXCLUDED.doc_type,
            doc_number = EXCLUDED.doc_number,
            doc_date_created = EXCLUDED.doc_date_created,
            doc_date_issued = EXCLUDED.doc_date_issued,
            doc_date_paid = EXCLUDED.doc_date_paid,
            doc_status = EXCLUDED.doc_status,
            customer_name = EXCLUDED.customer_name,
            customer_company = EXCLUDED.customer_company,
            customer_address = EXCLUDED.customer_address,
            customer_phone = EXCLUDED.customer_phone,
            customer_mobile = EXCLUDED.customer_mobile,
            vehicle_make = EXCLUDED.vehicle_make,
            vehicle_model = EXCLUDED.vehicle_model,
            vehicle_registration = EXCLUDED.vehicle_registration,
            vehicle_mileage = EXCLUDED.vehicle_mileage,
            total_gross = EXCLUDED.total_gross,
            total_net = EXCLUDED.total_net,
            total_tax = EXCLUDED.total_tax,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `,
        values: []
      };

      for (const record of batch) {
        // Format address
        const addressParts = [
          record.custAddress_HouseNo,
          record.custAddress_Road,
          record.custAddress_Town,
          record.custAddress_County,
          record.custAddress_PostCode
        ].filter(Boolean).join(', ');

        // Determine document type
        let docType = 'Other';
        if (record.docNumber_Invoice) docType = 'Invoice';
        else if (record.docNumber_Estimate) docType = 'Estimate';
        else if (record.docNumber_Jobsheet) docType = 'Jobsheet';
        else if (record.docNumber_Credit) docType = 'Credit Note';

        // Add values to the query
        query.values.push(
          record._ID || null,
          record._ID_Customer || null,
          record._ID_Vehicle || null,
          docType,
          record.docNumber_Invoice || record.docNumber_Estimate || record.docNumber_Jobsheet || record.docNumber_Credit || null,
          record.docDate_Created ? new Date(record.docDate_Created) : null,
          record.docDate_Issued ? new Date(record.docDate_Issued) : null,
          record.docDate_Paid ? new Date(record.docDate_Paid) : null,
          record.docStatus || null,
          [record.custName_Title, record.custName_Forename, record.custName_Surname].filter(Boolean).join(' ').trim() || null,
          record.custName_Company || null,
          addressParts || null,
          record.custCont_Telephone || null,
          record.custCont_Mobile || null,
          record.vehMake || null,
          record.vehModel || null,
          record.vehRegistration || null,
          record.vehMileage ? parseInt(record.vehMileage.replace(/[^0-9]/g, '')) || null : null,
          record.us_TotalGROSS ? parseFloat(record.us_TotalGROSS) || 0 : 0,
          record.us_TotalNET ? parseFloat(record.us_TotalNET) || 0 : 0,
          record.us_TotalTAX ? parseFloat(record.us_TotalTAX) || 0 : 0,
          record.docStatus || 'Unknown'
        );
      }

      try {
        const result = await pool.query(query);
        importedCount += result.rowCount || 0;
        console.log(`Imported batch ${i / batchSize + 1}/${Math.ceil(records.length / batchSize)}: ${importedCount} documents`);
      } catch (error) {
        console.error(`Error importing batch starting at row ${i + 1}:`, error);
        skippedCount += batch.length;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`- Successfully imported: ${importedCount} documents`);
    console.log(`- Skipped: ${skippedCount} documents`);

  } catch (error) {
    console.error('Error importing documents:', error);
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await createDocumentsTable();
    await importDocuments();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
