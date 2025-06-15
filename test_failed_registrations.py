#!/usr/bin/env python3
"""
Test script to demonstrate the failed registrations functionality
"""

import requests
import json
import time

API_BASE_URL = 'http://127.0.0.1:5002/api'

def test_failed_registrations():
    """Test the failed registrations functionality"""
    
    print("🧪 Testing Failed Registrations Functionality")
    print("=" * 60)
    
    # Test 1: Add some invalid registrations to generate failures
    print("\n1️⃣ Adding invalid registrations to generate failures...")
    
    invalid_registrations = [
        {'registration': 'INVALID1', 'customer_name': 'John Smith', 'mobile_number': '07123456789'},
        {'registration': 'BADPLATE', 'customer_name': 'Jane Doe', 'mobile_number': '07987654321'},
        {'registration': 'NOTREAL', 'customer_name': 'Bob Wilson', 'mobile_number': '07555123456'},
    ]
    
    for reg_data in invalid_registrations:
        try:
            response = requests.post(f"{API_BASE_URL}/mot/vehicles", 
                                   json=reg_data,
                                   headers={'Content-Type': 'application/json'})
            
            if response.status_code == 200:
                result = response.json()
                if result['success']:
                    print(f"   ✅ {reg_data['registration']}: Added successfully")
                else:
                    print(f"   ❌ {reg_data['registration']}: {result['error']}")
            else:
                print(f"   💥 {reg_data['registration']}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   💥 {reg_data['registration']}: Error - {e}")
    
    # Wait a moment for processing
    time.sleep(1)
    
    # Test 2: Check failed registrations
    print("\n2️⃣ Checking failed registrations...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/mot/failed-registrations?status=pending")
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                failed_regs = result['failed_registrations']
                print(f"   📊 Found {len(failed_regs)} failed registrations")
                
                for failed in failed_regs:
                    print(f"   📋 ID: {failed['id']}")
                    print(f"      Original: {failed['original_registration']}")
                    print(f"      Customer: {failed['customer_name']}")
                    print(f"      Mobile: {failed['mobile_number']}")
                    print(f"      Error: {failed['error_message']}")
                    print(f"      Status: {failed['status']}")
                    print()
                
                # Test 3: Try to correct one of the failed registrations
                if failed_regs:
                    print("3️⃣ Testing registration correction...")
                    
                    first_failed = failed_regs[0]
                    corrected_registration = 'AB12CDE'  # Known working registration
                    
                    print(f"   🔧 Correcting '{first_failed['original_registration']}' to '{corrected_registration}'")
                    
                    correction_data = {
                        'corrected_registration': corrected_registration,
                        'action': 'retry'
                    }
                    
                    response = requests.put(f"{API_BASE_URL}/mot/failed-registrations/{first_failed['id']}", 
                                          json=correction_data,
                                          headers={'Content-Type': 'application/json'})
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result['success']:
                            print(f"   ✅ Correction successful: {result.get('message', 'Registration corrected')}")
                        else:
                            print(f"   ❌ Correction failed: {result.get('error', 'Unknown error')}")
                    else:
                        print(f"   💥 HTTP {response.status_code}: {response.text}")
                
                # Test 4: Check updated failed registrations
                print("\n4️⃣ Checking updated failed registrations...")
                
                response = requests.get(f"{API_BASE_URL}/mot/failed-registrations?status=pending")
                
                if response.status_code == 200:
                    result = response.json()
                    if result['success']:
                        remaining_failed = result['failed_registrations']
                        print(f"   📊 Remaining failed registrations: {len(remaining_failed)}")
                        
                        for failed in remaining_failed:
                            print(f"   📋 {failed['original_registration']} - {failed['status']}")
                
            else:
                print(f"   ❌ API Error: {result.get('error', 'Unknown error')}")
        else:
            print(f"   💥 HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"   💥 Error: {e}")
    
    # Test 5: Check all failed registrations (including resolved)
    print("\n5️⃣ Checking all failed registrations (including resolved)...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/mot/failed-registrations?status=all")
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                all_failed = result['failed_registrations']
                print(f"   📊 Total failed registrations (all statuses): {len(all_failed)}")
                
                status_counts = {}
                for failed in all_failed:
                    status = failed['status']
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                for status, count in status_counts.items():
                    print(f"   📈 {status}: {count}")
                
            else:
                print(f"   ❌ API Error: {result.get('error', 'Unknown error')}")
        else:
            print(f"   💥 HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"   💥 Error: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Failed Registrations Test Completed!")
    print("\n💡 How to use this feature:")
    print("   1. Navigate to MOT Reminders in the web interface")
    print("   2. Click the 'Review Failed' button (if any failed registrations exist)")
    print("   3. Edit the registration numbers and click retry")
    print("   4. Successfully corrected registrations will be added to the main list")
    print("   5. Failed registrations can be dismissed if they're genuinely invalid")

if __name__ == '__main__':
    test_failed_registrations()
