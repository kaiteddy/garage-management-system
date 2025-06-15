#!/usr/bin/env python3
"""
Test script for document extras import
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def test_document_extras_import():
    """Test document extras import"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "eli_motors_document_extras_sample.csv"
    
    print('🧪 Testing ELI MOTORS Document Extras Import')
    print('=' * 50)
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    try:
        import_service = CSVImportService(db_path)
        result = import_service.import_csv_file(csv_file, 'document_extras')
        
        if result['success']:
            print('✅ Document extras import successful!')
            print(f'   Imported: {result.get("imported", 0)}')
            print(f'   Failed: {result.get("failed", 0)}')
            print(f'   Duplicates: {result.get("duplicates", 0)}')
            
            if result.get('errors'):
                print('🔍 Errors:')
                for error in result['errors'][:3]:
                    print(f'   - {error}')
        else:
            print(f'❌ Import failed: {result.get("error", "Unknown error")}')
            
    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()

def check_imported_jobs():
    """Check what jobs were imported"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT job_number, description, notes, status FROM jobs ORDER BY id DESC LIMIT 5')
        jobs = cursor.fetchall()
        
        print('\n📊 Recent jobs in database:')
        print('=' * 50)
        for job in jobs:
            print(f'Job: {job[0]}')
            print(f'Description: {job[1][:100]}...' if len(job[1]) > 100 else f'Description: {job[1]}')
            print(f'Notes: {job[2]}')
            print(f'Status: {job[3]}')
            print('---')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking jobs: {e}')

if __name__ == "__main__":
    test_document_extras_import()
    check_imported_jobs()
