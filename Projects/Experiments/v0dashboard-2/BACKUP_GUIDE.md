# 🔄 COMPREHENSIVE BACKUP & RESTORE SYSTEM

Complete backup and restoration solution for your garage management system with **zero data loss guarantee**.

## 🎯 Quick Start

### Create a Backup
```bash
# Create full backup (SQL + CSV)
npm run backup

# List existing backups
npm run backup:list

# Schedule automatic backups
npm run backup:schedule
```

### Restore from Backup
```bash
# List available backups
npm run restore:list

# Restore from specific backup
npm run restore restore backup_2024-01-15_14-30-25
```

## 📦 Backup Features

### **🔄 Multiple Formats**
- **SQL Dumps**: Complete database structure + data
- **CSV Exports**: Individual table exports for flexibility
- **Both Formats**: Maximum compatibility and options

### **🗜️ Compression & Storage**
- **Automatic compression** to save space
- **Timestamped backups** for easy identification
- **Automatic cleanup** of old backups (configurable)
- **Cloud storage ready** for offsite backups

### **📊 What Gets Backed Up**
| Table | Description | Typical Records |
|-------|-------------|-----------------|
| **customers** | Customer information | ~7,000+ |
| **vehicles** | Vehicle registrations & details | ~5,000+ |
| **documents** | Job sheets, invoices, estimates | ~50,000+ |
| **line_items** | Service items, parts, labor | ~200,000+ |
| **receipts** | Payment records | ~10,000+ |
| **document_extras** | Additional document data | ~5,000+ |
| **appointments** | Scheduled appointments | ~2,000+ |
| **reminders** | MOT & service reminders | ~3,000+ |

## 🛡️ Restore Features

### **🔍 Safety First**
- **Automatic safety backup** before restoration
- **Backup verification** before proceeding
- **Data integrity checks** after restoration
- **Rollback capability** if issues occur

### **⚡ Flexible Restoration**
- **Full database restore** from SQL dumps
- **Individual table restore** from CSV files
- **Selective restoration** of specific tables
- **Skip existing tables** option

## 📋 Detailed Usage

### **Creating Backups**

#### Command Line
```bash
# Create backup with default settings
npm run backup

# List all backups
npm run backup:list

# Schedule daily backups at 2 AM
npm run backup:schedule "0 2 * * *"
```

#### Web API
```bash
# Create backup via API
curl -X POST http://localhost:3000/api/backup

# List backups via API
curl http://localhost:3000/api/backup
```

### **Backup Output Example**
```
🔄 COMPREHENSIVE BACKUP SYSTEM
==================================================
📁 Backup location: /path/to/backups/backup_2024-01-15_14-30-25

📊 Found 8 tables to backup

💾 Creating SQL backup...
  📋 Backing up customers...
  📋 Backing up vehicles...
  📋 Backing up documents...
  📋 Backing up line_items...
  📋 Backing up receipts...
  📋 Backing up document_extras...
  📋 Backing up appointments...
  📋 Backing up reminders...
✅ SQL backup created: full_backup.sql

📊 Creating CSV backups...
  📋 Exporting customers to CSV...
    ✅ 7,234 records exported
  📋 Exporting vehicles to CSV...
    ✅ 5,891 records exported
  📋 Exporting documents to CSV...
    ✅ 52,103 records exported
  📋 Exporting line_items to CSV...
    ✅ 198,445 records exported
  📋 Exporting receipts to CSV...
    ✅ 8,234 records exported
  📋 Exporting document_extras to CSV...
    ✅ 4,567 records exported
  📋 Exporting appointments to CSV...
    ✅ 1,892 records exported
  📋 Exporting reminders to CSV...
    ✅ 2,845 records exported
✅ CSV backups created in: csv/

📋 Metadata created: backup_metadata.json

🗜️  Compressing backup...
✅ Backup ready for compression

🧹 Cleaning old backups...
✅ Keeping 10 most recent backups

🎉 BACKUP COMPLETED SUCCESSFULLY!
==================================================
⏱️  Duration: 45.2s
📦 Size: 125.7 MB
📁 Location: /path/to/backups/backup_2024-01-15_14-30-25
```

### **Restoring Backups**

#### Command Line
```bash
# List available backups
npm run restore:list

# Restore from specific backup
npm run restore restore backup_2024-01-15_14-30-25
```

#### Web API
```bash
# List available backups
curl http://localhost:3000/api/restore

# Restore from backup
curl -X POST http://localhost:3000/api/restore \
  -H "Content-Type: application/json" \
  -d '{"backupName": "backup_2024-01-15_14-30-25"}'
```

