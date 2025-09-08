#\!/usr/bin/env python3
"""
GA4 Migration Configuration Template

Copy this file to config.py and update with your actual values.
"""

# Database Configuration
DATABASE_CONFIG = {
    'host': 'localhost',
    'database': 'ga4_garage',
    'user': 'postgres',
    'password': 'your_password_here',
    'port': 5432
}

# CSV Data Directory
# Update this path to point to your GA4 EXPORT folder
CSV_DIRECTORY = '/Users/adamrutstein/Desktop/GA4 EXPORT'

# Migration Settings
MIGRATION_SETTINGS = {
    'batch_size': 1000,  # Number of records to process at once
    'enable_logging': True,
    'log_level': 'INFO',  # DEBUG, INFO, WARNING, ERROR
    'create_backup': True,
    'validate_after_migration': True
}

# Validation Settings
VALIDATION_SETTINGS = {
    'check_record_counts': True,
    'check_referential_integrity': True,
    'check_data_quality': True,
    'check_financial_totals': True,
    'generate_report': True
}

# File Encoding Settings
ENCODING_SETTINGS = {
    'primary_encoding': 'latin-1',  # Try this first
    'fallback_encodings': ['utf-8', 'cp1252'],  # Try these if primary fails
    'error_handling': 'replace'  # How to handle encoding errors
}
