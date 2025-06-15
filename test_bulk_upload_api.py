#!/usr/bin/env python3
"""
Test bulk upload process using the API
"""

import requests
import json
import time

# Test registrations from the CSV
test_registrations = [
    'EJ13UYV',  # Toyota Yaris
    'L15AJR',   # Ford Focus  
    'HY12GNN',  # Mini Countryman
    'EG19HXF',  # Ford Focus
    'RV13GTU',  # Volkswagen Polo
]

API_URL = 'http://127.0.0.1:5002/api/mot/vehicles'

def test_single_vehicle(registration):
    """Test adding a single vehicle via API"""
    try:
        print(f"🚗 Testing: {registration}")
        
        payload = {
            'registration': registration
        }
        
        response = requests.post(API_URL, json=payload, timeout=15)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                vehicle_data = data.get('data', {})
                print(f"   ✅ SUCCESS: {vehicle_data.get('make')} {vehicle_data.get('model')}")
                print(f"   MOT expires: {vehicle_data.get('mot_expiry_date')}")
                return True
            else:
                print(f"   ❌ API Error: {data.get('error')}")
                return False
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   💥 Exception: {str(e)}")
        return False

def test_bulk_upload():
    """Test bulk upload simulation"""
    print("🔄 Testing Bulk Upload Simulation")
    print("=" * 50)
    
    successful = 0
    failed = 0
    
    for i, registration in enumerate(test_registrations):
        print(f"\n📝 Processing {i+1}/{len(test_registrations)}")
        
        if test_single_vehicle(registration):
            successful += 1
        else:
            failed += 1
        
        # Add small delay like the frontend does
        if i < len(test_registrations) - 1:
            time.sleep(0.5)
    
    print(f"\n📊 BULK UPLOAD RESULTS")
    print("=" * 50)
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Success Rate: {(successful/(successful+failed)*100):.1f}%")
    
    return successful, failed

def test_api_health():
    """Test API health"""
    try:
        response = requests.get('http://127.0.0.1:5002/api/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Health: {data.get('status')}")
            print(f"   Service: {data.get('service')}")
            print(f"   DVLA Integration: {data.get('dvla_integration')}")
            return True
        else:
            print(f"❌ API Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Health Check Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 Bulk Upload API Test")
    print("=" * 50)
    
    # Test API health first
    if not test_api_health():
        print("❌ API is not healthy. Please start the backend service.")
        exit(1)
    
    print()
    
    # Test bulk upload
    successful, failed = test_bulk_upload()
    
    print(f"\n🎯 FINAL SUMMARY")
    print("=" * 50)
    if successful > 0 and failed == 0:
        print("🎉 ALL TESTS PASSED!")
        print("   The bulk upload should work perfectly in the frontend.")
    elif successful > failed:
        print("⚠️  MOSTLY WORKING")
        print("   Most vehicles work, some may have issues.")
    else:
        print("❌ MAJOR ISSUES")
        print("   The bulk upload has significant problems.")
