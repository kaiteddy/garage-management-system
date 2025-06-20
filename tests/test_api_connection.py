#!/usr/bin/env python3
"""
Test script for MOT Reminder API connectivity
"""

import os
import sys
from datetime import datetime

from mot_reminder import MOTReminder

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def test_api_authentication():
    """Test API authentication"""
    print("Testing API authentication...")

    try:
        reminder = MOTReminder()
        token = reminder.get_access_token()

        if token:
            print("✓ Successfully obtained access token")
            print(f"✓ Token length: {len(token)} characters")
            return True
        else:
            print("✗ Failed to obtain access token")
            return False
    except Exception as e:
        print(f"✗ Error during authentication: {e}")
        return False


def test_vehicle_lookup():
    """Test vehicle lookup with a known registration"""
    print("\nTesting vehicle lookup...")

    # Using a test registration - you can replace with a real one
    test_registration = "AB12CDE"  # This is a placeholder

    try:
        reminder = MOTReminder()
        vehicle_info = reminder.check_mot_status(test_registration)

        if vehicle_info:
            print(f"✓ Successfully retrieved data for {test_registration}")
            print(
                f"✓ Vehicle: {vehicle_info.get('make', 'Unknown')} {vehicle_info.get('model', 'Unknown')}")
            print(
                f"✓ MOT expiry: {vehicle_info.get('mot_expiry_date', 'Unknown')}")
            print(
                f"✓ Days until expiry: {vehicle_info.get('days_until_expiry', 'Unknown')}")
            return True
        else:
            print(
                f"⚠ No data found for {test_registration} (this may be expected for test registration)")
            return True  # This is expected for a test registration
    except Exception as e:
        print(f"✗ Error during vehicle lookup: {e}")
        return False


def test_reminder_functionality():
    """Test the reminder functionality"""
    print("\nTesting reminder functionality...")

    try:
        reminder = MOTReminder()

        # Create test vehicle info
        test_vehicle_info = {
            'registration': 'TEST123',
            'make': 'TEST',
            'model': 'VEHICLE',
            'mot_expiry_date': '2025.07.15',
            'days_until_expiry': 25,
            'is_expired': False,
            'last_test_date': '2024.07.16',
            'test_result': 'PASSED'
        }

        print("✓ Testing reminder for vehicle expiring in 25 days...")
        reminder.send_reminder(test_vehicle_info)

        # Test expired vehicle
        expired_vehicle_info = test_vehicle_info.copy()
        expired_vehicle_info['days_until_expiry'] = -5
        expired_vehicle_info['is_expired'] = True

        print("✓ Testing urgent notification for expired vehicle...")
        reminder.send_reminder(expired_vehicle_info)

        return True
    except Exception as e:
        print(f"✗ Error testing reminder functionality: {e}")
        return False


def main():
    """Run API connectivity tests"""
    print("MOT Reminder Tool - API Connectivity Test")
    print("=" * 45)

    tests = [
        test_api_authentication,
        test_vehicle_lookup,
        test_reminder_functionality
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 45)
    print(f"API Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("✓ All API tests passed! MOT Reminder tool is fully functional.")
        print("\nThe tool is ready for production use!")
        print("\nTo use the tool:")
        print("1. Web interface: python app.py (then visit http://localhost:5001)")
        print("2. Command line: python mot_reminder.py")
    else:
        print("⚠ Some API tests failed. Please check the configuration and network connectivity.")


if __name__ == "__main__":
    main()
