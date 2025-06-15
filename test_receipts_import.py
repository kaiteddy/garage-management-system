#!/usr/bin/env python3
"""
Test script for ELI MOTORS receipts import
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def test_receipts_import():
    """Test receipts import"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "eli_motors_receipts_sample.csv"
    
    print('🧪 Testing ELI MOTORS Receipts Import')
    print('=' * 50)
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    try:
        import_service = CSVImportService(db_path)
        result = import_service.import_csv_file(csv_file, 'receipts', {'update_duplicates': True})
        
        if result['success']:
            print('✅ Receipts import successful!')
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

def check_imported_payments():
    """Check what payments were imported"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT p.payment_reference, p.amount, p.payment_date, p.payment_method, 
                   p.description, p.reconciled, i.invoice_number, c.name
            FROM payments p 
            LEFT JOIN invoices i ON p.invoice_id = i.id
            LEFT JOIN customers c ON p.customer_id = c.id
            ORDER BY p.id DESC LIMIT 5
        ''')
        payments = cursor.fetchall()
        
        print('\n📊 Recent payments in database:')
        print('=' * 80)
        for payment in payments:
            reconciled_status = 'RECONCILED' if payment[5] else 'PENDING'
            customer_info = payment[7] if payment[7] else 'Unknown'
            invoice_info = payment[6] if payment[6] else 'No invoice'
            print(f'Payment: {payment[0][:8]}... | £{payment[1]} | {payment[2]} | {payment[3]} | {reconciled_status} | Invoice: {invoice_info} | Customer: {customer_info}')
        
        # Check updated invoice statuses
        print('\n💰 Invoice payment status:')
        cursor.execute('''
            SELECT invoice_number, status, paid_date, payment_method, total_amount
            FROM invoices 
            WHERE paid_date IS NOT NULL
            ORDER BY id DESC LIMIT 5
        ''')
        invoices = cursor.fetchall()
        for invoice in invoices:
            print(f'Invoice: {invoice[0]} | Status: {invoice[1]} | Paid: {invoice[2]} | Method: {invoice[3]} | Amount: £{invoice[4]}')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking payments: {e}')

if __name__ == "__main__":
    test_receipts_import()
    check_imported_payments()
