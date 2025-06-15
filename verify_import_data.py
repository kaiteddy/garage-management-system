#!/usr/bin/env python3
"""
Verify what data was actually imported from ELI MOTORS
"""

import sys
import os

def check_database_details():
    """Check detailed database contents"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print('🔍 DETAILED DATABASE ANALYSIS')
        print('=' * 60)
        
        # Check customers in detail
        print('\n👥 CUSTOMERS ANALYSIS:')
        cursor.execute('SELECT COUNT(*) FROM customers')
        total_customers = cursor.fetchone()[0]
        print(f'   Total customers: {total_customers}')
        
        cursor.execute('SELECT COUNT(*) FROM customers WHERE account_number LIKE "CUST%"')
        demo_customers = cursor.fetchone()[0]
        print(f'   Demo customers (CUST%): {demo_customers}')
        
        cursor.execute('SELECT COUNT(*) FROM customers WHERE account_number NOT LIKE "CUST%" AND account_number IS NOT NULL AND account_number != ""')
        real_customers = cursor.fetchone()[0]
        print(f'   Real customers (non-CUST): {real_customers}')
        
        # Show sample real customers
        cursor.execute('SELECT account_number, name FROM customers WHERE account_number NOT LIKE "CUST%" AND account_number IS NOT NULL AND account_number != "" LIMIT 5')
        real_customer_samples = cursor.fetchall()
        if real_customer_samples:
            print('   Sample real customers:')
            for customer in real_customer_samples:
                print(f'     - {customer[0]}: {customer[1]}')
        
        # Check vehicles
        print('\n🚗 VEHICLES ANALYSIS:')
        cursor.execute('SELECT COUNT(*) FROM vehicles')
        total_vehicles = cursor.fetchone()[0]
        print(f'   Total vehicles: {total_vehicles}')
        
        cursor.execute('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL')
        linked_vehicles = cursor.fetchone()[0]
        print(f'   Vehicles linked to customers: {linked_vehicles}')
        
        cursor.execute('SELECT COUNT(*) FROM vehicles WHERE customer_id IS NULL')
        unlinked_vehicles = cursor.fetchone()[0]
        print(f'   Vehicles not linked: {unlinked_vehicles}')
        
        # Check jobs
        print('\n🔧 JOBS ANALYSIS:')
        cursor.execute('SELECT COUNT(*) FROM jobs')
        total_jobs = cursor.fetchone()[0]
        print(f'   Total jobs: {total_jobs}')
        
        cursor.execute('SELECT COUNT(*) FROM jobs WHERE customer_id IS NOT NULL')
        linked_jobs = cursor.fetchone()[0]
        print(f'   Jobs linked to customers: {linked_jobs}')
        
        cursor.execute('SELECT COUNT(*) FROM jobs WHERE vehicle_id IS NOT NULL')
        vehicle_linked_jobs = cursor.fetchone()[0]
        print(f'   Jobs linked to vehicles: {vehicle_linked_jobs}')
        
        # Check invoices
        print('\n💰 INVOICES ANALYSIS:')
        cursor.execute('SELECT COUNT(*) FROM invoices')
        total_invoices = cursor.fetchone()[0]
        print(f'   Total invoices: {total_invoices}')
        
        cursor.execute('SELECT COUNT(*) FROM invoices WHERE customer_id IS NOT NULL')
        linked_invoices = cursor.fetchone()[0]
        print(f'   Invoices linked to customers: {linked_invoices}')
        
        cursor.execute('SELECT COUNT(*) FROM invoices WHERE job_id IS NOT NULL')
        job_linked_invoices = cursor.fetchone()[0]
        print(f'   Invoices linked to jobs: {job_linked_invoices}')
        
        # Check payments if table exists
        try:
            cursor.execute('SELECT COUNT(*) FROM payments')
            total_payments = cursor.fetchone()[0]
            print(f'\n💳 PAYMENTS: {total_payments} records')
            
            cursor.execute('SELECT COUNT(*) FROM payments WHERE amount < 0')
            negative_payments = cursor.fetchone()[0]
            print(f'   Credit notes/refunds: {negative_payments}')
        except:
            print('\n💳 PAYMENTS: Table not found or empty')
        
        # Check data relationships
        print('\n🔗 DATA RELATIONSHIP ANALYSIS:')
        
        # Customer-Vehicle relationships
        cursor.execute('''
            SELECT COUNT(*) FROM vehicles v 
            JOIN customers c ON v.customer_id = c.id 
            WHERE c.account_number NOT LIKE "CUST%"
        ''')
        real_customer_vehicles = cursor.fetchone()[0]
        print(f'   Vehicles linked to real customers: {real_customer_vehicles}')
        
        # Customer-Job relationships
        cursor.execute('''
            SELECT COUNT(*) FROM jobs j 
            JOIN customers c ON j.customer_id = c.id 
            WHERE c.account_number NOT LIKE "CUST%"
        ''')
        real_customer_jobs = cursor.fetchone()[0]
        print(f'   Jobs linked to real customers: {real_customer_jobs}')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking database: {e}')
        import traceback
        traceback.print_exc()

def show_recommendations():
    """Show recommendations based on analysis"""
    
    print('\n💡 RECOMMENDATIONS')
    print('=' * 60)
    print('Based on your database statistics:')
    print('')
    print('1. 📊 **Customer Count Issue:**')
    print('   - Only 10 customers showing vs 7,043 imported')
    print('   - This suggests the customer import may have failed')
    print('   - Or customers were imported but not counted correctly')
    print('')
    print('2. 🔗 **Data Linking:**')
    print('   - 20,822 jobs vs 3 invoices suggests linking issues')
    print('   - Jobs may not be properly linked to invoices')
    print('')
    print('3. 🚀 **Next Steps:**')
    print('   - Check if customer import actually worked')
    print('   - Verify data relationships are correct')
    print('   - Consider re-importing with proper linking')
    print('')
    print('4. 📋 **To Fix:**')
    print('   - Re-import customers with "Update existing records"')
    print('   - Ensure proper account number mapping')
    print('   - Check ELI MOTORS data format consistency')

if __name__ == "__main__":
    check_database_details()
    show_recommendations()
