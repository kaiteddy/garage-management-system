#!/usr/bin/env python3
"""
Test script to verify bulk upload functionality
"""

import requests
import json

# Test data in your format
test_vehicles = [
    {
        "registration": "MF55VXU",
        "customer_name": "Ms Ana",
        "mobile_number": "7752698439"
    },
    {
        "registration": "AG04KLL", 
        "customer_name": "Mrs Greenberg",
        "mobile_number": "7771508747"
    },
    {
        "registration": "AB12CDE",
        "customer_name": "Mr John Smith", 
        "mobile_number": "7123456789"
    }
]

def test_bulk_upload():
    """Test the bulk upload API endpoint"""
    base_url = "http://127.0.0.1:5001"
    
    print("🧪 Testing bulk upload functionality...")
    print("=" * 50)
    
    for i, vehicle in enumerate(test_vehicles, 1):
        print(f"\n{i}. Testing vehicle: {vehicle['registration']}")
        print(f"   Customer: {vehicle['customer_name']}")
        print(f"   Mobile: {vehicle['mobile_number']}")
        
        try:
            response = requests.post(
                f"{base_url}/api/mot/vehicles",
                headers={"Content-Type": "application/json"},
                json=vehicle,
                timeout=30
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"   ✅ Success: {result.get('message', 'Vehicle added')}")
                    if 'vehicle_data' in result:
                        vehicle_data = result['vehicle_data']
                        print(f"   📋 Make/Model: {vehicle_data.get('make', 'N/A')} {vehicle_data.get('model', 'N/A')}")
                        print(f"   📅 MOT Expiry: {vehicle_data.get('mot_expiry_date', 'N/A')}")
                        print(f"   🔍 Test Result: {vehicle_data.get('mot_test_result', 'N/A')}")
                else:
                    print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Request failed: {e}")
        except Exception as e:
            print(f"   ❌ Unexpected error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Bulk upload test completed!")

if __name__ == "__main__":
    test_bulk_upload()
