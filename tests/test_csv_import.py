#!/usr/bin/env python3
"""
Test script to debug CSV import issues
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_import_service import CSVImportService

def test_csv_import():
    """Test the CSV import service directly"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    print(f"📁 Database path: {db_path}")
    print(f"📁 Database exists: {os.path.exists(db_path)}")
    
    # Test customer import with ELI MOTORS format
    csv_file = "eli_motors_customers_sample.csv"
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    print(f"📄 CSV file: {csv_file}")
    print(f"📄 CSV exists: {os.path.exists(csv_file)}")
    
    try:
        import_service = CSVImportService(db_path)
        print("✅ CSV import service created")
        
        # Test the import
        result = import_service.import_csv_file(csv_file, 'customers')
        print(f"📊 Import result: {result}")
        
        if not result['success']:
            print(f"❌ Import failed: {result.get('error', 'Unknown error')}")
        else:
            print(f"✅ Import completed:")
            print(f"   Imported: {result.get('imported', 0)}")
            print(f"   Failed: {result.get('failed', 0)}")
            print(f"   Duplicates: {result.get('duplicates', 0)}")
            
            if result.get('errors'):
                print("🔍 Errors:")
                for error in result['errors'][:5]:  # Show first 5 errors
                    print(f"   - {error}")
        
    except Exception as e:
        print(f"❌ Exception during import: {e}")
        import traceback
        traceback.print_exc()

def test_database_connection():
    """Test database connection"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'garage.db')
    
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"📊 Database tables: {[table[0] for table in tables]}")
        
        # Check customers table structure
        cursor.execute("PRAGMA table_info(customers)")
        columns = cursor.fetchall()
        print(f"👥 Customers table columns: {[col[1] for col in columns]}")
        
        conn.close()
        print("✅ Database connection test successful")
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

def main():
    """Main test function"""
    print("🧪 Testing CSV Import Service")
    print("=" * 50)
    
    print("\n1️⃣ Testing database connection...")
    test_database_connection()
    
    print("\n2️⃣ Testing CSV import...")
    test_csv_import()
    
    print("\n" + "=" * 50)
    print("🎉 Test completed!")

if __name__ == "__main__":
    main()
