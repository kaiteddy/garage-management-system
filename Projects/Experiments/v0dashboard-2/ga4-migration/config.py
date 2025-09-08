#!/usr/bin/env python3
"""
GA4 Migration Configuration - SAFE MODE
Configured to preserve existing data and only add missing records
"""

# Database Configuration - Using your Neon database
DATABASE_CONFIG = {
    'host': 'ep-snowy-truth-abtxy4yd.eu-west-2.aws.neon.tech',
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_WRqMTuEo65tQ',
    'port': 5432,
    'sslmode': 'require'
}

# CSV Data Directory - Your existing data folder
CSV_DIRECTORY = '../data'  # Go up one level from ga4-migration directory

# SAFE MIGRATION SETTINGS - Preserve existing data
MIGRATION_SETTINGS = {
    'batch_size': 500,  # Smaller batches for stability
    'enable_logging': True,
    'log_level': 'INFO',
    'create_backup': False,  # Don't backup - we're adding, not replacing
    'validate_after_migration': True,
    'safe_mode': True,  # CRITICAL: Only add missing data
    'preserve_existing': True,  # CRITICAL: Don't touch existing records
    'skip_existing_tables': [
        'customers',  # 7,079 records - KEEP
        'vehicles',   # 10,519 records - KEEP (VRM, technical data)
        'line_items', # 90,062 records - KEEP
        'document_receipts',  # 24,717 records - KEEP
        'document_extras',    # 21,804 records - KEEP
        'document_line_items' # 89,902 records - KEEP
    ],
    'import_only_tables': [
        'documents',  # Missing 31,644 records
        'reminders',  # Missing all 11,622 records
        'stock'       # Missing all 267 records
    ]
}

# Validation Settings
VALIDATION_SETTINGS = {
    'check_record_counts': True,
    'check_referential_integrity': True,
    'check_data_quality': True,
    'check_financial_totals': True,
    'generate_report': True,
    'compare_before_after': True  # Show what was added
}

# File Encoding Settings
ENCODING_SETTINGS = {
    'primary_encoding': 'utf-8',  # Your CSV files are UTF-8
    'fallback_encodings': ['latin-1', 'cp1252'],
    'error_handling': 'replace'
}

# SAFETY CHECKS
SAFETY_CHECKS = {
    'confirm_before_import': False,  # Skip confirmation for automated run
    'dry_run_first': False,  # Set to True to test without importing
    'max_records_per_table': 50000,  # Safety limit
    'require_confirmation': False  # Skip confirmation for automated run
}

# Current database state (for validation)
EXPECTED_EXISTING_COUNTS = {
    'customers': 7079,
    'vehicles': 10519,
    'documents': 1245,  # Will increase to ~32,889
    'line_items': 90062,
    'document_receipts': 24717,
    'document_extras': 21804,
    'document_line_items': 89902,
    'reminders': 0,     # Will increase to ~11,622
    'stock': 0          # Will increase to ~267
}

print("🛡️  SAFE MODE CONFIGURATION LOADED")
print("✅ Will preserve all existing data")
print("✅ Will only add missing records")
print("✅ Will not touch VRM or technical data")
