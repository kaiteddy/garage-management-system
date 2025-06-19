#!/usr/bin/env python3
"""
Comprehensive verification of data connections and account number usage
"""

import sys
import os

def verify_database_connections():
    """Verify all data connections and account number usage"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print('🔍 COMPREHENSIVE DATA CONNECTION VERIFICATION')
        print('=' * 70)
        
        # 1. CUSTOMER ACCOUNT NUMBER ANALYSIS
        print('\n1️⃣ CUSTOMER ACCOUNT NUMBER ANALYSIS:')
        print('-' * 50)
        
        cursor.execute('SELECT COUNT(*) FROM customers')
        total_customers = cursor.fetchone()[0]
        print(f'   Total customers: {total_customers}')
        
        cursor.execute('SELECT COUNT(*) FROM customers WHERE account_number IS NOT NULL AND account_number != ""')
        customers_with_accounts = cursor.fetchone()[0]
        print(f'   Customers with account numbers: {customers_with_accounts}')
        
        cursor.execute('SELECT COUNT(*) FROM customers WHERE account_number IS NULL OR account_number = ""')
        customers_without_accounts = cursor.fetchone()[0]
        print(f'   Customers without account numbers: {customers_without_accounts}')
        
        # Sample account numbers
        cursor.execute('SELECT account_number, name FROM customers WHERE account_number IS NOT NULL AND account_number != "" LIMIT 10')
        sample_accounts = cursor.fetchall()
        print('\n   Sample account numbers:')
        for acc in sample_accounts:
            print(f'     {acc[0]} -> {acc[1]}')
        
        # 2. VEHICLE-CUSTOMER CONNECTIONS
        print('\n2️⃣ VEHICLE-CUSTOMER CONNECTIONS:')
        print('-' * 50)
        
        cursor.execute('SELECT COUNT(*) FROM vehicles')
        total_vehicles = cursor.fetchone()[0]
        print(f'   Total vehicles: {total_vehicles}')
        
        cursor.execute('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL')
        linked_vehicles = cursor.fetchone()[0]
        print(f'   Vehicles linked to customers: {linked_vehicles}')
        
        cursor.execute('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NULL')
        unlinked_vehicles = cursor.fetchone()[0]
        print(f'   Vehicles NOT linked: {unlinked_vehicles}')
        
        # Sample vehicle-customer links
        cursor.execute('''
            SELECT v.registration, v.make, v.model, c.account_number, c.name
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            LIMIT 10
        ''')
        sample_vehicle_links = cursor.fetchall()
        print('\n   Sample vehicle-customer links:')
        for link in sample_vehicle_links:
            customer_info = f"{link[3]} ({link[4]})" if link[3] else "NO CUSTOMER LINKED"
            print(f'     {link[0]} {link[1]} {link[2]} -> {customer_info}')
        
        # 3. JOB-CUSTOMER CONNECTIONS
        print('\n3️⃣ JOB-CUSTOMER CONNECTIONS:')
        print('-' * 50)
        
        cursor.execute('SELECT COUNT(*) FROM jobs')
        total_jobs = cursor.fetchone()[0]
        print(f'   Total jobs: {total_jobs}')
        
        cursor.execute('SELECT COUNT(*) FROM jobs WHERE customer_id IS NOT NULL')
        linked_jobs = cursor.fetchone()[0]
        print(f'   Jobs linked to customers: {linked_jobs}')
        
        cursor.execute('SELECT COUNT(*) FROM jobs WHERE customer_id IS NULL')
        unlinked_jobs = cursor.fetchone()[0]
        print(f'   Jobs NOT linked: {unlinked_jobs}')
        
        # Sample job-customer links
        cursor.execute('''
            SELECT j.job_number, j.description, c.account_number, c.name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE j.job_number IS NOT NULL
            LIMIT 10
        ''')
        sample_job_links = cursor.fetchall()
        print('\n   Sample job-customer links:')
        for link in sample_job_links:
            customer_info = f"{link[2]} ({link[3]})" if link[2] else "NO CUSTOMER LINKED"
            job_desc = link[1][:30] + "..." if link[1] and len(link[1]) > 30 else link[1] or "No description"
            print(f'     Job {link[0]}: {job_desc} -> {customer_info}')
        
        # 4. INVOICE-JOB-CUSTOMER CONNECTIONS
        print('\n4️⃣ INVOICE-JOB-CUSTOMER CONNECTIONS:')
        print('-' * 50)
        
        cursor.execute('SELECT COUNT(*) FROM invoices')
        total_invoices = cursor.fetchone()[0]
        print(f'   Total invoices: {total_invoices}')
        
        cursor.execute('SELECT COUNT(*) FROM invoices WHERE customer_id IS NOT NULL')
        customer_linked_invoices = cursor.fetchone()[0]
        print(f'   Invoices linked to customers: {customer_linked_invoices}')
        
        cursor.execute('SELECT COUNT(*) FROM invoices WHERE job_id IS NOT NULL')
        job_linked_invoices = cursor.fetchone()[0]
        print(f'   Invoices linked to jobs: {job_linked_invoices}')
        
        # Sample invoice connections
        cursor.execute('''
            SELECT i.invoice_number, i.total_amount, j.job_number, c.account_number, c.name
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN customers c ON i.customer_id = c.id
            LIMIT 10
        ''')
        sample_invoice_links = cursor.fetchall()
        print('\n   Sample invoice connections:')
        for link in sample_invoice_links:
            customer_info = f"{link[3]} ({link[4]})" if link[3] else "NO CUSTOMER"
            job_info = f"Job {link[2]}" if link[2] else "NO JOB"
            print(f'     Invoice {link[0]} (£{link[1]}) -> {job_info} -> {customer_info}')
        
        # 5. PAYMENT CONNECTIONS
        print('\n5️⃣ PAYMENT CONNECTIONS:')
        print('-' * 50)
        
        try:
            cursor.execute('SELECT COUNT(*) FROM payments')
            total_payments = cursor.fetchone()[0]
            print(f'   Total payments: {total_payments}')
            
            cursor.execute('SELECT COUNT(*) FROM payments WHERE customer_id IS NOT NULL')
            customer_linked_payments = cursor.fetchone()[0]
            print(f'   Payments linked to customers: {customer_linked_payments}')
            
            cursor.execute('SELECT COUNT(*) FROM payments WHERE invoice_id IS NOT NULL')
            invoice_linked_payments = cursor.fetchone()[0]
            print(f'   Payments linked to invoices: {invoice_linked_payments}')
            
            cursor.execute('SELECT COUNT(*) FROM payments WHERE amount < 0')
            negative_payments = cursor.fetchone()[0]
            print(f'   Credit notes/refunds: {negative_payments}')
            
        except sqlite3.OperationalError:
            print('   Payments table not found or empty')
        
        # 6. DATA INTEGRITY ISSUES
        print('\n6️⃣ DATA INTEGRITY ANALYSIS:')
        print('-' * 50)
        
        # Check for orphaned vehicles (vehicles without valid customer links)
        cursor.execute('''
            SELECT COUNT(*) FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            WHERE v.customer_id IS NOT NULL AND c.id IS NULL
        ''')
        orphaned_vehicles = cursor.fetchone()[0]
        print(f'   Orphaned vehicles (invalid customer_id): {orphaned_vehicles}')
        
        # Check for orphaned jobs
        cursor.execute('''
            SELECT COUNT(*) FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE j.customer_id IS NOT NULL AND c.id IS NULL
        ''')
        orphaned_jobs = cursor.fetchone()[0]
        print(f'   Orphaned jobs (invalid customer_id): {orphaned_jobs}')
        
        # Check for duplicate account numbers
        cursor.execute('''
            SELECT account_number, COUNT(*) as count
            FROM customers
            WHERE account_number IS NOT NULL AND account_number != ""
            GROUP BY account_number
            HAVING COUNT(*) > 1
        ''')
        duplicate_accounts = cursor.fetchall()
        if duplicate_accounts:
            print(f'   ⚠️  Duplicate account numbers found: {len(duplicate_accounts)}')
            for dup in duplicate_accounts[:5]:
                print(f'     Account {dup[0]} appears {dup[1]} times')
        else:
            print('   ✅ No duplicate account numbers found')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error during verification: {e}')
        import traceback
        traceback.print_exc()

def check_eli_motors_linking():
    """Check if ELI MOTORS data is properly linked"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print('\n🔗 ELI MOTORS DATA LINKING ANALYSIS:')
        print('-' * 50)
        
        # Check if vehicles are linking to ELI MOTORS customers
        cursor.execute('''
            SELECT COUNT(*) FROM vehicles v
            JOIN customers c ON v.customer_id = c.id
            WHERE c.account_number NOT LIKE 'CUST%'
            AND c.account_number IS NOT NULL
            AND c.account_number != ''
        ''')
        eli_customer_vehicles = cursor.fetchone()[0]
        print(f'   Vehicles linked to ELI MOTORS customers: {eli_customer_vehicles}')
        
        # Check if jobs are linking to ELI MOTORS customers
        cursor.execute('''
            SELECT COUNT(*) FROM jobs j
            JOIN customers c ON j.customer_id = c.id
            WHERE c.account_number NOT LIKE 'CUST%'
            AND c.account_number IS NOT NULL
            AND c.account_number != ''
        ''')
        eli_customer_jobs = cursor.fetchone()[0]
        print(f'   Jobs linked to ELI MOTORS customers: {eli_customer_jobs}')
        
        # Sample ELI MOTORS customer data
        cursor.execute('''
            SELECT account_number, name, address, email, mobile
            FROM customers
            WHERE account_number NOT LIKE 'CUST%'
            AND account_number IS NOT NULL
            AND account_number != ''
            LIMIT 5
        ''')
        eli_customers = cursor.fetchall()
        print('\n   Sample ELI MOTORS customers:')
        for customer in eli_customers:
            print(f'     {customer[0]}: {customer[1]}')
            print(f'       Address: {customer[2]}')
            print(f'       Contact: {customer[3]} | {customer[4]}')
            print()
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking ELI MOTORS linking: {e}')

def show_recommendations():
    """Show recommendations based on verification"""
    
    print('\n💡 RECOMMENDATIONS:')
    print('=' * 50)
    print('Based on the verification results:')
    print('')
    print('1. 🔍 **Check Customer Import:**')
    print('   - If most vehicles/jobs are unlinked, re-import customers')
    print('   - Ensure "Update existing records" is enabled')
    print('')
    print('2. 🔗 **Fix Data Linking:**')
    print('   - Vehicles should link via _ID_Customer field')
    print('   - Jobs should link via customer account numbers')
    print('   - Check import mapping is correct')
    print('')
    print('3. 📊 **Expected Results for Complete ELI MOTORS Import:**')
    print('   - 7,000+ customers with real account numbers')
    print('   - 10,000+ vehicles linked to customers')
    print('   - 20,000+ jobs linked to customers')
    print('   - All data properly connected')
    print('')
    print('4. 🚀 **If Issues Found:**')
    print('   - Re-import customers first (foundation data)')
    print('   - Then re-import vehicles (will link to customers)')
    print('   - Then re-import documents/jobs (will link to both)')

if __name__ == "__main__":
    verify_database_connections()
    check_eli_motors_linking()
    show_recommendations()
