#!/usr/bin/env python3
"""
Single Vehicle SMS Test Script
Test SMS functionality on one selected vehicle before bulk sending
"""

import os
import sys
import json
import requests
from datetime import datetime

# Add the src directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'mot_reminder'))

def get_available_vehicles():
    """Get list of vehicles with MOT data"""
    try:
        response = requests.get('http://127.0.0.1:5002/api/mot/vehicles')
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                return data['vehicles']
        return []
    except Exception as e:
        print(f"Error fetching vehicles: {e}")
        return []

def display_vehicles_for_selection(vehicles):
    """Display vehicles in a user-friendly format for selection"""
    print("\n" + "="*80)
    print("🚗 AVAILABLE VEHICLES FOR SMS TEST")
    print("="*80)
    
    if not vehicles:
        print("❌ No vehicles found in the system")
        return None
    
    # Filter vehicles with mobile numbers
    vehicles_with_mobile = [v for v in vehicles if v.get('mobile_number')]
    
    if not vehicles_with_mobile:
        print("❌ No vehicles with mobile numbers found")
        return None
    
    print(f"📱 Found {len(vehicles_with_mobile)} vehicles with mobile numbers:\n")
    
    for i, vehicle in enumerate(vehicles_with_mobile, 1):
        status_emoji = "🚨" if vehicle['is_expired'] else "⚠️" if vehicle['days_until_expiry'] <= 7 else "📅"
        status_text = "EXPIRED" if vehicle['is_expired'] else f"{vehicle['days_until_expiry']} days left"
        
        print(f"{i:2d}. {status_emoji} {vehicle['registration']} - {vehicle['make']} {vehicle['model']}")
        print(f"     Customer: {vehicle['customer_name'] or 'Unknown'}")
        print(f"     Mobile: {vehicle['mobile_number']}")
        print(f"     MOT Status: {status_text} (expires: {vehicle['mot_expiry_date']})")
        print()
    
    return vehicles_with_mobile

def send_test_sms(vehicle):
    """Send SMS to selected vehicle"""
    print(f"\n🚀 SENDING TEST SMS TO: {vehicle['registration']}")
    print("-" * 50)
    
    try:
        response = requests.post('http://127.0.0.1:5002/api/mot/sms/send', 
                               json={'registrations': [vehicle['registration']]})
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                print("✅ SMS SENT SUCCESSFULLY!")
                print(f"   Total sent: {result['total_sent']}")
                print(f"   Total failed: {result['total_failed']}")
                
                if result.get('results'):
                    for sms_result in result['results']:
                        if sms_result['success']:
                            print(f"   ✅ {sms_result['registration']}: {sms_result.get('template_type', 'unknown')} template")
                        else:
                            print(f"   ❌ {sms_result['registration']}: {sms_result.get('error', 'Unknown error')}")
                
                return True
            else:
                print(f"❌ SMS FAILED: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ API ERROR: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 SINGLE VEHICLE SMS TEST")
    print("=" * 60)
    print("This script will help you test SMS functionality on ONE vehicle")
    print("before sending bulk reminders to all customers.")
    print()
    
    # Check if services are running
    try:
        response = requests.get('http://127.0.0.1:5002/api/mot/vehicles')
        if response.status_code != 200:
            print("❌ MOT service not running. Please start it first:")
            print("   cd garage-management-system/src && python mot_service.py")
            return
    except:
        print("❌ Cannot connect to MOT service. Please start it first:")
        print("   cd garage-management-system/src && python mot_service.py")
        return
    
    # Get available vehicles
    vehicles = get_available_vehicles()
    vehicles_with_mobile = display_vehicles_for_selection(vehicles)
    
    if not vehicles_with_mobile:
        return
    
    # Get user selection
    while True:
        try:
            choice = input(f"\n🎯 Select vehicle number (1-{len(vehicles_with_mobile)}) or 'q' to quit: ").strip()
            
            if choice.lower() == 'q':
                print("👋 Test cancelled")
                return
            
            vehicle_index = int(choice) - 1
            if 0 <= vehicle_index < len(vehicles_with_mobile):
                selected_vehicle = vehicles_with_mobile[vehicle_index]
                break
            else:
                print(f"❌ Please enter a number between 1 and {len(vehicles_with_mobile)}")
        except ValueError:
            print("❌ Please enter a valid number or 'q' to quit")
    
    # Confirm selection
    print(f"\n📋 SELECTED VEHICLE:")
    print(f"   Registration: {selected_vehicle['registration']}")
    print(f"   Vehicle: {selected_vehicle['make']} {selected_vehicle['model']}")
    print(f"   Customer: {selected_vehicle['customer_name'] or 'Unknown'}")
    print(f"   Mobile: {selected_vehicle['mobile_number']}")
    print(f"   MOT Status: {'EXPIRED' if selected_vehicle['is_expired'] else f'{selected_vehicle['days_until_expiry']} days left'}")
    
    confirm = input(f"\n⚠️  CONFIRM: Send SMS to {selected_vehicle['mobile_number']}? (y/N): ").strip().lower()
    
    if confirm == 'y':
        success = send_test_sms(selected_vehicle)
        
        if success:
            print(f"\n🎉 TEST COMPLETED SUCCESSFULLY!")
            print(f"📱 SMS sent to {selected_vehicle['mobile_number']}")
            print(f"🚗 Vehicle: {selected_vehicle['registration']}")
            print(f"\n💡 If the SMS was received correctly, you can now proceed with bulk sending.")
        else:
            print(f"\n❌ TEST FAILED!")
            print(f"Please check your Twilio configuration and try again.")
    else:
        print("👋 Test cancelled")

if __name__ == '__main__':
    main()
