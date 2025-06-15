#!/usr/bin/env python3
"""
Test script to check MOT reminder upload functionality
"""

import requests
import os

def test_mot_upload():
    """Test the MOT reminder upload functionality"""
    
    # MOT reminder service URL
    url = "http://127.0.0.1:8080/upload_file"
    
    # Test file path
    test_file = "mot_reminder/enhanced_vehicle_template.csv"
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        return False
    
    print(f"🧪 Testing MOT upload with file: {test_file}")
    
    try:
        # Read the file
        with open(test_file, 'rb') as f:
            files = {'file': (os.path.basename(test_file), f, 'text/csv')}
            
            # Make the upload request
            response = requests.post(url, files=files, allow_redirects=False)
            
            print(f"📊 Response status: {response.status_code}")
            print(f"📊 Response headers: {dict(response.headers)}")
            
            if response.status_code == 302:
                print("✅ Upload appears successful (redirect response)")
                return True
            elif response.status_code == 200:
                print("✅ Upload successful")
                print(f"📄 Response content: {response.text[:500]}...")
                return True
            else:
                print(f"❌ Upload failed with status {response.status_code}")
                print(f"📄 Response content: {response.text[:500]}...")
                return False
                
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to MOT reminder service")
        print("💡 Make sure the MOT reminder app is running on http://127.0.0.1:8080")
        return False
    except Exception as e:
        print(f"❌ Error during upload test: {e}")
        return False

def test_mot_service_status():
    """Test if the MOT reminder service is running"""
    
    try:
        response = requests.get("http://127.0.0.1:8080/test", timeout=5)
        if response.status_code == 200:
            print("✅ MOT reminder service is running")
            print(f"📄 Response: {response.text}")
            return True
        else:
            print(f"❌ MOT service responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ MOT reminder service is not running")
        return False
    except Exception as e:
        print(f"❌ Error checking MOT service: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing MOT Reminder Upload Functionality")
    print("=" * 50)
    
    # Test 1: Check if service is running
    print("\n1️⃣ Testing MOT service status...")
    if not test_mot_service_status():
        print("\n💡 To start the MOT reminder service:")
        print("   cd mot_reminder && python app.py")
        return
    
    # Test 2: Test file upload
    print("\n2️⃣ Testing file upload...")
    if test_mot_upload():
        print("\n🎉 MOT upload test completed successfully!")
    else:
        print("\n❌ MOT upload test failed!")
    
    print("\n" + "=" * 50)
    print("Test completed. Check the MOT reminder interface at http://127.0.0.1:8080")

if __name__ == "__main__":
    main()
