#!/usr/bin/env python3
"""
Fix malformed customer account numbers to improve linking
"""

import os
import sys


def fix_customer_account_numbers():
    """Clean up malformed customer account numbers"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('🔧 FIXING CUSTOMER ACCOUNT NUMBERS')
        print('=' * 50)

        # Get all customers with malformed account numbers
        cursor.execute('''
            SELECT id, account_number, name
            FROM customers 
            WHERE account_number IS NOT NULL 
            AND account_number != ""
            AND (
                account_number LIKE '(%' OR 
                account_number LIKE '-%' OR
                account_number LIKE '%(' OR
                account_number LIKE '%.%'
            )
        ''')
        malformed_accounts = cursor.fetchall()

        print(
            f'Found {len(malformed_accounts)} customers with malformed account numbers')

        fixed_count = 0

        for customer_id, account_number, name in malformed_accounts:
            original_account = account_number

            # Clean the account number
            cleaned_account = account_number

            # Remove leading/trailing parentheses
            cleaned_account = cleaned_account.strip('()')

            # Remove leading minus signs
            cleaned_account = cleaned_account.lstrip('-')

            # Handle decimal format (0.0 -> 000)
            if '.' in cleaned_account:
                try:
                    numeric_part = int(float(cleaned_account))
                    cleaned_account = f"{numeric_part:03d}"
                except:
                    pass

            # Ensure it's not empty after cleaning
            if cleaned_account and cleaned_account != original_account:
                # Check if the cleaned account already exists
                cursor.execute('SELECT id FROM customers WHERE account_number = ? AND id != ?',
                               (cleaned_account, customer_id))
                existing = cursor.fetchone()

                if not existing:
                    # Update the account number
                    cursor.execute('UPDATE customers SET account_number = ? WHERE id = ?',
                                   (cleaned_account, customer_id))
                    print(
                        f'   Fixed: "{original_account}" -> "{cleaned_account}" ({name})')
                    fixed_count += 1
                else:
                    print(
                        f'   Skipped: "{original_account}" -> "{cleaned_account}" (duplicate exists)')

        conn.commit()
        print(f'\n✅ Fixed {fixed_count} customer account numbers')

        # Show sample of cleaned accounts
        cursor.execute('''
            SELECT account_number, name
            FROM customers 
            WHERE account_number IS NOT NULL 
            AND account_number != ""
            AND account_number NOT LIKE 'CUST%'
            ORDER BY account_number
            LIMIT 10
        ''')
        clean_accounts = cursor.fetchall()

        print('\nSample cleaned account numbers:')
        for acc, name in clean_accounts:
            print(f'   {acc}: {name}')

        conn.close()

    except Exception as e:
        print(f'❌ Error fixing account numbers: {e}')
        import traceback
        traceback.print_exc()


def re_link_data_after_cleanup():
    """Re-run linking after account cleanup"""

    print('\n🔗 RE-LINKING DATA AFTER CLEANUP')
    print('=' * 50)
    print('After cleaning account numbers, you should:')
    print('')
    print('1. 🔄 **Re-import vehicles** with cleaned customer accounts')
    print('2. 🔄 **Re-import documents** with cleaned customer accounts')
    print('3. ✅ **Verify improved linking** statistics')
    print('')
    print('Expected improvements:')
    print('   - Vehicle linking: 0.2% -> 60%+')
    print('   - Job linking: 35.8% -> 80%+')
    print('   - Complete data relationships')


if __name__ == "__main__":
    fix_customer_account_numbers()
    re_link_data_after_cleanup()
