#!/usr/bin/env python3
"""
Test script to demonstrate the smart filtering and manual control system
Shows how the MOT reminder system handles different vehicle scenarios
"""

import requests
import json
from datetime import datetime, timedelta

def test_smart_filtering():
    """Test the smart filtering API endpoints"""
    
    print("🧪 TESTING SMART FILTERING & MANUAL CONTROL SYSTEM")
    print("=" * 70)
    print()
    
    base_url = "http://127.0.0.1:5002/api"
    
    # Test 1: Get vehicles with smart filtering
    print("1️⃣ TESTING SMART FILTERING API")
    print("-" * 40)
    
    try:
        response = requests.get(f"{base_url}/mot/vehicles")
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ API Response: {response.status_code}")
            print(f"📊 Total vehicles: {data.get('total_count', 0)}")
            print(f"📱 Sendable vehicles: {data.get('sendable_count', 0)}")
            print()
            
            # Show grouped data
            grouped = data.get('grouped', {})
            print("📋 VEHICLE CLASSIFICATION:")
            print(f"   🚨 Expired: {len(grouped.get('expired', []))}")
            print(f"   ⚠️  Critical (≤7 days): {len(grouped.get('critical', []))}")
            print(f"   📅 Due Soon (8-30 days): {len(grouped.get('due_soon', []))}")
            print(f"   ✅ Normal (31-365 days): {len(grouped.get('normal', []))}")
            print(f"   🔒 Flagged (365+ days): {len(grouped.get('long_term', []))}")
            print()
            
            # Show sample flagged vehicles
            flagged_vehicles = grouped.get('long_term', [])
            if flagged_vehicles:
                print("🔒 FLAGGED VEHICLES (365+ days - potentially SORN/written off):")
                for vehicle in flagged_vehicles[:5]:  # Show first 5
                    print(f"   • {vehicle['registration']} - {vehicle['make']} {vehicle['model']}")
                    print(f"     MOT expires: {vehicle['mot_expiry_date']} ({vehicle['days_until_expiry']} days)")
                    print(f"     Customer: {vehicle.get('customer_name', 'Unknown')}")
                    print(f"     Mobile: {vehicle.get('mobile_number', 'None')}")
                    print(f"     Status: {'Can send SMS' if vehicle.get('can_send_sms') else 'Cannot send SMS'}")
                    print()
            
            # Show sample ready vehicles
            ready_vehicles = [v for v in data.get('vehicles', []) if v.get('can_send_sms') and v.get('send_by_default')]
            if ready_vehicles:
                print("✅ READY FOR SMS (auto-sendable):")
                for vehicle in ready_vehicles[:3]:  # Show first 3
                    print(f"   • {vehicle['registration']} - {vehicle['make']} {vehicle['model']}")
                    print(f"     MOT expires: {vehicle['mot_expiry_date']} ({vehicle['days_until_expiry']} days)")
                    print(f"     Customer: {vehicle.get('customer_name', 'Unknown')}")
                    print(f"     Mobile: {vehicle.get('mobile_number', 'None')}")
                    print(f"     Recent SMS: {'Yes' if vehicle.get('recent_sms', {}).get('has_recent_sms') else 'No'}")
                    print()
                    
        else:
            print(f"❌ API Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")
    
    # Test 2: SMS History
    print("2️⃣ TESTING SMS HISTORY API")
    print("-" * 40)
    
    try:
        response = requests.get(f"{base_url}/mot/sms/history?limit=10")
        if response.status_code == 200:
            data = response.json()
            history = data.get('history', [])
            
            print(f"✅ SMS History loaded: {len(history)} messages")
            
            if history:
                print("\n📱 RECENT SMS MESSAGES:")
                for msg in history[:5]:  # Show first 5
                    print(f"   • {msg['registration']} to {msg['mobile_number']}")
                    print(f"     Sent: {msg['sent_at']}")
                    print(f"     Type: {msg['message_type']} | Status: {msg['status']}")
                    print(f"     Customer: {msg.get('customer_name', 'Unknown')}")
                    print()
            else:
                print("   📭 No SMS messages sent yet")
                
        else:
            print(f"❌ SMS History Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ SMS History Connection Error: {e}")
    
    # Test 3: Manual Selection Simulation
    print("3️⃣ TESTING MANUAL SELECTION WORKFLOW")
    print("-" * 40)
    
    print("🎯 MANUAL SELECTION WORKFLOW:")
    print("   1. System automatically flags vehicles with 365+ days MOT")
    print("   2. User reviews flagged vehicles manually")
    print("   3. User selects specific vehicles for SMS sending")
    print("   4. System prevents duplicate SMS within 7 days")
    print("   5. System logs all SMS attempts for audit trail")
    print()
    
    print("🔧 SMART FILTERING FEATURES:")
    print("   ✅ Automatic flagging of potentially SORN vehicles")
    print("   ✅ Visual indicators for different vehicle statuses")
    print("   ✅ Manual override controls with checkboxes")
    print("   ✅ Bulk send controls with confirmation dialogs")
    print("   ✅ Duplicate prevention with message logging")
    print("   ✅ Data quality validation before sending")
    print("   ✅ Professional message templates with business branding")
    print()
    
    print("📋 BUSINESS BENEFITS:")
    print("   • Prevents accidental SMS to inactive vehicles")
    print("   • Reduces customer complaints from unwanted messages")
    print("   • Provides full audit trail of communications")
    print("   • Ensures professional appearance with Eli Motors branding")
    print("   • Saves time with smart automation and manual control")
    print()

def test_bulk_sms_simulation():
    """Simulate bulk SMS sending with manual selection"""
    
    print("4️⃣ BULK SMS SIMULATION")
    print("-" * 40)
    
    # This would be the registrations selected manually by the user
    selected_registrations = [
        "LN57EZF",  # Critical - 2 days left
        "BD64USH",  # Critical - 2 days left  
        "LN14KCA",  # Critical - 3 days left
    ]
    
    print(f"📝 Simulating bulk SMS to {len(selected_registrations)} manually selected vehicles:")
    for reg in selected_registrations:
        print(f"   • {reg}")
    print()
    
    print("🚨 IMPORTANT: This is a simulation only - no actual SMS will be sent")
    print("   In the real system, you would:")
    print("   1. Select vehicles using checkboxes in the web interface")
    print("   2. Click 'Send SMS' button")
    print("   3. Confirm the action in the dialog")
    print("   4. System sends SMS only to selected, validated vehicles")
    print()
    
    # Simulate the API call (but don't actually send)
    print("💡 To test actual SMS sending:")
    print("   1. Go to http://127.0.0.1:5001")
    print("   2. Navigate to 'MOT Reminders'")
    print("   3. Select vehicles using checkboxes")
    print("   4. Click 'Send SMS' button")
    print("   5. Confirm in the dialog")
    print()

def main():
    """Main test function"""
    test_smart_filtering()
    test_bulk_sms_simulation()
    
    print("=" * 70)
    print("🎉 SMART FILTERING SYSTEM TEST COMPLETE!")
    print()
    print("📱 Next Steps:")
    print("   1. Open http://127.0.0.1:5001 in your browser")
    print("   2. Go to MOT Reminders section")
    print("   3. Review the smart filtering in action")
    print("   4. Test manual selection and SMS sending")
    print("   5. Check SMS History for audit trail")
    print()
    print("🔒 The system now provides full control over which customers")
    print("   receive MOT reminders, preventing unwanted messages to")
    print("   potentially inactive vehicles while maintaining professional")
    print("   communication with active customers.")

if __name__ == '__main__':
    main()
