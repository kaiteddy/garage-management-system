#!/usr/bin/env python3
"""
Test script for SMS service functionality
"""

import os
import sys
from datetime import datetime, timedelta

from sms_service import SMSService

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def test_phone_validation():
    """Test phone number validation"""
    print("Testing phone number validation...")

    sms = SMSService()

    test_numbers = [
        ('07700900123', '+447700900123'),  # UK mobile
        ('447700900123', '+447700900123'),  # UK mobile with country code
        ('+447700900123', '+447700900123'),  # Already formatted
        ('020 7946 0958', '+442079460958'),  # UK landline
        ('invalid', None),  # Invalid
        ('', None),  # Empty
        ('123', None),  # Too short
    ]

    passed = 0
    for input_num, expected in test_numbers:
        result = sms.validate_phone_number(input_num)
        if result == expected:
            print(f"✓ {input_num:15s} -> {result}")
            passed += 1
        else:
            print(f"✗ {input_num:15s} -> {result} (expected {expected})")

    print(f"Phone validation: {passed}/{len(test_numbers)} tests passed\n")
    return passed == len(test_numbers)


def test_message_templates():
    """Test SMS message templates"""
    print("Testing SMS message templates...")

    sms = SMSService()

    # Test vehicle data
    test_vehicles = [
        {
            'registration': 'EXPIRED1',
            'make': 'FORD',
            'model': 'FOCUS',
            'mot_expiry_date': '2024-01-15',
            'days_until_expiry': -30,
            'is_expired': True
        },
        {
            'registration': 'CRITICAL1',
            'make': 'BMW',
            'model': '320D',
            'mot_expiry_date': '2024-12-25',
            'days_until_expiry': 3,
            'is_expired': False
        },
        {
            'registration': 'DUESOON1',
            'make': 'TOYOTA',
            'model': 'COROLLA',
            'mot_expiry_date': '2025-01-15',
            'days_until_expiry': 20,
            'is_expired': False
        },
        {
            'registration': 'VALID001',
            'make': 'MERCEDES',
            'model': 'C-CLASS',
            'mot_expiry_date': '2025-06-15',
            'days_until_expiry': 180,
            'is_expired': False
        }
    ]

    expected_templates = ['expired', 'critical', 'due_soon', 'reminder']

    passed = 0
    for i, vehicle in enumerate(test_vehicles):
        template_type = sms.determine_template_type(vehicle)
        message = sms.create_message_from_template(
            template_type, vehicle, "John Smith")

        print(f"\n--- {vehicle['registration']} ({template_type}) ---")
        print(message)

        if template_type == expected_templates[i]:
            print(f"✓ Correct template: {template_type}")
            passed += 1
        else:
            print(
                f"✗ Wrong template: {template_type} (expected {expected_templates[i]})")

    print(f"\nTemplate tests: {passed}/{len(test_vehicles)} tests passed\n")
    return passed == len(test_vehicles)


def test_sms_demo_mode():
    """Test SMS sending in demo mode"""
    print("Testing SMS demo mode...")

    sms = SMSService()

    test_vehicle = {
        'registration': 'TEST123',
        'make': 'TEST',
        'model': 'VEHICLE',
        'mot_expiry_date': '2024-12-25',
        'days_until_expiry': 5,
        'is_expired': False
    }

    # Test single SMS
    result = sms.send_mot_reminder(
        vehicle_info=test_vehicle,
        mobile_number='07700900123',
        customer_name='Test Customer'
    )

    if result['success']:
        print("✓ Single SMS demo successful")
        print(f"  Template: {result['template_type']}")
        print(f"  Message ID: {result['message_sid']}")
        single_passed = True
    else:
        print(f"✗ Single SMS demo failed: {result['error']}")
        single_passed = False

    # Test bulk SMS
    bulk_data = [
        {
            'vehicle_info': test_vehicle,
            'mobile_number': '07700900123',
            'customer_name': 'Customer 1'
        },
        {
            'vehicle_info': test_vehicle,
            'mobile_number': '07700900456',
            'customer_name': 'Customer 2'
        }
    ]

    bulk_result = sms.send_bulk_reminders(bulk_data)

    if bulk_result['sent'] == 2 and bulk_result['failed'] == 0:
        print("✓ Bulk SMS demo successful")
        print(
            f"  Sent: {bulk_result['sent']}, Failed: {bulk_result['failed']}")
        bulk_passed = True
    else:
        print(f"✗ Bulk SMS demo failed: {bulk_result}")
        bulk_passed = False

    return single_passed and bulk_passed


