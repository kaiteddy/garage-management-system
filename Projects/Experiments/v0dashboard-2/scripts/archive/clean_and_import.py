import csv
import re

# Function to clean text by removing non-printable characters
def clean_text(text):
    if not text:
        return ""
    # Remove non-printable characters except spaces, letters, numbers, and common punctuation
    return re.sub(r'[^\x20-\x7E]', '', str(text))

# Clean the Customers CSV
input_file = '/Users/service/Desktop/Customers.csv'
output_file = '/Users/service/Desktop/Customers_cleaned.csv'

with open(input_file, 'r', encoding='utf-8', errors='replace') as infile, \
     open(output_file, 'w', encoding='utf-8', newline='') as outfile:
    
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames
    
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    
    for row in reader:
        cleaned_row = {k: clean_text(v) for k, v in row.items()}
        writer.writerow(cleaned_row)

print(f"Cleaned CSV saved to {output_file}")

# Now let's create a SQL file to import the cleaned data
with open('/Users/service/v0dashboard/v0dashboard/import_cleaned_customers.sql', 'w', encoding='utf-8') as sql_file:
    sql_file.write("""
-- Create a temporary table to stage the data
CREATE TEMP TABLE temp_customers (
    _ID TEXT,
    _ID_Delivery_InFocus TEXT,
    _ID_Template TEXT,
    _ID_VehicleInFocus TEXT,
    AccountCreditLimit TEXT,
    AccountCreditTerms TEXT,
    AccountHeld TEXT,
    AccountNumber TEXT,
    AccountStatus TEXT,
    addressCounty TEXT,
    addressHouseNo TEXT,
    addressLocality TEXT,
    addressPostCode TEXT,
    addressRoad TEXT,
    addressTown TEXT,
    classification TEXT,
    contactEmail TEXT,
    contactMobile TEXT,
    contactNoEmail TEXT,
    contactTelephone TEXT,
    HowFoundUs TEXT,
    nameCompany TEXT,
    nameForename TEXT,
    nameSurname TEXT,
    nameTitle TEXT,
    rates_ForceTaxFree TEXT,
    rates_LabourDiscountPercent TEXT,
    rates_LabourRate TEXT,
    rates_PartsDiscountPercent TEXT,
    rates_TradeParts TEXT,
    regularCustomer TEXT,
    remindersAllowed TEXT,
    status_LastInvoiceDate TEXT,
    sys_TimeStamp_Creation TEXT,
    sys_TimeStamp_Modification TEXT,
    AdditionalContactName1 TEXT,
    AdditionalContactName2 TEXT,
    AdditionalContactName3 TEXT,
    AdditionalContactNumber1 TEXT,
    AdditionalContactNumber2 TEXT,
    AdditionalContactNumber3 TEXT,
    FurtherInfo_1 TEXT,
    FurtherInfo_2 TEXT,
    FurtherInfo_3 TEXT,
    Notes TEXT
);

-- Import the cleaned CSV data into the temporary table
\copy temp_customers FROM '/Users/service/Desktop/Customers_cleaned.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Insert the data into the actual customers table
-- Since the database expects an auto-incrementing ID, we'll let it generate one
-- and store the original _ID in an external_id column if it exists, or in a comment if not
INSERT INTO customers (
    name, 
    email, 
    phone, 
    address, 
    created_at, 
    updated_at
)
SELECT 
    COALESCE(
        NULLIF(TRIM(
            CONCAT_WS(' ', 
                NULLIF(TRIM(nameTitle), ''), 
                NULLIF(TRIM(nameForename), ''), 
                NULLIF(TRIM(nameSurname), '')
            )
        ), ''),
        COALESCE(NULLIF(TRIM(nameCompany), ''), 'Unknown Customer')
    ) AS name,
    NULLIF(TRIM(contactEmail), '') AS email,
    COALESCE(
        NULLIF(TRIM(contactTelephone), ''),
        NULLIF(REGEXP_REPLACE(contactMobile, '[^0-9+]', '', 'g'), '')
    ) AS phone,
    NULLIF(TRIM(
        CONCAT_WS(', ',
            CASE WHEN addressHouseNo IS NOT NULL AND addressHouseNo != '' THEN addressHouseNo END,
            CASE WHEN addressRoad IS NOT NULL AND addressRoad != '' THEN addressRoad END,
            CASE WHEN addressLocality IS NOT NULL AND addressLocality != '' THEN addressLocality END,
            CASE WHEN addressTown IS NOT NULL AND addressTown != '' THEN addressTown END,
            CASE WHEN addressCounty IS NOT NULL AND addressCounty != '' THEN addressCounty END,
            CASE WHEN addressPostCode IS NOT NULL AND addressPostCode != '' THEN addressPostCode END
        )
    ), '') AS address,
    NOW() AS created_at,
    NOW() AS updated_at
FROM temp_customers
-- Skip rows where we can't construct a name
WHERE (
    NULLIF(TRIM(CONCAT_WS(' ', nameTitle, nameForename, nameSurname)), '') IS NOT NULL
    OR NULLIF(TRIM(nameCompany), '') IS NOT NULL
);

-- Clean up
DROP TABLE temp_customers;

-- Show the number of imported records
SELECT COUNT(*) AS imported_customers_count FROM customers;
""")

print("SQL import script created at /Users/service/v0dashboard/v0dashboard/import_cleaned_customers.sql")
print("To run the import, use:")
print("PGPASSWORD=npg_WRqMTuEo65tQ psql -h ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech -U neondb_owner -d neondb -f /Users/service/v0dashboard/v0dashboard/import_cleaned_customers.sql")
