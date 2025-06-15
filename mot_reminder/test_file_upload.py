#!/usr/bin/env python3
"""
Test script for file upload functionality
"""

import os
import sys
import pandas as pd

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import process_uploaded_file, allowed_file
import io

def test_csv_processing():
    """Test CSV file processing"""
    print("Testing CSV file processing...")
    
    # Create test CSV content
    csv_content = """registration
AB12CDE
XY34FGH
MN56JKL
PQ78RST"""
    
    # Create file-like object
    csv_file = io.StringIO(csv_content)
    csv_file.filename = 'test.csv'
    
    try:
        registrations, error = process_uploaded_file(csv_file)
        
        if error:
            print(f"✗ Error processing CSV: {error}")
            return False
        
        if registrations:
            print(f"✓ Successfully extracted {len(registrations)} registrations from CSV")
            print(f"✓ Registrations: {registrations}")
            return True
        else:
            print("✗ No registrations found in CSV")
            return False
            
    except Exception as e:
        print(f"✗ Exception during CSV processing: {e}")
        return False

def test_excel_processing():
    """Test Excel file processing"""
    print("\nTesting Excel file processing...")
    
    try:
        # Create test Excel file
        data = {
            'registration': ['AB12CDE', 'XY34FGH', 'MN56JKL', 'PQ78RST']
        }
        df = pd.DataFrame(data)
        
        # Save to BytesIO
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        excel_buffer.seek(0)
        excel_buffer.filename = 'test.xlsx'
        
        registrations, error = process_uploaded_file(excel_buffer)
        
        if error:
            print(f"✗ Error processing Excel: {error}")
            return False
        
        if registrations:
            print(f"✓ Successfully extracted {len(registrations)} registrations from Excel")
            print(f"✓ Registrations: {registrations}")
            return True
        else:
            print("✗ No registrations found in Excel")
            return False
            
    except Exception as e:
        print(f"✗ Exception during Excel processing: {e}")
        return False

def test_file_validation():
    """Test file validation"""
    print("\nTesting file validation...")
    
    test_cases = [
        ('test.csv', True),
        ('test.xlsx', True),
        ('test.xls', True),
        ('test.txt', False),
        ('test.pdf', False),
        ('test', False),
        ('test.CSV', True),  # Case insensitive
        ('test.XLSX', True)
    ]
    
    passed = 0
    for filename, expected in test_cases:
        result = allowed_file(filename)
        if result == expected:
            print(f"✓ {filename}: {result} (expected {expected})")
            passed += 1
        else:
            print(f"✗ {filename}: {result} (expected {expected})")
    
    return passed == len(test_cases)

def test_sample_file():
    """Test the sample CSV file"""
    print("\nTesting sample CSV file...")
    
    if not os.path.exists('sample_vehicles.csv'):
        print("✗ Sample CSV file not found")
        return False
    
    try:
        with open('sample_vehicles.csv', 'r') as f:
            registrations, error = process_uploaded_file(f)
        
        if error:
            print(f"✗ Error processing sample CSV: {error}")
            return False
        
        if registrations:
            print(f"✓ Successfully processed sample CSV with {len(registrations)} registrations")
            print(f"✓ Registrations: {registrations}")
            return True
        else:
            print("✗ No registrations found in sample CSV")
            return False
            
    except Exception as e:
        print(f"✗ Exception processing sample CSV: {e}")
        return False

def main():
    """Run all file upload tests"""
    print("MOT Reminder Tool - File Upload Test Suite")
    print("=" * 50)
    
    tests = [
        test_file_validation,
        test_csv_processing,
        test_excel_processing,
        test_sample_file
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"File Upload Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All file upload tests passed!")
        print("\nFile upload functionality is working correctly.")
        print("\nYou can now:")
        print("1. Upload CSV files with vehicle registrations")
        print("2. Upload Excel files with vehicle registrations")
        print("3. Download template files from the web interface")
        print("4. Bulk process multiple vehicles at once")
    else:
        print("⚠ Some file upload tests failed.")

if __name__ == "__main__":
    main()
