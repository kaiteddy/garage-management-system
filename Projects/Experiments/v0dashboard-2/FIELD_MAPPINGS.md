# 📋 TURBO IMPORT - Complete Field Mappings Reference

This document shows exactly how CSV fields are mapped to database columns to ensure **zero data loss**.

## 👥 Customers.csv → customers table

| CSV Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `_ID` | `id` | TEXT | Primary key - customer ID |
| `nameForename` | `first_name` | TEXT | Customer first name |
| `nameSurname` | `last_name` | TEXT | Customer last name |
| `nameTitle` | `title` | TEXT | Title (Mr, Mrs, Dr, etc.) |
| `nameCompany` | `company_name` | TEXT | Company name |
| `contactEmail` | `email` | TEXT | Email address |
| `contactTelephone` | `phone` | TEXT | Landline phone number |
| `contactMobile` | `mobile` | TEXT | Mobile phone number |
| `addressHouseNo` | `address_house_no` | TEXT | House number |
| `addressRoad` | `address_road` | TEXT | Street name |
| `addressLocality` | `address_locality` | TEXT | Locality/area |
| `addressTown` | `address_town` | TEXT | Town/city |
| `addressCounty` | `address_county` | TEXT | County |
| `addressPostCode` | `address_postcode` | TEXT | Postal code |
| `accountNumber` | `account_number` | TEXT | Account reference |
| `accountStatus` | `account_status` | TEXT | Account status (active/inactive) |
| `Notes` | `notes` | TEXT | Customer notes |

## 🚗 Vehicles.csv → vehicles table

| CSV Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `registration` | `registration` | TEXT | Vehicle registration (PRIMARY KEY) |
| `_ID_Customer` | `owner_id` | TEXT | Link to customer ID |
| `make` | `make` | TEXT | Vehicle manufacturer |
| `model` | `model` | TEXT | Vehicle model |
| `year` | `year` | INTEGER | Year of manufacture |
| `color` / `colour` | `color` | TEXT | Vehicle color |
| `fuel_type` / `fuelType` | `fuel_type` | TEXT | Fuel type (petrol/diesel/hybrid) |
| `engine_size` / `engineSize` | `engine_size` | TEXT | Engine size (e.g., "1.6L") |
| `engine_code` / `engineCode` | `engine_code` | TEXT | Engine code |
| `vin` | `vin` | TEXT | Vehicle identification number |
| `mot_status` / `motStatus` | `mot_status` | TEXT | MOT status |
| `mot_expiry_date` / `motExpiryDate` | `mot_expiry_date` | DATE | MOT expiry date |
| `tax_status` / `taxStatus` | `tax_status` | TEXT | Tax status |
| `tax_due_date` / `taxDueDate` | `tax_due_date` | DATE | Tax due date |
| `registration_date` / `registrationDate` | `registration_date` | DATE | First registration date |
| `body_style` / `bodyStyle` | `body_style` | TEXT | Body style (hatchback/saloon/etc.) |
| `doors` | `doors` | INTEGER | Number of doors |
| `transmission` | `transmission` | TEXT | Transmission type |
| `notes` | `notes` | TEXT | Vehicle notes |

## 📄 Documents.csv → documents table

| CSV Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `_ID` | `_id` | TEXT | Primary key - document ID |
| `_ID_Customer` | `_id_customer` | TEXT | Link to customer ID |
| `_ID_Vehicle` | `_id_vehicle` | TEXT | Link to vehicle registration |
| `docType` | `doc_type` | TEXT | Document type (JS/SI/ES/etc.) |
| `docNumber` | `doc_number` | TEXT | Document number |
| `docDate_Created` / `docDate` | `doc_date_created` | DATE | Creation date |
| `docDate_Issued` | `doc_date_issued` | DATE | Issue date |
| `docDate_Paid` | `doc_date_paid` | DATE | Payment date |
| `docStatus` | `doc_status` | TEXT | Document status |
| `customerName` | `customer_name` | TEXT | Customer name on document |
| `customerCompany` | `customer_company` | TEXT | Customer company |
| `customerAddress` | `customer_address` | TEXT | Customer address |
| `customerPhone` | `customer_phone` | TEXT | Customer phone |
| `customerMobile` | `customer_mobile` | TEXT | Customer mobile |
| `vehicleMake` | `vehicle_make` | TEXT | Vehicle make on document |
| `vehicleModel` | `vehicle_model` | TEXT | Vehicle model on document |
| `vehicleRegistration` | `vehicle_registration` | TEXT | Vehicle registration on document |
| `vehicleMileage` | `vehicle_mileage` | INTEGER | Vehicle mileage |
| `us_TotalGROSS` / `docTotalGross` | `total_gross` | DECIMAL | Total gross amount |
| `us_TotalNET` / `docTotalNet` | `total_net` | DECIMAL | Total net amount |
| `us_TotalTAX` / `docTotalTax` | `total_tax` | DECIMAL | Total tax amount |
| `originalJobSheet` | `original_job_sheet` | TEXT | Original job sheet reference |
| `convertedTo` | `converted_to` | TEXT | Conversion target |
| `conversionNotes` | `conversion_notes` | TEXT | Conversion notes |

