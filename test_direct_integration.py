#!/usr/bin/env python3
"""
Test direct MOT integration without backend service
"""

import sys
import os
sys.path.append('mot_reminder')

from mot_reminder import MOTReminder
from dotenv import load_dotenv

# Load environment variables
load_dotenv('mot_reminder/.env')

def test_csv_registrations():
    """Test the registrations from the CSV file"""
    
    # Test registrations from the CSV
    test_registrations = [
        'EJ13UYV',  # Toyota Yaris
        'L15AJR',   # Ford Focus  
        'HY12GNN',  # Mini Countryman
        'EG19HXF',  # Ford Focus (with space removed)
        'RV13GTU',  # Volkswagen Polo
        'LS58NXM',  # Ford Fiesta
        'WL61FAJ',  # Kia Venga (with space removed)
        'LN57EZF',  # Toyota Estima (with space removed)
        'YT69SKK',  # BMW X2 (with space removed)
        'RJ19UCY'   # Fiat 500 (with space removed)
    ]
    
    reminder = MOTReminder()
    
    print("Testing CSV registrations with direct DVLA API...")
    print("=" * 60)
    
    successful = 0
    failed = 0
    
    for reg in test_registrations:
        print(f"\n🚗 Testing: {reg}")
        try:
            result = reminder.check_mot_status(reg)
            if result:
                print(f"✅ SUCCESS: {result['make']} {result['model']}")
                print(f"   MOT expires: {result['mot_expiry_date']}")
                print(f"   Days until expiry: {result['days_until_expiry']}")
                successful += 1
            else:
                print(f"❌ FAILED: No data found")
                failed += 1
        except Exception as e:
            print(f"💥 ERROR: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {successful} successful, {failed} failed")
    print(f"Success rate: {(successful/(successful+failed)*100):.1f}%")
    
    return successful, failed

def test_customer_parsing():
    """Test customer field parsing"""
    
    test_customers = [
        'Mr Gary Liss t: m: 07804391204 e: maps.liss@gmail.com',
        'Mrs Lisa Renak t: 89532873 m: 07956319942 e: lisa@ybpconsultants.co.uk;leigh@ybpconsultants.',
        'Mr Benaim t: 07779233842 MRS m: 07920725422 e: mrbenaim@gmail.com',
        'Ms Zoe t: m: 07934997892 e:',
        'Misha Morris t: 07375558398 m: 07976263858 e: eliana(398)'
    ]
    
    print("\nTesting customer field parsing...")
    print("=" * 60)
    
    for customer in test_customers:
        print(f"\nInput: {customer}")
        
        # Extract mobile number (pattern: m: followed by digits)
        import re
        mobile_match = re.search(r'm:\s*(\d{11}|\d{10})', customer)
        mobile = mobile_match.group(1) if mobile_match else ''
        
        # Extract name (everything before the first 't:')
        name_match = re.search(r'^([^t]+?)(?:\s*t:|$)', customer)
        name = name_match.group(1).strip() if name_match else ''
        
        # Clean up name (remove quotes and common prefixes)
        name = re.sub(r'^["\']+|["\']+$', '', name)  # Remove quotes
        name = re.sub(r'^(Mr|Mrs|Ms|Miss|Dr)\s+', '', name, flags=re.IGNORECASE)  # Remove titles
        
        print(f"  Name: '{name.strip()}'")
        print(f"  Mobile: '{mobile}'")

if __name__ == "__main__":
    print("🔧 Direct MOT Integration Test")
    print("=" * 60)
    
    # Test registrations
    successful, failed = test_csv_registrations()
    
    # Test customer parsing
    test_customer_parsing()
    
    print(f"\n🎯 SUMMARY")
    print("=" * 60)
    if successful > failed:
        print("✅ Direct integration is working!")
        print("   The issue is likely in the frontend-backend communication.")
    else:
        print("❌ Direct integration has issues.")
        print("   Check DVLA API credentials and network connectivity.")
