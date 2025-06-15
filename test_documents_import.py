#!/usr/bin/env python3
"""
Test script for ELI MOTORS documents import
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def test_documents_import():
    """Test documents import"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "eli_motors_documents_sample.csv"
    
    print('🧪 Testing ELI MOTORS Documents Import')
    print('=' * 50)
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    try:
        import_service = CSVImportService(db_path)
        result = import_service.import_csv_file(csv_file, 'documents', {'update_duplicates': True})
        
        if result['success']:
            print('✅ Documents import successful!')
            print(f'   Total Imported: {result.get("imported", 0)}')
            print(f'   Failed: {result.get("failed", 0)}')
            print(f'   Duplicates: {result.get("duplicates", 0)}')
            
            if 'details' in result:
                details = result['details']
                print(f'   Jobs: {details.get("jobs", 0)}')
                print(f'   Invoices: {details.get("invoices", 0)}')
                print(f'   Vehicles: {details.get("vehicles", 0)}')
            
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

def check_imported_data():
    """Check what data was imported"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check jobs
        cursor.execute('SELECT COUNT(*) FROM jobs')
        jobs_count = cursor.fetchone()[0]
        print(f'\n📊 Jobs in database: {jobs_count}')
        
        cursor.execute('SELECT job_number, customer_id, vehicle_id, status, total_amount FROM jobs ORDER BY id DESC LIMIT 3')
        jobs = cursor.fetchall()
        for job in jobs:
            print(f'  Job: {job[0]} | Customer: {job[1]} | Vehicle: {job[2]} | Status: {job[3]} | Amount: £{job[4]}')
        
        # Check invoices
        cursor.execute('SELECT COUNT(*) FROM invoices')
        invoices_count = cursor.fetchone()[0]
        print(f'\n📊 Invoices in database: {invoices_count}')
        
        cursor.execute('SELECT invoice_number, customer_id, status, total_amount FROM invoices ORDER BY id DESC LIMIT 3')
        invoices = cursor.fetchall()
        for invoice in invoices:
            print(f'  Invoice: {invoice[0]} | Customer: {invoice[1]} | Status: {invoice[2]} | Amount: £{invoice[3]}')
        
        # Check vehicles
        cursor.execute('SELECT COUNT(*) FROM vehicles')
        vehicles_count = cursor.fetchone()[0]
        print(f'\n📊 Vehicles in database: {vehicles_count}')
        
        cursor.execute('SELECT registration, make, model, customer_id FROM vehicles ORDER BY id DESC LIMIT 3')
        vehicles = cursor.fetchall()
        for vehicle in vehicles:
            print(f'  Vehicle: {vehicle[0]} | {vehicle[1]} {vehicle[2]} | Customer: {vehicle[3]}')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking data: {e}')

if __name__ == "__main__":
    test_documents_import()
    check_imported_data()
