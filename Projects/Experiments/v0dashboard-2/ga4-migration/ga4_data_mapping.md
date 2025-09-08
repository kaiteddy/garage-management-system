# GA4 Data Migration Mapping Strategy

## Overview
This document outlines the mapping strategy for migrating data from GA4 CSV exports to the new normalized database schema.

## Data Quality Summary
- **Total Records**: 200,433 across all tables
- **Primary Key Integrity**: 100% - No empty or duplicate primary keys found
- **Referential Integrity**: 99.9%+ - Excellent data quality
- **Encoding**: Mixed (latin-1 for large tables, utf-8 for smaller ones)

## Table-by-Table Mapping

### 1. CUSTOMERS Table Migration

**Source**: `Customers.csv` (7,143 records)
**Target**: `customers` table

| Source Field | Target Field | Transformation | Notes |
|--------------|--------------|----------------|-------|
| `_ID` | `legacy_id` | Direct copy | Preserve original ID |
| `AccountNumber` | `account_number` | Direct copy | |
| `nameTitle` | `title` | Direct copy | |
| `nameForename` | `forename` | Direct copy | |
| `nameSurname` | `surname` | Direct copy | Required field |
| `nameCompany` | `company_name` | Direct copy | |
| `contactEmail` | `email` | Direct copy | |
| `contactTelephone` | `telephone` | Direct copy | |
| `contactMobile` | `mobile` | Extract mobile number | Parse "07846653685 MARIA" format |
| `contactNoEmail` | `no_email` | Convert to boolean | "1" → true, "0" → false |
| `addressHouseNo` | `house_no` | Direct copy | |
| `addressRoad` | `road` | Direct copy | |
| `addressLocality` | `locality` | Direct copy | |
| `addressTown` | `town` | Direct copy | |
| `addressCounty` | `county` | Direct copy | |
| `addressPostCode` | `postcode` | Direct copy | |
| `classification` | `classification` | Direct copy | |
| `HowFoundUs` | `how_found_us` | Direct copy | |
| `regularCustomer` | `regular_customer` | Convert to boolean | |
| `AccountHeld` | `account_held` | Convert to boolean | |
| `AccountCreditLimit` | `credit_limit` | Convert to decimal | |
| `AccountCreditTerms` | `credit_terms` | Convert to integer | |
| `rates_ForceTaxFree` | `force_tax_free` | Convert to boolean | |
| `rates_LabourRate` | `labour_rate` | Convert to decimal | |
| `rates_LabourDiscountPercent` | `labour_discount_percent` | Convert to decimal | |
| `rates_PartsDiscountPercent` | `parts_discount_percent` | Convert to decimal | |
| `rates_TradeParts` | `trade_parts` | Convert to boolean | |
| `remindersAllowed` | `reminders_allowed` | Convert to boolean | |
| `status_LastInvoiceDate` | `last_invoice_date` | Parse date | Format: DD/MM/YYYY |
| `sys_TimeStamp_Creation` | `created_at` | Parse timestamp | Format: DD/MM/YYYY HH:MM:SS |
| `sys_TimeStamp_Modification` | `updated_at` | Parse timestamp | |
| `Notes` | `notes` | Direct copy | |

**Additional Customer Contacts**: Extract from `AdditionalContactName1-3` and `AdditionalContactNumber1-3` into `customer_contacts` table.

### 2. VEHICLES Table Migration

**Source**: `Vehicles.csv` (10,550 records)
**Target**: `vehicles` table