### **Restoration Output Example**
```
🔄 COMPREHENSIVE RESTORE SYSTEM
==================================================
📁 Restoring from: backup_2024-01-15_14-30-25

📋 Backup created: 2024-01-15T14:30:25.000Z
📊 Tables in backup: 8
📈 Total records: 278,211

🛡️  Creating safety backup before restoration...
✅ Safety backup created

🔍 Verifying backup integrity...
✅ SQL backup file found
✅ CSV backup files verified
✅ Backup integrity verified

💾 Restoring from SQL backup...
📄 Reading SQL file: full_backup.sql
📝 Found 1,247 SQL statements

🏗️  Creating table: customers
🏗️  Creating table: vehicles
🏗️  Creating table: documents
🏗️  Creating table: line_items
🏗️  Creating table: receipts
🏗️  Creating table: document_extras
🏗️  Creating table: appointments
🏗️  Creating table: reminders
  📈 Processed 100 statements...
  📈 Processed 200 statements...
  📈 Processed 300 statements...
✅ SQL restoration completed

🔍 Verifying restoration...
✅ customers: 7,234 records (matches backup)
✅ vehicles: 5,891 records (matches backup)
✅ documents: 52,103 records (matches backup)
✅ line_items: 198,445 records (matches backup)
✅ receipts: 8,234 records (matches backup)
✅ document_extras: 4,567 records (matches backup)
✅ appointments: 1,892 records (matches backup)
✅ reminders: 2,845 records (matches backup)
✅ Restoration verification completed

🎉 RESTORATION COMPLETED SUCCESSFULLY!
==================================================
⏱️  Duration: 67.3s
📊 Tables restored: 8
📈 Records restored: 278,211
```

## 📁 Backup Structure

Each backup creates a timestamped folder with:

```
backup_2024-01-15_14-30-25/
├── full_backup.sql           # Complete SQL dump
├── backup_metadata.json      # Backup information
└── csv/                      # Individual table exports
    ├── customers.csv
    ├── vehicles.csv
    ├── documents.csv
    ├── line_items.csv
    ├── receipts.csv
    ├── document_extras.csv
    ├── appointments.csv
    └── reminders.csv
```

### **Metadata File Example**
```json
{
  "backup_info": {
    "timestamp": "2024-01-15_14-30-25",
    "created_at": "2024-01-15T14:30:25.000Z",
    "format": "both",
    "include_schema": true,
    "include_data": true,
    "compressed": true
  },
  "tables": {
    "customers": 7234,
    "vehicles": 5891,
    "documents": 52103,
    "line_items": 198445,
    "receipts": 8234,
    "document_extras": 4567,
    "appointments": 1892,
    "reminders": 2845
  },
  "totals": {
    "tables": 8,
    "total_records": 278211
  },
  "system_info": {
    "node_version": "v18.17.0",
    "platform": "darwin",
    "backup_tool": "Garage Management Backup System v1.0"
  }
}
```

## ⚙️ Configuration Options

### **Backup Configuration**
```typescript
const backupSystem = new BackupSystem({
  backupDir: './backups',        // Backup directory
  includeData: true,             // Include table data
  includeSchema: true,           // Include table schemas
  compress: true,                // Compress backups
  maxBackups: 10,                // Keep 10 most recent
  format: 'both'                 // 'sql', 'csv', or 'both'
})
```

### **Restore Configuration**
```typescript
const restoreSystem = new RestoreSystem({
  backupDir: './backups',              // Backup directory
  verifyBeforeRestore: true,           // Verify backup integrity
  createBackupBeforeRestore: true,     // Safety backup
  skipExistingTables: false            // Skip existing tables
})
```

## 🔄 Automated Backups

### **Cron Schedule Examples**
```bash
# Daily at 2 AM
npm run backup:schedule "0 2 * * *"

# Every 6 hours
npm run backup:schedule "0 */6 * * *"

# Weekly on Sunday at 3 AM
npm run backup:schedule "0 3 * * 0"

# Monthly on 1st at 4 AM
npm run backup:schedule "0 4 1 * *"
```

## 🚨 Emergency Procedures

### **Quick Recovery**
```bash
# 1. List available backups
npm run restore:list

# 2. Restore from most recent backup
npm run restore restore backup_YYYY-MM-DD_HH-MM-SS

# 3. Verify restoration
npm run verify-all
```

### **Partial Recovery**
If you only need specific tables, use CSV restoration:
1. Extract CSV files from backup
2. Use individual table import scripts
3. Verify data integrity

## 📊 Best Practices

### **Backup Schedule**
- **Daily backups** for active systems
- **Weekly backups** for less active systems
- **Before major updates** or changes
- **Before data imports** or migrations

### **Storage Management**
- Keep **at least 7 daily backups**
- Keep **4 weekly backups**
- Keep **12 monthly backups**
- Store backups **offsite** for disaster recovery

### **Testing Backups**
- **Monthly restoration tests** on development systems
- **Verify backup integrity** regularly
- **Document recovery procedures**
- **Train staff** on restoration process

## 🔐 Security Considerations

### **Backup Security**
- **Encrypt backups** for sensitive data
- **Secure backup storage** locations
- **Access control** for backup files
- **Audit backup access** regularly

### **Data Privacy**
- **Remove sensitive data** if required
- **Anonymize customer data** for testing
- **Comply with GDPR/privacy laws**
- **Document data retention policies**

## 🎯 Success Metrics

Your backup system is working correctly when:
- ✅ **Backups complete** without errors
- ✅ **All tables** are included
- ✅ **Record counts** match expectations
- ✅ **Restoration works** flawlessly
- ✅ **Data integrity** is maintained
- ✅ **Performance** meets requirements

**Your garage management data is now fully protected with enterprise-grade backup and restore capabilities!** 🛡️
