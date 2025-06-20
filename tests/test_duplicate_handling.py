#!/usr/bin/env python3
"""
Test script to verify improved duplicate handling for ELI MOTORS imports
"""

import os
import sys

from services.csv_import_service import CSVImportService

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))


def test_duplicate_handling():
    """Test that duplicate handling works correctly"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "eli_motors_customers_sample.csv"

    print('🧪 Testing Improved Duplicate Handling')
    print('=' * 50)

    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return

    try:
        import_service = CSVImportService(db_path)

        # First import - should work normally
        print('\n📥 First import (should create new records):')
        result1 = import_service.import_csv_file(
            csv_file, 'customers', {'update_duplicates': False})

        if result1['success']:
            print(
                f'   ✅ Success! Imported: {result1.get("imported", 0)}, Failed: {result1.get("failed", 0)}, Duplicates: {result1.get("duplicates", 0)}')
        else:
            print(f'   ❌ Failed: {result1.get("error", "Unknown error")}')

        # Second import - should handle duplicates
        print('\n📥 Second import (should handle duplicates):')
        result2 = import_service.import_csv_file(
            csv_file, 'customers', {'update_duplicates': True})

        if result2['success']:
            print(
                f'   ✅ Success! Imported: {result2.get("imported", 0)}, Failed: {result2.get("failed", 0)}, Duplicates: {result2.get("duplicates", 0)}')
        else:
            print(f'   ❌ Failed: {result2.get("error", "Unknown error")}')

        # Third import - without update_duplicates (should show as duplicates)
        print('\n📥 Third import (without update, should show duplicates):')
        result3 = import_service.import_csv_file(
            csv_file, 'customers', {'update_duplicates': False})

        if result3['success']:
            print(
                f'   ✅ Success! Imported: {result3.get("imported", 0)}, Failed: {result3.get("failed", 0)}, Duplicates: {result3.get("duplicates", 0)}')
        else:
            print(f'   ❌ Failed: {result3.get("error", "Unknown error")}')

        if result3.get('errors'):
            print('   🔍 Errors (should be minimal now):')
            for error in result3['errors'][:3]:
                print(f'     - {error}')

    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()


def check_customer_data():
    """Check what customer data is in the database"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute(
            'SELECT account_number, name, email, mobile FROM customers ORDER BY id DESC LIMIT 10')
        customers = cursor.fetchall()

        print('\n📊 Current customers in database:')
        print('=' * 60)
        for customer in customers:
            print(
                f'Account: {customer[0]} | Name: {customer[1]} | Email: {customer[2]} | Mobile: {customer[3]}')

        # Check for duplicates
        cursor.execute('''
            SELECT account_number, COUNT(*) as count 
            FROM customers 
            WHERE account_number IS NOT NULL AND account_number != ''
            GROUP BY account_number 
            HAVING COUNT(*) > 1
        ''')
        duplicates = cursor.fetchall()

        if duplicates:
            print('\n⚠️  Duplicate account numbers found:')
            for dup in duplicates:
                print(f'   Account: {dup[0]} appears {dup[1]} times')
        else:
            print('\n✅ No duplicate account numbers found')

        conn.close()

    except Exception as e:
        print(f'❌ Error checking customers: {e}')


def show_tips():
    """Show tips for handling large imports"""

    print('\n💡 TIPS FOR LARGE ELI MOTORS IMPORTS')
    print('=' * 50)
    print('For your large customer file (7,048 records):')
    print('')
    print('1. ✅ **Always enable "Update existing records"**')
    print('   - This prevents UNIQUE constraint failures')
    print('   - Updates existing customers instead of failing')
    print('')
    print('2. 🔄 **The system now handles duplicates better:**')
    print('   - Checks by account number first')
    print('   - Falls back to name matching if needed')
    print('   - Gracefully handles constraint violations')
    print('')
    print('3. 📊 **Expected results for your import:**')
    print('   - Some records will be imported (new customers)')
    print('   - Some will be updated (existing customers)')
    print('   - Some may be duplicates (handled gracefully)')
    print('')
    print('4. 🚀 **To re-import your customer file:**')
    print('   - Go to: http://127.0.0.1:5001/upload')
    print('   - Select "Customers" data type')
    print('   - ✅ Enable "Update existing records"')
    print('   - Upload your ELI MOTORS customer CSV')


if __name__ == "__main__":
    test_duplicate_handling()
    check_customer_data()
    show_tips()
