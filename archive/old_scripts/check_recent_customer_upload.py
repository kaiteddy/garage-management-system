#!/usr/bin/env python3
"""
Check if the recent customer upload worked properly
"""

import os
import sys


def check_customer_upload_results():
    """Check the results of the recent customer upload"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('📊 RECENT CUSTOMER UPLOAD VERIFICATION')
        print('=' * 60)

        # 1. TOTAL CUSTOMER COUNT
        print('\n1️⃣ CUSTOMER COUNT ANALYSIS:')
        print('-' * 40)

        cursor.execute('SELECT COUNT(*) FROM customers')
        total_customers = cursor.fetchone()[0]
        print(f'   Total customers in database: {total_customers}')

        # Expected: Should be around 7,000+ if ELI MOTORS import worked
        if total_customers > 6000:
            print('   ✅ Customer count looks good (6,000+)')
        elif total_customers > 1000:
            print('   ⚠️  Moderate customer count (1,000+)')
        else:
            print('   ❌ Low customer count (under 1,000)')

        # 2. CUSTOMER DATA QUALITY
        print('\n2️⃣ CUSTOMER DATA QUALITY:')
        print('-' * 40)

        # Check customers with account numbers
        cursor.execute(
            'SELECT COUNT(*) FROM customers WHERE account_number IS NOT NULL AND account_number != ""')
        customers_with_accounts = cursor.fetchone()[0]
        print(f'   Customers with account numbers: {customers_with_accounts}')

        # Check customers with names
        cursor.execute(
            'SELECT COUNT(*) FROM customers WHERE name IS NOT NULL AND name != ""')
        customers_with_names = cursor.fetchone()[0]
        print(f'   Customers with names: {customers_with_names}')

        # Check customers with contact info
        cursor.execute(
            'SELECT COUNT(*) FROM customers WHERE email IS NOT NULL AND email != "" AND email != "nan"')
        customers_with_email = cursor.fetchone()[0]
        print(f'   Customers with email: {customers_with_email}')

        cursor.execute(
            'SELECT COUNT(*) FROM customers WHERE mobile IS NOT NULL AND mobile != "" AND mobile != "nan"')
        customers_with_mobile = cursor.fetchone()[0]
        print(f'   Customers with mobile: {customers_with_mobile}')

        cursor.execute(
            'SELECT COUNT(*) FROM customers WHERE address IS NOT NULL AND address != "" AND address != "nan"')
        customers_with_address = cursor.fetchone()[0]
        print(f'   Customers with address: {customers_with_address}')

        # 3. SAMPLE CUSTOMER DATA
        print('\n3️⃣ SAMPLE CUSTOMER DATA:')
        print('-' * 40)

        # Show recent customers (likely from ELI MOTORS)
        cursor.execute('''
            SELECT account_number, name, company, address, email, mobile
            FROM customers 
            WHERE account_number IS NOT NULL AND account_number != ""
            AND account_number NOT LIKE 'CUST%'
            ORDER BY id DESC
            LIMIT 10
        ''')
        recent_customers = cursor.fetchall()

        print('   Recent ELI MOTORS customers:')
        for i, customer in enumerate(recent_customers, 1):
            print(f'   {i:2d}. Account: {customer[0]} | Name: {customer[1]}')
            if customer[2]:  # Company
                print(f'       Company: {customer[2]}')
            if customer[3]:  # Address
                print(
                    f'       Address: {customer[3][:50]}{"..." if len(customer[3]) > 50 else ""}')
            if customer[4]:  # Email
                print(f'       Email: {customer[4]}')
            if customer[5]:  # Mobile
                print(f'       Mobile: {customer[5]}')
            print()

        # 4. ACCOUNT NUMBER PATTERNS
        print('\n4️⃣ ACCOUNT NUMBER PATTERNS:')
        print('-' * 40)

        # Check different account number formats
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN account_number LIKE 'CUST%' THEN 'Demo (CUST%)'
                    WHEN account_number REGEXP '^[0-9]+$' THEN 'Numeric'
                    WHEN account_number REGEXP '^[0-9]+\\.0$' THEN 'Decimal'
                    WHEN account_number REGEXP '^[A-Z]+[0-9]+$' THEN 'Alpha-Numeric'
                    ELSE 'Other'
                END as pattern_type,
                COUNT(*) as count
            FROM customers 
            WHERE account_number IS NOT NULL AND account_number != ""
            GROUP BY pattern_type
            ORDER BY count DESC
        ''')

        try:
            patterns = cursor.fetchall()
            print('   Account number patterns:')
            for pattern in patterns:
                print(f'     {pattern[0]}: {pattern[1]} customers')
        except:
            # Fallback if REGEXP not supported
            cursor.execute('''
                SELECT account_number, COUNT(*) as count
                FROM customers 
                WHERE account_number IS NOT NULL AND account_number != ""
                GROUP BY 
                    CASE 
                        WHEN account_number LIKE 'CUST%' THEN 'Demo'
                        WHEN account_number LIKE '%.0' THEN 'Decimal'
                        ELSE 'Other'
                    END
                ORDER BY count DESC
                LIMIT 5
            ''')
            patterns = cursor.fetchall()
            print('   Sample account numbers:')
            for pattern in patterns[:5]:
                print(f'     {pattern[0]}: {pattern[1]} occurrences')

        # 5. DATA COMPLETENESS ANALYSIS
        print('\n5️⃣ DATA COMPLETENESS ANALYSIS:')
        print('-' * 40)

        completeness_fields = [
            ('account_number', 'Account Numbers'),
            ('name', 'Names'),
            ('address', 'Addresses'),
            ('email', 'Email Addresses'),
            ('mobile', 'Mobile Numbers'),
            ('phone', 'Phone Numbers')
        ]

        for field, label in completeness_fields:
            cursor.execute(f'''
                SELECT COUNT(*) FROM customers 
                WHERE {field} IS NOT NULL AND {field} != "" AND {field} != "nan"
            ''')
            count = cursor.fetchone()[0]
            percentage = (count / total_customers *
                          100) if total_customers > 0 else 0
            print(f'   {label}: {count}/{total_customers} ({percentage:.1f}%)')

        # 6. RECENT IMPORT TIMESTAMP CHECK
        print('\n6️⃣ RECENT IMPORT ANALYSIS:')
        print('-' * 40)

        # Check for recently created customers
        cursor.execute('''
            SELECT created_date, COUNT(*) as count
            FROM customers 
            WHERE created_date IS NOT NULL
            GROUP BY created_date
            ORDER BY created_date DESC
            LIMIT 5
        ''')
        recent_dates = cursor.fetchall()

        print('   Recent import dates:')
        for date_info in recent_dates:
            print(f'     {date_info[0]}: {date_info[1]} customers')

        conn.close()

    except Exception as e:
        print(f'❌ Error checking customer upload: {e}')
        import traceback
        traceback.print_exc()


def check_eli_motors_data_quality():
    """Check the quality of ELI MOTORS customer data specifically"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('\n🔍 ELI MOTORS DATA QUALITY CHECK:')
        print('=' * 60)

        # Count non-demo customers
        cursor.execute('''
            SELECT COUNT(*) FROM customers 
            WHERE account_number NOT LIKE 'CUST%' 
            AND account_number IS NOT NULL 
            AND account_number != ""
        ''')
        eli_customers = cursor.fetchone()[0]
        print(f'   ELI MOTORS customers (non-demo): {eli_customers}')

        # Check for proper name formatting
        cursor.execute('''
            SELECT COUNT(*) FROM customers 
            WHERE account_number NOT LIKE 'CUST%'
            AND name IS NOT NULL 
            AND name != ""
            AND name != "nan"
            AND LENGTH(name) > 3
        ''')
        proper_names = cursor.fetchone()[0]
        print(f'   Customers with proper names: {proper_names}')

        # Check for complete addresses
        cursor.execute('''
            SELECT COUNT(*) FROM customers 
            WHERE account_number NOT LIKE 'CUST%'
            AND address IS NOT NULL 
            AND address != ""
            AND address != "nan"
            AND LENGTH(address) > 10
        ''')
        complete_addresses = cursor.fetchone()[0]
        print(f'   Customers with complete addresses: {complete_addresses}')

        # Check for valid email addresses
        cursor.execute('''
            SELECT COUNT(*) FROM customers 
            WHERE account_number NOT LIKE 'CUST%'
            AND email IS NOT NULL 
            AND email != ""
            AND email != "nan"
            AND email LIKE '%@%'
        ''')
        valid_emails = cursor.fetchone()[0]
        print(f'   Customers with valid emails: {valid_emails}')

        # Sample of high-quality customer records
        cursor.execute('''
            SELECT account_number, name, address, email, mobile
            FROM customers 
            WHERE account_number NOT LIKE 'CUST%'
            AND name IS NOT NULL AND name != "" AND name != "nan"
            AND address IS NOT NULL AND address != "" AND address != "nan"
            AND (email LIKE '%@%' OR mobile IS NOT NULL AND mobile != "" AND mobile != "nan")
            LIMIT 5
        ''')
        quality_customers = cursor.fetchall()

        print('\n   Sample high-quality customer records:')
        for customer in quality_customers:
            print(f'     {customer[0]}: {customer[1]}')
            print(f'       Address: {customer[2]}')
            print(f'       Contact: {customer[3]} | {customer[4]}')
            print()

        conn.close()

    except Exception as e:
        print(f'❌ Error checking ELI MOTORS data quality: {e}')


def show_upload_assessment():
    """Show overall assessment of the customer upload"""

    print('\n📋 CUSTOMER UPLOAD ASSESSMENT:')
    print('=' * 60)
    print('Based on the analysis above:')
    print('')
    print('✅ **SUCCESS INDICATORS:**')
    print('   - Customer count > 6,000 (indicates successful ELI MOTORS import)')
    print('   - High percentage of customers with account numbers')
    print('   - Proper name formatting (First Last, not shifted data)')
    print('   - Complete address information')
    print('   - Valid contact information')
    print('')
    print('⚠️  **POTENTIAL ISSUES:**')
    print('   - Low customer count (< 1,000)')
    print('   - Many customers missing names or account numbers')
    print('   - Malformed data (names in wrong fields)')
    print('   - High percentage of "nan" values')
    print('')
    print('🔧 **NEXT STEPS:**')
    print('   - If upload successful: Proceed to re-import vehicles/documents')
    print('   - If issues found: Re-import customers with correct mapping')
    print('   - Verify data linking works with improved logic')


if __name__ == "__main__":
    check_customer_upload_results()
    check_eli_motors_data_quality()
    show_upload_assessment()
