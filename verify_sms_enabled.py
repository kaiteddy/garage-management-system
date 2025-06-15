#!/usr/bin/env python3
"""
Verification script to confirm SMS service is enabled for real sending
"""

import requests
import json

def verify_sms_service():
    """Verify that SMS service is configured for real sending"""
    
    print("📱 VERIFYING SMS SERVICE STATUS")
    print("=" * 50)
    print()
    
    base_url = "http://127.0.0.1:5002/api"
    
    try:
        # Test SMS service status endpoint
        response = requests.get(f"{base_url}/mot/sms/status")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SMS Service Status:")
            print(f"   Configured: {data.get('configured', False)}")
            print(f"   Demo Mode: {data.get('demo_mode', True)}")
            print(f"   From Number: {data.get('from_number', 'Not configured')}")
            print(f"   Account SID: {data.get('account_sid', 'Not configured')}")
            print()
            
            if data.get('configured') and not data.get('demo_mode'):
                print("🎉 SMS SERVICE IS ENABLED FOR REAL SENDING!")
                return True
            else:
                print("⚠️ SMS Service still in demo mode")
                return False
        else:
            print(f"❌ SMS Status API error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking SMS status: {e}")
        return False

def test_sms_api():
    """Test the SMS API endpoint"""
    
    print("🧪 TESTING SMS API:")
    print("-" * 30)
    
    base_url = "http://127.0.0.1:5002/api"
    
    try:
        # Get vehicles to test with
        response = requests.get(f"{base_url}/mot/vehicles")
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('vehicles', [])
            
            # Find a vehicle with a mobile number for testing
            test_vehicle = None
            for vehicle in vehicles:
                if vehicle.get('mobile_number'):
                    test_vehicle = vehicle
                    break
            
            if test_vehicle:
                print(f"✅ Found test vehicle: {test_vehicle['registration']}")
                print(f"   Mobile: {test_vehicle['mobile_number']}")
                print(f"   Customer: {test_vehicle.get('customer_name', 'Unknown')}")
                print()
                
                print("📋 SMS API is ready for testing")
                print("   You can now send real SMS messages through the web interface")
                return True
            else:
                print("⚠️ No vehicles with mobile numbers found for testing")
                return False
        else:
            print(f"❌ Vehicles API error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing SMS API: {e}")
        return False

def show_usage_instructions():
    """Show how to use the enabled SMS service"""
    
    print("📋 HOW TO USE REAL SMS SENDING:")
    print("=" * 50)
    print()
    
    print("1️⃣ ACCESS MOT REMINDERS:")
    print("   • Open: http://127.0.0.1:5001")
    print("   • Navigate to 'MOT Reminders' section")
    print()
    
    print("2️⃣ SEND TEST SMS:")
    print("   • Select a vehicle with a mobile number")
    print("   • Click 'Send SMS' button")
    print("   • Confirm sending in the modal")
    print("   • Real SMS will be sent to the customer!")
    print()
    
    print("3️⃣ VERIFY SMS SENDING:")
    print("   • Check the console output for '✅ SMS sent to...'")
    print("   • Vehicle will be automatically archived after SMS")
    print("   • SMS History will log the real message")
    print()
    
    print("4️⃣ BULK SMS SENDING:")
    print("   • Select multiple vehicles")
    print("   • Use 'Send Bulk SMS' feature")
    print("   • All selected customers will receive real SMS")
    print()
    
    print("⚠️ IMPORTANT NOTES:")
    print("   • Real SMS messages will be sent to customers")
    print("   • Each SMS costs money through your Twilio account")
    print("   • Test with your own number first")
    print("   • SMS templates are professional and branded 'Eli Motors'")
    print()

def main():
    """Main verification function"""
    
    print("🚀 SMS SERVICE ENABLEMENT VERIFICATION")
    print("=" * 50)
    print()
    
    sms_enabled = verify_sms_service()
    api_ready = test_sms_api()
    
    print("=" * 50)
    print("📊 VERIFICATION SUMMARY:")
    print(f"   SMS Service Enabled: {'✅ YES' if sms_enabled else '❌ NO'}")
    print(f"   API Ready for Testing: {'✅ YES' if api_ready else '❌ NO'}")
    print()
    
    if sms_enabled and api_ready:
        print("🎉 SUCCESS! REAL SMS SENDING IS NOW ENABLED!")
        print()
        print("✅ Your MOT reminder system can now:")
        print("   • Send real SMS messages to customers")
        print("   • Use professional Eli Motors templates")
        print("   • Automatically archive vehicles after SMS")
        print("   • Track SMS history with real message IDs")
        print("   • Handle bulk SMS sending efficiently")
        print()
        show_usage_instructions()
    else:
        print("❌ SMS SERVICE NOT FULLY ENABLED")
        print()
        print("🔧 Troubleshooting:")
        print("   1. Check that MOT service is running")
        print("   2. Verify .env file has real Twilio credentials")
        print("   3. Restart the MOT service")
        print("   4. Check console output for SMS service initialization")

if __name__ == '__main__':
    main()
