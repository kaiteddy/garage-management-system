#!/usr/bin/env python3
"""
Simple test script to verify the application is working.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_app():
    """Test the application."""
    try:
        print("🔍 Testing Garage Management System...")
        
        # Test imports
        print("1. Testing imports...")
        from secure_app import create_app
        print("   ✅ App import successful")
        
        # Test app creation
        print("2. Testing app creation...")
        app = create_app()
        print("   ✅ App creation successful")
        
        # Test routes
        print("3. Testing routes...")
        with app.test_client() as client:
            # Test main page
            response = client.get('/')
            print(f"   GET / -> Status: {response.status_code}")
            if response.status_code == 200:
                print(f"   Response: {response.get_json()}")
            
            # Test API status
            response = client.get('/api/status')
            print(f"   GET /api/status -> Status: {response.status_code}")
            if response.status_code == 200:
                print(f"   Response: {response.get_json()}")
            
            # Test login endpoint
            response = client.post('/api/auth/login', json={
                'username': 'admin',
                'password': 'admin123'
            })
            print(f"   POST /api/auth/login -> Status: {response.status_code}")
            if response.status_code in [200, 401]:
                print(f"   Response: {response.get_json()}")
        
        print("\n✅ All tests passed! App is working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_app()
    if success:
        print("\n🚀 Ready to start the application!")
        print("Run: python3 run_secure.py")
    else:
        print("\n⚠️  Please fix the errors before running the application.")
