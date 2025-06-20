#!/usr/bin/env python3
"""
Google Drive Integration Setup Helper
This script helps you set up Google Drive integration for the garage management system.
"""

import json
import os
import sys
from pathlib import Path


def check_dependencies():
    """Check if Google Drive dependencies are installed"""
    try:
        import google.auth
        import googleapiclient.discovery
        print("✅ Google Drive dependencies are installed")
        return True
    except ImportError as e:
        print("❌ Google Drive dependencies missing")
        print("Run: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
        return False


def check_credentials():
    """Check if Google credentials file exists"""
    config_dir = Path(__file__).parent / "config"
    credentials_path = config_dir / "google_credentials.json"

    if credentials_path.exists():
        print(f"✅ Credentials file found: {credentials_path}")

        # Validate credentials format
        try:
            with open(credentials_path, 'r') as f:
                creds = json.load(f)

            if 'installed' in creds:
                required_fields = ['client_id',
                                   'client_secret', 'auth_uri', 'token_uri']
                missing_fields = [
                    field for field in required_fields if field not in creds['installed']]

                if missing_fields:
                    print(
                        f"❌ Credentials file missing fields: {missing_fields}")
                    return False
                else:
                    print("✅ Credentials file format is valid")
                    return True
            else:
                print(
                    "❌ Credentials file format is invalid (missing 'installed' section)")
                return False

        except json.JSONDecodeError:
            print("❌ Credentials file is not valid JSON")
            return False
    else:
        print(f"❌ Credentials file not found: {credentials_path}")
        print("\n📋 To create credentials:")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create a new project or select existing")
        print("3. Enable Google Drive API")
        print("4. Create OAuth 2.0 credentials (Desktop application)")
        print("5. Download the JSON file and save as 'google_credentials.json' in the config/ directory")
        return False


def test_google_drive_service():
    """Test Google Drive service initialization"""
    try:
        from src.services.google_drive_service import GoogleDriveService

        db_path = Path(__file__).parent / "instance" / "garage.db"
        service = GoogleDriveService(str(db_path))

        if service.is_available():
            print("✅ Google Drive service initialized successfully")

            # Test connection
            status = service.get_connection_status()
            if status['connected']:
                print(
                    f"✅ Connected to Google Drive as: {status.get('user_email', 'Unknown')}")
            else:
                print(
                    f"⚠️  Not connected to Google Drive: {status.get('error', 'Unknown error')}")
                print(
                    "   This is normal for first-time setup - you'll need to authenticate via the web interface")

            return True
        else:
            print("❌ Google Drive service not available")
            return False

    except Exception as e:
        print(f"❌ Error testing Google Drive service: {e}")
        return False


def create_config_directory():
    """Create config directory if it doesn't exist"""
    config_dir = Path(__file__).parent / "config"
    config_dir.mkdir(exist_ok=True)
    print(f"✅ Config directory ready: {config_dir}")


def show_next_steps():
    """Show next steps for setup"""
    print("\n" + "="*60)
    print("🚀 GOOGLE DRIVE INTEGRATION SETUP")
    print("="*60)

    print("\n📋 NEXT STEPS:")
    print("\n1. 🔑 SET UP GOOGLE CLOUD CREDENTIALS:")
    print("   • Go to: https://console.cloud.google.com/")
    print("   • Create project: 'ELI Motors Garage System'")
    print("   • Enable Google Drive API")
    print("   • Create OAuth 2.0 credentials (Desktop app)")
    print("   • Download JSON and save as: config/google_credentials.json")

    print("\n2. 🌐 CONFIGURE IN WEB INTERFACE:")
    print("   • Visit: http://127.0.0.1:5001/google-drive")
    print("   • Click 'Test Connection' to authenticate")
    print("   • Configure folder mappings")

    print("\n3. 📁 ORGANIZE GOOGLE DRIVE:")
    print("   • Create folders for each data type:")
    print("     - ELI_MOTORS_Customers/")
    print("     - ELI_MOTORS_Vehicles/")
    print("     - ELI_MOTORS_Jobs/")
    print("     - ELI_MOTORS_Invoices/")
    print("     - ELI_MOTORS_Documents/")
    print("     - ELI_MOTORS_Receipts/")

    print("\n4. 🧪 TEST SYNCHRONIZATION:")
    print("   • Upload a test CSV file to a configured folder")
    print("   • Use 'Sync All Now' in the web interface")
    print("   • Verify data import was successful")

    print("\n✨ BENEFITS:")
    print("   ✅ Automatic data updates from Google Drive")
    print("   ✅ Real-time synchronization every 30 minutes")
    print("   ✅ Manual upload still available for one-time imports")
    print("   ✅ Team collaboration via shared Google Drive folders")
    print("   ✅ Backup and version control through Google Drive")


def main():
    """Main setup function"""
    print("🔧 Google Drive Integration Setup Helper")
    print("="*50)

    # Check dependencies
    if not check_dependencies():
        sys.exit(1)

    # Create config directory
    create_config_directory()

    # Check credentials
    has_credentials = check_credentials()

    # Test service
    if has_credentials:
        test_google_drive_service()

    # Show next steps
    show_next_steps()

    print(f"\n📖 For detailed setup instructions, see: config/google_drive_setup.md")
    print(f"🌐 Web interface: http://127.0.0.1:5001/google-drive")


if __name__ == "__main__":
    main()
