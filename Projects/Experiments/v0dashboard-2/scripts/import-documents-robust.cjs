const { Pool } = require('pg');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10 // Use a connection pool with 10 connections
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Dropping existing documents table if it exists...');
    await client.query('DROP TABLE IF EXISTS documents CASCADE');
    
    console.log('Creating documents table...');
    await client.query(`
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

    console.log('Creating staging table...');
    await client.query('CREATE TEMP TABLE staging (data JSONB)');

    console.log('Reading CSV file...');
    const fileContent = await readFile('data/Documents.csv', 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      quote: '"',
      escape: '\\',
      relax_quotes: true,
      relax_column_count: true
    });

    console.log(`Processing ${records.length} records...`);
    
    // Process in batches to avoid memory issues
    const batchSize = 1000;
    let processed = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values = batch.map(record => [JSON.stringify(record)]);
      
      await client.query(
        'INSERT INTO staging (data) SELECT * FROM unnest($1::jsonb[])',
        [values.map(v => v[0])]
      );
      
      processed += batch.length;
      console.log(`Processed ${processed} of ${records.length} records...`);
    }

    console.log('Transforming data...');
    await client.query(`
      INSERT INTO documents (
        _id, _id_customer, _id_vehicle, doc_type, doc_number,
        doc_date_created, doc_date_issued, doc_date_paid, doc_status,
        customer_name, customer_company, customer_address, customer_phone, customer_mobile,
        vehicle_make, vehicle_model, vehicle_registration, vehicle_mileage,
        total_gross, total_net, total_tax, status
      )
      SELECT 
        data->>'_ID' as _id,
        data->>'_ID_Customer' as _id_customer,
        data->>'_ID_Vehicle' as _id_vehicle,
        CASE 
          WHEN data->>'docNumber_Invoice' IS NOT NULL THEN 'Invoice'
          WHEN data->>'docNumber_Estimate' IS NOT NULL THEN 'Estimate'
          WHEN data->>'docNumber_Jobsheet' IS NOT NULL THEN 'Jobsheet'
          WHEN data->>'docNumber_Credit' IS NOT NULL THEN 'Credit Note'
          ELSE 'Other'
        END as doc_type,
        COALESCE(
          data->>'docNumber_Invoice',
          data->>'docNumber_Estimate',
          data->>'docNumber_Jobsheet',
          data->>'docNumber_Credit',
          ''
        ) as doc_number,
        CASE WHEN data->>'docDate_Created' ~ '^\d{2}/\d{2}/\d{4}$' 
             THEN to_date(data->>'docDate_Created', 'DD/MM/YYYY') 
             ELSE NULL 
        END as doc_date_created,
        CASE WHEN data->>'docDate_Issued' ~ '^\d{2}/\d{2}/\d{4}$' 
             THEN to_date(data->>'docDate_Issued', 'DD/MM/YYYY') 
             ELSE NULL 
        END as doc_date_issued,
        CASE WHEN data->>'docDate_Paid' ~ '^\d{2}/\d{2}/\d{4}$' 
             THEN to_date(data->>'docDate_Paid', 'DD/MM/YYYY') 
             ELSE NULL 
        END as doc_date_paid,
        data->>'docStatus' as doc_status,
        TRIM(CONCAT_WS(' ',
          NULLIF(data->>'custName_Title', ''),
          NULLIF(data->>'custName_Forename', ''),
          NULLIF(data->>'custName_Surname', '')
        )) as customer_name,
        NULLIF(data->>'custName_Company', '') as customer_company,
        TRIM(CONCAT_WS(', ',
          NULLIF(data->>'custAddress_HouseNo', ''),
          NULLIF(data->>'custAddress_Road', ''),
          NULLIF(data->>'custAddress_Town', ''),
          NULLIF(data->>'custAddress_County', ''),
          NULLIF(data->>'custAddress_PostCode', '')
        )) as customer_address,
        NULLIF(data->>'custCont_Telephone', '') as customer_phone,
        NULLIF(data->>'custCont_Mobile', '') as customer_mobile,
        NULLIF(data->>'vehMake', '') as vehicle_make,
        NULLIF(data->>'vehModel', '') as vehicle_model,
        NULLIF(data->>'vehRegistration', '') as vehicle_registration,
        NULLIF(REGEXP_REPLACE(data->>'vehMileage', '[^0-9]', '', 'g'), '')::int as vehicle_mileage,
        CASE 
          WHEN data->>'us_TotalGROSS' ~ '^-?\d{1,3}(,\d{3})*(\.\d+)?$' OR data->>'us_TotalGROSS' ~ '^-?\d+(\.\d+)?$' 
          THEN COALESCE(NULLIF(REPLACE(REPLACE(data->>'us_TotalGROSS', ',', ''), ' ', ''), '')::numeric, 0) 
          ELSE 0 
        END as total_gross,
        CASE 
          WHEN data->>'us_TotalNET' ~ '^-?\d{1,3}(,\d{3})*(\.\d+)?$' OR data->>'us_TotalNET' ~ '^-?\d+(\.\d+)?$' 
          THEN COALESCE(NULLIF(REPLACE(REPLACE(data->>'us_TotalNET', ',', ''), ' ', ''), '')::numeric, 0) 
          ELSE 0 
        END as total_net,
        CASE 
          WHEN data->>'us_TotalTAX' ~ '^-?\d{1,3}(,\d{3})*(\.\d+)?$' OR data->>'us_TotalTAX' ~ '^-?\d+(\.\d+)?$' 
          THEN COALESCE(NULLIF(REPLACE(REPLACE(data->>'us_TotalTAX', ',', ''), ' ', ''), '')::numeric, 0) 
          ELSE 0 
        END as total_tax,
        COALESCE(data->>'docStatus', 'Unknown') as status
      FROM staging
      WHERE data->>'_ID' IS NOT NULL;
    `);

    console.log('Cleaning up...');
    await client.query('DROP TABLE IF EXISTS staging');
    
    await client.query('COMMIT');
    console.log('Import completed successfully!');
    
    // Get final count
    const countResult = await client.query('SELECT COUNT(*) FROM documents');
    console.log(`Total documents imported: ${countResult.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
