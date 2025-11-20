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
    await pool.query('DROP TABLE IF EXISTS documents CASCADE');
    
    await pool.query(`
      CREATE TABLE documents (
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
    console.log('Documents table created');
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
    ssl: { rejectUnauthorized: false },
    max: 10 // Use a connection pool with 10 connections
  });

  try {
    // Read and parse the CSV file
    console.log('Reading CSV file...');
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

    // Process records one by one to avoid batch issues
    let importedCount = 0;
    let errorCount = 0;
    const batchSize = 1000;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Skip if no ID
      if (!record._ID) {
        errorCount++;
        continue;
      }

      try {
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
        let docNumber = '';
        
        if (record.docNumber_Invoice) {
          docType = 'Invoice';
          docNumber = record.docNumber_Invoice;
        } else if (record.docNumber_Estimate) {
          docType = 'Estimate';
          docNumber = record.docNumber_Estimate;
        } else if (record.docNumber_Jobsheet) {
          docType = 'Jobsheet';
          docNumber = record.docNumber_Jobsheet;
        } else if (record.docNumber_Credit) {
          docType = 'Credit Note';
          docNumber = record.docNumber_Credit;
        }

        // Format customer name
        const customerName = [
          record.custName_Title,
          record.custName_Forename,
          record.custName_Surname
        ].filter(Boolean).join(' ').trim() || null;

        // Parse numeric values safely
        const totalGross = parseFloat(record.us_TotalGROSS) || 0;
        const totalNet = parseFloat(record.us_TotalNET) || 0;
        const totalTax = parseFloat(record.us_TotalTAX) || 0;
        
        const vehicleMileage = record.vehMileage ? 
          parseInt(record.vehMileage.replace(/[^0-9]/g, '')) || null : null;

        // Insert or update the document
        const query = {
          text: `
            INSERT INTO documents (
              _id, _id_customer, _id_vehicle, doc_type, doc_number, 
              doc_date_created, doc_date_issued, doc_date_paid, doc_status,
              customer_name, customer_company, customer_address, customer_phone, customer_mobile,
              vehicle_make, vehicle_model, vehicle_registration, vehicle_mileage,
              total_gross, total_net, total_tax, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
          values: [
            record._ID,
            record._ID_Customer || null,
            record._ID_Vehicle || null,
            docType,
            docNumber || null,
            record.docDate_Created ? new Date(record.docDate_Created) : null,
            record.docDate_Issued ? new Date(record.docDate_Issued) : null,
            record.docDate_Paid ? new Date(record.docDate_Paid) : null,
            record.docStatus || null,
            customerName,
            record.custName_Company || null,
            addressParts || null,
            record.custCont_Telephone || null,
            record.custCont_Mobile || null,
            record.vehMake || null,
            record.vehModel || null,
            record.vehRegistration || null,
            vehicleMileage,
            totalGross,
            totalNet,
            totalTax,
            record.docStatus || 'Unknown'
          ]
        };

        await pool.query(query);
        importedCount++;

        // Log progress
        if (importedCount % batchSize === 0) {
          console.log(`Processed ${importedCount} documents...`);
        }
      } catch (error) {
        console.error(`Error importing document ${i + 1} (ID: ${record._ID}):`, error.message);
        errorCount++;
      }
    }

    console.log('\nImport complete!');
    console.log(`- Successfully imported: ${importedCount} documents`);
    console.log(`- Failed to import: ${errorCount} documents`);

  } catch (error) {
    console.error('Error in import process:', error);
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
