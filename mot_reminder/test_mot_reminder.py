#!/usr/bin/env python3
"""
Test script for MOT Reminder functionality
"""

import os
import sys
from datetime import datetime, timedelta

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mot_reminder import MOTReminder

def test_mot_reminder_initialization():
    """Test MOTReminder class initialization"""
    print("Testing MOTReminder initialization...")
    
    try:
        reminder = MOTReminder()
        print("✓ MOTReminder initialized successfully")
        
        # Check if environment variables are loaded
        if reminder.client_id:
            print("✓ CLIENT_ID loaded from environment")
        else:
            print("⚠ CLIENT_ID not found in environment")
            
        if reminder.client_secret:
            print("✓ CLIENT_SECRET loaded from environment")
        else:
            print("⚠ CLIENT_SECRET not found in environment")
            
        if reminder.api_key:
            print("✓ API_KEY loaded from environment")
        else:
            print("⚠ API_KEY not found in environment")
            
        if reminder.token_url:
            print("✓ TOKEN_URL loaded from environment")
        else:
            print("⚠ TOKEN_URL not found in environment")
            
        return True
    except Exception as e:
        print(f"✗ Error initializing MOTReminder: {e}")
        return False

def test_environment_setup():
    """Test environment setup"""
    print("\nTesting environment setup...")
    
    # Check if .env file exists
    if os.path.exists('.env'):
        print("✓ .env file exists")
        
        # Read .env file content
        with open('.env', 'r') as f:
            content = f.read()
            
        required_vars = ['CLIENT_ID', 'CLIENT_SECRET', 'API_KEY', 'TOKEN_URL']
        for var in required_vars:
            if var in content:
                if f"{var}=your_" in content:
                    print(f"⚠ {var} found but contains placeholder value")
                else:
                    print(f"✓ {var} configured")
            else:
                print(f"✗ {var} missing from .env file")
    else:
        print("⚠ .env file not found - will be created on first run")

def test_mock_vehicle_data():
    """Test with mock vehicle data structure"""
    print("\nTesting mock vehicle data processing...")
    
    # Mock vehicle data structure (similar to what DVSA API would return)
    # Using a future date for testing
    future_date = (datetime.now() + timedelta(days=20)).strftime('%Y.%m.%d')
    mock_vehicle_data = {
        'make': 'FORD',
        'model': 'FOCUS',
        'motTests': [
            {
                'expiryDate': future_date,
                'completedDate': '2023.12.16',
                'testResult': 'PASSED'
            }
        ]
    }
    
    try:
        reminder = MOTReminder()
        
        # Test date parsing
        expiry_date = datetime.strptime(mock_vehicle_data['motTests'][0]['expiryDate'], '%Y.%m.%d')
        today = datetime.now()
        days_until_expiry = (expiry_date - today).days
        
        print(f"✓ Mock vehicle: {mock_vehicle_data['make']} {mock_vehicle_data['model']}")
        print(f"✓ MOT expiry date: {mock_vehicle_data['motTests'][0]['expiryDate']}")
        print(f"✓ Days until expiry: {days_until_expiry}")
        print(f"✓ Test result: {mock_vehicle_data['motTests'][0]['testResult']}")
        
        # Test reminder logic
        if days_until_expiry <= 30 and days_until_expiry >= 0:
            print("✓ Would trigger reminder (expires within 30 days)")
        elif days_until_expiry < 0:
            print("✓ Would trigger urgent notification (expired)")
        else:
            print("✓ No reminder needed (valid for more than 30 days)")
            
        return True
    except Exception as e:
        print(f"✗ Error processing mock data: {e}")
        return False

def main():
    """Run all tests"""
    print("MOT Reminder Tool - Test Suite")
    print("=" * 40)
    
    tests = [
        test_environment_setup,
        test_mot_reminder_initialization,
        test_mock_vehicle_data
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 40)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All tests passed! MOT Reminder tool is ready to use.")
        print("\nNext steps:")
        print("1. Configure your DVSA API credentials in the .env file")
        print("2. Add vehicle registration numbers to monitor")
        print("3. Run the Flask web app: python app.py")
        print("4. Or run the command-line version: python mot_reminder.py")
    else:
        print("⚠ Some tests failed. Please check the configuration.")

if __name__ == "__main__":
    main()
