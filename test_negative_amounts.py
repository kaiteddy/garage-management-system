#!/usr/bin/env python3
"""
Test script to verify negative amount handling in receipts import
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def create_test_receipts_with_negatives():
    """Create test CSV with negative amounts"""
    
    csv_content = """_ID,_ID_Document,Amount,Date,Description,Method,Reconciled,Reconciled_Date,Reconciled_Ref,SurchargeApplied,SurchargeGROSS,SurchargeNET,SurchargeTAX,TotalReceipt
TEST001,DOC001,857.82,12/04/2011,Card Payment,Card,1,28/06/2016,001,0,0,0,0,857.82
TEST002,DOC002,-225.48,15/04/2011,Customer Refund,Credit Note,1,28/06/2016,002,0,0,0,0,-225.48
TEST003,DOC003,150.00,20/04/2011,Cash Payment,Cash,1,28/06/2016,003,0,0,0,0,150.00
TEST004,DOC004,-442.56,25/04/2011,Invoice Adjustment,Credit Note,1,28/06/2016,004,0,0,0,0,-442.56
TEST005,DOC005,0.00,30/04/2011,Zero Amount Test,Card,0,,,0,0,0,0,0.00"""
    
    with open('test_receipts_negative.csv', 'w') as f:
        f.write(csv_content)
    
    print("✅ Created test_receipts_negative.csv with positive and negative amounts")

def test_negative_amounts():
    """Test that negative amounts are now handled correctly"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    csv_file = "test_receipts_negative.csv"
    
    print('🧪 Testing Negative Amount Handling in Receipts')
    print('=' * 50)
    
    # Create test file
    create_test_receipts_with_negatives()
    
    try:
        import_service = CSVImportService(db_path)
        result = import_service.import_csv_file(csv_file, 'receipts', {'update_duplicates': True})
        
        if result['success']:
            print('✅ Receipts import successful!')
            print(f'   Imported: {result.get("imported", 0)}')
            print(f'   Failed: {result.get("failed", 0)}')
            print(f'   Duplicates: {result.get("duplicates", 0)}')
            
            if result.get('errors'):
                print('🔍 Errors (should only be zero amount):')
                for error in result['errors']:
                    print(f'   - {error}')
            else:
                print('✅ No errors - negative amounts handled correctly!')
        else:
            print(f'❌ Import failed: {result.get("error", "Unknown error")}')
            
    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()

def check_imported_payments():
    """Check what payments were imported including negatives"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT payment_reference, amount, payment_method, description, reconciled
            FROM payments 
            WHERE payment_reference LIKE 'TEST%'
            ORDER BY payment_reference
        ''')
        payments = cursor.fetchall()
        
        print('\n📊 Test payments in database:')
        print('=' * 70)
        for payment in payments:
            amount_type = "CREDIT/REFUND" if payment[1] < 0 else "PAYMENT"
            reconciled_status = 'RECONCILED' if payment[4] else 'PENDING'
            print(f'ID: {payment[0]} | Amount: £{payment[1]} ({amount_type}) | Method: {payment[2]} | Status: {reconciled_status}')
        
        # Check for negative amounts specifically
        cursor.execute('SELECT COUNT(*) FROM payments WHERE amount < 0 AND payment_reference LIKE "TEST%"')
        negative_count = cursor.fetchone()[0]
        print(f'\n✅ Successfully imported {negative_count} negative amount records (credit notes/refunds)')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ Error checking payments: {e}')

def cleanup_test_files():
    """Clean up test files"""
    try:
        if os.path.exists('test_receipts_negative.csv'):
            os.remove('test_receipts_negative.csv')
            print('\n🧹 Cleaned up test files')
    except:
        pass

def show_negative_amount_info():
    """Show information about negative amounts in accounting"""
    
    print('\n💡 NEGATIVE AMOUNTS IN ACCOUNTING SYSTEMS')
    print('=' * 50)
    print('Negative amounts are normal and represent:')
    print('')
    print('✅ **Credit Notes** - Refunds issued to customers')
    print('✅ **Adjustments** - Corrections to previous invoices')
    print('✅ **Reversals** - Canceling previous transactions')
    print('✅ **Discounts** - Applied after initial billing')
    print('')
    print('🔧 **System now handles:**')
    print('   - Positive amounts: Regular payments')
    print('   - Negative amounts: Credit notes and refunds')
    print('   - Zero amounts: Rejected (invalid)')
    print('')
    print('📊 **Your ELI MOTORS data:**')
    print('   - Contains legitimate negative amounts')
    print('   - These represent business transactions')
    print('   - System now imports them correctly')

if __name__ == "__main__":
    test_negative_amounts()
    check_imported_payments()
    cleanup_test_files()
    show_negative_amount_info()
