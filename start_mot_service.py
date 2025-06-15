#!/usr/bin/env python3
"""
Start the MOT Service Backend
This script starts the backend service that provides real DVSA API integration
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import requests
        import flask_cors
        print("✅ Dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install dependencies with: pip install -r requirements.txt")
        return False

def check_env_file():
    """Check if .env file exists with DVSA credentials"""
    env_path = Path("src/.env")
    if env_path.exists():
        print("✅ Environment file found")
        return True
    else:
        print("⚠️  No .env file found - creating template...")
        create_env_template()
        return True

def create_env_template():
    """Create a template .env file"""
    env_content = """# DVSA API Configuration (Pre-configured)
CLIENT_ID=2b3911f4-55f5-4a86-a9f0-0fc02c2bff0f
CLIENT_SECRET=your_client_secret_here
API_KEY=your_api_key_here
TOKEN_URL=https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token

# SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_phone_number
"""
    
    os.makedirs("src", exist_ok=True)
    with open("src/.env", "w") as f:
        f.write(env_content)
    print("📝 Created .env template file")

def start_mot_service():
    """Start the MOT service backend"""
    print("🚀 Starting MOT Service Backend...")
    
    # Change to src directory
    os.chdir("src")
    
    try:
        # Start the MOT service
        process = subprocess.Popen([
            sys.executable, "mot_service.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        print("⏳ Waiting for service to start...")
        time.sleep(3)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ MOT Service started successfully!")
            print("🌐 Backend API: http://127.0.0.1:5002/api")
            print("📋 Service provides real DVSA API integration")
            print("\n🔧 To use with the frontend:")
            print("1. Open src/static/index.html in your browser")
            print("2. Navigate to 'MOT Reminders' in the sidebar")
            print("3. Add vehicles - they will use real DVSA data!")
            print("\n⏹️  Press Ctrl+C to stop the service")
            
            # Keep the service running
            try:
                process.wait()
            except KeyboardInterrupt:
                print("\n🛑 Stopping MOT Service...")
                process.terminate()
                process.wait()
                print("✅ Service stopped")
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Service failed to start:")
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            
    except FileNotFoundError:
        print("❌ mot_service.py not found in src/ directory")
        return False
    except Exception as e:
        print(f"❌ Error starting service: {e}")
        return False

def main():
    """Main function"""
    print("🏁 MOT Service Startup Script")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        return
    
    # Check environment file
    check_env_file()
    
    # Start the service
    start_mot_service()

if __name__ == "__main__":
    main()
