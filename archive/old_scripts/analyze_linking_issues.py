#!/usr/bin/env python3
"""
Comprehensive analysis of data linking issues in ELI MOTORS database
"""

import os
import sys


def analyze_customer_id_patterns():
    """Analyze customer ID patterns to understand the mismatch"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('🔍 CUSTOMER ID PATTERN ANALYSIS')
        print('=' * 60)

        # 1. Analyze customer account number patterns
        print('\n1️⃣ CUSTOMER ACCOUNT NUMBER PATTERNS:')
        print('-' * 40)

        # Get all unique account number patterns
        cursor.execute('''
            SELECT account_number, name, id
            FROM customers 
            WHERE account_number IS NOT NULL AND account_number != ""
            ORDER BY account_number
        ''')
        customers = cursor.fetchall()

        # Categorize patterns
        numeric_only = []
        alpha_numeric = []
        decimal_format = []
        other_format = []

        for acc, name, cust_id in customers:
            if acc.isdigit():
                numeric_only.append((acc, name, cust_id))
            elif acc.replace('.', '').isdigit():
                decimal_format.append((acc, name, cust_id))
            elif any(c.isalpha() for c in acc) and any(c.isdigit() for c in acc):
                alpha_numeric.append((acc, name, cust_id))
            else:
                other_format.append((acc, name, cust_id))

        print(
            f'   Numeric only (e.g., "004", "010"): {len(numeric_only)} customers')
        print(
            f'   Alpha-numeric (e.g., "AAN001", "GEO001"): {len(alpha_numeric)} customers')
        print(
            f'   Decimal format (e.g., "0.0", "1.0"): {len(decimal_format)} customers')
        print(f'   Other formats: {len(other_format)} customers')

        # Show samples
        if numeric_only:
            print('\n   Sample numeric accounts:')
            for acc, name, _ in numeric_only[:5]:
                print(f'     {acc}: {name}')

        if alpha_numeric:
            print('\n   Sample alpha-numeric accounts:')
            for acc, name, _ in alpha_numeric[:5]:
                print(f'     {acc}: {name}')

        # 2. Check what _ID_Customer values exist in vehicles
        print('\n2️⃣ VEHICLE _ID_Customer ANALYSIS:')
        print('-' * 40)

        # We need to check the original CSV or look at unlinked vehicles
        cursor.execute('''
            SELECT registration, make, model, customer_id
            FROM vehicles 
            WHERE customer_id IS NULL
            LIMIT 10
        ''')
        unlinked_vehicles = cursor.fetchall()

        print(f'   Total unlinked vehicles: {len(unlinked_vehicles)}')
        print('   Sample unlinked vehicles:')
        for reg, make, model, _ in unlinked_vehicles[:5]:
            print(f'     {reg} {make} {model}')

        # 3. Check jobs for customer references
        print('\n3️⃣ JOB CUSTOMER REFERENCE ANALYSIS:')
        print('-' * 40)

        cursor.execute('''
            SELECT job_number, customer_id, vehicle_id, description
            FROM jobs 
            WHERE customer_id IS NULL
            LIMIT 10
        ''')
        unlinked_jobs = cursor.fetchall()

        print(f'   Total unlinked jobs: {len(unlinked_jobs)}')
        print('   Sample unlinked jobs:')
        for job_num, _, _, desc in unlinked_jobs[:3]:
            desc_short = desc[:50] + \
                "..." if desc and len(desc) > 50 else desc or "No description"
            print(f'     {job_num}: {desc_short}')

        conn.close()

    except Exception as e:
        print(f'❌ Error analyzing patterns: {e}')
        import traceback
        traceback.print_exc()


def create_customer_id_mapping():
    """Create a mapping between different customer ID formats"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('\n🗺️ CREATING CUSTOMER ID MAPPING')
        print('=' * 60)

        # Create a temporary mapping table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_id_mapping (
                customer_db_id INTEGER,
                account_number TEXT,
                numeric_id TEXT,
                alpha_id TEXT,
                name TEXT,
                PRIMARY KEY (customer_db_id)
            )
        ''')

        # Clear existing mappings
        cursor.execute('DELETE FROM customer_id_mapping')

        # Get all customers and create mappings
        cursor.execute('''
            SELECT id, account_number, name
            FROM customers 
            WHERE account_number IS NOT NULL AND account_number != ""
        ''')
        customers = cursor.fetchall()

        mapping_count = 0

        for cust_id, account_number, name in customers:
            numeric_id = None
            alpha_id = None

            # Extract numeric part if it exists
            if account_number.isdigit():
                numeric_id = account_number
            elif account_number.replace('.', '').isdigit():
                # Handle decimal format
                try:
                    numeric_id = str(int(float(account_number)))
                except:
                    pass
            else:
                # Extract numeric part from alpha-numeric
                import re
                numeric_match = re.search(r'(\d+)', account_number)
                if numeric_match:
                    numeric_id = numeric_match.group(1)
                alpha_id = account_number

            # Insert mapping
            cursor.execute('''
                INSERT INTO customer_id_mapping 
                (customer_db_id, account_number, numeric_id, alpha_id, name)
                VALUES (?, ?, ?, ?, ?)
            ''', (cust_id, account_number, numeric_id, alpha_id, name))

            mapping_count += 1

        conn.commit()
        print(f'   Created {mapping_count} customer ID mappings')

        # Show sample mappings
        cursor.execute('''
            SELECT account_number, numeric_id, alpha_id, name
            FROM customer_id_mapping
            LIMIT 10
        ''')
        mappings = cursor.fetchall()

        print('\n   Sample ID mappings:')
        for acc, num_id, alpha_id, name in mappings:
            print(
                f'     Account: {acc} | Numeric: {num_id} | Alpha: {alpha_id} | Name: {name}')

        conn.close()

    except Exception as e:
        print(f'❌ Error creating mapping: {e}')
        import traceback
        traceback.print_exc()


def analyze_vehicle_registration_linking():
    """Analyze potential vehicle linking via registration numbers in jobs"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('\n🚗 VEHICLE REGISTRATION LINKING ANALYSIS')
        print('=' * 60)

        # Check if jobs contain vehicle registration references
        cursor.execute('''
            SELECT j.job_number, j.description, v.registration, v.make, v.model
            FROM jobs j
            JOIN vehicles v ON j.vehicle_id = v.id
            WHERE j.vehicle_id IS NOT NULL
            LIMIT 5
        ''')
        linked_job_vehicles = cursor.fetchall()

        print('   Sample jobs already linked to vehicles:')
        for job_num, desc, reg, make, model in linked_job_vehicles:
            desc_short = desc[:30] + \
                "..." if desc and len(desc) > 30 else desc or "No description"
            print(f'     {job_num}: {reg} {make} {model} - {desc_short}')

        # Check for potential registration matches in job descriptions
        cursor.execute('''
            SELECT j.job_number, j.description, j.customer_id, j.vehicle_id
            FROM jobs j
            WHERE j.description IS NOT NULL 
            AND j.description != ""
            AND j.vehicle_id IS NULL
            LIMIT 10
        ''')
        unlinked_jobs_with_desc = cursor.fetchall()

        print('\n   Sample unlinked jobs with descriptions (potential reg matches):')
        for job_num, desc, cust_id, veh_id in unlinked_jobs_with_desc[:3]:
            desc_short = desc[:60] + "..." if desc and len(desc) > 60 else desc
            print(f'     {job_num}: {desc_short}')

        conn.close()

    except Exception as e:
        print(f'❌ Error analyzing vehicle linking: {e}')


if __name__ == "__main__":
    analyze_customer_id_patterns()
    create_customer_id_mapping()
    analyze_vehicle_registration_linking()
