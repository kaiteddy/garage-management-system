#!/usr/bin/env python3
"""
Test script for ELI MOTORS vehicles import
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def test_vehicles_import():
    """Test vehicles import"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "eli_motors_vehicles_sample.csv"
    
    print('🧪 Testing ELI MOTORS Vehicles Import')
    print('=' * 50)
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    try:
        import_service = CSVImportService(db_path)
        result = import_service.import_csv_file(csv_file, 'vehicles', {'update_duplicates': True})
        
        if result['success']:
            print('✅ Vehicles import successful!')
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

def check_imported_vehicles():
    """Check what vehicles were imported"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT v.registration, v.make, v.model, v.year, v.color, v.fuel_type, 
                   c.account_number, c.name
            FROM vehicles v 
            LEFT JOIN customers c ON v.customer_id = c.id 
            ORDER BY v.id DESC LIMIT 5
        ''')
        vehicles = cursor.fetchall()
        
        print('\n📊 Recent vehicles in database:')
        print('=' * 70)
        for vehicle in vehicles:
            customer_info = f"{vehicle[6]} ({vehicle[7]})" if vehicle[6] else "No customer"
            print(f'Vehicle: {vehicle[0]} | {vehicle[1]} {vehicle[2]} | Year: {vehicle[3]} | Color: {vehicle[4]} | Fuel: {vehicle[5]} | Customer: {customer_info}')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking vehicles: {e}')

if __name__ == "__main__":
    test_vehicles_import()
    check_imported_vehicles()