def test_service_status():
    """Test SMS service status"""
    print("Testing SMS service status...")

    sms = SMSService()
    status = sms.get_service_status()

    print(f"Service configured: {status['configured']}")
    print(f"Demo mode: {status['demo_mode']}")
    print(f"From number: {status['from_number']}")
    print(f"Account SID: {status['account_sid']}")

    # In demo mode, should not be configured
    if status['demo_mode'] and not status['configured']:
        print("✓ Service status correct (demo mode)")
        return True
    elif status['configured'] and not status['demo_mode']:
        print("✓ Service status correct (configured)")
        return True
    else:
        print("✗ Service status inconsistent")
        return False


def demonstrate_sms_templates():
    """Demonstrate all SMS templates"""
    print("\n" + "="*60)
    print("SMS TEMPLATE DEMONSTRATION")
    print("="*60)

    sms = SMSService()

    scenarios = [
        {
            'name': 'EXPIRED MOT',
            'vehicle': {
                'registration': 'EXPIRED1',
                'make': 'FORD',
                'model': 'FOCUS',
                'mot_expiry_date': '2024-01-15',
                'days_until_expiry': -30,
                'is_expired': True
            }
        },
        {
            'name': 'CRITICAL (≤7 days)',
            'vehicle': {
                'registration': 'CRITICAL1',
                'make': 'BMW',
                'model': '320D',
                'mot_expiry_date': (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
                'days_until_expiry': 3,
                'is_expired': False
            }
        },
        {
            'name': 'DUE SOON (8-30 days)',
            'vehicle': {
                'registration': 'DUESOON1',
                'make': 'TOYOTA',
                'model': 'COROLLA',
                'mot_expiry_date': (datetime.now() + timedelta(days=20)).strftime('%Y-%m-%d'),
                'days_until_expiry': 20,
                'is_expired': False
            }
        },
        {
            'name': 'GENERAL REMINDER',
            'vehicle': {
                'registration': 'VALID001',
                'make': 'MERCEDES',
                'model': 'C-CLASS',
                'mot_expiry_date': (datetime.now() + timedelta(days=180)).strftime('%Y-%m-%d'),
                'days_until_expiry': 180,
                'is_expired': False
            }
        }
    ]

    for scenario in scenarios:
        template_type = sms.determine_template_type(scenario['vehicle'])
        message = sms.create_message_from_template(
            template_type, scenario['vehicle'], "John Smith")

        print(f"\n📱 {scenario['name']} ({template_type.upper()}):")
        print("-" * 50)
        print(message)


def main():
    """Run all SMS service tests"""
    print("MOT Reminder Tool - SMS Service Test Suite")
    print("=" * 60)

    tests = [
        test_service_status,
        test_phone_validation,
        test_message_templates,
        test_sms_demo_mode
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
        print()

    print("=" * 60)
    print(f"SMS Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("✅ All SMS tests passed!")
        print("\n🎉 SMS Service Features:")
        print("✅ Phone number validation and formatting")
        print("✅ Template-based messaging system")
        print("✅ Urgency-based template selection")
        print("✅ Single and bulk SMS sending")
        print("✅ Demo mode for testing without Twilio")
        print("✅ Comprehensive error handling")

        demonstrate_sms_templates()

        print(f"\n🌐 Access the SMS dashboard at: http://127.0.0.1:5001/sms")
        print("📝 Upload CSV files with mobile numbers to start sending SMS reminders!")
    else:
        print("⚠️ Some SMS tests failed.")


if __name__ == "__main__":
    main()