| Source Field | Target Field | Transformation | Notes |
|--------------|--------------|----------------|-------|
| `_ID` | `legacy_id` | Direct copy | |
| `_ID_Customer` | `customer_id` | Lookup customer UUID | Join on customers.legacy_id |
| `Registration` | `registration` | Direct copy | |
| `_RegID` | `registration_id` | Direct copy | Legacy field |
| `VIN` | `vin` | Direct copy | |
| `Make` | `make` | Direct copy | |
| `Model` | `model` | Direct copy | |
| `Colour` | `colour` | Direct copy | |
| `DateofReg` | `date_of_registration` | Parse date | Format: DD/MM/YYYY |
| `DateofManufacture` | `date_of_manufacture` | Parse date | |
| `TypeofVehicle` | `vehicle_type` | Direct copy | |
| `BodyStyle` | `body_style` | Direct copy | |
| `EngineCC` | `engine_cc` | Convert to integer | |
| `EngineCode` | `engine_code` | Direct copy | |
| `EngineNo` | `engine_no` | Direct copy | |
| `FuelType` | `fuel_type` | Direct copy | |
| `CylinderCount` | `cylinders` | Convert to integer | |
| `ValveCount` | `valve_count` | Convert to integer | |
| `Power_MaxBHP` | `power_bhp` | Convert to decimal | |
| `Power_MaxKW` | `power_kw` | Convert to decimal | |
| `MaxTorqueatNm` | `torque_nm` | Convert to decimal | |
| `MaxTorqueatLbFt` | `torque_lbft` | Convert to decimal | |
| `CO2` | `co2_emissions` | Convert to integer | |
| `EuroStatus` | `euro_status` | Direct copy | |
| `Widthmm` | `width_mm` | Convert to integer | |
| `Heightmm` | `height_mm` | Convert to integer | |
| `KerbWeightMin` | `kerb_weight_min` | Convert to integer | |
| `KerbWeightMax` | `kerb_weight_max` | Convert to integer | |
| `KeyCode` | `key_code` | Direct copy | |
| `RadioCode` | `radio_code` | Direct copy | |
| `Paintcode` | `paint_code` | Direct copy | |
| `Transmission` | `transmission` | Direct copy | |
| `DriveType` | `drive_type` | Direct copy | |
| `status_LastInvoiceDate` | `last_invoice_date` | Parse date | |
| `Notes` | `notes` | Direct copy | |
| `Notes_Reminders` | `reminder_notes` | Direct copy | |

### 3. DOCUMENTS Table Migration

**Source**: `Documents.csv` (33,196 records)
**Target**: `documents` table

| Source Field | Target Field | Transformation | Notes |
|--------------|--------------|----------------|-------|
| `_ID` | `legacy_id` | Direct copy | |
| `_ID_Customer` | `customer_id` | Lookup customer UUID | |
| `_ID_Vehicle` | `vehicle_id` | Lookup vehicle UUID | |
| `_ID_Appointment` | `appointment_id` | Lookup appointment UUID | |
| `docType` | `document_type` | Map to enum | Map values to enum |
| `docNumber_Invoice` | `document_number` | Use appropriate number | Based on document type |
| `docOrderRef` | `order_reference` | Direct copy | |
| `docDate_Created` | `created_date` | Parse date | |
| `docDate_Issued` | `issued_date` | Parse date | |
| `docDate_DueBy` | `due_date` | Parse date | |
| `docDate_Paid` | `paid_date` | Parse date | |
| `docDate_Expires_ES` | `expires_date` | Parse date | |
| `docStatus` | `status` | Map to enum | |
| `docStatus_Printed` | `printed` | Convert to boolean | |
| `docStatus_Emailed` | `emailed` | Convert to boolean | |
| `docStatus_Exported` | `exported` | Convert to boolean | |
| `docStatus_Reconciled` | `reconciled` | Convert to boolean | |
| Financial fields | Various totals | Convert to decimal | Multiple NET/TAX/GROSS fields |
| `discountGlobal_*` | Discount fields | Convert to decimal | |
| `vehRegistration` | `vehicle_registration` | Direct copy | |
| `vehMake` | `vehicle_make` | Direct copy | |
| `vehModel` | `vehicle_model` | Direct copy | |
| `vehMileage` | `vehicle_mileage` | Convert to integer | |
| Staff fields | Staff assignments | Direct copy | |
| MOT fields | MOT information | Various conversions | |
| `docTermsandConditions` | `terms_and_conditions` | Direct copy | |

### 4. LINE_ITEMS Table Migration

**Source**: `LineItems.csv` (90,636 records)
**Target**: `line_items` table

