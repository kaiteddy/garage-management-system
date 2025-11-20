# GarageManager Pro - Safe Data Update Guide

## Overview
This guide helps you **safely update and improve** your existing data without removing anything. All operations can be previewed first with dry-run mode.

## 🛡️ Safety Features
- **Dry-run mode** - Preview all changes before applying
- **No data deletion** - Only updates and additions
- **Batch processing** - Process data in small, manageable chunks
- **Detailed logging** - See exactly what will change
- **Rollback capability** - Changes can be reversed if needed

---

## Step-by-Step Safe Update Process

### Phase 1: Analyze Current Data
```bash
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "analyze"}'
```

**What this does:**
- Counts all your current records
- Identifies job numbering issues (short numbers)
- Finds registration data problems (monetary values)
- Shows sample problematic records
- **No changes made** - analysis only

**Expected output:**
```json
{
  "record_counts": {
    "customers": 7234,
    "documents": 32891,
    "vehicles": 8456
  },
  "numbering_analysis": [
    {"doc_type": "ES", "short_numbers": 1250},
    {"doc_type": "SI", "short_numbers": 890}
  ],
  "sample_problems": [
    {"doc_number": "973", "vehicle_registration": "044.73"},
    {"doc_number": "972", "vehicle_registration": "1"}
  ]
}
```

---

### Phase 2: Fix Job Numbering (Preview First)
```bash
# PREVIEW the changes first
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "fix-numbering", "dryRun": true}'
```

**What this shows:**
- Which job numbers will be updated
- Current: "973" → New: "00973"
- Current: "1234" → New: "01234"
- **No actual changes made**

**When you're ready to apply:**
```bash
# APPLY the changes
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "fix-numbering", "dryRun": false}'
```

---

### Phase 3: Fix Registration Data (Preview First)
```bash
# PREVIEW the changes first
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "fix-registrations", "dryRun": true, "batchSize": 100}'
```

**What this shows:**
- Registrations with monetary values: "044.73" → `null`
- Short numbers: "1" → `null`
- Empty strings: "" → `null`
- Valid registrations: "KD54WYL" → unchanged

**When you're ready to apply:**
```bash
# APPLY the changes
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "fix-registrations", "dryRun": false, "batchSize": 100}'
```

---

### Phase 4: Add Missing Data (Preview First)
```bash
# PREVIEW what would be added
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "add-missing", "dryRun": true, "batchSize": 100}'
```

**What this shows:**
- How many new documents would be added from CSV
- Which customers would be added
- **No existing data modified**

**When you're ready to apply:**
```bash
# APPLY the additions
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "add-missing", "dryRun": false, "batchSize": 100}'
```

---

### Phase 5: Verify Final Results
```bash
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -H "Content-Type: application/json" \
  -d '{"phase": "verify"}'
```

**What this shows:**
- Final record counts
- Data quality scores
- Highest job numbers by type
- System readiness status

---

## What Each Phase Actually Does

### ✅ Fix Numbering
- **Updates** job numbers from "973" to "00973"
- **Preserves** all original data
- **Maintains** chronological order
- **Ensures** 5-digit format consistency

### ✅ Fix Registrations  
- **Cleans** invalid registrations (monetary values)
- **Preserves** valid UK registration formats
- **Sets invalid entries to null** (shows as "N/A" in UI)
- **No valid data lost**

### ✅ Add Missing Data
- **Imports** records from CSV that aren't in database
- **Skips** records that already exist
- **Adds** customers, documents, line items
- **No duplicates created**

---

## Safety Checks

### Before Each Phase
1. **Always run with `dryRun: true` first**
2. **Review the preview results**
3. **Check the sample changes**
4. **Only then run with `dryRun: false`**

### Monitoring Progress
```bash
# Check job sheets after updates
curl http://localhost:3002/api/job-sheets | jq '.numbering_info'

# Check overall system status
curl http://localhost:3002/api/bulk-processing/comprehensive-status
```

---

## Expected Results After Updates

### ✅ Job Sheet Numbering
- All job numbers in 5-digit format: "00973", "01234", "91145"
- Proper sorting by number (highest first)
- Continuity maintained with existing sequence
- Next new job sheet uses correct next number

### ✅ Registration Data
- Invalid entries cleaned: "044.73" → "N/A"
- Valid registrations preserved: "KD54WYL" → "KD54WYL"
- Consistent display in job sheets table
- No data corruption

### ✅ Complete Data
- All missing records from CSV files added
- No existing records modified unnecessarily
- Customer-document relationships preserved
- Line items properly linked

---

## Rollback Plan (If Needed)

If you need to undo changes:

### Rollback Job Numbers
```sql
-- If you need to revert job numbers (example)
UPDATE documents 
SET doc_number = CAST(CAST(doc_number AS INTEGER) AS TEXT)
WHERE doc_number ~ '^0+[0-9]+$' AND LENGTH(doc_number) = 5;
```

### Rollback Registration Changes
```sql
-- Registration changes are harder to rollback since we're cleaning invalid data
-- This is why we preview first with dryRun: true
```

---

## Troubleshooting

### If Preview Shows Unexpected Changes
1. **Don't apply** - investigate first
2. **Check CSV file data** for accuracy
3. **Review sample records** in preview
4. **Contact support** if unsure

### If Updates Fail Partway
1. **Check server logs** for specific errors
2. **Run verify phase** to see current state
3. **Continue from where it stopped** (system is designed to handle partial updates)

### If Job Numbers Look Wrong
1. **Run analyze phase** to see current state
2. **Check highest numbers** in each document type
3. **Verify CSV data** has correct numbering

---

## Performance Notes

- **Batch processing** prevents system overload
- **Small batch sizes** (100-500) recommended for safety
- **Monitor system resources** during updates
- **Can pause and resume** between batches

---

## Final Verification

After all updates:

```bash
# Check the job sheets API
curl http://localhost:3002/api/job-sheets | head -20

# Verify numbering
curl -X POST http://localhost:3002/api/system/data-mapping-update \
  -d '{"phase": "verify"}' | jq '.verification_results.data_quality'
```

Expected final state:
- ✅ 5-digit job numbers throughout
- ✅ Clean registration data
- ✅ All CSV data imported
- ✅ No data loss
- ✅ System ready for production

---

## Why This Approach Is Safer

1. **Preview everything** before applying
2. **No data deletion** - only updates and additions
3. **Batch processing** allows monitoring and control
4. **Preserves all existing relationships**
5. **Can be stopped/resumed** at any point
6. **Detailed logging** of all changes

This approach gives you the benefits of clean data without the risks of starting over.
