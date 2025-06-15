#!/usr/bin/env python3
"""
Test script to demonstrate smart customer name handling
Shows how SMS messages will look with different name scenarios
"""

import os
import sys
import requests

# Add the mot_reminder directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'mot_reminder'))

from sms_service import SMSService

def test_name_scenarios():
    """Test different customer name scenarios"""
    
    print("🧪 TESTING SMART CUSTOMER NAME HANDLING")
    print("=" * 60)
    print("This shows how SMS messages will look with different name data")
    print()
    
    sms_service = SMSService()
    
    # Test vehicle data
    test_vehicle = {
        'registration': 'TEST123',
        'make': 'TOYOTA',
        'model': 'YARIS',
        'mot_expiry_date': '16-06-2025',
        'days_until_expiry': 4,
        'is_expired': False
    }
    
    # Test scenarios
    test_scenarios = [
        {
            'name': 'Good Name',
            'customer_name': 'John Smith',
            'mobile': '07700900123'
        },
        {
            'name': 'Name with Title',
            'customer_name': 'Mr. David Jones',
            'mobile': '07700900124'
        },
        {
            'name': 'Name with Contact Info',
            'customer_name': 'Sarah Wilson t: 020123456 m: 07700900125 e: sarah@email.com',
            'mobile': '07700900125'
        },
        {
            'name': 'Complex Name Format',
            'customer_name': 'Mrs E Abraham t: m: 07747060397 e:',
            'mobile': '07747060397'
        },
        {
            'name': 'Empty Name',
            'customer_name': '',
            'mobile': '07700900126'
        },
        {
            'name': 'Just Spaces',
            'customer_name': '   ',
            'mobile': '07700900127'
        },
        {
            'name': 'Single Letter',
            'customer_name': 'R',
            'mobile': '07700900128'
        },
        {
            'name': 'Numbers Only',
            'customer_name': '12345',
            'mobile': '07700900129'
        },
        {
            'name': 'Missing Mobile',
            'customer_name': 'John Doe',
            'mobile': ''
        }
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"{i}. {scenario['name']}:")
        print(f"   Raw Data: '{scenario['customer_name']}' | Mobile: '{scenario['mobile']}'")
        
        # Test name cleaning
        clean_name = sms_service.clean_customer_name(scenario['customer_name'])
        print(f"   Cleaned Name: '{clean_name or 'None'}'")
        
        # Test validation
        validation = sms_service.should_send_sms(test_vehicle, scenario['mobile'], scenario['customer_name'])
        print(f"   Should Send: {validation['should_send']} - {validation['reason']}")
        
        if validation['should_send']:
            # Create message
            template_type = sms_service.determine_template_type(test_vehicle)
            message = sms_service.create_message_from_template(template_type, test_vehicle, scenario['customer_name'])
            
            print(f"   Template: {template_type}")
            print(f"   Message Preview:")
            print(f"   ┌─────────────────────────────────────────────────────────┐")
            for line in message.split('\n'):
                print(f"   │ {line:<55} │")
            print(f"   └─────────────────────────────────────────────────────────┘")
        else:
            print(f"   ❌ SMS would NOT be sent: {validation['reason']}")
        
        print()

def get_real_data_sample():
    """Get a sample of real vehicle data to show name handling"""
    print("\n" + "=" * 60)
    print("🚗 REAL DATA SAMPLE - NAME HANDLING")
    print("=" * 60)
    
    try:
        response = requests.get('http://127.0.0.1:5002/api/mot/vehicles')
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('vehicles', [])
            
            # Show first 10 vehicles with their name handling
            sms_service = SMSService()
            
            print("Sample of your actual vehicle data and how names would be handled:\n")
            
            for i, vehicle in enumerate(vehicles[:10], 1):
                customer_name = vehicle.get('customer_name', '')
                mobile = vehicle.get('mobile_number', '')
                registration = vehicle.get('registration', '')
                
                print(f"{i:2d}. {registration} - {vehicle.get('make', '')} {vehicle.get('model', '')}")
                print(f"     Raw Name: '{customer_name}'")
                print(f"     Mobile: '{mobile}'")
                
                clean_name = sms_service.clean_customer_name(customer_name)
                validation = sms_service.should_send_sms(vehicle, mobile, customer_name)
                
                print(f"     Clean Name: '{clean_name or 'None'}'")
                print(f"     SMS Status: {'✅ WOULD SEND' if validation['should_send'] else '❌ WOULD NOT SEND'}")
                if not validation['should_send']:
                    print(f"     Reason: {validation['reason']}")
                print()
                
        else:
            print("❌ Could not fetch vehicle data. Make sure MOT service is running.")
            
    except Exception as e:
        print(f"❌ Error fetching data: {e}")

def main():
    """Main test function"""
    test_name_scenarios()
    get_real_data_sample()
    
    print("=" * 60)
    print("📋 SUMMARY:")
    print("✅ Smart name cleaning removes titles and contact info")
    print("✅ Messages work with or without customer names")
    print("✅ Invalid data is filtered out automatically")
    print("✅ Professional appearance maintained")
    print()
    print("🚨 NO ACTUAL SMS MESSAGES WERE SENT - THIS IS PREVIEW ONLY")

if __name__ == '__main__':
    main()