| Source Field | Target Field | Transformation | Notes |
|--------------|--------------|----------------|-------|
| `_ID` | `legacy_id` | Direct copy | |
| `_ID_Document` | `document_id` | Lookup document UUID | |
| `_ID_Stock` | `stock_id` | Lookup stock UUID | May be null |
| `itemType` | `item_type` | Direct copy | |
| `itemDescription` | `description` | Direct copy | |
| `itemPartNumber` | `part_number` | Direct copy | |
| `itemQuantity` | `quantity` | Convert to decimal | |
| `itemUnitCost` | `unit_cost` | Convert to decimal | |
| `itemUnitPrice` | `unit_price` | Convert to decimal | |
| `itemDiscount` | `discount_percent` | Convert to decimal | |
| `itemSub_Net` | `line_net` | Convert to decimal | |
| `itemSub_Tax` | `line_tax` | Convert to decimal | |
| `itemSub_Gross` | `line_gross` | Convert to decimal | |
| `itemTaxCode` | `tax_code` | Direct copy | |
| `itemTaxRate` | `tax_rate` | Convert to decimal | |
| `itemTaxInclusive` | `tax_inclusive` | Convert to boolean | |
| `itemSupplier` | `supplier` | Direct copy | |
| `itemSupplier_Invoice` | `supplier_invoice` | Direct copy | |
| `itemSupplier_PurchaseDate` | `purchase_date` | Parse date | |
| `itemGuarantee` | `guarantee_period` | Convert to integer | |
| `itemGuarantee_Notes` | `guarantee_notes` | Direct copy | |
| `itemNominalCode` | `nominal_code` | Direct copy | |
| `technician` | `technician` | Direct copy | |

### 5. Additional Tables

**STOCK_ITEMS**: Map from `Stock.csv` (267 records)
**APPOINTMENTS**: Map from `Appointments.csv` (92 records)  
**RECEIPTS**: Map from `Receipts.csv` (24,758 records)
**REMINDERS**: Map from `Reminders.csv` (11,668 records)
**REMINDER_TEMPLATES**: Map from `Reminder_Templates.csv` (7 records)

## Data Transformation Rules

### Date Parsing
- **Input Format**: DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
- **Output Format**: ISO 8601 (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
- **Null Handling**: Empty strings → NULL

### Boolean Conversion
- **Input**: "1", "0", "True", "False", empty string
- **Output**: true, false, NULL
- **Default**: false for most fields

### Decimal Conversion
- **Input**: String numbers, may contain commas
- **Processing**: Remove commas, convert to decimal
- **Precision**: Maintain appropriate decimal places
- **Null Handling**: Empty strings → 0 or NULL as appropriate

### Text Field Handling
- **Encoding**: Handle mixed latin-1/utf-8 encoding
- **Cleanup**: Trim whitespace, handle special characters
- **Length**: Truncate if exceeds target field length

### Foreign Key Resolution
1. **Load Reference Tables First**: customers, vehicles, stock_items
2. **Create Mapping Tables**: legacy_id → new UUID
3. **Resolve References**: Use mapping tables during dependent table loads
4. **Handle Missing References**: Log warnings, set to NULL if allowed

## Migration Order

1. **Reference Data**: suppliers, reminder_templates
2. **Core Entities**: customers, vehicles, stock_items  
3. **Business Processes**: appointments, documents
4. **Dependent Data**: line_items, receipts, reminders, customer_contacts

## Data Validation Rules

### Pre-Migration Validation
- Check for required fields
- Validate foreign key references
- Check data type compatibility
- Identify potential data truncation

### Post-Migration Validation
- Verify record counts match
- Check referential integrity
- Validate calculated totals
- Spot-check sample records

## Error Handling Strategy

1. **Validation Errors**: Log and continue with defaults
2. **Data Type Errors**: Attempt conversion, log failures
3. **Foreign Key Errors**: Set to NULL if allowed, log warnings
4. **Critical Errors**: Stop migration, require manual intervention

## Performance Considerations

- **Batch Processing**: Process in chunks of 1,000 records
- **Indexing**: Create indexes after data load
- **Constraints**: Add foreign key constraints after all data loaded
- **Parallel Processing**: Load independent tables in parallel
