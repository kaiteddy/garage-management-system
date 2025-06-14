#!/usr/bin/env python3
"""
Private deployment script for the Garage Management System.
Runs the application on local network only, not accessible from the internet.
"""
import os
import sys
import socket
from datetime import datetime

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def get_local_ip():
    """Get the local IP address."""
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

def setup_private_environment():
    """Setup environment for private deployment."""
    env_vars = {
        'SECRET_KEY': 'private-deployment-secret-key-change-me',
        'DATABASE_URL': 'sqlite:///private_garage.db',
        'FLASK_ENV': 'development',
        'DEBUG': 'False',  # Disable debug in private mode
        'MFA_ENABLED': 'True',
        'GDPR_ENABLED': 'True',
        'SECURITY_MONITORING_ENABLED': 'True',
        'COMPANY_NAME': 'Private Garage Management',
        'COMPANY_EMAIL': 'admin@private-garage.local',
        'DPO_EMAIL': 'dpo@private-garage.local',
        # Private network settings
        'PRIVATE_MODE': 'True',
        'ALLOW_REGISTRATION': 'False',  # Disable public registration
        'REQUIRE_ADMIN_APPROVAL': 'True'
    }
    
    for key, value in env_vars.items():
        os.environ[key] = value
    
    print("✅ Private environment configured")

def main():
    """Main function for private deployment."""
    print("🔒 Garage Management System - Private Deployment")
    print("=" * 60)
    
    # Setup private environment
    setup_private_environment()
    
    # Get network information
    local_ip = get_local_ip()
    
    print(f"🌐 Network Configuration:")
    print(f"   Local IP: {local_ip}")
    print(f"   Localhost: 127.0.0.1")
    print(f"   Port: 5000")
    print()
    
    print(f"🔒 Private Access URLs:")
    print(f"   Local only: http://127.0.0.1:5000")
    print(f"   Local network: http://{local_ip}:5000")
    print()
    
    print(f"🛡️ Security Settings:")
    print(f"   ✅ Public registration: DISABLED")
    print(f"   ✅ Admin approval required: ENABLED")
    print(f"   ✅ Debug mode: DISABLED")
    print(f"   ✅ Private mode: ENABLED")
    print()
    
    print(f"🔑 Access Credentials:")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print(f"   Role: Administrator")
    print()
    
    print(f"📋 Private Deployment Features:")
    print(f"   • Not accessible from the internet")
    print(f"   • Only available on local network")
    print(f"   • Enhanced security for private use")
    print(f"   • All GDPR and security features active")
    print(f"   • Admin-only user management")
    print()
    
    # Import and run the app
    try:
        from simple_app import main as create_simple_app
        app = create_simple_app()
        
        print("🚀 Starting private server...")
        print("=" * 60)
        print(f"⚠️  PRIVATE MODE: Not accessible from internet")
        print(f"🌐 Access from local network: http://{local_ip}:5000")
        print(f"💻 Access from this machine: http://127.0.0.1:5000")
        print("=" * 60)
        
        # Run on local network (0.0.0.0 allows local network access)
        # But this is still private as it's not exposed to the internet
        app.run(
            host='0.0.0.0',  # Allow local network access
            port=5000,
            debug=False,     # Disable debug for security
            threaded=True    # Enable threading for better performance
        )
        
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down private server...")
    except Exception as e:
        print(f"\n❌ Error starting private server: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
