
-- DIRECT POSTGRESQL IMPORT SCRIPT
-- Generated: 2025-09-02T15:21:33.067Z

-- Check current state
SELECT 'BEFORE IMPORT - Current counts:' as status;
SELECT 'Vehicles: ' || COUNT(*) FROM vehicles;
SELECT 'Customers: ' || COUNT(*) FROM customers;
SELECT 'Documents: ' || COUNT(*) FROM customer_documents;

-- Import vehicles using COPY (fastest method)
\echo 'Importing vehicles...'
\COPY vehicles(registration, make, model, year, created_at) 
FROM '/Users/adamrutstein/v0dashboard-2/data/vehicles.csv' 
DELIMITER ',' CSV HEADER
ON_ERROR_STOP;

-- Import customers
\echo 'Importing customers...'
\COPY customers(first_name, last_name, phone, email, created_at) 
FROM '/Users/adamrutstein/v0dashboard-2/data/customers.csv' 
DELIMITER ',' CSV HEADER
ON_ERROR_STOP;

-- Import documents
\echo 'Importing documents...'
\COPY customer_documents(doc_number, doc_type, total_gross, _id_customer, vehicle_registration, created_at) 
FROM '/Users/adamrutstein/v0dashboard-2/data/Documents.csv' 
DELIMITER ',' CSV HEADER
ON_ERROR_STOP;

-- Check final state
SELECT 'AFTER IMPORT - Final counts:' as status;
SELECT 'Vehicles: ' || COUNT(*) FROM vehicles;
SELECT 'Customers: ' || COUNT(*) FROM customers;
SELECT 'Documents: ' || COUNT(*) FROM customer_documents;

-- Show sample data
SELECT 'Sample vehicles:' as status;
SELECT registration, make, model FROM vehicles LIMIT 5;

\echo 'Import completed successfully!'
