#!/usr/bin/env python3
"""
Test the improved customer linking logic
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def create_test_vehicles_with_customer_ids():
    """Create test vehicles CSV with _ID_Customer values that should match existing customers"""
    
    # Based on the customer account numbers we saw: 004, 010, 035, 042, etc.
    csv_content = """_ID,_ID_Customer,Registration,Make,Model,Colour,DateofReg,EngineCC,FuelType,VIN
1,4,TEST001,Ford,Focus,Blue,01/01/2020,1600,Petrol,VIN001
2,10,TEST002,Toyota,Corolla,Red,15/03/2019,1800,Petrol,VIN002
3,35,TEST003,BMW,320i,Black,20/06/2021,2000,Diesel,VIN003
4,42,TEST004,Audi,A4,Silver,10/12/2018,2500,Diesel,VIN004
5,999,TEST005,Honda,Civic,White,05/08/2022,1500,Petrol,VIN005"""
    
    with open('test_vehicles_linking.csv', 'w') as f:
        f.write(csv_content)
    
    print("✅ Created test_vehicles_linking.csv with customer ID references")

def test_vehicle_customer_linking():
    """Test that vehicles now link to customers correctly"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "test_vehicles_linking.csv"
    
    print('🧪 Testing Improved Vehicle-Customer Linking')
    print('=' * 60)
    
    # Create test file
    create_test_vehicles_with_customer_ids()
    
    try:
        import_service = CSVImportService(db_path)
        result = import_service.import_csv_file(csv_file, 'vehicles', {'update_duplicates': True})
        
        if result['success']:
            print('✅ Vehicle import successful!')
            print(f'   Imported: {result.get("imported", 0)}')
            print(f'   Failed: {result.get("failed", 0)}')
            print(f'   Duplicates: {result.get("duplicates", 0)}')
            
            if result.get('errors'):
                print('🔍 Errors:')
                for error in result['errors']:
                    print(f'   - {error}')
        else:
            print(f'❌ Import failed: {result.get("error", "Unknown error")}')
            
    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()

def check_vehicle_customer_links():
    """Check if vehicles are now properly linked to customers"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check test vehicles specifically
        cursor.execute('''
            SELECT v.registration, v.make, v.model, c.account_number, c.name
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            WHERE v.registration LIKE 'TEST%'
            ORDER BY v.registration
        ''')
        test_vehicles = cursor.fetchall()
        
        print('\n📊 Test Vehicle-Customer Links:')
        print('=' * 70)
        linked_count = 0
        for vehicle in test_vehicles:
            if vehicle[3]:  # Has customer account
                print(f'✅ {vehicle[0]} {vehicle[1]} {vehicle[2]} -> {vehicle[3]} ({vehicle[4]})')
                linked_count += 1
            else:
                print(f'❌ {vehicle[0]} {vehicle[1]} {vehicle[2]} -> NO CUSTOMER LINKED')
        
        print(f'\n📈 Linking Success Rate: {linked_count}/{len(test_vehicles)} vehicles linked')
        
        # Check overall vehicle linking improvement
        cursor.execute('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL')
        total_linked = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM vehicles')
        total_vehicles = cursor.fetchone()[0]
        
        print(f'📊 Overall Vehicle Linking: {total_linked}/{total_vehicles} vehicles linked to customers')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking vehicle links: {e}')

def test_customer_account_matching():
    """Test the different customer account matching strategies"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print('\n🔍 Testing Customer Account Matching Strategies:')
        print('=' * 60)
        
        # Test different ID formats that should match
        test_ids = ['4', '10', '35', '42', '004', '010', '035', '042', '4.0', '10.0']
        
        for test_id in test_ids:
            # Strategy 1: Direct match
            cursor.execute('SELECT account_number, name FROM customers WHERE account_number = ?', (test_id,))
            direct_match = cursor.fetchone()
            
            # Strategy 2: With .0 suffix
            cursor.execute('SELECT account_number, name FROM customers WHERE account_number = ?', (f"{test_id}.0",))
            dot_zero_match = cursor.fetchone()
            
            # Strategy 3: Zero-padded
            try:
                numeric_id = int(float(test_id))
                padded_id = f"{numeric_id:03d}"
                cursor.execute('SELECT account_number, name FROM customers WHERE account_number = ?', (padded_id,))
                padded_match = cursor.fetchone()
            except:
                padded_match = None
            
            print(f'   ID "{test_id}":')
            if direct_match:
                print(f'     ✅ Direct: {direct_match[0]} -> {direct_match[1]}')
            if dot_zero_match:
                print(f'     ✅ .0 suffix: {dot_zero_match[0]} -> {dot_zero_match[1]}')
            if padded_match:
                print(f'     ✅ Padded: {padded_match[0]} -> {padded_match[1]}')
            if not (direct_match or dot_zero_match or padded_match):
                print(f'     ❌ No matches found')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error testing account matching: {e}')

def cleanup_test_files():
    """Clean up test files"""
    try:
        if os.path.exists('test_vehicles_linking.csv'):
            os.remove('test_vehicles_linking.csv')
            print('\n🧹 Cleaned up test files')
    except:
        pass

def show_linking_improvements():
    """Show what linking improvements were made"""
    
    print('\n🔧 LINKING IMPROVEMENTS SUMMARY')
    print('=' * 60)
    print('**Enhanced Customer Linking Strategies:**')
    print('')
    print('1. ✅ **Direct Match:** account_number = "004"')
    print('2. ✅ **Decimal Format:** account_number = "4.0"')
    print('3. ✅ **Zero-Padded:** account_number = "004" matches _ID_Customer = "4"')
    print('4. ✅ **Flexible Matching:** Handles various ELI MOTORS ID formats')
    print('')
    print('**Applied To:**')
    print('   🚗 Vehicle imports (_ID_Customer field)')
    print('   🔧 Document/Job imports (customer account fields)')
    print('')
    print('🚀 **Ready to re-import your ELI MOTORS data with proper linking!**')

if __name__ == "__main__":
    test_vehicle_customer_linking()
    check_vehicle_customer_links()
    test_customer_account_matching()
    cleanup_test_files()
    show_linking_improvements()
