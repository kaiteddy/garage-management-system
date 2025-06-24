#!/usr/bin/env python3
"""
Startup script for the integrated Garage Management System with MOT Reminders
Starts both the main application and the MOT service backend
"""

import os
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path


def start_mot_service():
    """Start the MOT service backend"""
    print("🚗 Starting MOT Reminder Service...")

    # Change to the src directory
    src_dir = Path(__file__).parent / 'src'
    os.chdir(src_dir)

    try:
        # Start the MOT service with a different port (8001)
        subprocess.run([sys.executable, 'mot_service.py', '--port', '8001'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting MOT service: {e}")
    except KeyboardInterrupt:
        print("🛑 MOT service stopped by user")


def start_main_application():
    """Start the main garage management application server"""
    print("🏢 Starting Main Garage Management System...")

    # Change to the src directory
    src_dir = Path(__file__).parent / 'src'
    os.chdir(src_dir)

    try:
        # Start the main application server with a different port (8002)
        subprocess.run([sys.executable, 'main.py', '--port', '8002'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting main application server: {e}")
    except KeyboardInterrupt:
        print("🛑 Main application server stopped by user")


def open_browser():
    """Open the browser after services are ready"""
    print("🌐 Opening integrated dashboard in browser...")

    # Wait for services to be ready
    time.sleep(5)

    # Open the integrated dashboard in browser
    main_app_url = "http://127.0.0.1:8002/integrated"
    print(f"🌐 Opening integrated dashboard: {main_app_url}")

    try:
        webbrowser.open(main_app_url)
        print("✅ Integrated dashboard opened in browser")
    except Exception as e:
        print(f"❌ Error opening browser: {e}")
        print(f"Please manually open: {main_app_url}")


def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = ['flask', 'flask-cors', 'requests', 'phonenumbers']
    missing_packages = []

    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)

    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\nPlease install missing packages:")
        print(f"pip install {' '.join(missing_packages)}")
        return False

    return True


def main():
    """Main startup function"""
    print("🚀 Starting Integrated Garage Management System with MOT Reminders")
    print("=" * 70)

    # Check dependencies
    if not check_dependencies():
        sys.exit(1)

    # Check if MOT reminder files exist
    mot_reminder_dir = Path(__file__).parent / 'mot_reminder'
    if not mot_reminder_dir.exists():
        print("⚠️  MOT reminder directory not found. Some features may be limited.")

    try:
        # Start MOT service in a separate thread
        mot_thread = threading.Thread(target=start_mot_service, daemon=True)
        mot_thread.start()

        # Start main application server in a separate thread
        main_app_thread = threading.Thread(
            target=start_main_application, daemon=True)
        main_app_thread.start()

        # Open browser after services are ready
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()

        print("\n" + "=" * 70)
        print("🎉 System started successfully!")
        print("\n📋 Available Services:")
        print("   • Main Application: http://127.0.0.1:8002")
        print("   • Integrated Dashboard: http://127.0.0.1:8002/integrated")
        print("   • MOT Service API:  http://127.0.0.1:8001/api")
        print("\n🔧 Features Available:")
        print("   • Customer Management")
        print("   • Vehicle Management")
        print("   • Job Management")
        print("   • Invoice Management")
        print("   • MOT Reminders with DVSA API integration")
        print("   • SMS Notifications")
        print("   • Bulk vehicle upload (CSV/Excel)")
        print("\n💡 Tips:")
        print("   • Navigate to 'MOT Reminders' in the sidebar to access MOT features")
        print("   • Use 'Add Vehicle' to monitor individual vehicles")
        print("   • Use 'Bulk Upload' to import multiple vehicles from CSV/Excel")
        print("   • Configure SMS settings for real SMS notifications")
        print("\n⚠️  Note: SMS service is in demo mode. Configure Twilio credentials for real SMS.")
        print("\nPress Ctrl+C to stop all services")

        # Keep the main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutting down system...")

    except Exception as e:
        print(f"❌ Error starting system: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
