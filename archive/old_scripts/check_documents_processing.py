#!/usr/bin/env python3
"""
Check how the documents were processed and verify linking
"""

import os
import sys


def check_documents_processing():
    """Check the results of the documents processing"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('📊 DOCUMENTS PROCESSING VERIFICATION')
        print('=' * 60)

        # 1. OVERALL STATISTICS
        print('\n1️⃣ OVERALL DATABASE STATISTICS:')
        print('-' * 40)

        # Get current counts
        tables_to_check = [
            ('customers', 'Customers'),
            ('vehicles', 'Vehicles'),
            ('jobs', 'Jobs'),
            ('invoices', 'Invoices'),
            ('payments', 'Payments')
        ]

        for table, label in tables_to_check:
            try:
                cursor.execute(f'SELECT COUNT(*) FROM {table}')
                count = cursor.fetchone()[0]
                print(f'   {label}: {count}')
            except:
                print(f'   {label}: Table not found')

        # 2. LINKING ANALYSIS
        print('\n2️⃣ DATA LINKING ANALYSIS:')
        print('-' * 40)

        # Vehicle-Customer linking
        cursor.execute(
            'SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL')
        linked_vehicles = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM vehicles')
        total_vehicles = cursor.fetchone()[0]
        vehicle_link_rate = (
            linked_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0
        print(
            f'   Vehicles linked to customers: {linked_vehicles}/{total_vehicles} ({vehicle_link_rate:.1f}%)')

        # Job-Customer linking
        cursor.execute(
            'SELECT COUNT(*) FROM jobs WHERE customer_id IS NOT NULL')
        linked_jobs = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM jobs')
        total_jobs = cursor.fetchone()[0]
        job_link_rate = (linked_jobs / total_jobs *
                         100) if total_jobs > 0 else 0
        print(
            f'   Jobs linked to customers: {linked_jobs}/{total_jobs} ({job_link_rate:.1f}%)')

        # Job-Vehicle linking
        cursor.execute(
            'SELECT COUNT(*) FROM jobs WHERE vehicle_id IS NOT NULL')
        job_vehicle_links = cursor.fetchone()[0]
        job_vehicle_rate = (job_vehicle_links / total_jobs *
                            100) if total_jobs > 0 else 0
        print(
            f'   Jobs linked to vehicles: {job_vehicle_links}/{total_jobs} ({job_vehicle_rate:.1f}%)')

        # Invoice-Job linking
        cursor.execute(
            'SELECT COUNT(*) FROM invoices WHERE job_id IS NOT NULL')
        invoice_job_links = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM invoices')
        total_invoices = cursor.fetchone()[0]
        invoice_link_rate = (invoice_job_links /
                             total_invoices * 100) if total_invoices > 0 else 0
        print(
            f'   Invoices linked to jobs: {invoice_job_links}/{total_invoices} ({invoice_link_rate:.1f}%)')

        # 3. RECENT PROCESSING ANALYSIS
        print('\n3️⃣ RECENT PROCESSING ANALYSIS:')
        print('-' * 40)

        # Check for recent jobs
        cursor.execute('''
            SELECT created_date, COUNT(*) as count
            FROM jobs 
            WHERE created_date IS NOT NULL
            GROUP BY created_date
            ORDER BY created_date DESC
            LIMIT 5
        ''')
        recent_jobs = cursor.fetchall()

        print('   Recent job creation dates:')
        for date_info in recent_jobs:
            print(f'     {date_info[0]}: {date_info[1]} jobs')

        # Check for recent vehicles
        cursor.execute('''
            SELECT created_at, COUNT(*) as count
            FROM vehicles 
            WHERE created_at IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY created_at DESC
            LIMIT 5
        ''')
        recent_vehicles = cursor.fetchall()

        print('\n   Recent vehicle creation dates:')
        for date_info in recent_vehicles:
            print(f'     {date_info[0]}: {date_info[1]} vehicles')

        # 4. SAMPLE LINKED DATA
        print('\n4️⃣ SAMPLE LINKED DATA:')
        print('-' * 40)

        # Sample jobs with customer links
        cursor.execute('''
            SELECT j.job_number, j.description, c.account_number, c.name, v.registration
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            WHERE j.customer_id IS NOT NULL
            LIMIT 5
        ''')
        linked_jobs_sample = cursor.fetchall()

        print('   Sample jobs linked to customers:')
        for job in linked_jobs_sample:
            desc = job[1][:40] + \
                "..." if job[1] and len(
                    job[1]) > 40 else job[1] or "No description"
            customer = f"{job[2]} ({job[3]})" if job[2] else "No customer"
            vehicle = job[4] if job[4] else "No vehicle"
            print(f'     Job {job[0]}: {desc}')
            print(f'       Customer: {customer} | Vehicle: {vehicle}')
            print()

        # Sample vehicles with customer links
        cursor.execute('''
            SELECT v.registration, v.make, v.model, c.account_number, c.name
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            WHERE v.customer_id IS NOT NULL
            LIMIT 5
        ''')
        linked_vehicles_sample = cursor.fetchall()

        print('   Sample vehicles linked to customers:')
        for vehicle in linked_vehicles_sample:
            print(
                f'     {vehicle[0]} {vehicle[1]} {vehicle[2]} -> {vehicle[3]} ({vehicle[4]})')

        # 5. PROCESSING QUALITY INDICATORS
        print('\n5️⃣ PROCESSING QUALITY INDICATORS:')
        print('-' * 40)

        # Check for jobs with financial data
        cursor.execute('SELECT COUNT(*) FROM jobs WHERE total_amount > 0')
        jobs_with_amounts = cursor.fetchone()[0]
        print(f'   Jobs with financial data: {jobs_with_amounts}')

        # Check for vehicles with proper registration format
        cursor.execute('''
            SELECT COUNT(*) FROM vehicles 
            WHERE registration IS NOT NULL 
            AND registration != "" 
            AND LENGTH(registration) >= 5
        ''')
        proper_registrations = cursor.fetchone()[0]
        print(f'   Vehicles with proper registrations: {proper_registrations}')

        # Check for invoices with amounts
        cursor.execute('SELECT COUNT(*) FROM invoices WHERE total_amount > 0')
        invoices_with_amounts = cursor.fetchone()[0]
        print(f'   Invoices with amounts: {invoices_with_amounts}')

        conn.close()

    except Exception as e:
        print(f'❌ Error checking documents processing: {e}')
        import traceback
        traceback.print_exc()


def check_linking_success():
    """Check if the improved linking logic worked"""

    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print('\n🔗 LINKING SUCCESS VERIFICATION:')
        print('=' * 60)

        # Check customer account patterns that should have linked
        cursor.execute('''
            SELECT account_number, COUNT(*) as count
            FROM customers 
            WHERE account_number IS NOT NULL 
            AND account_number != ""
            AND account_number NOT LIKE 'CUST%'
            GROUP BY account_number
            ORDER BY CAST(account_number AS INTEGER)
            LIMIT 10
        ''')
        customer_accounts = cursor.fetchall()

        print('   Customer accounts available for linking:')
        for acc in customer_accounts:
            print(f'     Account: {acc[0]} ({acc[1]} records)')

        # Check if any vehicles linked to these accounts
        print('\n   Checking vehicle linking to these accounts:')
        for acc in customer_accounts[:5]:  # Check first 5
            cursor.execute('''
                SELECT COUNT(*) FROM vehicles v
                JOIN customers c ON v.customer_id = c.id
                WHERE c.account_number = ?
            ''', (acc[0],))
            vehicle_count = cursor.fetchone()[0]
            print(f'     Account {acc[0]}: {vehicle_count} vehicles linked')

        # Check if any jobs linked to these accounts
        print('\n   Checking job linking to these accounts:')
        for acc in customer_accounts[:5]:  # Check first 5
            cursor.execute('''
                SELECT COUNT(*) FROM jobs j
                JOIN customers c ON j.customer_id = c.id
                WHERE c.account_number = ?
            ''', (acc[0],))
            job_count = cursor.fetchone()[0]
            print(f'     Account {acc[0]}: {job_count} jobs linked')

        conn.close()

    except Exception as e:
        print(f'❌ Error checking linking success: {e}')


def show_processing_assessment():
    """Show assessment of the documents processing"""

    print('\n📋 DOCUMENTS PROCESSING ASSESSMENT:')
    print('=' * 60)
    print('Based on the analysis above:')
    print('')
    print('✅ **SUCCESS INDICATORS:**')
    print('   - High percentage of jobs/vehicles linked to customers')
    print('   - Recent creation dates showing new imports')
    print('   - Proper financial data in jobs and invoices')
    print('   - Valid vehicle registrations')
    print('')
    print('⚠️  **POTENTIAL ISSUES:**')
    print('   - Low linking percentages (< 50%)')
    print('   - No recent creation dates')
    print('   - Missing financial data')
    print('   - Malformed vehicle registrations')
    print('')
    print('🔧 **NEXT STEPS:**')
    print('   - If linking successful: System is ready for use')
    print('   - If linking failed: Check customer account matching')
    print('   - Consider re-importing with smaller chunks')
    print('   - Verify document CSV format matches expectations')


if __name__ == "__main__":
    check_documents_processing()
    check_linking_success()
    show_processing_assessment()
