#!/usr/bin/env python3
"""
Setup DVSA credentials and test the API connection
"""

import os
import sys
import subprocess
import requests
from dotenv import load_dotenv

def load_credentials():
    """Load credentials from .env file"""
    print("🔑 Loading DVSA credentials...")
    
    # Load environment variables from .env file
    load_dotenv()
    
    # Check required credentials
    required_vars = ['DVSA_CLIENT_SECRET', 'DVSA_API_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var) or os.getenv(var) == f'your_{var.lower()}_here':
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required credentials: {', '.join(missing_vars)}")
        print("\n📝 Please edit the .env file and add your real DVSA credentials:")
        print("   - DVSA_CLIENT_SECRET=your_actual_client_secret")
        print("   - DVSA_API_KEY=your_actual_api_key")
        print("\n💡 The .env file has been created with placeholder values.")
        return False
    
    print("✅ DVSA credentials loaded successfully")
    return True

def test_dvsa_connection():
    """Test DVSA API connection"""
    print("🔍 Testing DVSA API connection...")
    
    try:
        # Test the service status endpoint
        response = requests.get("http://localhost:8002/api/dvsa/service-status", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                service_status = data.get('service_status', {})
                dvsa_status = service_status.get('dvsa_mot_api', {}).get('status', 'unknown')
                
                if dvsa_status == 'available':
                    print("✅ DVSA API connection successful!")
                    return True
                else:
                    print(f"❌ DVSA API status: {dvsa_status}")
                    return False
            else:
                print("❌ Service status check failed")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def test_real_registration():
    """Test with a real UK registration"""
    print("🚗 Testing with real registration LN64XFG...")
    
    try:
        response = requests.get("http://localhost:8002/api/dvsa/vehicle/LN64XFG/mot", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Successfully retrieved MOT data for LN64XFG!")
                mot_data = data.get('mot_data', {})
                if 'motTests' in mot_data:
                    print(f"📊 Found {len(mot_data['motTests'])} MOT test records")
                return True
            else:
                print(f"❌ API returned error: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code}")
            if response.status_code == 404:
                print("   This could mean the registration is not found in DVSA records")
            return False
            
    except Exception as e:
        print(f"❌ Registration test failed: {e}")
        return False

def restart_services():
    """Restart the services to pick up new environment variables"""
    print("🔄 Restarting services to load new credentials...")
    
    try:
        # Kill existing processes
        subprocess.run(["pkill", "-f", "main.py"], capture_output=True)
        subprocess.run(["pkill", "-f", "mot_service.py"], capture_output=True)
        
        print("⏳ Waiting for services to stop...")
        import time
        time.sleep(3)
        
        # Start services with new environment
        print("🚀 Starting services with DVSA credentials...")
        subprocess.Popen(["./launch.sh"], cwd=os.getcwd())
        
        print("⏳ Waiting for services to start...")
        time.sleep(10)
        
        return True
        
    except Exception as e:
        print(f"❌ Error restarting services: {e}")
        return False

def main():
    """Main setup function"""
    print("🔧 DVSA Credentials Setup")
    print("=" * 50)
    
    # Step 1: Load credentials
    if not load_credentials():
        print("\n📋 Next steps:")
        print("1. Edit the .env file with your real DVSA credentials")
        print("2. Run this script again: python3 setup_dvsa_credentials.py")
        return
    
    # Step 2: Restart services
    if not restart_services():
        print("❌ Failed to restart services")
        return
    
    # Step 3: Test connection
    if not test_dvsa_connection():
        print("❌ DVSA API connection failed")
        print("\n🔍 Troubleshooting:")
        print("- Check your DVSA_CLIENT_SECRET is correct")
        print("- Check your DVSA_API_KEY is correct")
        print("- Ensure you have internet connectivity")
        return
    
    # Step 4: Test with real registration
    if test_real_registration():
        print("\n🎉 DVSA integration is working perfectly!")
        print("✅ You can now use real UK registrations like LN64XFG")
        print("✅ MOT history viewing will show real DVSA data")
        print("✅ The system is ready for production use")
    else:
        print("\n⚠️ DVSA connection works but registration test failed")
        print("💡 This might be normal if LN64XFG is not in DVSA records")
        print("✅ Try with other known UK registrations")

if __name__ == "__main__":
    main()
