# 🚀 TURBO IMPORT - Lightning Fast Data Import System

Import ALL your garage management data in **SECONDS** with parallel processing and bulk operations!

## ⚡ Quick Start

### Option 1: Command Line (Recommended)
```bash
# Import all data
npm run turbo-import

# Verify the import
npm run turbo-verify
```

### Option 2: Web API
```bash
# Start the development server
npm run dev

# Trigger import via API
curl -X POST http://localhost:3000/api/turbo-import

# Check status
curl http://localhost:3000/api/turbo-import/status
```

## 📁 Required Files

Place these CSV files in your Google Drive export folder:
```
/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/
├── Customers.csv
├── Vehicles.csv
├── Documents.csv
├── LineItems.csv
├── Receipts.csv
└── Document_Extras.csv
```

## 🎯 Features

- **⚡ Lightning Fast**: Imports thousands of records in seconds
- **🔄 Parallel Processing**: Multiple files imported simultaneously
- **📦 Bulk Operations**: Batch inserts for maximum speed
- **🔍 Real-time Progress**: Live progress tracking
- **✅ Instant Verification**: Automatic data integrity checks
- **🔗 Smart Dependencies**: Imports in correct order (customers → vehicles → documents → line items)
- **🛡️ Error Handling**: Graceful error recovery and reporting

## 📊 What Gets Imported

| File | Records | Features | CSV Fields Mapped |
|------|---------|----------|-------------------|
| **Customers.csv** | ~7,000+ | Names, contact info, addresses | `_ID`, `nameForename`, `nameSurname`, `nameTitle`, `nameCompany`, `contactEmail`, `contactTelephone`, `contactMobile`, `addressHouseNo`, `addressRoad`, `addressLocality`, `addressTown`, `addressCounty`, `addressPostCode`, `accountNumber`, `accountStatus`, `Notes` |
| **Vehicles.csv** | ~5,000+ | Registrations, make/model, MOT dates | `registration`, `_ID_Customer`, `make`, `model`, `year`, `color`, `fuel_type`, `engine_size`, `engine_code`, `vin`, `mot_status`, `mot_expiry_date`, `tax_status`, `tax_due_date`, `registration_date`, `body_style`, `doors`, `transmission`, `notes` |
| **Documents.csv** | ~50,000+ | Job sheets, invoices, estimates | `_ID`, `_ID_Customer`, `_ID_Vehicle`, `docType`, `docNumber`, `docDate_Created`, `docDate_Issued`, `docDate_Paid`, `docStatus`, `customerName`, `customerCompany`, `customerAddress`, `customerPhone`, `customerMobile`, `vehicleMake`, `vehicleModel`, `vehicleRegistration`, `vehicleMileage`, `us_TotalGROSS`, `us_TotalNET`, `us_TotalTAX` |
| **LineItems.csv** | ~200,000+ | Service items, parts, labor | `_ID`, `_ID_Document`, `_ID_Stock`, `itemDescription`, `itemQuantity`, `itemUnitPrice`, `itemSub_Gross`, `itemTaxRate`, `itemTaxAmount`, `itemType`, `itemNotes`, `itemPartNumber`, `itemNominalCode` |
| **Receipts.csv** | ~10,000+ | Payment records | `_ID`, `_ID_Document`, `receiptDate`, `amount`, `paymentMethod`, `description` |
| **Document_Extras.csv** | ~5,000+ | Additional document data | `_ID`, `Labour Description`, `docNotes` |

## 🔍 Verification Checks

The system automatically verifies:
- ✅ **Record counts** match expectations (customers > 1000, vehicles > 1000, etc.)
- ✅ **Data integrity** - no missing critical data (customer names, vehicle registrations, document types)
- ✅ **Relationships** are properly linked (vehicles → customers, documents → customers, line items → documents)
- ✅ **Job sheets** are correctly imported (documents with `docType` = 'JS', 'JOB', etc.)
- ✅ **Sample data** inspection shows real data, not test records
- ✅ **Field mappings** preserve all original CSV data with proper type conversion

## ⏱️ Performance

**Expected Import Times:**
- Small dataset (1K records): **< 5 seconds**
- Medium dataset (10K records): **< 15 seconds**
- Large dataset (100K+ records): **< 60 seconds**

**Speed**: ~5,000-10,000 records per second

## 🛠️ Troubleshooting

### File Not Found
```bash
Error: File not found: /path/to/Customers.csv
```
**Solution**: Check that CSV files are in the correct Google Drive folder

### Database Connection Error
```bash
Error: Connection failed
```
**Solution**: Verify DATABASE_URL in .env.local is correct

### Import Incomplete
```bash
Warning: Customer count seems low
```
**Solution**: Check CSV file format and run verification

### Zero Job Sheets
```bash
⚠️ No job sheets found - check document type mapping
```
**Solution**: Verify Documents.csv has records with doc_type 'JS', 'JOB', etc.

## 🔧 Advanced Usage

### Custom Data Path
Edit `scripts/turbo-import.ts` and change:
```typescript
const CONFIG = {
  DATA_PATH: '/your/custom/path/to/csv/files',
  // ...
}
```

### Batch Size Tuning
For very large datasets, adjust batch size:
```typescript
const CONFIG = {
  BATCH_SIZE: 2000, // Increase for more memory, decrease for stability
  // ...
}
```

### Skip Data Clearing
To append data instead of replacing:
```typescript
// Comment out this line in turbo-import.ts
// await this.clearExistingData()
```

## 📈 Monitoring

### Real-time Status
```bash
curl http://localhost:3000/api/turbo-import/status
```

### Health Check
```json
{
  "health": {
    "score": 100,
    "status": "excellent",
    "checks": {
      "has_data": true,
      "has_customers": true,
      "has_vehicles": true,
      "has_documents": true,
      "has_relationships": true
    }
  },
  "ready_for_use": true
}
```

## 🎉 Success!

When you see this, your garage management system is ready:

```
🎉 IMPORT COMPLETED!
============================================================
⏱️  Total time: 45.2s
✅ Customers.csv: 7,234/7,234 (8,450ms)
✅ Vehicles.csv: 5,891/5,891 (6,230ms)
✅ Documents.csv: 52,103/52,103 (18,940ms)
✅ LineItems.csv: 198,445/198,445 (12,180ms)
============================================================
📊 Total: 263,673/263,673 records imported
⚡ Speed: 5,834 records/second
```

## 🚀 Next Steps

After successful import:

1. **Visit your dashboard**: http://localhost:3000
2. **Check job sheets**: http://localhost:3000/job-sheets
3. **View customers**: http://localhost:3000/customers
4. **Test MOT reminders**: http://localhost:3000/mot-reminders

Your garage management system is now fully operational! 🎯
