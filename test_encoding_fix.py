#!/usr/bin/env python3
"""
Test script to verify encoding fix for CSV imports
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def test_encoding_fix():
    """Test that the encoding fix works with various file types"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    print('🧪 Testing CSV Encoding Fix')
    print('=' * 50)
    
    # Test files we know work
    test_files = [
        ('simple_vehicles_test.csv', 'vehicles'),
        ('eli_motors_receipts_sample.csv', 'receipts'),
        ('eli_motors_customers_sample.csv', 'customers')
    ]
    
    try:
        import_service = CSVImportService(db_path)
        
        for csv_file, table_type in test_files:
            if os.path.exists(csv_file):
                print(f'\n📄 Testing {csv_file} ({table_type}):')
                result = import_service.import_csv_file(csv_file, table_type, {'update_duplicates': True})
                
                if result['success']:
                    print(f'   ✅ Success! Imported: {result.get("imported", 0)}, Failed: {result.get("failed", 0)}, Duplicates: {result.get("duplicates", 0)}')
                else:
                    print(f'   ❌ Failed: {result.get("error", "Unknown error")}')
            else:
                print(f'\n📄 {csv_file}: File not found, skipping')
                
    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()

def show_encoding_tips():
    """Show tips for handling encoding issues"""
    
    print('\n💡 ENCODING TROUBLESHOOTING TIPS')
    print('=' * 50)
    print('If you encounter encoding errors with your ELI MOTORS CSV files:')
    print('')
    print('1. 📝 **Common ELI MOTORS encodings:**')
    print('   - Windows-1252 (cp1252) - Most common for Windows exports')
    print('   - Latin-1 (iso-8859-1) - Western European characters')
    print('   - UTF-8 - Modern standard')
    print('')
    print('2. 🔧 **The system now automatically tries:**')
    print('   - UTF-8 (default)')
    print('   - Latin-1 (iso-8859-1)')
    print('   - Windows-1252 (cp1252)')
    print('   - ISO-8859-1')
    print('   - UTF-16')
    print('')
    print('3. 📋 **If issues persist:**')
    print('   - Open CSV in Excel and Save As UTF-8')
    print('   - Use Notepad++ to convert encoding')
    print('   - Contact for assistance with problematic files')
    print('')
    print('4. ✅ **Upload interface handles this automatically**')
    print('   - Go to: http://127.0.0.1:5001/upload')
    print('   - Select your data type')
    print('   - Upload your ELI MOTORS CSV file')
    print('   - System will try multiple encodings automatically')

if __name__ == "__main__":
    test_encoding_fix()
    show_encoding_tips()
