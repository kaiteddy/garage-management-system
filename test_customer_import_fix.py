#!/usr/bin/env python3
"""
Test script to verify the customer import fix works correctly
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def create_test_eli_motors_customers():
    """Create test CSV with ELI MOTORS format"""
    
    csv_content = """_ID,AccountNumber,addressCounty,addressHouseNo,addressLocality,addressPostCode,addressRoad,classification,contactEmail,contactMobile,contactTelephone,nameCompany,nameForename,nameSurname
1,CUST001,Surrey,123,Guildford,GU1 1AA,High Street,Individual,john@example.com,07123456789,01483123456,,John,Smith
2,CUST002,Kent,456,Canterbury,CT1 2BB,King Street,Individual,mary@example.com,07234567890,01227234567,ABC Ltd,Mary,Jones
3,CUST003,Essex,789,Chelmsford,CM1 3CC,Queen Road,Individual,bob@example.com,07345678901,01245345678,,Bob,Wilson
4,,Surrey,999,Woking,GU22 9ZZ,Station Road,Individual,test@example.com,07999888777,01483999888,,Test,Customer
5,CUST005,London,111,Westminster,SW1A 1AA,Parliament St,Business,info@company.com,07111222333,02071112223,Big Company Ltd,Jane,Director"""
    
    with open('test_eli_motors_customers.csv', 'w') as f:
        f.write(csv_content)
    
    print("✅ Created test_eli_motors_customers.csv with correct ELI MOTORS format")

def test_customer_import_fix():
    """Test that customer import now works correctly"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "test_eli_motors_customers.csv"
    
    print('🧪 Testing Customer Import Fix')
    print('=' * 50)
    
    # Create test file
    create_test_eli_motors_customers()
    
    try:
        import_service = CSVImportService(db_path)
        result = import_service.import_csv_file(csv_file, 'customers', {'update_duplicates': True})
        
        if result['success']:
            print('✅ Customer import successful!')
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

def check_imported_customers():
    """Check what customers were imported"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT account_number, name, company, address, postcode, email, mobile
            FROM customers 
            WHERE account_number LIKE 'CUST%' OR name LIKE '%Test%'
            ORDER BY account_number
        ''')
        customers = cursor.fetchall()
        
        print('\n📊 Test customers imported:')
        print('=' * 80)
        for customer in customers:
            print(f'Account: {customer[0]} | Name: {customer[1]} | Company: {customer[2]}')
            print(f'   Address: {customer[3]}, {customer[4]}')
            print(f'   Contact: {customer[5]} | Mobile: {customer[6]}')
            print()
        
        # Count total customers now
        cursor.execute('SELECT COUNT(*) FROM customers')
        total_customers = cursor.fetchone()[0]
        print(f'✅ Total customers in database: {total_customers}')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking customers: {e}')

def cleanup_test_files():
    """Clean up test files"""
    try:
        if os.path.exists('test_eli_motors_customers.csv'):
            os.remove('test_eli_motors_customers.csv')
            print('\n🧹 Cleaned up test files')
    except:
        pass

def show_fix_summary():
    """Show what was fixed"""
    
    print('\n🔧 CUSTOMER IMPORT FIX SUMMARY')
    print('=' * 50)
    print('**Problem:** Customer import was using wrong column names')
    print('')
    print('**Before (Incorrect):**')
    print('   - account_number from "AccountHeld" (wrong)')
    print('   - name from "nameSurname" + "nameCompany" (wrong)')
    print('   - address from "addressCounty" + "addressPostCode" (wrong)')
    print('')
    print('**After (Correct):**')
    print('   ✅ account_number from "AccountNumber"')
    print('   ✅ name from "nameForename" + "nameSurname"')
    print('   ✅ company from "nameCompany"')
    print('   ✅ address from "addressHouseNo" + "addressRoad" + etc.')
    print('   ✅ email from "contactEmail"')
    print('   ✅ mobile from "contactMobile"')
    print('')
    print('🚀 **Ready to re-import your ELI MOTORS customer data!**')

if __name__ == "__main__":
    test_customer_import_fix()
    check_imported_customers()
    cleanup_test_files()
    show_fix_summary()
