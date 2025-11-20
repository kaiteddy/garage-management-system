# GarageManager Pro - Clean Import Guide

## Overview
This guide will help you perform a complete clean import of all data from your old system files, ensuring proper job sheet numbering and data integrity.

## 🚨 IMPORTANT: Before You Start
- **Backup your current database** - The clean import process will delete all existing data
- **Ensure your CSV files are accessible** at `/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/`
- **Stop all other processes** that might be accessing the database
- **Allow 30-60 minutes** for the complete process

## Step-by-Step Process

### Phase 1: Backup Current Data
```bash
curl -X POST http://localhost:3002/api/system/clean-import \
  -H "Content-Type: application/json" \
  -d '{"phase": "backup"}'
```

**What this does:**
- Creates timestamped backup tables of all current data
- Preserves customers, vehicles, documents, line items, and MOT history
- Returns backup table names for recovery if needed

**Expected result:** Backup tables created with timestamp

---

### Phase 2: Clear All Data
```bash
curl -X POST http://localhost:3002/api/system/clean-import \
  -H "Content-Type: application/json" \
  -d '{"phase": "clear", "confirmClear": true}'
```

**⚠️ WARNING:** This will delete ALL data from your database!

**What this does:**
- Deletes all records from all tables in correct order
- Resets auto-increment sequences
- Prepares database for fresh import

**Expected result:** Empty database ready for import

---

### Phase 3: Execute Clean Import
```bash
curl -X POST http://localhost:3002/api/system/clean-import \
  -H "Content-Type: application/json" \
  -d '{"phase": "import", "batchSize": 100}'
```

**What this does:**
1. **Import Customers** (~7,000 records)
   - Reads from Customers.csv
   - Creates customer records with proper IDs
   
2. **Import Documents** (~32,000+ records)
   - Reads from Documents.csv
   - Creates invoices, estimates, job sheets
   - Establishes proper numbering sequence
   - Links to customers and creates vehicles
   
3. **Import Line Items** 
   - Reads from LineItems.csv
   - Links detailed work descriptions to documents

**Expected result:** Fully populated database with proper numbering

---

### Phase 4: Verify Import
```bash
curl -X POST http://localhost:3002/api/system/clean-import \
  -H "Content-Type: application/json" \
  -d '{"phase": "verify"}'
```

**What this does:**
- Counts all imported records
- Identifies highest document numbers by type
- Checks data integrity
- Provides next job number for continuity

**Expected result:** Verification report with data quality metrics

---

## After Import: Job Sheet Numbering

Once the clean import is complete, your job sheet system will have:

### ✅ Proper 5-Digit Numbers
- Job numbers formatted as: `00001`, `00002`, `91145`, etc.
- Maintains continuity with your previous system
- Next new job sheet will use the correct sequential number

### ✅ Clean Registration Data
- Invalid registrations (like monetary values) filtered out
- Only proper UK registration formats displayed
- Invalid entries show as "N/A"

### ✅ Correct Sorting
- Job sheets sorted by actual job number (highest first)
- Proper date handling with fallbacks
- Clean customer and vehicle data

---

## Monitoring Progress

### Check Job Sheets API
```bash
curl http://localhost:3002/api/job-sheets | jq '.numbering_info'
```

This will show:
```json
{
  "current_highest": 91144,
  "next_job_number": 91145,
  "next_formatted": "91145"
}
```

### Check Import Status
```bash
curl http://localhost:3002/api/bulk-processing/comprehensive-status
```

---

## Script Cleanup (Optional)

After successful import, you can clean up old import scripts:

```bash
# Analyze current scripts
curl http://localhost:3002/api/system/cleanup-scripts

# Remove deprecated scripts (if desired)
curl -X POST http://localhost:3002/api/system/cleanup-scripts \
  -H "Content-Type: application/json" \
  -d '{"action": "remove_deprecated", "scripts_to_remove": ["documents/import-si80349", "documents/import-simple"]}'
```

---

## Troubleshooting

### If Import Fails
1. **Check the logs** in your terminal running the dev server
2. **Verify CSV file paths** are correct
3. **Ensure sufficient disk space** for the import
4. **Restore from backup** if needed:
   ```sql
   INSERT INTO customers SELECT * FROM customers_backup_[timestamp];
   ```

### If Job Numbers Are Wrong
1. **Re-run verification phase** to check current state
2. **Check document types** in the database
3. **Manually update highest number** if needed

### If Data Is Missing
1. **Check CSV file integrity** 
2. **Verify file permissions** on the Google Drive folder
3. **Re-run specific import phases** as needed

---

## Expected Final Results

After successful clean import:

- **~7,000 customers** properly imported
- **~32,000+ documents** with correct numbering
- **~50,000+ line items** linked to documents
- **Job sheet numbering** continues from highest existing number
- **Clean, consistent data** ready for production use

---

## Recovery Plan

If something goes wrong, you can restore from backup:

```sql
-- Restore customers
DROP TABLE customers;
ALTER TABLE customers_backup_[timestamp] RENAME TO customers;

-- Restore documents  
DROP TABLE documents;
ALTER TABLE documents_backup_[timestamp] RENAME TO documents;

-- Repeat for other tables as needed
```

---

## Next Steps After Import

1. **Test job sheet creation** with new numbers
2. **Verify customer lookups** work correctly
3. **Check MOT reminder functionality**
4. **Update any hardcoded references** to old numbering
5. **Train staff** on new system if needed

---

## Support

If you encounter issues during the import process:

1. **Check server logs** for detailed error messages
2. **Verify all CSV files** are accessible and properly formatted
3. **Ensure database has sufficient resources** for the import
4. **Contact support** with specific error messages if needed

The clean import process is designed to be safe and recoverable, with backups created at each step.
