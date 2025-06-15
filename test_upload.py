#!/usr/bin/env python3
"""
Test script to verify the upload functionality
"""

import requests
import os

def test_upload(file_path, table_name):
    """Test uploading a CSV file"""
    
    url = "http://127.0.0.1:5001/upload/csv"
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"🧪 Testing upload of {file_path} to {table_name} table...")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'text/csv')}
            data = {'table_name': table_name}
            
            response = requests.post(url, files=files, data=data)
            result = response.json()
            
            if result.get('success'):
                print(f"✅ Upload successful!")
                print(f"   Imported: {result.get('imported', 0)}")
                print(f"   Failed: {result.get('failed', 0)}")
                print(f"   Duplicates: {result.get('duplicates', 0)}")
                return True
            else:
                print(f"❌ Upload failed: {result.get('error', 'Unknown error')}")
                return False
                
    except Exception as e:
        print(f"❌ Error during upload: {e}")
        return False

def test_api_stats():
    """Test the API stats endpoint"""
    
    try:
        response = requests.get("http://127.0.0.1:5001/api/stats")
        result = response.json()
        
        if result.get('success'):
            stats = result.get('stats', {})
            print("📊 Current database statistics:")
            for key, value in stats.items():
                print(f"   {key.capitalize()}: {value}")
            return True
        else:
            print(f"❌ Stats API failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting stats: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Garage Management System Upload")
    print("=" * 50)
    
    # Test 1: Upload customers
    print("\n1️⃣ Testing customer upload...")
    test_upload("sample_customers.csv", "customers")
    
    # Test 2: Upload vehicles
    print("\n2️⃣ Testing vehicle upload...")
    test_upload("sample_vehicles.csv", "vehicles")
    
    # Test 3: Check stats
    print("\n3️⃣ Testing API stats...")
    test_api_stats()
    
    print("\n" + "=" * 50)
    print("🎉 Test completed!")
    print("🌐 Main interface: http://127.0.0.1:5001")
    print("📤 Upload interface: http://127.0.0.1:5001/upload")
    print("🚗 MOT Reminders: http://127.0.0.1:8080")

if __name__ == "__main__":
    main()