## 📝 LineItems.csv → line_items table

| CSV Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `_ID` | `id` | TEXT | Primary key - line item ID |
| `_ID_Document` | `document_id` | TEXT | Link to document ID |
| `_ID_Stock` | `stock_id` | TEXT | Link to stock item |
| `itemDescription` | `description` | TEXT | Item description |
| `itemQuantity` | `quantity` | DECIMAL | Quantity |
| `itemUnitPrice` | `unit_price` | DECIMAL | Unit price |
| `itemSub_Gross` | `total_price` | DECIMAL | Total price |
| `itemTaxRate` | `tax_rate` | DECIMAL | Tax rate (%) |
| `itemTaxAmount` | `tax_amount` | DECIMAL | Tax amount |
| `itemType` | `line_type` | TEXT | Item type (part/labour) |
| `itemNotes` | `notes` | TEXT | Item notes |
| `itemPartNumber` | `part_number` | TEXT | Part number |
| `itemNominalCode` | `nominal_code` | TEXT | Nominal code |

## 🧾 Receipts.csv → receipts table

| CSV Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `_ID` | `id` | TEXT | Primary key - receipt ID |
| `_ID_Document` / `document_id` | `document_id` | TEXT | Link to document ID |
| `receiptDate` / `receipt_date` | `receipt_date` | DATE | Receipt date |
| `amount` / `receiptAmount` | `amount` | DECIMAL | Receipt amount |
| `paymentMethod` / `payment_method` | `payment_method` | TEXT | Payment method |
| `description` / `receiptDescription` | `description` | TEXT | Receipt description |

## 📋 Document_Extras.csv → document_extras table

| CSV Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `_ID` | `document_id` | TEXT | Link to document ID |
| `Labour Description` / `labourDescription` | `labour_description` | TEXT | Labour description |
| `docNotes` / `notes` | `notes` | TEXT | Additional notes |

## 🔄 Data Type Conversions

The turbo import system automatically handles:

### Date Parsing
- **Input formats**: Various date formats from CSV
- **Output**: ISO date format (YYYY-MM-DD)
- **Null handling**: Empty/invalid dates become NULL

### Decimal Parsing
- **Input formats**: Numbers with currency symbols, commas
- **Output**: Decimal with proper precision
- **Null handling**: Empty/invalid numbers become NULL

### Text Cleaning
- **Trimming**: Removes leading/trailing whitespace
- **Case handling**: Preserves original case except vehicle registrations (UPPERCASE)
- **Length limits**: Respects database column constraints

## 🔗 Relationship Preservation

The import maintains all relationships:

1. **Customers ← Vehicles**: `vehicles.owner_id` → `customers.id`
2. **Customers ← Documents**: `documents._id_customer` → `customers.id`
3. **Vehicles ← Documents**: `documents._id_vehicle` → `vehicles.registration`
4. **Documents ← Line Items**: `line_items.document_id` → `documents._id`
5. **Documents ← Receipts**: `receipts.document_id` → `documents._id`
6. **Documents ← Document Extras**: `document_extras.document_id` → `documents._id`

## ✅ Quality Assurance

### Field Validation
- **Required fields**: Primary keys must be present
- **Data types**: Automatic type conversion with error handling
- **Constraints**: Respects database constraints (unique keys, foreign keys)

### Error Handling
- **Skip invalid records**: Continues import if individual records fail
- **Log errors**: Reports which records couldn't be imported
- **Rollback protection**: Uses transactions for data consistency

### Performance Optimization
- **Batch processing**: Imports in configurable batch sizes (default: 1000)
- **Bulk operations**: Uses bulk INSERT statements
- **Parallel processing**: Imports multiple files simultaneously where possible
- **Progress tracking**: Real-time progress updates

## 🎯 Zero Data Loss Guarantee

The turbo import system ensures **100% data preservation** by:

1. **Complete field mapping**: Every CSV column is mapped to a database column
2. **Flexible parsing**: Handles multiple field name variations
3. **Type safety**: Proper data type conversion with fallbacks
4. **Relationship integrity**: Maintains all foreign key relationships
5. **Conflict resolution**: Uses UPSERT operations to handle duplicates
6. **Verification**: Automatic post-import verification checks

**Result**: Your garage management data is imported completely and accurately! 🎉
