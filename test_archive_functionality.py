#!/usr/bin/env python3
"""
Test script to verify the archive functionality is working
"""

import requests
import json

def test_archive_functionality():
    """Test the new archive functionality"""
    
    print("🗃️ TESTING ARCHIVE FUNCTIONALITY")
    print("=" * 50)
    print()
    
    base_url = "http://127.0.0.1:5002/api"
    
    # Test 1: Get vehicles (should show active vehicles by default)
    print("1️⃣ TESTING DEFAULT VEHICLE LIST (ACTIVE ONLY):")
    try:
        response = requests.get(f"{base_url}/mot/vehicles")
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('vehicles', [])
            active_vehicles = [v for v in vehicles if not v.get('is_archived')]
            archived_vehicles = [v for v in vehicles if v.get('is_archived')]
            
            print(f"   ✅ Total vehicles: {len(vehicles)}")
            print(f"   ✅ Active vehicles: {len(active_vehicles)}")
            print(f"   ✅ Archived vehicles: {len(archived_vehicles)}")
            
            if vehicles:
                sample_vehicle = vehicles[0]
                print(f"   ✅ Sample vehicle: {sample_vehicle['registration']}")
                print(f"      └─ Archived: {sample_vehicle.get('is_archived', False)}")
        else:
            print(f"   ❌ Error: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 2: Get vehicles including archived
    print("2️⃣ TESTING VEHICLE LIST WITH ARCHIVED:")
    try:
        response = requests.get(f"{base_url}/mot/vehicles?include_archived=true")
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('vehicles', [])
            active_vehicles = [v for v in vehicles if not v.get('is_archived')]
            archived_vehicles = [v for v in vehicles if v.get('is_archived')]
            
            print(f"   ✅ Total vehicles (with archived): {len(vehicles)}")
            print(f"   ✅ Active vehicles: {len(active_vehicles)}")
            print(f"   ✅ Archived vehicles: {len(archived_vehicles)}")
        else:
            print(f"   ❌ Error: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 3: Test archive API endpoints
    print("3️⃣ TESTING ARCHIVE API ENDPOINTS:")
    
    # Get a test vehicle
    try:
        response = requests.get(f"{base_url}/mot/vehicles")
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('vehicles', [])
            active_vehicles = [v for v in vehicles if not v.get('is_archived')]
            
            if active_vehicles:
                test_vehicle = active_vehicles[0]
                test_registration = test_vehicle['registration']
                
                print(f"   📋 Using test vehicle: {test_registration}")
                
                # Test archive endpoint
                print(f"   🗃️ Testing archive endpoint...")
                archive_response = requests.post(
                    f"{base_url}/mot/vehicles/{test_registration}/archive",
                    json={'reason': 'Test archive'}
                )
                
                if archive_response.status_code == 200:
                    result = archive_response.json()
                    if result.get('success'):
                        print(f"      ✅ Archive successful: {result.get('message')}")
                        
                        # Test unarchive endpoint
                        print(f"   📤 Testing unarchive endpoint...")
                        unarchive_response = requests.post(
                            f"{base_url}/mot/vehicles/{test_registration}/unarchive"
                        )
                        
                        if unarchive_response.status_code == 200:
                            unarchive_result = unarchive_response.json()
                            if unarchive_result.get('success'):
                                print(f"      ✅ Unarchive successful: {unarchive_result.get('message')}")
                            else:
                                print(f"      ❌ Unarchive failed: {unarchive_result.get('error')}")
                        else:
                            print(f"      ❌ Unarchive HTTP error: {unarchive_response.status_code}")
                    else:
                        print(f"      ❌ Archive failed: {result.get('error')}")
                else:
                    print(f"      ❌ Archive HTTP error: {archive_response.status_code}")
            else:
                print("   ⚠️ No active vehicles available for testing")
    except Exception as e:
        print(f"   ❌ Error testing archive endpoints: {e}")
    
    print()
    
    # Test 4: Test bulk archive endpoint
    print("4️⃣ TESTING BULK ARCHIVE ENDPOINT:")
    try:
        response = requests.get(f"{base_url}/mot/vehicles")
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('vehicles', [])
            active_vehicles = [v for v in vehicles if not v.get('is_archived')]
            
            if len(active_vehicles) >= 2:
                test_registrations = [v['registration'] for v in active_vehicles[:2]]
                print(f"   📋 Testing bulk archive with: {test_registrations}")
                
                bulk_response = requests.post(
                    f"{base_url}/mot/vehicles/archive/bulk",
                    json={
                        'registrations': test_registrations,
                        'reason': 'Test bulk archive'
                    }
                )
                
                if bulk_response.status_code == 200:
                    result = bulk_response.json()
                    if result.get('success'):
                        print(f"      ✅ Bulk archive successful: {result.get('archived_count')} vehicles archived")
                        
                        # Unarchive them back
                        for reg in test_registrations:
                            requests.post(f"{base_url}/mot/vehicles/{reg}/unarchive")
                        print(f"      ✅ Test vehicles unarchived")
                    else:
                        print(f"      ❌ Bulk archive failed: {result.get('error')}")
                else:
                    print(f"      ❌ Bulk archive HTTP error: {bulk_response.status_code}")
            else:
                print("   ⚠️ Need at least 2 active vehicles for bulk archive test")
    except Exception as e:
        print(f"   ❌ Error testing bulk archive: {e}")
    
    print()

def show_archive_features():
    """Show the new archive features"""
    
    print("🎯 NEW ARCHIVE FEATURES:")
    print("-" * 30)
    print()
    
    print("✅ AUTOMATIC ARCHIVING:")
    print("   • Vehicles are automatically archived after SMS is sent")
    print("   • Removes completed vehicles from active list")
    print("   • Keeps MOT reminders list clean and focused")
    print()
    
    print("✅ MANUAL ARCHIVE CONTROLS:")
    print("   • Individual vehicle archive/unarchive buttons")
    print("   • Bulk archive selected vehicles")
    print("   • 'Show Archived' toggle to view archived vehicles")
    print()
    
    print("✅ VISUAL INDICATORS:")
    print("   • Archived vehicles shown with gray styling")
    print("   • 'ARCHIVED' badge on archived vehicles")
    print("   • Different button states for archived vs active")
    print()
    
    print("✅ WORKFLOW IMPROVEMENTS:")
    print("   • Send SMS → Vehicle automatically archived")
    print("   • Focus on vehicles that still need attention")
    print("   • Easy to restore archived vehicles if needed")
    print("   • Complete audit trail of archive actions")
    print()

def main():
    """Main test function"""
    test_archive_functionality()
    show_archive_features()
    
    print("=" * 50)
    print("🎉 ARCHIVE FUNCTIONALITY TESTING COMPLETE!")
    print()
    print("📱 To test the archive features:")
    print("   1. Open: http://127.0.0.1:5001")
    print("   2. Navigate to MOT Reminders")
    print("   3. Try the 'Show Archived' button")
    print("   4. Select vehicles and use 'Archive Selected'")
    print("   5. Send SMS to see automatic archiving")
    print("   6. Use individual archive/unarchive buttons")
    print()
    print("✅ Expected behavior:")
    print("   • SMS sending automatically archives vehicles")
    print("   • Archived vehicles disappear from active list")
    print("   • 'Show Archived' reveals archived vehicles")
    print("   • Clean, focused workflow for MOT reminders")

if __name__ == '__main__':
    main()
